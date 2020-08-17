exports.styles = {
  '.image-embed': {
    maxWidth: '500px',
    img: {
      display: 'block',
      maxWidth: '100%'
    }
  },
  '.video-embed': {
    maxWidth: '500px',
    '> div': {
      paddingTop: '56.25%',
      position: 'relative'
    },
    iframe: {
      position: 'absolute',
      border: 0,
      left: 0,
      top: 0,
      height: '100%',
      width: '100%'
    }
  }
};
exports.component = ({React, jsx}) => ({className, value}) => {

  const tokens = React.useMemo(() => [
    {
      type: 'bold',
      re: /\*\*([^*]*)\*\*/,
      render: match => ['strong', match[1]]
    },
    {
      type: 'italic',
      re: /\b_(.*)_\b/,
      render: match => ['em', match[1]]
    },
    {
      type: 'code',
      re: /`([^`]*)`/,
      render: match => ['code', match[1]]
    },
    {
      type: 'link',
      re: /\[([^\]]*)\]\(([^)]+)\)/,
      render: match => ['a', {href: match[2], target: '_blank'}, match[1]]
    },
    {
      type: 'image',
      re: /<img src="([^"]+)">/,
      block: true,
      render: match => ['p', {className: 'image-embed'}, ['img', {src: match[1]}]]
    },
    {
      type: 'video',
      re: /<video src="([^"]+)">/,
      block: true,
      render: match => ['p', {className: 'video-embed'}, ['div', ['iframe', {src: match[1]}]]]
    },
  ]);
  const renderLines = React.useCallback((chunk) => {
    const blocks = [];
    let spans = [];
    chunk.split('\n').forEach(line => {
      if (line.startsWith('### ')) {
        if (spans.length) {
          blocks.push(['p', ...spans]);
          spans = [];
        }
        blocks.push(['h3', line.substr(4)])
        return;
      }
      if (spans.length) spans.push(['br']);
      while (line) {
        let match;
        let token;
        tokens.forEach(t => {
          const m = line.match(t.re);
          if (m && (!match || m.index < match.index)) {
            match = m;
            token = t;
          }
        });
        if (match) {
          if (match.index) {
            spans.push(line.substr(0, match.index));
          }
          if (token.block) {
            if (spans.length) {
              blocks.push(['p', ...spans]);
              spans = [];
            }
            blocks.push(token.render(match));
          } else {
            spans.push(token.render(match));
          }
          line = line.substr(match.index + match[0].length);
        } else {
          spans.push(line);
          line = '';
        }
      }
    });
    if (spans.length) blocks.push(['p', ...spans]);
    return blocks;
  }, []);
  const renderBlocks = React.useCallback((text) => {
    // header, pre, p
    const blocks = [];
    text.trim().split(/\n\s*\n/).forEach(chunk => {
      if (/^```[\s\S]*```$/.test(chunk)) {
        blocks.push(['pre', chunk.slice(3, -3).trim()]);
      } else {
        renderLines(chunk).forEach(block => {
          blocks.push(block);
        });
      }
    });
    return blocks;
  })

  return jsx(['div', {className}, ...renderBlocks(value || '')]);
};
