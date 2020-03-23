exports.component = () => props => {
  /* eslint-disable prettier/prettier */
  return [
    ['h1', 'Register'],
    ['form', {method: 'post'},
      ['div', {className: 'form-group'},
        ['label', {htmlFor: 'name'}, 'Name: '],
        ['input', {name: 'name', id: 'name', className: 'form-control'}]
      ],
      ['div', {className: 'form-group'},
        ['label', {htmlFor: 'email'}, 'Email: '],
        ['input', {type: 'email', name: 'email', id: 'password', className: 'form-control'}]
      ],
      ['div', {className: 'form-group'},
        ['label', {htmlFor: 'password'}, 'Password: '],
        ['input', {type: 'password', name: 'password', id: 'password', className: 'form-control'}]
      ],
      ['button', {className: 'btn btn-primary'}, 'Register']
    ]
  ];
};
