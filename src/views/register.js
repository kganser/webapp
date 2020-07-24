exports.component = ({jsx}) => props => {
  return jsx([
    ['h2', 'Register'],
    ['form', {className: 'form', method: 'post'},
      ['label', {className: 'field'},
        ['div', {className: 'label'}, 'Name:'],
        ['input', {autoFocus: true, name: 'name'}]
      ],
      ['label', {className: 'field'},
        ['div', {className: 'label'}, 'Email:'],
        ['input', {type: 'email', name: 'email'}]
      ],
      ['label', {className: 'field'},
        ['div', {className: 'label'}, 'Password:'],
        ['input', {type: 'password', name: 'password'}]
      ],
      ['button', {className: 'button'}, 'Register']
    ]
  ]);
};
