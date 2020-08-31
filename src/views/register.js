exports.dependencies = ['field'];
exports.component = ({jsx, components}) => props => {
  const {field} = components;
  return jsx([
    ['h2', 'Register'],
    ['form', {method: 'post'},
      [field, {label: 'Name'},
        ['input', {autoFocus: true, name: 'name'}]
      ],
      [field, {label: 'Email'},
        ['input', {type: 'email', name: 'email'}]
      ],
      [field, {label: 'Password'},
        ['input', {type: 'password', name: 'password'}]
      ],
      ['button', {className: 'button'}, 'Register']
    ]
  ]);
};
