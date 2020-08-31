const fetch = require('node-fetch');
const {hash, hmac} = require('./util');

// http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
const rfc3986 = str =>
  encodeURIComponent(str).replace(
    /[!*'()]/g,
    c =>
      `%${c
        .charCodeAt(0)
        .toString(16)
        .toUpperCase()}`
  );

module.exports = ({key, secret}) => {
  const request = ({
    service,
    region = 'us-east-1',
    method = 'GET',
    path = '/',
    query,
    data
  }) => {
    const time = new Date().toISOString().replace(/-|:|\.\d+/g, '');
    const date = time.substr(0, 8);
    const host = `${service}.${region}.amazonaws.com`;
    const queryString = Object.keys(query)
      .filter(k => query[k] != null)
      .sort()
      .map(k => `${k}=${rfc3986(query[k])}`)
      .join('&');
    const algo = 'AWS4-HMAC-SHA256';
    const scope = [date, region, service, 'aws4_request'].join('/');

    const mac = hmac(
      hmac(hmac(hmac(`AWS4${secret}`, date), region), service),
      'aws4_request'
    );
    const body = hash(data || '', 'hex');
    const digest = hash(
      `${method}\n${path}\n${queryString}\nhost:${host}\nx-amz-date:${time}\n\nhost;x-amz-date\n${body}`,
      'hex'
    );
    const signature = hmac(mac, `${algo}\n${time}\n${scope}\n${digest}`, 'hex');

    return fetch(`https://${host}${path}?${queryString}`, {
      method: method,
      headers: {
        'x-amz-date': time,
        Authorization: `${algo} Credential=${key}/${scope}, SignedHeaders=host;x-amz-date, Signature=${signature}`
      },
      body: data
    });
  }

  const sendEmail = async ({to, subject, message}) => {
    const response = await aws({
      service: 'email',
      query: {
        Action: 'SendEmail',
        'Destination.ToAddresses.member.1': to,
        'Message.Body.Text.Data':
          message +
          '\n\nIf you have any questions, please e-mail us at info@austinmusicacademy.com' +
          '\n\nBest wishes,\nGreater Austin Music Academy',
        'Message.Subject.Data': subject,
        Source: 'noreply@members.austinmusicacademy.com',
        Version: '2010-12-01'
      }
    });
    if (response.status >= 400) {
      const text = await response.text();
      const match = text.match(/<Code>([^<]*)<\/Code>/) || [];
      throw new Error(`Error sending email: ${match[1] || response.status}`);
    }
  };

  return {request, sendEmail};
};