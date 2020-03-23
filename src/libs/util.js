const crypto = require('crypto');

const base64Mac = (key, payload) =>
  base64Url(
    crypto
      .createHmac('sha256', key)
      .update(payload)
      .digest()
  );

const base64Url = buffer =>
  buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

const jwt = (key, data) => {
  const payload =
    'eyJhbGciOiJoczI1NiIsInR5cCI6Imp3dCJ9.' +
    base64Url(Buffer.from(JSON.stringify({...data, iat: Math.floor(Date.now() / 1000)})));
  return payload + '.' + base64Mac(key, payload);
};

const pbkdf2 = (password, salt, iterations) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, 32, 'sha256', (error, key) => {
      if (error) reject(error);
      else resolve('pbkdf2_sha256_' + iterations + '.' + base64Url(salt) + '.' + base64Url(key));
    });
  });

const passwordHash = password => pbkdf2(password, crypto.randomBytes(32), 20000);

const passwordVerify = async (password, hash) => {
  const [spec, salt] = hash.split('.'); // pbkdf2_sha256_20000.[salt].[digest]
  const result = await pbkdf2(password, Buffer.from(salt, 'base64'), +spec.split('_')[2]);
  return result == hash;
};

module.exports = {base64Mac, base64Url, jwt, passwordHash, passwordVerify};
