exports.component = ({React}) => props => {
  const [count, setCount] = React.useState(0);

  return [
    ['h1', 'Home'],
    ['p', 'Welcome, ' + props.ip],
    ['p', 'You clicked ' + count + ' times.'],
    ['button', {onClick: () => setCount(count + 1)}, 'Click me']
  ];
};
