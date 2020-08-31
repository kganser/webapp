const fetch = require('node-fetch');
const qs = require('querystring');
const {base64Url, sign} = require('./util')

const iso8601 = date => date.toISOString().replace(/\.\d*Z$/, 'Z');
const b64j = data => base64Url(Buffer.from(JSON.stringify(data)));

module.exports = ({accessId, secret}) => {
  const pem = `-----BEGIN PRIVATE KEY-----\n${secret}\n-----END PRIVATE KEY-----\n`;
  let accessToken, exp;
  return {
    uploadParams: ({prefix, redirect, filename, maxSize = 5 * 1024 * 1024 * 1024}) => {
      const key = `${prefix}/${filename || '${filename}'}`;
      const policy = Buffer.from(
        JSON.stringify({
          expiration: new Date(Date.now() + 300000).toISOString(),
          conditions: [{key}, ['content-length-range', 1, maxSize]].concat(
            redirect ? {success_action_redirect: redirect} : []
          )
        })
      ).toString('base64');
      const signature = sign(policy, pem, 'base64');
      return {
        key,
        policy,
        signature,
        redirect,
        accessId,
        maxSize
      };
    },
    url: (method, path, type) => {
      const exp = Math.floor(Date.now() / 1000) + 60;
      const signature = sign(`${method}\n\n${type || ''}\n${exp}\n${path}`, pem, 'base64');
      return (
        `https://storage.googleapis.com${path}?` +
        qs.stringify({
          GoogleAccessId: accessId,
          Expires: exp,
          Signature: signature
        })
      );
    },
    token: async () => {
      if (accessToken && exp > Date.now()) return accessToken;
      const ts = Math.floor(Date.now() / 1000);
      const uri = 'https://www.googleapis.com/oauth2/v4/token';
      const payload =
        b64j({alg: 'RS256', typ: 'JWT'}) +
        '.' +
        b64j({
          iss: accessId,
          scope: 'https://www.googleapis.com/auth/devstorage.read_write',
          aud: uri,
          exp: ts + 3600,
          iat: ts
        });
      const signature = sign(payload, pem, 'base64');
      const response = await fetch(uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: qs.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: `${payload}.${signature}`
        })
      });
      const auth = await response.json().catch(e => null);
      if (!auth || !auth.access_token || !auth.expires_in)
        throw new Error(`Invalid access token response ${JSON.stringify(auth)}`);
      exp = Date.now() + auth.expires_in * 1000;
      accessToken = auth.access_token;
      return accessToken;
    }
  };
};