exports.styles = {
  body: {fontFamily: 'sans-serif'}
};
exports.component = ({components}) => ({view, props}) => {
  return ['div',
    ['nav',
      ['a', {href: '/'}, 'Home'], ' ',
      ['a', {href: '/about'}, 'About']
    ],
    [components[view], props]
  ];
};