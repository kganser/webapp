exports.styles = {
  body: {fontFamily: 'sans-serif'}
};
/* eslint-disable prettier/prettier */
exports.component = ({components}) => ({view, props}) => {
  return ['div',
    ['nav',
      ['a', {href: '/'}, 'Home'], ' ',
      ['a', {href: '/about'}, 'About']
    ],
    [components[view], props]
  ];
};