exports.component = ({React}) => props => {
  const [count, setCount] = React.useState(0);
  const onClick = React.useCallback(() => setCount(count => count + 1), []);

  return [
    ['h2', 'Home'],
    ['p', `You clicked ${count} times.`],
    ['button', {className: 'button', onClick}, 'Click me']
  ];
};
