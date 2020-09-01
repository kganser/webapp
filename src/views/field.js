exports.styles = {
  '.field': {
    display: 'block',
    marginBottom: '20px',
    '.label': {
      display: 'block',
      fontWeight: 500,
      marginBottom: '5px'
    },
    '.hint': {
      color: '#666',
      fontSize: '.8rem'
    },
    'input, select, textarea': {
      font: 'inherit',
      border: 'solid 1px #ddd',
      borderRadius: 0,
      padding: '5px 10px',
      outline: 'none',
      width: '300px',
      maxWidth: '100%',
      boxSizing: 'border-box',
      '&:focus': {
        borderColor: '#bbb'
      }
    },
    'input:-webkit-autofill::first-line': {
      fontSize: '16px'
    },
    'input[type=file]': {
      padding: 0,
      border: 'none'
    },
    'textarea': {
      width: '500px'
    }
  },
};
exports.component = ({React, jsx}) => ({label, hint, children, div}) => {
  return jsx([div ? 'div' : 'label', {className: 'field'},
    label && ['div', {className: 'label'}, label],
    hint && ['div', {className: 'hint'}, hint],
    ...React.Children.toArray(children)
  ]);
};