exports.styles = {
  body: {
    font: '15px -apple-system, BlinkMacSystemFont, sans-serif',
    margin: '0 auto 200px',
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
  '.button': {
    display: 'inline-block',
    verticalAlign: 'middle',
    background: '#eee',
    border: 'none',
    padding: '6px 12px',
    marginRight: '10px',
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
      fontSize: 'initial'
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
        fontWeight: 'bold',
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
    login
      ? ['div', 'Welcome, ' + login.name + ' ', ['a', {href: '/logout'}, 'Log Out']]
      : ['div', ['a', {href: '/login'}, 'Log In'], ' or ', ['a', {href: '/register'}, 'Register']],
    message && ['div', {className: `message ${message.type}`}, message.text],
    [components[view], props]
  ];
};