exports.includes = {
  // styles: ['https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css'],
  // scripts: ['https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js'],
  styles: ['/static/bootstrap.min.css'],
  scripts: ['/static/bootstrap.min.js']
};
exports.styles = {
  body: {
    fontFamily: 'sans-serif'
  }
};
/* eslint-disable prettier/prettier */
exports.component = ({components}) => ({login, message, view, props}) => {
  return ['div', {className: 'container'},
    ['nav', {className: 'navbar navbar-expand-lg navbar-light bg-light'},
      ['a', {className: 'navbar-brand', href: '/'}, 'WebApp'],
      ['button', {className: 'navbar-toggler', type: 'button', 'data-toggle': 'collapse', 'data-target': 'navbar-menu'},
        ['span', {className: 'navbar-toggler-icon'}]
      ],
      ['div', {className: 'collapse navbar-collapse', id: 'navbar-menu'},
        ['div', {className: 'navbar-nav'},
          ['a', {className: 'nav-item nav-link', href: '/about'}, 'About']
          ['a', {className: 'nav-item nav-link', href: '/pricing'}, 'Pricing']
        ]
      ]
    ],
    login ? ['div',
      'Welcome, ' + login.name + ' ',
      ['a', {href: '/logout'}, 'Log Out']
    ] : ['div',
      ['a', {href: '/login'}, 'Log In'],
      ' or ',
      ['a', {href: '/register'}, 'Register']
    ],
    message && ['div', {className: 'alert alert-' + message.type}, message.text],
    [components[view], props]
  ];
};