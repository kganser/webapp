exports.dependencies = ['jsonField'];
exports.component = ({React, components, jsx}) => props => {
  const {jsonField} = components;
  const [value, setValue] = React.useState(props.value);
  const ref = React.useRef();

  return jsx(
    [jsonField, {
      ref,
      metadata: true,
      value,
      onChange: (op, path, value) => {
        setValue(ref.current.update(op, path, value));
      },
      onLoad: async (path, last) => {
        // TODO
        console.log('load', path);
        const response = await fetch(path.map(encodeURIComponent).join('/'), {
          headers: {Accept: 'application/json'}
        });
        const data = await response.json();
      },
      onToggle: (path, collapsed) => {
        const item = ref.current.get(path);
        item.collapsed = collapsed;
        setValue({...value});
      }
    }],
  );
};
