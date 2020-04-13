exports.component = () => props => {
  return [
    ['h2', 'Login'],
    ['form', {className: 'form', method: 'post'},
      ['label', {className: 'field'},
        ['div', {className: 'label'}, 'Email: '],
        ['input', {type: 'email', name: 'email'}]
      ],
      ['div', {className: 'field'},
        ['div', {className: 'label'}, 'Password: '],
        ['input', {type: 'password', name: 'password'}]
      ],
      ['button', {className: 'button'}, 'Log In']
    ]
  ];
};
