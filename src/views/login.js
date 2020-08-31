exports.dependencies = ['field'];
exports.component = ({components, jsx}) => props => {
  const {field} = components;
  return jsx([
    ['h2', 'Login'],
    ['form', {method: 'post'},
      [field, {label: 'Email'},
        ['input', {autoFocus: true, type: 'email', name: 'email'}]
      ],
      [field, {label: 'Password'},
        ['input', {type: 'password', name: 'password'}]
      ],
      ['button', {className: 'button'}, 'Log In'],
      ['p',
        ['a', {className: 'button', href: '/register'}, 'Register']
      ]
    ]
  ]);
};
