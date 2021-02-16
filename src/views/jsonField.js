exports.styles = {
  '.json': {
    font: '12px/16px SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
    li: {
      whiteSpace: 'nowrap',
      paddingLeft: '1.2em',
      '&:after': {
        content: '","'
      },
      '&:last-child.last:after': {
        content: 'none'
      }
    },
    button: {
      border: 'solid .1em #ddd',
      borderRadius: '3px',
      background: 'white',
      color: '#808080',
      cursor: 'pointer',
      outline: 'none',
      '&:disabled': {
        color: '#ddd'
      },
      '&:enabled:hover': {
        color: 'white',
        borderColor: 'transparent'
      }
    },
    '.delete, .add': {
      display: 'none',
      verticalAlign: 'bottom',
      width: '1em',
      padding: 0,
      margin: '0 0 .2em .1em',
      font: '1em/.8em sans-serif'
    },
    '.delete': {
      float: 'left',
      margin: '.2em .2em 0 -1.2em',
      '&:hover': {
        background: '#c5201c'
      }
    },
    '.add:hover': {
      background: '#0c0'
    },
    'ul, ol': {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    '.disabled > ul, .disabled > ol': {
      opacity: .5
    },
    'li > .add': {
      margin: '0 -1.7em .2em .7em'
    },
    '&:hover': {
      '&.object, &.array': {
        '> .add': {
          display: 'inline-block'
        }
      }
    },
    'li:hover': {
      '> .object > .add, > .array > .add, > .add, > .delete': {
        display: 'inline-block'
      }
    },
    '.toggle': {
      margin: '0 .65em 0 -1.8em',
      cursor: 'pointer',
      userSelect: 'none',
      '&:before': {
        content: '',
        display: 'inline-block',
        verticalAlign: 'middle',
        height: 0,
        borderStyle: 'solid',
        borderWidth: '.6em .35em 0 .35em',
        borderColor: '#5a5a5a transparent transparent',
        margin: '.2em .25em'
      }
    },
    '&.object, &.array': {
      marginLeft: '1.2em',
      '&.closed': {
        '.toggle:before': {
          borderWidth: '.35em 0 .35em .6em',
          borderColor: 'transparent transparent transparent #5a5a5a',
          margin: '.2em .3em'
        },
        'ul, ol': {
          display: 'inline-block'
        },
        li: {
          display: 'inline',
          paddingLeft: 0,
          '&:last-child:after': {
            content: '",…"'
          },
          '&.last:last-child:after': {
            content: 'none'
          },
        },
        '.object, .array': {
          marginLeft: 0
        }
      }
    },
    '&.object': {
      '&:before': {
        content: '"{"'
      },
      '&:after': {
        content: '"}"'
      }
    },
    '&.array': {
      '&:before': {
        content: '"["'
      },
      '&:after': {
        content: '"]"'
      }
    },
    '&.string': {
      color: '#c5201c',
      whiteSpace: 'pre-wrap',
      '&:before, &:after': {
        content: '"\\\""'
      }
    },
    '.key': {
      color: '#881391',
      whiteSpace: 'pre-wrap',
    },
    '&.number, &.boolean': {
      color: '#1c00cf'
    },
    '&.null': {
      color: '#808080'
    },
    '.next': {
      paddingLeft: '1.2em',
      button: {
        padding: '0 5px',
        fontSize: '11px',
        '&:enabled:hover': {
          background: '#8097bd'
        }
      }
    },
    '.error': {
      font: '12px sans-serif',
      marginLeft: '10px',
      '&:before': {
        content: '"⚠️ "'
      }
    },
    '&.input': {
      position: 'relative',
      display: 'inline-block',
      verticalAlign: 'top',
      padding: '0 1px',
      margin: '-1px -2px',
      border: 'solid 1px #999',
      pre: {
        font: 'inherit',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        padding: 0,
        visibility: 'hidden',
        minWidth: '3px'
      },
      textarea: {
        font: 'inherit',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        padding: '0 1px',
        boxSizing: 'border-box',
        border: 'none',
        outline: 'none',
        resize: 'none'
      }
    }
  }
};
exports.component = ({React, components, jsx}) => React.forwardRef((props, ref) => {

  let [stateValue, setValue] = React.useState(props.defaultValue);
  let [collapsed, setCollapsed] = React.useState(false);
  const [edit, setEdit] = React.useState(); // {key, value}

  const {metadata, onChange, onLoad, onToggle, peek} = props;
  const controlled = props.value !== undefined;
  const value = controlled ? props.value : stateValue;
  const editor = !controlled || !!onChange;

  let data = value;
  let type = typeof data;
  let disabled, loading, error, remaining;

  if (type == 'object') {
    if (metadata && value && typeof value.data == 'object') {
      collapsed = value.collapsed;
      disabled = !!value.disabled;
      loading = !!value.loading;
      error = value.error;
      remaining = value.remaining || false;
      data = value.data;
    }
    type = Array.isArray(data) ? 'array' : data ? type : 'null';
  }
  const object = type == 'object';
  const scalar = !object && type != 'array';
  const items = object ? Object.keys(data).sort() : data;
  const closed = peek || collapsed;

  const addMetadata = value => !value || typeof value != 'object' ? value : {
    data: Array.isArray(value)
      ? value.map(addMetadata)
      : Object.keys(value).reduce((object, key) => ({
          ...object,
          [key]: addMetadata(value[key])
        }), {})
  };

  const get = path => {
    let node = value;
    for (let key of path || []) {
      if (metadata) node = node.data;
      if (!node) return;
      node = node[key];
    }
    return node;
  };

  const update = (operation, path, payload) => {
    if (operation != 'put' && operation != 'insert' && operation != 'delete')
      throw new Error(`Invalid operation: ${operation}`);
    if (metadata && operation != 'delete')
      payload = addMetadata(payload);

    if (!path.length) {
      if (operation != 'put')
        throw new Error(`Path cannot be empty on ${operation}`);
      return payload;
    }

    let parent = get(path.slice(0, -1));
    if (parent && metadata) parent = parent.data;
    if (parent) {
      const key = path[path.length - 1];
      if (operation == 'put') {
        parent[key] = payload;
      } else if (Array.isArray(parent)) {
        if (operation == 'insert') {
          parent.splice(key, 0, payload);
        } else {
          parent.splice(key, 1);
        }
      } else if (operation == 'delete') {
        delete parent[key];
      }
    }

    // spread required to force re-render
    return Array.isArray(value) ? [...value] : {...value};
  };

  React.useImperativeHandle(ref, () => ({get, update}));

  const handleChange = React.useCallback((operation, path, value) => {
    onChange(operation, path, value);
    if (!controlled) setValue(update(operation, path, value));
  }, [controlled, onChange]);

  const keyInput = React.useRef();
  const valueInput = React.useRef();

  React.useEffect(() => {
    if (!edit) return;
    const {key, value} = edit;
    const input = typeof key == 'string' ? keyInput.current : valueInput.current;
    if (input) {
      input.focus();
      if (value) input.select();
    }
  }, [!edit]);

  const insertHandler = (key, value) => () => {
    try {
      JSON.parse(value); // json-escape value if this succeeds
      value = JSON.stringify(value);
    } catch (e) {}
    setEdit({key, value: value || ''});
  };

  const input = (isKey, initialValue) => {
    const current = isKey ? edit.key : edit.value;
    return ['span', {className: 'json input'},
      ['pre', ['span', current], ['br']],
      ['textarea', {
        value: current,
        ref: isKey ? keyInput : valueInput,
        onChange: e => {
          const {value} = e.target;
          setEdit(isKey ? {...edit, key: value} : {...edit, value});
        },
        onKeyDown: e => {
          var esc = e.keyCode == 27,
              move = e.keyCode == 9 || e.keyCode == 13, // tab, enter
              colon = e.keyCode == 186 || e.keyCode == 59 && e.shiftKey;
          if (esc || !isKey && move && !e.shiftKey) { // cancel/submit
            e.preventDefault();
            e.target.blur();
          } else if (isKey && (move || colon)) { // move to value
            e.preventDefault();
            if (valueInput.current) valueInput.current.focus();
          } else if (!isKey && keyInput.current && move && e.shiftKey) { // move to key
            e.preventDefault();
            keyInput.current.focus();
          }
        },
        onBlur: () => {
          let {key, value} = edit;
          setTimeout(() => {
            const neighbor = isKey ? valueInput.current : keyInput.current;
            if (neighbor != document.activeElement) {
              setEdit(undefined);
              if (!value) return;
              try { value = JSON.parse(value); } catch (e) {}
              if (value !== initialValue) {
                const operation = typeof key == 'number' ? 'insert' : 'put';
                const path = initialValue === undefined ? [key] : [];
                handleChange(operation, path, value);
              }
            }
          });
        }
      }]
    ];
  };

  return jsx(edit && scalar ? input(false, data) : ['span', {
    className: 'json ' + type + (collapsed ? ' closed' : '') + (disabled ? ' disabled' : ''),
    onClick: scalar && editor && !disabled ? insertHandler(undefined, data) : undefined
  }].concat(
    scalar ? [
      type == 'string' && peek ? data.replace(/[\r\n]/g, '↵') : String(data),
      // TODO: error message for scalars
    ] : [
      !peek && ['span', {
        className: 'toggle',
        onClick: () => {
          if (onToggle) onToggle([], !collapsed, self);
          if (!metadata) setCollapsed(!collapsed);
        }
      }],
      !editor || !closed && ['button', {
        className: 'add',
        title: object ? 'Add' : 'Insert at index 0',
        disabled: disabled,
        onClick: insertHandler(object ? '' : 0)
      }, '+'],
      [object ? 'ul' : 'ol'].concat(
        (closed ? items.slice(0, 1) : items).map((x, i) => {
          const key = object ? x : i;
          return [
            !!edit && !closed && (object && !i || edit.key === i) && ['li', {key: `edit-${key}`},
              ['button', {className: 'delete', title: 'Cancel'}, '×']
            ].concat(
              object ? [input(true), ': '] : [],
              [input(false)]
            ),
            ['li', {
              key,
              className: i == items.length - 1 ? 'last' : undefined,
              value: object ? undefined : i
            },
              !editor || !closed && ['button', {
                className: 'delete',
                title: 'Delete',
                onClick: onChange && (() => handleChange('delete', [key]))
              }, '×'],
              object && [['span', {className: 'key'}, key], ': '],
              [components.jsonField, {
                value: data[key],
                collapsed,
                metadata,
                peek: closed,
                onChange: onChange && ((operation, path, value) => {
                  handleChange(operation, [key, ...path], value);
                }),
                onLoad: onLoad && ((path, last) => {
                  onLoad([key, ...path], last);
                }),
                onToggle: onToggle && ((path, collapsed) => {
                  onToggle([key, ...path], collapsed);
                })
              }],
              !editor || !object && !closed && ['button', {
                className: 'add',
                title: `Insert at index ${i + 1}`,
                disabled,
                onClick: insertHandler(i + 1)
              }, '+']
            ]
          ];
        }),
        edit && !closed && (edit.key === items.length || !items.length) ? [
          ['li', ['button', {className: 'delete', title: 'Cancel'}, '×']].concat(
            object ? [input(true), ': '] : [],
            [input(false)]
          )
        ] : []
      ),
      !closed && ['div', {className: 'next'},
        remaining && ['button', {
          disabled: loading || disabled,
          onClick: () => {
            const i = items.length - 1;
            if (onLoad) onLoad([], object ? items[i] : i);
            // metadata must be present for this button to appear, so
            // remaining / loading / disabled / error values cannot be managed
            // in state without an onLoad handler (like collapsed can without onToggle)
          }
        }, loading ? 'Loading...' : remaining === true ? 'more' : `${remaining} more`],
        !!error && ['span', {className: 'error'}, String(error)]
      ]
    ]
  ));
});
