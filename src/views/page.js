exports.styles = {
  body: {
    font: '16px -apple-system, BlinkMacSystemFont, sans-serif',
    margin: '0 auto',
    padding: '0 10px',
    maxWidth: '900px',
    webkitTextSizeAdjust: 'none'
  },
  'ul, ol': {
    listStyle: 'none',
    padding: 0
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
  p: {
    lineHeight: 1.5
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
  },
  '.form': {
    'input, select, textarea': {
      font: 'inherit',
      border: 'solid 1px #ddd',
      borderRadius: 0,
      padding: '5px 10px',
      outline: 'none',
      width: '300px',
      maxWidth: '100%',
      boxSizing: 'border-box',
      '&:focus': {
        borderColor: '#bbb'
      }
    },
    'input:-webkit-autofill::first-line': {
      fontSize: '16px'
    },
    'input[type=file]': {
      padding: 0,
      border: 'none'
    },
    'textarea': {
      width: '500px',
    },
    '.field': {
      display: 'block',
      marginBottom: '20px',
      '.label': {
        display: 'block',
        fontWeight: 500,
        marginBottom: '5px'
      }
    }
  },
  '.hidden': {
    display: 'none !important'
  }
};
exports.component = ({components}) => ({login, message, view, props}) => {
  return [
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
  ];
};