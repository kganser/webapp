exports.includes = {
  styles: [],
  scripts: []
};
exports.styles = {
  body: {
    fontFamily: 'sans-serif'
  },
  '.field': {
    display: 'block'
  }
};
exports.component = ({components}) => ({login, message, view, props}) => {
  return ['div', {className: 'container'},
    ['h1', ['a', {href: '/'}, 'WebApp']],
    login
      ? ['div', 'Welcome, ' + login.name + ' ', ['a', {href: '/logout'}, 'Log Out']]
      : ['div', ['a', {href: '/login'}, 'Log In'], ' or ', ['a', {href: '/register'}, 'Register']],
    message && ['div', {className: 'alert alert-' + message.type}, message.text],
    [components[view], props]
  ];
};