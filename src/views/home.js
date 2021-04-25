exports.component = ({React, jsx}) => props => {
  return jsx([
    ['ul', {className: 'nav'},
      ['li', ['a', {href: '/users'}, 'Users']],
      ['li', ['a', {href: '/db'}, 'Database']]
    ]
  ]);
};
