exports.includes = {
  scripts: [
    '//unpkg.com/react@16/umd/react.development.js',
    '//unpkg.com/react-dom@16/umd/react-dom.development.js',
  ]
};
exports.component = ({components}) => ({title, description, styles, scripts, view, props}) => {
  return ['html',
    ['head',
      ['title', title],
      // TODO: arbitrary meta tags
      ['meta', {charSet: 'utf-8'}],
      ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1.0, user-scalable=no'}],
      ['meta', {name: 'description', content: description}],
      ...styles.map(href => ['link', {rel: 'stylesheet', href}])
    ],
    ['body',
      ['div', {id: 'root'},
        [components[view], props]
      ],
      ...scripts.map(src => ['script', {src}]),
      ['script', {
        dangerouslySetInnerHTML: {
          __html: 'Site.init(' + ['root', view, props].map(JSON.stringify).join() + ');'
        }
      }]
    ]
  ];
};