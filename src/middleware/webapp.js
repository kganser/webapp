const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babel = require('@babel/core');
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
  const {assetsTTL = 86400, componentsDir = 'components', dev} = options || {};

  const script = (name, component) => {
    const code =
      name == 'site'
        ? 'window.Site = (' + site + ')({}, ' + JSON.stringify(config) + ', ' + jsx + ');'
        : 'window.Site.components[' + JSON.stringify(name) + '] = ' + component + ';';
    return babel.transformSync(code, {
      comments: dev,
      presets: [['@babel/preset-env', {targets: '> 0.25%, not dead'}]], // {exclude: ['transform-typeof-symbol']}
      minified: !dev,
      sourceFileName: '/js/' + name + '.js',
      sourceMaps: dev && 'inline'
    }).code;
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

  const router = express.Router();
  router.use(bodyParser.urlencoded({extended: false}));
  router.use(cookieParser());

  router.use((req, res, next) => {
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
      let message = req.cookies.message;
      if (message && /^[es]:/.test(message)) {
        message = {
          type: {e: 'danger', s: 'success'}[message[0]],
          text: message.substr(2)
        };
        res.clearCookie('message');
      }
      res.render(['page', view], {meta, view, login: req.login, message, props});
    };
    res.error = (message, path) => {
      res.cookie('message', 'e:' + message).redirect(path || req.path);
    };
    res.success = (message, path) => {
      res.cookie('message', 's:' + message).redirect(path || req.path);
    };
    next();
  });

  router.get('/css/:view.:hash.css', (req, res) => {
    const {view, hash} = req.params;
    let value = (views[view] || {}).styles;
    if (!value) return res.sendStatus(404);
    value = css(value);
    return sha1(value) == hash
      ? res
          .set({
            'Content-Type': 'text/css',
            'Cache-Control': 'max-age=' + assetsTTL,
            ETag: hash
          })
          .end(value)
      : res.sendStatus(400);
  });

  router.get('/js/:view.:hash.js', (req, res) => {
    const {view, hash} = req.params;
    let value = (views[view] || {}).component;
    if (!value) return res.sendStatus(404);
    value = script(view, value);
    return sha1(value) == hash
      ? res
          .set({
            'Content-Type': 'text/javascript',
            'Cache-Control': 'max-age=' + assetsTTL,
            ETag: hash
          })
          .end(value)
      : res.sendStatus(400);
  });

  router.get('/static/:file', (req, res) => {
    // TODO: validate path; add content-type, etag headers
    fs.createReadStream(path.join(__dirname, '..', req.path)).pipe(res);
  });

  return router;
};
