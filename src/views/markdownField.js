exports.styles = {
  '.markdown-field': {
    '.toolbar': {
      background: '#f6f6f6',
      padding: '8px 8px 0',
      textAlign: 'right',
      '&:after': {
        content: '',
        clear: 'both',
        display: 'block'
      }
    },
    '.tabs': {
      float: 'left',
      position: 'relative',
      button: {
        background: 'transparent',
        border: 'solid 1px transparent',
        borderWidth: '1px 1px 0',
        color: 'black',
        cursor: 'pointer',
        font: 'inherit',
        padding: '3px 10px',
        outline: 'none',
        '&:disabled': {
          background: 'white',
          borderColor: '#ddd',
          marginBottom: '-1px',
          paddingBottom: '4px'
        }
      }
    },
    '.icon': {
      background: 'transparent',
      border: 'none',
      color: '#333',
      cursor: 'pointer',
      margin: '-2px 0 0 3px',
      padding: '2px 4px',
      height: '24px',
      width: '24px',
      verticalAlign: 'top',
      '&.section': {
        marginLeft: '15px'
      },
      '&:hover': {
        color: 'black'
      }
    },
    '.content': {
      border: 'solid 1px #ddd',
      boxSizing: 'border-box',
    },
    '.preview': {
      padding: '0 10px'
    },
    textarea: {
      border: 'none',
      resize: 'none',
      width: '100%'
    }
  }
};
exports.dependencies = ['markdown'];
exports.component = ({React, jsx, components}) => props => {
  const {markdown} = components;
  const {defaultValue, imageUrl, videoUrl, ref, ...rest} = props;

  const input = React.useRef();
  const [preview, setPreview] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue || '');
  const onChange = React.useCallback(e => setValue(e.target.value), []);

  const insertInline = React.useCallback((left, right) => {
    const elem = input.current;
    if (!elem) return;
    if (right == null) right = left;
    const start = elem.selectionStart;
    const end = elem.selectionEnd;
    setValue(value.substr(0, start) + left + value.substring(start, end) + right + value.substr(end));
    // elem.setSelectionRange(start + wrapper.length, end + wrapper.length);
  }, [value, input]);
  const insertBlock = React.useCallback((left, right) => {
    const elem = input.current;
    if (!elem) return;
    const start = elem.selectionStart;
    const end = elem.selectionEnd;
    setValue(value + '\n\n' + left + (right || ''));
    //elem.setSelectionRange(start + left.length, start + left.length);
  }, [value, input]);

  return jsx(['div', {className: 'markdown-field'},
    ['div', {className: 'toolbar'},
      ['div', {className: 'tabs'},
        ['button', {
          type: 'button',
          disabled: !preview,
          onClick: () => setPreview(false)
        },
          'Edit'
        ],
        ['button', {
          type: 'button',
          disabled: preview,
          onClick: () => setPreview(true)
        },
          'Preview'
        ]
      ],
      ['button', {
        className: 'icon',
        title: 'Header',
        type: 'button',
        onClick: () => insertBlock('### ')
      },
        ['svg', {viewBox: '0 0 512 512'},
          ['path', {
            fill: 'currentColor',
            d: 'M496 80V48c0-8.837-7.163-16-16-16H320c-8.837 0-16 7.163-16 16v32c0 8.837 7.163 16 16 16h37.621v128H154.379V96H192c8.837 0 16-7.163 16-16V48c0-8.837-7.163-16-16-16H32c-8.837 0-16 7.163-16 16v32c0 8.837 7.163 16 16 16h37.275v320H32c-8.837 0-16 7.163-16 16v32c0 8.837 7.163 16 16 16h160c8.837 0 16-7.163 16-16v-32c0-8.837-7.163-16-16-16h-37.621V288H357.62v128H320c-8.837 0-16 7.163-16 16v32c0 8.837 7.163 16 16 16h160c8.837 0 16-7.163 16-16v-32c0-8.837-7.163-16-16-16h-37.275V96H480c8.837 0 16-7.163 16-16z'
          }]
        ]
      ],
      ['button', {
        className: 'icon',
        title: 'Bold',
        type: 'button',
        onClick: () => insertInline('**')
      },
        ['svg', {viewBox: '0 0 92 92'},
          ['path', {
            fill: 'currentColor',
            d: 'M60.1,44.2c3.7-3.6,6-8.7,6-14.2c0-11-9-20-20-20H25c-2.2,0-4,1.8-4,4v32v32c0,2.2,1.8,4,4,4h26c11,0,20-9,20-20C71,54.3,66.6,47.6,60.1,44.2z M29,18h17.1c6.6,0,12,5.4,12,12s-5.4,12-12,12H29V18z M51,74H29V50h17.1H51c6.6,0,12,5.4,12,12S57.6,74,51,74z'
          }]
        ]
      ],
      ['button', {
        className: 'icon',
        title: 'Italic',
        type: 'button',
        onClick: () => insertInline('_')
      },
        ['svg', {viewBox: '0 0 92 92'},
          ['path', {
            fill: 'currentColor',
            d: 'M50.7,30.6c0.8,0.9,1.1,2.3,0.8,3.5L44.2,72c1.8-0.6,3.9,0.1,4.8,1.8c1.1,1.9,0.4,4.4-1.5,5.4l-2.5,1.4c-1,0.5-2,0.8-3.1,0.8c-1.3,0-2.6-0.4-3.7-1.3c-2-1.5-3-4-2.5-6.5L42.8,37h-1.7c-2.2,0-4-1.8-4-4s1.8-4,4-4h6.6C48.8,29,49.9,29.7,50.7,30.6z M48.9,13.4c-2.6,0-4.7,2.1-4.7,4.7s2.1,4.7,4.7,4.7s4.7-2.1,4.7-4.7S51.4,13.4,48.9,13.4z'
          }]
        ]
      ],
      ['button', {
        className: 'icon section',
        title: 'Code',
        type: 'button',
        onClick: () => insertInline('`')
      },
        ['svg', {viewBox: '0 0 92 92'},
          ['path', {
            fill: 'currentColor',
            d: 'M59,75c-1.1,0-2.1-0.4-2.9-1.2c-1.5-1.6-1.5-4.1,0.1-5.7l23-22.1l-23-22.1c-1.6-1.5-1.6-4.1-0.1-5.7c1.5-1.6,4.1-1.6,5.7-0.1l26,25c0.8,0.8,1.2,1.8,1.2,2.9s-0.4,2.1-1.2,2.9l-26,25C61,74.6,60,75,59,75z M35.9,73.8c1.5-1.6,1.5-4.1-0.1-5.7L12.8,46l23-22.1c1.6-1.5,1.6-4.1,0.1-5.7c-1.5-1.6-4.1-1.6-5.7-0.1l-26,25C3.4,43.9,3,44.9,3,46s0.4,2.1,1.2,2.9l26,25C31,74.6,32,75,33,75C34,75,35.1,74.6,35.9,73.8z'
          }]
        ]
      ],
      ['button', {
        className: 'icon',
        title: 'Link',
        type: 'button',
        onClick: () => insertInline('[](url) ', '')
      },
        ['svg', {viewBox: '0 0 92 92'},
          ['path', {
            fill: 'currentColor',
            d: 'M90.8,63.9L67,40.1c-1.6-1.6-4.1-1.6-5.7,0l-7.8,7.8l-9.4-9.4l7.8-7.8c1.6-1.6,1.6-4.1,0-5.7L28.1,1.2c-1.6-1.6-4.1-1.6-5.7,0L1.2,22.5C0.4,23.2,0,24.2,0,25.3c0,1.1,0.4,2.1,1.2,2.8L25,51.9c0.8,0.8,1.8,1.2,2.8,1.2c1,0,2-0.4,2.8-1.2l7.8-7.8l9.4,9.4l-7.8,7.8c-1.6,1.6-1.6,4.1,0,5.7l23.8,23.8c0.8,0.8,1.8,1.2,2.8,1.2c1.1,0,2.1-0.4,2.8-1.2l21.3-21.3C92.4,68,92.4,65.4,90.8,63.9z M27.8,43.4L9.7,25.3L25.3,9.7l18.1,18.1l-5,5l-3-3c-1.6-1.6-4.1-1.6-5.7,0c-1.6,1.6-1.6,4.1,0,5.7l3,3L27.8,43.4z M66.7,82.3L48.6,64.2l5-5l3,3c0.8,0.8,1.8,1.2,2.8,1.2c1,0,2-0.4,2.8-1.2c1.6-1.6,1.6-4.1,0-5.7l-3-3l5-5l18.1,18.1L66.7,82.3z'
          }]
        ]
      ],
      ['button', {
        className: 'icon',
        title: 'Image',
        type: 'button',
        onClick: () => insertBlock(`<img src="${imageUrl || ''}`, '">')
      },
        ['svg', {viewBox: '0 0 92 92'},
          ['path', {
            fill: 'currentColor',
            d: 'M88,11H4c-2.2,0-4,1.8-4,4v62c0,2.2,1.8,4,4,4h84c2.2,0,4-1.8,4-4V15C92,12.8,90.2,11,88,11z M84,19v33.5l-6.7-5.6c-1.5-1.2-3.6-1.2-5.1,0l-10.8,9L36.3,34.1c-1.5-1.3-3.6-1.3-5.1-0.1L8,52.7V19H84z M8,73V63l25.6-20.7l25.1,21.8c1.5,1.3,3.7,1.3,5.2,0.1l10.8-9L84,63v10H8z M52.1,32.6c0-4,3.3-7.3,7.4-7.3c4.1,0,7.4,3.3,7.4,7.3c0,4-3.3,7.3-7.4,7.3C55.4,39.9,52.1,36.6,52.1,32.6z'
          }]
        ]
      ],
      ['button', {
        className: 'icon',
        title: 'Video',
        type: 'button',
        onClick: () => insertBlock(`<video src="${videoUrl || ''}`, '">')
      },
        ['svg', {viewBox: '0 0 92 92'},
          ['path', {
            fill: 'currentColor',
            d: 'M89.8,21.4c-1.4-0.7-3.2-0.5-4.4,0.4L69,33.9V25c0-2.2-1.4-4-3.6-4H4c-2.2,0-4,1.8-4,4v42c0,2.2,1.8,4,4,4h61.4c2.2,0,3.6-1.8,3.6-4v-8.9l16.4,12.1c0.7,0.5,1.7,0.8,2.5,0.8c0.6,0,1.3-0.1,1.8-0.4c1.4-0.7,2.3-2.1,2.3-3.6V25C92,23.5,91.1,22.1,89.8,21.4z M61,63H8V29h53V63z M84,59L70,48.4v-4.8L84,33V59z'
          }]
        ]
      ]
    ],
    ['div', {className: 'content'},
      preview && [markdown, {className: 'preview', value}],
      ['div', {style: preview ? {display: 'none'} : {}},
        ['textarea', {ref: input, value, onChange, ...rest}]
      ]
    ]
  ]);
};
