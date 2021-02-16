const crypto = require('crypto');
const React = require('react');

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

const hash = (data, enc, algo) =>
  crypto
    .createHash(algo || 'sha256')
    .update(data)
    .digest(enc);

const hmac = (key, data, enc, algo) =>
  crypto
    .createHmac(algo || 'sha256', key)
    .update(data)
    .digest(enc);

const sign = (data, key, enc, algo) =>
  crypto
    .createSign(algo || 'RSA-SHA256')
    .update(data)
    .sign(key, enc);

const base64Url = buffer =>
  buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

const base64Mac = (key, data, enc, algo) =>
  base64Url(hmac(key, data, enc, algo));

const jwt = (key, data) => {
  const payload =
    'eyJhbGciOiJoczI1NiIsInR5cCI6Imp3dCJ9.' +
    base64Url(Buffer.from(JSON.stringify({...data, iat: Math.floor(Date.now() / 1000)})));
  return `${payload}.${base64Mac(key, payload)}`;
};

const decodeJwt = (key, token) => {
  const parts = (token || '').split('.');
  if (parts.length == 3 && base64Mac(key, `${parts[0]}.${parts[1]}`) == parts[2])
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
};

const pbkdf2 = (password, salt, iterations) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (error, key) => {
      if (error) reject(error);
      else resolve(`pbkdf2_sha256_${iterations}.${base64Url(salt)}.${base64Url(key)}`);
    });
  });

const hashPassword = password => pbkdf2(password, crypto.randomBytes(32), 20000);

const verifyPassword = async (password, hash) => {
  if (!hash) return false;
  const [spec, salt] = hash.split('.'); // pbkdf2_sha256_20000.[salt].[digest]
  const result = await pbkdf2(password, Buffer.from(salt, 'base64'), +spec.split('_')[2]);
  return result == hash;
};

const url = (path, args) => {
  return path.replace(/:[a-z]+/ig, param => {
    const key = param.substr(1);
    const arg = args[key] || '';
    delete args[key];
    return encodeURIComponent(arg);
  }) + ('?' + Object.keys(args).reduce((query, name) => {
    const value = args[name];
    name = encodeURIComponent(name);
    return query.concat(
      value === undefined ? []
        : Array.isArray(value) ? value.map(v => name + '=' + encodeURIComponent(v || ''))
        : [name + (value == null ? '' : '=' + encodeURIComponent(value))]);
  }, []).join('&')).replace(/\?$/, '');
}

module.exports = {
  css,
  jsx,
  base64Mac,
  base64Url,
  decodeJwt,
  hash,
  hmac,
  sign,
  jwt,
  hashPassword,
  verifyPassword,
  url
};
