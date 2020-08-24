exports.styles = {
  '.markdown-field': {
    '.toolbar': {
      background: '#f6f6f6',
      padding: '8px 8px 0',
      textAlign: 'right'
    },
    '.tabs': {
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
    '.content': {
      border: 'solid 1px #ddd',
      boxSizing: 'border-box',
    },
    textarea: {
      border: 'none',
      padding: '1em 10px',
      width: '100% !important'
    }
  }
};
exports.includes = {
  styles: ['/static/prosemirror.css'],
  scripts: [
    'https://cdnjs.cloudflare.com/ajax/libs/markdown-it/11.0.0/markdown-it.min.js',
    '/static/prosemirror.js',
    '/static/prosemirror-markdown.js'
  ]
};
exports.component = ({React, jsx}) => props => {
  const {defaultValue, imageUrl, videoUrl, ref, ...rest} = props;

  const editor = React.useRef();
  const [visual, setVisual] = React.useState(true);
  const toggleEditor = React.useCallback(() => setVisual(visual => !visual), []);

  const {createState, serializer} = React.useMemo(() => {
    if (typeof PM == "undefined") return {}; // disabled server-side
    const {schema, defaultParser, defaultSerializer} = PM.markdown;
    const plugins = PM.example_setup.exampleSetup({schema});
    return {
      createState: value => PM.state.EditorState.create({
        doc: defaultParser.parse(value || ''),
        plugins
      }),
      serializer: defaultSerializer,
    };
  }, []);

  const [value, setValue] = React.useState(defaultValue || '');
  const editorRef = React.useCallback(elem => {
    if (editor.current) editor.current.destroy();
    if (elem) {
      const e = editor.current = new PM.view.EditorView(elem, {
        state: createState(value),
        dispatchTransaction: txn => {
          const state = e.state.apply(txn);
          setValue(serializer.serialize(state.doc));
          e.updateState(state);
        }
      });
    } else {
      editor.current = null;
    }
  }, []);

  const onChange = React.useCallback(e => {
    const {value} = e.target;
    if (editor.current)
      editor.current.updateState(createState(value))
    setValue(value);
  }, []);

  return jsx(['div', {className: 'markdown-field'},
    ['div', {className: 'toolbar'},
      ['div', {className: 'tabs'},
        ['button', {
          type: 'button',
          disabled: visual,
          onClick: toggleEditor
        },
          'Visual'
        ],
        ['button', {
          type: 'button',
          disabled: !visual,
          onClick: toggleEditor
        },
          'Markdown'
        ]
      ]
    ],
    ['div', {className: 'content'},
      ['div', {
        style: {display: visual ? 'block' : 'none'},
        ref: editorRef
      }],
      ['textarea', {
        ...rest,
        style: {display: visual ? 'none' : 'block'},
        value,
        onChange
      }]
    ]
  ]);
};
