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
  '.user': {
    float: 'right',
    textAlign: 'right',
    summary: {
      cursor: 'pointer',
      display: 'inline-block',
      outline: 'none',
      padding: '6px 12px',
      userSelect: 'none',
    },
    ul: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      a: {
        display: 'block',
        padding: '2px 12px',
      }
    }
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
  const {menu} = components;
  return jsx([
    login !== false && ['div', {className: 'user'},
      login
        ? ['details',
            ['summary', login.name],
            ['ul',
              ['li', ['a', {href: '/user'}, 'Account Info']],
              ['li', ['a', {href: '/logout'}, 'Log Out']]
            ],
          ]
        : ['a', {className: 'button', href: '/login'}, 'Log In']
    ],
    ['h1', ['a', {href: '/'}, 'WebApp']],
    message && ['div', {className: `message ${message.type}`}, message.text],
    [components[view], props]
  ]);
};