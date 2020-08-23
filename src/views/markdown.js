exports.includes = {
  scripts: ['https://cdnjs.cloudflare.com/ajax/libs/markdown-it/11.0.0/markdown-it.min.js']
};
exports.component = ({React, jsx}) => ({className, value}) => {
  const [__html, setHtml] = React.useState();
  React.useEffect(() => setHtml(markdownit("commonmark", {html: false, linkify: false}).render(value || '')), [value]);
  return jsx(['div', {className, dangerouslySetInnerHTML: {__html}}]);
};
