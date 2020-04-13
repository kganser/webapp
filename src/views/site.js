const serialize = data => JSON.stringify(data).replace(
  /[<\u2028\u2029]/g,
  char => ({'<': '\\u003C', '\u2028': '\\u2028', '\u2029': '\\u2029'}[char])
);

exports.component = ({components}) => ({title, description, styles, scripts, view, props}) => {
  return ['html',
    ['head',
      ['title', title],
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
          __html: `Site.init(${['root', view, props].map(serialize).join()});`
        }
      }]
    ]
  ];
};
