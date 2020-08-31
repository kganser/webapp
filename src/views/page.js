exports.styles = {
  body: {
    font: '16px -apple-system, BlinkMacSystemFont, sans-serif',
    margin: '0 auto',
    padding: '0 10px',
    maxWidth: '900px',
    webkitTextSizeAdjust: 'none'
  },
  'h1, h2, h3, h4': {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: 500
  },
  'h1': {
    fontSize: '30px'
  },
  'h2': {
    fontSize: '24px'
  },
  'h3': {
    fontSize: '20px'
  },
  'h4': {
    fontSize: '18px'
  },
  '.button': {
    display: 'inline-block',
    verticalAlign: 'middle',
    background: '#eee',
    border: 'none',
    padding: '6px 12px',
    font: 'inherit',
    color: 'inherit',
    textDecoration: 'inherit',
    cursor: 'pointer',
    outline: 'none',
    '&:hover': {
      background: '#e0e0e0'
    },
  },
  '.message': {
    margin: '20px 0',
    '&.error, &.success': {
      padding: '5px 10px',
      color: 'white',
      background: '#0b0'
    },
    '&.error': {
      background: '#b00'
    },
  }
};
exports.component = ({components, jsx}) => ({login, message, view, props}) => {
  return jsx([
    ['h1', ['a', {href: '/'}, 'WebApp']],
    view != 'login' && view != 'register' && [
      login && ['p', `Welcome, ${login.name}`],
      ['div', login
        ? ['a', {className: 'button', href: '/logout'}, 'Log Out']
        : ['a', {className: 'button', href: '/login'}, 'Log In']
      ]
    ],
    message && ['div', {className: `message ${message.type}`}, message.text],
    [components[view], props]
  ]);
};