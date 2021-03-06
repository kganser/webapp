const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babel = require('@babel/core');
const React = require('react');
const ReactDOM = require('react-dom/server');
const {css, jsx, base64Mac, base64Url, decodeJwt, hash, jwt, url} = require('./util');

// Patch express to propagate errors from async request handlers
const Layer = require('express/lib/router/layer');
const handle_request = Layer.prototype.handle_request;

Layer.prototype.handle_request = function(req, res, next) {
  if (!this._async && this.method) {
    this._async = true;
    const handle = this.handle;
    this.handle = async function(req, res, next) {
      try {
        return await handle.apply(this, arguments);
      } catch (e) {
        next(e);
      }
    };
  }
  return handle_request.apply(this, arguments);
};

exports.app = express;

const shortHash = string =>
  base64Url(hash(string)).substr(0, 8);

let polyfill = '';
fs.readFile(require.resolve('regenerator-runtime/runtime'), 'utf8', (err, data) => {
  polyfill = data;
});

const site = (React, components, config, jsx, url) => ({
  React,
  config,
  components,
  jsx,
  url,
  init: function(root, component, props) {
    Object.entries(components).forEach(([name, component]) => {
      const render = component(this);
      render.displayName = name;
      components[name] = render;
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

const resolveFile = (dir, file) => new Promise(resolve => {
  const filePath = path.join(dir, file);
  fs.access(filePath, fs.constants.R_OK, error => {
    resolve(!error && filePath);
  });
});

const initComponents = (views, config) => {
  return site(
    React,
    Object.entries(views).reduce((views, [name, view]) => ({...views, [name]: view.component}), {}),
    config,
    jsx,
    url
  ).init().components;
};

exports.initComponents = initComponents;

exports.router = ({
  assetsTTL = 86400,
  config = {},
  views = {},
  loginData,
  sessionKey,
  sessionCookie = 'auth',
  messageCookie = 'message',
  staticDir = 'src/static',
  dev
}) => {
  const script = (name, component) => {
    const code =
      name == 'site'
        ? `${polyfill}\nwindow.Site = (${site})(React, {}, ${JSON.stringify(config)}, ${jsx}, ${url});`
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

  const components = initComponents(views, config);

  const router = express.Router();
  router.use(bodyParser.urlencoded({extended: false}));
  router.use(cookieParser());

  router.use((req, res, next) => {

    if (req.headers['x-forwarded-proto'] == 'http')
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);

    res.render = (view, {meta, ...props}) => {
      const ids = ['site'].concat(view);
      const assets = {};
      const scripts = [];
      ids.forEach(function add(name) {
        if (assets[name]) return;
        if (!views[name]) throw new Error(`View "${name}" not found`);
        const {component, styles, includes = {}, dependencies = []} = views[name];
        assets[name] = {
          styles: (styles ? [`/css/${name}.${shortHash(css(styles))}.css`] : []).concat(
            includes.styles || []
          ),
          scripts: [`/js/${name}.${shortHash(script(name, component))}.js`]
        };
        dependencies.forEach(add);
        (includes.scripts || []).forEach(script => scripts.push(script));
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
                  new Set([
                    ...scripts,
                    ...Object.values(assets).reduce((urls, {scripts}) => urls.concat(scripts), [
                      `/static/react${dev ? '.dev' : ''}.js`,
                      `/static/react-dom${dev ? '.dev' : ''}.js`
                    ])
                  ])
                )
              }
            ])
          )
      );
    };
    res.renderPage = (view, data) => {
      const {token, message} = req;
      const {meta, ...props} = data || {};
      const login = meta.login == false ? false : req.login;
      if (message) res.clearCookie(messageCookie);
      res.render(['page', view], {meta, view, login, token, message, props});
    };
    res.logIn = data => res.cookie(sessionCookie, jwt(sessionKey, data));
    res.logOut = () => res.clearCookie(sessionCookie);
    res.error = (message, path) => res.cookie(messageCookie, `e:${message}`);
    res.success = (message, path) => res.cookie(messageCookie, `s:${message}`);

    req.token = req.cookies[sessionCookie];
    req.login = decodeJwt(sessionKey, req.token);

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
    const filename = req.params.file;
    if (!/^\.\.?(\/|$)/.test(filename)) {
      const file =
        (await resolveFile(staticDir, filename)) || (await resolveFile(`${__dirname}/static`, filename));
      if (file) return fs.createReadStream(file).pipe(res.type(path.extname(filename)).status(200));
    }
    res.sendStatus(404);
  });

  return router;
};
