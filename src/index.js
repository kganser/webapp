const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babel = require('@babel/core');
const React = require('react');
const ReactDOM = require('react-dom/server');
const {base64Mac, base64Url, jwt} = require('./util');

exports.reload = require('./reload');
exports.util = require('./util');

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

function css(styles) {
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
}

const shortHash = string =>
  base64Url(
    crypto
      .createHash('sha256')
      .update(string)
      .digest()
  ).substr(0, 8);

const site = (React, components, config, jsx) => ({
  React,
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
    this.init = null;
    return this;
  }
});

const resolveFile = (dir, file) =>
  new Promise(resolve => {
    const filePath = path.join(dir, file);
    fs.access(filePath, fs.constants.R_OK, error => {
      resolve(!error && filePath);
    });
  });

exports.router = ({
  assetsTTL = 86400,
  config = {},
  views = {},
  sessionKey,
  sessionCookie = 'auth',
  messageCookie = 'message',
  staticDir = 'src/static',
  dev
}) => {
  const script = (name, component) => {
    const code =
      name == 'site'
        ? `window.Site = (${site})(React, {}, ${JSON.stringify(config)}, ${jsx});`
        : `window.Site.components[${JSON.stringify(name)}] = ${component};`;
    return babel.transformSync(code, {
      comments: dev,
      presets: [['@babel/preset-env', {targets: '> 0.25%, not dead'}]],
      minified: !dev,
      sourceFileName: `/js/${name}.js`,
      sourceMaps: dev && 'inline'
    }).code;
  };

  if (!views.site) views.site = require('./views/site');
  if (!views.page) views.page = require('./views/page');

  const {components} = site(
    React,
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
        if (assets[name] || !views[name]) return;
        const {component, styles, includes = {}, dependencies = []} = views[name];
        assets[name] = {
          styles: (styles ? [`/css/${name}.${shortHash(css(styles))}.css`] : []).concat(
            includes.styles || []
          ),
          scripts: [`/js/${name}.${shortHash(script(name, component))}.js`].concat(
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
                    Object.values(assets).reduce((urls, {scripts}) => urls.concat(scripts), [
                      `/static/react${dev ? '.dev' : ''}.js`,
                      `/static/react-dom${dev ? '.dev' : ''}.js`
                    ])
                  )
                )
              }
            ])
          )
      );
    };
    res.renderPage = (view, {meta, ...props}) => {
      const {login, message} = req;
      if (message) res.clearCookie(messageCookie);
      res.render(['page', view], {meta, view, login, message, props});
    };
    res.logIn = data => res.cookie(sessionCookie, jwt(sessionKey, data));
    res.logOut = () => res.clearCookie(sessionCookie);
    res.error = (message, path) => res.cookie(messageCookie, `e:${message}`);
    res.success = (message, path) => res.cookie(messageCookie, `s:${message}`);

    req.token = req.cookies[sessionCookie];
    if (req.token) {
      const parts = req.token.split('.');
      if (parts.length == 3 && base64Mac(sessionKey, parts[0] + '.' + parts[1]) == parts[2]) {
        // TODO: login exp (iat + ttl)
        req.login = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      }
    }

    const message = req.cookies[messageCookie];
    if (/^[es]:/.test(message)) {
      req.message = {
        type: {e: 'error', s: 'success'}[message[0]],
        text: message.substr(2)
      };
    }

    next();
  });

  router.get('/css/:view.:hash.css', (req, res) => {
    const {view, hash} = req.params;
    let value = (views[view] || {}).styles;
    if (!value) return res.sendStatus(404);
    value = css(value);
    return shortHash(value) == hash
      ? res
          .set({
            'Content-Type': 'text/css',
            'Cache-Control': `max-age=${assetsTTL}`,
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
    return shortHash(value) == hash
      ? res
          .set({
            'Content-Type': 'text/javascript',
            'Cache-Control': `max-age=${assetsTTL}`,
            ETag: hash
          })
          .end(value)
      : res.sendStatus(400);
  });

  router.get('/static/:file', async (req, res) => {
    let {file} = req.params;
    if (!file.match(/^\.\.?(\/|$)/)) {
      file = (await resolveFile(staticDir, file)) || (await resolveFile('static', file));
      if (file) return fs.createReadStream(file).pipe(res.status(200));
    }
    res.sendStatus(404);
  });

  return router;
};
