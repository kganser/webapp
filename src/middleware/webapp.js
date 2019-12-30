const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const React = require('react');
const ReactDOM = require('react-dom/server');

function jsx(node) {
  // node := [type, props, node*]
  //      |  [type, node*]
  //      |  [node*]
  //      |  string

  if (!Array.isArray(node)) return node;
  let type = node[0],
    props,
    children;
  if (!type || Array.isArray(type)) {
    type = React.Fragment;
    children = node;
  } else if (typeof node[1] == 'object' && !Array.isArray(node[1])) {
    props = node[1];
    children = node.slice(2);
  } else {
    children = node.slice(1);
  }
  return React.createElement.apply(null, [type, props].concat(children.map(jsx)));
}

const css = styles => {
  // styles     := { rule* }
  // rule       := selector : properties
  // properties := { (property|rule)* }
  // property   := name : value

  const rule = (selector, properties) => {
    const rules = [];
    let styles = [];
    Object.entries(properties).forEach(([name, value]) => {
      if (typeof value == 'object') {
        if (styles.length) {
          rules.push(selector + '{' + styles.join(';') + '}');
          styles = [];
        }
        selector.split(',').forEach(s => {
          s = s.trim();
          name.split(',').forEach(n => {
            n = n.trim();
            rule(n.includes('&') ? n.replace('&', s) : s + ' ' + n, value).forEach(rule => {
              rules.push(rule);
            });
          });
        });
      } else {
        styles.push(
          name
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/^(webkit|moz|o|ms)-/, '-$1-')
            .toLowerCase() +
            ':' +
            (value === '' ? '""' : value)
        );
      }
    });
    if (styles.length) rules.push(selector + '{' + styles.join(';') + '}');
    return rules;
  };

  return Object.keys(styles || {})
    .reduce((rules, selector) => {
      const properties = styles[selector];
      return rules.concat(
        selector.startsWith('@media ')
          ? selector + '{' + css(properties) + '}'
          : rule(selector, properties)
      );
    }, [])
    .join('');
};

const sha1 = string =>
  crypto
    .createHash('sha256')
    .update(string)
    .digest('base64')
    .substr(0, 8)
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const site = (components, config, jsx) => ({
  config,
  components,
  init: function(root, component, props) {
    Object.entries(components).forEach(([name, component]) => {
      const render = component(this);
      components[name] = props => jsx(render(props));
    });
    if (root)
      ReactDOM.hydrate(
        React.createElement(components[component], props),
        document.getElementById(root)
      );
    return this;
  }
});

module.exports = (config, options) => {
  const {componentsDir = 'components', assetsTTL = 86400} = options || {};

  const script = (name, component) => {
    // TODO: babel transform (& sourcemap)
    if (name == 'site')
      return 'Site = (' + site + ')({}, ' + JSON.stringify(config) + ', ' + jsx + ');';
    return 'Site.components[' + JSON.stringify(name) + '] = ' + component + ';';
  };

  const views = fs
    .readdirSync(path.join(__dirname, '..', componentsDir), {
      withFileTypes: true
    })
    .reduce((views, entry) => {
      if (entry.isFile) {
        const name = entry.name.replace(/\.js$/, '');
        views[name] = require('../' + componentsDir + '/' + name);
      }
      return views;
    }, {});

  const {components} = site(
    Object.entries(views).reduce((views, [name, view]) => ({...views, [name]: view.component}), {}),
    config,
    jsx
  ).init();

  return (req, res, next) => {
    const asset =
      req.path.match(/^\/(css)\/([^\.]+)\.([^\.]+)\.css$/) ||
      req.path.match(/^\/(js)\/([^\.]+)\.([^\.]+)\.js$/);
    if (asset) {
      const [_, type, view, hash] = asset;
      const js = type == 'js';
      let value = (views[view] || {})[js ? 'component' : 'styles'];
      if (!value) return res.sendStatus(404);
      value = js ? script(view, value) : css(value);
      return sha1(value) == hash
        ? res
            .set({
              'Content-Type': js ? 'text/javascript' : 'text/css',
              'Cache-Control': 'max-age=' + assetsTTL,
              ETag: hash
            })
            .end(value)
        : res.sendStatus(400);
    }
    res.render = (view, {meta, ...props}) => {
      const ids = ['site'].concat(view);
      const assets = {};
      ids.forEach(function add(name) {
        if (assets[name]) return;
        const {component, styles, includes = {}, dependencies = []} = views[name];
        assets[name] = {
          styles: (styles ? ['/css/' + name + '.' + sha1(css(styles)) + '.css'] : []).concat(
            includes.styles || []
          ),
          scripts: ['/js/' + name + '.' + sha1(script(name, component)) + '.js'].concat(
            includes.scripts || []
          )
        };
        dependencies.forEach(add);
      });
      res.end(
        '<!doctype html>' +
          ReactDOM.renderToStaticMarkup(
            jsx([
              components.site,
              {
                ...meta,
                view: ids[1],
                props,
                styles: Array.from(
                  new Set(Object.values(assets).reduce((urls, {styles}) => urls.concat(styles), []))
                ),
                scripts: Array.from(
                  new Set(
                    Object.values(assets).reduce((urls, {scripts}) => urls.concat(scripts), [])
                  )
                )
              }
            ])
          )
      );
    };
    res.renderPage = (view, {meta, ...props}) => {
      res.render(['page', view], {meta, view, props});
    };
    next();
  };
};
