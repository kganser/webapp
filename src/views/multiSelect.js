exports.styles = {
  '.multiselect': {
    maxWidth: '500px',
    marginBottom: '20px',
    ul: {
      listStyle: 'none',
      margin: '5px 0',
      padding: 0,
      position: 'relative'
    },
    li: {
      input: {
        marginRight: '10px'
      },
      label: {
        display: 'block',
        padding: '5px 0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        '&:hover input + span': {
          background: '#e0e0e0'
        }
      }
    },
    '.selected': {
      padding: '0 6px'
    },
    '.options': {
      maxHeight: '300px',
      border: 'solid 1px #ddd',
      padding: '5px',
      overflowY: 'auto'
    }
  },
};
exports.component = ({React, jsx}) => React.forwardRef(({name, options, selected = []}, ref) => {
  const optionsRef = React.useRef();
  React.useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      const elem = optionsRef.current;
      if (elem) elem.scrollTop = elem.scrollHeight;
    }
  }))

  const remaining = options.filter(({value}) => !selected.includes(value));

  return jsx(['div', {className: 'multiselect'},
    selected.length > 0 && ['ul', {className: 'selected'},
      ...selected.map(
        value => ['li', {key: value},
          ['label',
            ['input', {name, value, type: 'checkbox', defaultChecked: true}],
            options.find(option => option.value == value).label
          ]
        ]
      )
    ],
    (!!remaining.length || !options.length) &&
      ['ul', {ref: optionsRef, className: 'options'},
        ...remaining.map(({label, value, selected}) => ['li', {key: value},
            ['label',
              ['input', {name, value, type: 'checkbox', defaultChecked: !!selected}],
              label
            ]
          ]),
        !options.length && ['label', `No existing ${name}`]
      ]
  ]);
});