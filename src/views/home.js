exports.component = ({React}) => props => {
  const [count, setCount] = React.useState(0);
  const onClick = React.useCallback(() => setCount(count => count + 1), []);

  return [
    ['h1', 'Home'],
    ['p', `Welcome, ${props.ip}`],
    ['p', `You clicked ${count} times.`],
    ['button', {className: 'button', onClick}, 'Click me']
  ];
};
