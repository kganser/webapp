'use strict';

// ::Schema Document schema for the data model used by CommonMark.
var schema = new PM.model.Schema({
  nodes: {
    doc: {
      content: "block+"
    },

    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{tag: "p"}],
      toDOM: function toDOM() { return ["p", 0] }
    },

    blockquote: {
      content: "block+",
      group: "block",
      parseDOM: [{tag: "blockquote"}],
      toDOM: function toDOM() { return ["blockquote", 0] }
    },

    horizontal_rule: {
      group: "block",
      parseDOM: [{tag: "hr"}],
      toDOM: function toDOM() { return ["div", ["hr"]] }
    },

    heading: {
      attrs: {level: {default: 1}},
      content: "(text | image)*",
      group: "block",
      defining: true,
      parseDOM: [{tag: "h1", attrs: {level: 1}},
                 {tag: "h2", attrs: {level: 2}},
                 {tag: "h3", attrs: {level: 3}},
                 {tag: "h4", attrs: {level: 4}},
                 {tag: "h5", attrs: {level: 5}},
                 {tag: "h6", attrs: {level: 6}}],
      toDOM: function toDOM(node) { return ["h" + node.attrs.level, 0] }
    },

    code_block: {
      content: "text*",
      group: "block",
      code: true,
      defining: true,
      marks: "",
      attrs: {params: {default: ""}},
      parseDOM: [{tag: "pre", preserveWhitespace: "full", getAttrs: function (node) { return (
        {params: node.getAttribute("data-params") || ""}
      ); }}],
      toDOM: function toDOM(node) { return ["pre", node.attrs.params ? {"data-params": node.attrs.params} : {}, ["code", 0]] }
    },

    ordered_list: {
      content: "list_item+",
      group: "block",
      attrs: {order: {default: 1}, tight: {default: false}},
      parseDOM: [{tag: "ol", getAttrs: function getAttrs(dom) {
        return {order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1,
                tight: dom.hasAttribute("data-tight")}
      }}],
      toDOM: function toDOM(node) {
        return ["ol", {start: node.attrs.order == 1 ? null : node.attrs.order,
                       "data-tight": node.attrs.tight ? "true" : null}, 0]
      }
    },

    bullet_list: {
      content: "list_item+",
      group: "block",
      attrs: {tight: {default: false}},
      parseDOM: [{tag: "ul", getAttrs: function (dom) { return ({tight: dom.hasAttribute("data-tight")}); }}],
      toDOM: function toDOM(node) { return ["ul", {"data-tight": node.attrs.tight ? "true" : null}, 0] }
    },

    list_item: {
      content: "paragraph block*",
      defining: true,
      parseDOM: [{tag: "li"}],
      toDOM: function toDOM() { return ["li", 0] }
    },

    text: {
      group: "inline"
    },

    image: {
      inline: true,
      attrs: {
        src: {},
        alt: {default: null},
        title: {default: null}
      },
      group: "inline",
      draggable: true,
      parseDOM: [{tag: "img[src]", getAttrs: function getAttrs(dom) {
        return {
          src: dom.getAttribute("src"),
          title: dom.getAttribute("title"),
          alt: dom.getAttribute("alt")
        }
      }}],
      toDOM: function toDOM(node) { return ["img", node.attrs] }
    },

    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{tag: "br"}],
      toDOM: function toDOM() { return ["br"] }
    }
  },

  marks: {
    em: {
      parseDOM: [{tag: "i"}, {tag: "em"},
                 {style: "font-style", getAttrs: function (value) { return value == "italic" && null; }}],
      toDOM: function toDOM() { return ["em"] }
    },

    strong: {
      parseDOM: [{tag: "b"}, {tag: "strong"},
                 {style: "font-weight", getAttrs: function (value) { return /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null; }}],
      toDOM: function toDOM() { return ["strong"] }
    },

    link: {
      attrs: {
        href: {},
        title: {default: null}
      },
      inclusive: false,
      parseDOM: [{tag: "a[href]", getAttrs: function getAttrs(dom) {
        return {href: dom.getAttribute("href"), title: dom.getAttribute("title")}
      }}],
      toDOM: function toDOM(node) { return ["a", node.attrs] }
    },

    code: {
      parseDOM: [{tag: "code"}],
      toDOM: function toDOM() { return ["code"] }
    }
  }
});

function maybeMerge(a, b) {
  if (a.isText && b.isText && PM.model.Mark.sameSet(a.marks, b.marks))
    { return a.withText(a.text + b.text) }
}

// Object used to track the context of a running parse.
var MarkdownParseState = function MarkdownParseState(schema, tokenHandlers) {
  this.schema = schema;
  this.stack = [{type: schema.topNodeType, content: []}];
  this.marks = PM.model.Mark.none;
  this.tokenHandlers = tokenHandlers;
};

MarkdownParseState.prototype.top = function top () {
  return this.stack[this.stack.length - 1]
};

MarkdownParseState.prototype.push = function push (elt) {
  if (this.stack.length) { this.top().content.push(elt); }
};

// : (string)
// Adds the given text to the current position in the document,
// using the current marks as styling.
MarkdownParseState.prototype.addText = function addText (text) {
  if (!text) { return }
  var nodes = this.top().content, last = nodes[nodes.length - 1];
  var node = this.schema.text(text, this.marks), merged;
  if (last && (merged = maybeMerge(last, node))) { nodes[nodes.length - 1] = merged; }
  else { nodes.push(node); }
};

// : (Mark)
// Adds the given mark to the set of active marks.
MarkdownParseState.prototype.openMark = function openMark (mark) {
  this.marks = mark.addToSet(this.marks);
};

// : (Mark)
// Removes the given mark from the set of active marks.
MarkdownParseState.prototype.closeMark = function closeMark (mark) {
  this.marks = mark.removeFromSet(this.marks);
};

MarkdownParseState.prototype.parseTokens = function parseTokens (toks) {
  for (var i = 0; i < toks.length; i++) {
    var tok = toks[i];
    var handler = this.tokenHandlers[tok.type];
    if (!handler)
      { throw new Error("Token type `" + tok.type + "` not supported by Markdown parser") }
    handler(this, tok);
  }
};

// : (NodeType, ?Object, ?[Node]) → ?Node
// Add a node at the current position.
MarkdownParseState.prototype.addNode = function addNode (type, attrs, content) {
  var node = type.createAndFill(attrs, content, this.marks);
  if (!node) { return null }
  this.push(node);
  return node
};

// : (NodeType, ?Object)
// Wrap subsequent content in a node of the given type.
MarkdownParseState.prototype.openNode = function openNode (type, attrs) {
  this.stack.push({type: type, attrs: attrs, content: []});
};

// : () → ?Node
// Close and return the node that is currently on top of the stack.
MarkdownParseState.prototype.closeNode = function closeNode () {
  if (this.marks.length) { this.marks = PM.model.Mark.none; }
  var info = this.stack.pop();
  return this.addNode(info.type, info.attrs, info.content)
};

function attrs(spec, token) {
  if (spec.getAttrs) { return spec.getAttrs(token) }
  // For backwards compatibility when `attrs` is a Function
  else if (spec.attrs instanceof Function) { return spec.attrs(token) }
  else { return spec.attrs }
}

// Code content is represented as a single token with a `content`
// property in Markdown-it.
function noCloseToken(spec, type) {
  return spec.noCloseToken || type == "code_inline" || type == "code_block" || type == "fence"
}

function withoutTrailingNewline(str) {
  return str[str.length - 1] == "\n" ? str.slice(0, str.length - 1) : str
}

function noOp() {}

function tokenHandlers(schema, tokens) {
  var handlers = Object.create(null);
  var loop = function ( type ) {
    var spec = tokens[type];
    if (spec.block) {
      var nodeType = schema.nodeType(spec.block);
      if (noCloseToken(spec, type)) {
        handlers[type] = function (state, tok) {
          state.openNode(nodeType, attrs(spec, tok));
          state.addText(withoutTrailingNewline(tok.content));
          state.closeNode();
        };
      } else {
        handlers[type + "_open"] = function (state, tok) { return state.openNode(nodeType, attrs(spec, tok)); };
        handlers[type + "_close"] = function (state) { return state.closeNode(); };
      }
    } else if (spec.node) {
      var nodeType$1 = schema.nodeType(spec.node);
      handlers[type] = function (state, tok) { return state.addNode(nodeType$1, attrs(spec, tok)); };
    } else if (spec.mark) {
      var markType = schema.marks[spec.mark];
      if (noCloseToken(spec, type)) {
        handlers[type] = function (state, tok) {
          state.openMark(markType.create(attrs(spec, tok)));
          state.addText(withoutTrailingNewline(tok.content));
          state.closeMark(markType);
        };
      } else {
        handlers[type + "_open"] = function (state, tok) { return state.openMark(markType.create(attrs(spec, tok))); };
        handlers[type + "_close"] = function (state) { return state.closeMark(markType); };
      }
    } else if (spec.ignore) {
      if (noCloseToken(spec, type)) {
        handlers[type] = noOp;
      } else {
        handlers[type + '_open'] = noOp;
        handlers[type + '_close'] = noOp;
      }
    } else {
      throw new RangeError("Unrecognized parsing spec " + JSON.stringify(spec))
    }
  };

  for (var type in tokens) loop( type );

  handlers.text = function (state, tok) { return state.addText(tok.content); };
  handlers.inline = function (state, tok) { return state.parseTokens(tok.children); };
  handlers.softbreak = handlers.softbreak || (function (state) { return state.addText("\n"); });

  return handlers
}

// ::- A configuration of a Markdown parser. Such a parser uses
// [markdown-it](https://github.com/markdown-it/markdown-it) to
// tokenize a file, and then runs the custom rules it is given over
// the tokens to create a ProseMirror document tree.
var MarkdownParser = function MarkdownParser(schema, tokenizer, tokens) {
  // :: Object The value of the `tokens` object used to construct
  // this parser. Can be useful to copy and modify to base other
  // parsers on.
  this.tokens = tokens;
  this.schema = schema;
  this.tokenizer = tokenizer;
  this.tokenHandlers = tokenHandlers(schema, tokens);
};

// :: (string) → Node
// Parse a string as [CommonMark](http://commonmark.org/) markup,
// and create a ProseMirror document as prescribed by this parser's
// rules.
MarkdownParser.prototype.parse = function parse (text) {
  var state = new MarkdownParseState(this.schema, this.tokenHandlers), doc;
  state.parseTokens(this.tokenizer.parse(text, {}));
  do { doc = state.closeNode(); } while (state.stack.length)
  return doc
};

// :: MarkdownParser
// A parser parsing unextended [CommonMark](http://commonmark.org/),
// without inline HTML, and producing a document in the basic schema.
var defaultMarkdownParser = new MarkdownParser(schema, markdownit("commonmark", {html: false, linkify: false}), {
  blockquote: {block: "blockquote"},
  paragraph: {block: "paragraph"},
  list_item: {block: "list_item"},
  bullet_list: {block: "bullet_list"},
  ordered_list: {block: "ordered_list", getAttrs: function (tok) { return ({order: +tok.attrGet("start") || 1}); }},
  heading: {block: "heading", getAttrs: function (tok) { return ({level: +tok.tag.slice(1)}); }},
  code_block: {block: "code_block", noCloseToken: true},
  fence: {block: "code_block", getAttrs: function (tok) { return ({params: tok.info || ""}); }, noCloseToken: true},
  hr: {node: "horizontal_rule"},
  image: {node: "image", getAttrs: function (tok) { return ({
    src: tok.attrGet("src"),
    title: tok.attrGet("title") || null,
    alt: tok.children[0] && tok.children[0].content || null
  }); }},
  hardbreak: {node: "hard_break"},

  em: {mark: "em"},
  strong: {mark: "strong"},
  link: {mark: "link", getAttrs: function (tok) { return ({
    href: tok.attrGet("href"),
    title: tok.attrGet("title") || null
  }); }},
  code_inline: {mark: "code", noCloseToken: true}
});

// ::- A specification for serializing a ProseMirror document as
// Markdown/CommonMark text.
var MarkdownSerializer = function MarkdownSerializer(nodes, marks) {
  // :: Object<(MarkdownSerializerState, Node)> The node serializer
  // functions for this serializer.
  this.nodes = nodes;
  // :: Object The mark serializer info.
  this.marks = marks;
};

// :: (Node, ?Object) → string
// Serialize the content of the given node to
// [CommonMark](http://commonmark.org/).
MarkdownSerializer.prototype.serialize = function serialize (content, options) {
  var state = new MarkdownSerializerState(this.nodes, this.marks, options);
  state.renderContent(content);
  return state.out
};

// :: MarkdownSerializer
// A serializer for the [basic schema](#schema).
var defaultMarkdownSerializer = new MarkdownSerializer({
  blockquote: function blockquote(state, node) {
    state.wrapBlock("> ", null, node, function () { return state.renderContent(node); });
  },
  code_block: function code_block(state, node) {
    state.write("```" + (node.attrs.params || "") + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  },
  heading: function heading(state, node) {
    state.write(state.repeat("#", node.attrs.level) + " ");
    state.renderInline(node);
    state.closeBlock(node);
  },
  horizontal_rule: function horizontal_rule(state, node) {
    state.write(node.attrs.markup || "---");
    state.closeBlock(node);
  },
  bullet_list: function bullet_list(state, node) {
    state.renderList(node, "  ", function () { return (node.attrs.bullet || "*") + " "; });
  },
  ordered_list: function ordered_list(state, node) {
    var start = node.attrs.order || 1;
    var maxW = String(start + node.childCount - 1).length;
    var space = state.repeat(" ", maxW + 2);
    state.renderList(node, space, function (i) {
      var nStr = String(start + i);
      return state.repeat(" ", maxW - nStr.length) + nStr + ". "
    });
  },
  list_item: function list_item(state, node) {
    state.renderContent(node);
  },
  paragraph: function paragraph(state, node) {
    state.renderInline(node);
    state.closeBlock(node);
  },

  image: function image(state, node) {
    state.write("![" + state.esc(node.attrs.alt || "") + "](" + state.esc(node.attrs.src) +
                (node.attrs.title ? " " + state.quote(node.attrs.title) : "") + ")");
  },
  hard_break: function hard_break(state, node, parent, index) {
    for (var i = index + 1; i < parent.childCount; i++)
      { if (parent.child(i).type != node.type) {
        state.write("\\\n");
        return
      } }
  },
  text: function text(state, node) {
    state.text(node.text);
  }
}, {
  em: {open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true},
  strong: {open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true},
  link: {
    open: function open(_state, mark, parent, index) {
      return isPlainURL(mark, parent, index, 1) ? "<" : "["
    },
    close: function close(state, mark, parent, index) {
      return isPlainURL(mark, parent, index, -1) ? ">"
        : "](" + state.esc(mark.attrs.href) + (mark.attrs.title ? " " + state.quote(mark.attrs.title) : "") + ")"
    }
  },
  code: {open: function open(_state, _mark, parent, index) { return backticksFor(parent.child(index), -1) },
         close: function close(_state, _mark, parent, index) { return backticksFor(parent.child(index - 1), 1) },
         escape: false}
});

function backticksFor(node, side) {
  var ticks = /`+/g, m, len = 0;
  if (node.isText) { while (m = ticks.exec(node.text)) { len = Math.max(len, m[0].length); } }
  var result = len > 0 && side > 0 ? " `" : "`";
  for (var i = 0; i < len; i++) { result += "`"; }
  if (len > 0 && side < 0) { result += " "; }
  return result
}

function isPlainURL(link, parent, index, side) {
  if (link.attrs.title || !/^\w+:/.test(link.attrs.href)) { return false }
  var content = parent.child(index + (side < 0 ? -1 : 0));
  if (!content.isText || content.text != link.attrs.href || content.marks[content.marks.length - 1] != link) { return false }
  if (index == (side < 0 ? 1 : parent.childCount - 1)) { return true }
  var next = parent.child(index + (side < 0 ? -2 : 1));
  return !link.isInSet(next.marks)
}

// ::- This is an object used to track state and expose
// methods related to markdown serialization. Instances are passed to
// node and mark serialization methods (see `toMarkdown`).
var MarkdownSerializerState = function MarkdownSerializerState(nodes, marks, options) {
  this.nodes = nodes;
  this.marks = marks;
  this.delim = this.out = "";
  this.closed = false;
  this.inTightList = false;
  // :: Object
  // The options passed to the serializer.
  // tightLists:: ?bool
  // Whether to render lists in a tight style. This can be overridden
  // on a node level by specifying a tight attribute on the node.
  // Defaults to false.
  this.options = options || {};
  if (typeof this.options.tightLists == "undefined")
    { this.options.tightLists = false; }
};

MarkdownSerializerState.prototype.flushClose = function flushClose (size) {
  if (this.closed) {
    if (!this.atBlank()) { this.out += "\n"; }
    if (size == null) { size = 2; }
    if (size > 1) {
      var delimMin = this.delim;
      var trim = /\s+$/.exec(delimMin);
      if (trim) { delimMin = delimMin.slice(0, delimMin.length - trim[0].length); }
      for (var i = 1; i < size; i++)
        { this.out += delimMin + "\n"; }
    }
    this.closed = false;
  }
};

// :: (string, ?string, Node, ())
// Render a block, prefixing each line with `delim`, and the first
// line in `firstDelim`. `node` should be the node that is closed at
// the end of the block, and `f` is a function that renders the
// content of the block.
MarkdownSerializerState.prototype.wrapBlock = function wrapBlock (delim, firstDelim, node, f) {
  var old = this.delim;
  this.write(firstDelim || delim);
  this.delim += delim;
  f();
  this.delim = old;
  this.closeBlock(node);
};

MarkdownSerializerState.prototype.atBlank = function atBlank () {
  return /(^|\n)$/.test(this.out)
};

// :: ()
// Ensure the current content ends with a newline.
MarkdownSerializerState.prototype.ensureNewLine = function ensureNewLine () {
  if (!this.atBlank()) { this.out += "\n"; }
};

// :: (?string)
// Prepare the state for writing output (closing closed paragraphs,
// adding delimiters, and so on), and then optionally add content
// (unescaped) to the output.
MarkdownSerializerState.prototype.write = function write (content) {
  this.flushClose();
  if (this.delim && this.atBlank())
    { this.out += this.delim; }
  if (content) { this.out += content; }
};

// :: (Node)
// Close the block for the given node.
MarkdownSerializerState.prototype.closeBlock = function closeBlock (node) {
  this.closed = node;
};

// :: (string, ?bool)
// Add the given text to the document. When escape is not `false`,
// it will be escaped.
MarkdownSerializerState.prototype.text = function text (text$1, escape) {
  var lines = text$1.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var startOfLine = this.atBlank() || this.closed;
    this.write();
    this.out += escape !== false ? this.esc(lines[i], startOfLine) : lines[i];
    if (i != lines.length - 1) { this.out += "\n"; }
  }
};

// :: (Node)
// Render the given node as a block.
MarkdownSerializerState.prototype.render = function render (node, parent, index) {
  if (typeof parent == "number") { throw new Error("!") }
  if (!this.nodes[node.type.name]) { throw new Error("Token type `" + node.type.name + "` not supported by Markdown renderer") }
  this.nodes[node.type.name](this, node, parent, index);
};

// :: (Node)
// Render the contents of `parent` as block nodes.
MarkdownSerializerState.prototype.renderContent = function renderContent (parent) {
    var this$1 = this;

  parent.forEach(function (node, _, i) { return this$1.render(node, parent, i); });
};

// :: (Node)
// Render the contents of `parent` as inline content.
MarkdownSerializerState.prototype.renderInline = function renderInline (parent) {
    var this$1 = this;

  var active = [], trailing = "";
  var progress = function (node, _, index) {
    var marks = node ? node.marks : [];

    // Remove marks from `hard_break` that are the last node inside
    // that mark to prevent parser edge cases with new lines just
    // before closing marks.
    // (FIXME it'd be nice if we had a schema-agnostic way to
    // identify nodes that serialize as hard breaks)
    if (node && node.type.name === "hard_break")
      { marks = marks.filter(function (m) {
        if (index + 1 == parent.childCount) { return false }
        var next = parent.child(index + 1);
        return m.isInSet(next.marks) && (!next.isText || /\S/.test(next.text))
      }); }

    var leading = trailing;
    trailing = "";
    // If whitespace has to be expelled from the node, adjust
    // leading and trailing accordingly.
    if (node && node.isText && marks.some(function (mark) {
      var info = this$1.marks[mark.type.name];
      return info && info.expelEnclosingWhitespace
    })) {
      var ref = /^(\s*)(.*?)(\s*)$/m.exec(node.text);
        var _$1 = ref[0];
        var lead = ref[1];
        var inner$1 = ref[2];
        var trail = ref[3];
      leading += lead;
      trailing = trail;
      if (lead || trail) {
        node = inner$1 ? node.withText(inner$1) : null;
        if (!node) { marks = active; }
      }
    }

    var inner = marks.length && marks[marks.length - 1], noEsc = inner && this$1.marks[inner.type.name].escape === false;
    var len = marks.length - (noEsc ? 1 : 0);

    // Try to reorder 'mixable' marks, such as em and strong, which
    // in Markdown may be opened and closed in different order, so
    // that order of the marks for the token matches the order in
    // active.
    outer: for (var i = 0; i < len; i++) {
      var mark = marks[i];
      if (!this$1.marks[mark.type.name].mixable) { break }
      for (var j = 0; j < active.length; j++) {
        var other = active[j];
        if (!this$1.marks[other.type.name].mixable) { break }
        if (mark.eq(other)) {
          if (i > j)
            { marks = marks.slice(0, j).concat(mark).concat(marks.slice(j, i)).concat(marks.slice(i + 1, len)); }
          else if (j > i)
            { marks = marks.slice(0, i).concat(marks.slice(i + 1, j)).concat(mark).concat(marks.slice(j, len)); }
          continue outer
        }
      }
    }

    // Find the prefix of the mark set that didn't change
    var keep = 0;
    while (keep < Math.min(active.length, len) && marks[keep].eq(active[keep])) { ++keep; }

    // Close the marks that need to be closed
    while (keep < active.length)
      { this$1.text(this$1.markString(active.pop(), false, parent, index), false); }

    // Output any previously expelled trailing whitespace outside the marks
    if (leading) { this$1.text(leading); }

    // Open the marks that need to be opened
    if (node) {
      while (active.length < len) {
        var add = marks[active.length];
        active.push(add);
        this$1.text(this$1.markString(add, true, parent, index), false);
      }

      // Render the node. Special case code marks, since their content
      // may not be escaped.
      if (noEsc && node.isText)
        { this$1.text(this$1.markString(inner, true, parent, index) + node.text +
                  this$1.markString(inner, false, parent, index + 1), false); }
      else
        { this$1.render(node, parent, index); }
    }
  };
  parent.forEach(progress);
  progress(null, null, parent.childCount);
};

// :: (Node, string, (number) → string)
// Render a node's content as a list. `delim` should be the extra
// indentation added to all lines except the first in an item,
// `firstDelim` is a function going from an item index to a
// delimiter for the first line of the item.
MarkdownSerializerState.prototype.renderList = function renderList (node, delim, firstDelim) {
    var this$1 = this;

  if (this.closed && this.closed.type == node.type)
    { this.flushClose(3); }
  else if (this.inTightList)
    { this.flushClose(1); }

  var isTight = typeof node.attrs.tight != "undefined" ? node.attrs.tight : this.options.tightLists;
  var prevTight = this.inTightList;
  this.inTightList = isTight;
  node.forEach(function (child, _, i) {
    if (i && isTight) { this$1.flushClose(1); }
    this$1.wrapBlock(delim, firstDelim(i), node, function () { return this$1.render(child, node, i); });
  });
  this.inTightList = prevTight;
};

// :: (string, ?bool) → string
// Escape the given string so that it can safely appear in Markdown
// content. If `startOfLine` is true, also escape characters that
// has special meaning only at the start of the line.
MarkdownSerializerState.prototype.esc = function esc (str, startOfLine) {
  str = str.replace(/[`*\\~\[\]]/g, "\\$&");
  if (startOfLine) { str = str.replace(/^[:#\-*+]/, "\\$&").replace(/^(\d+)\./, "$1\\."); }
  return str
};

MarkdownSerializerState.prototype.quote = function quote (str) {
  var wrap = str.indexOf('"') == -1 ? '""' : str.indexOf("'") == -1 ? "''" : "()";
  return wrap[0] + str + wrap[1]
};

// :: (string, number) → string
// Repeat the given string `n` times.
MarkdownSerializerState.prototype.repeat = function repeat (str, n) {
  var out = "";
  for (var i = 0; i < n; i++) { out += str; }
  return out
};

// : (Mark, bool, string?) → string
// Get the markdown string for a given opening or closing mark.
MarkdownSerializerState.prototype.markString = function markString (mark, open, parent, index) {
  var info = this.marks[mark.type.name];
  var value = open ? info.open : info.close;
  return typeof value == "string" ? value : value(this, mark, parent, index)
};

// :: (string) → { leading: ?string, trailing: ?string }
// Get leading and trailing whitespace from a string. Values of
// leading or trailing property of the return object will be undefined
// if there is no match.
MarkdownSerializerState.prototype.getEnclosingWhitespace = function getEnclosingWhitespace (text) {
  return {
    leading: (text.match(/^(\s+)/) || [])[0],
    trailing: (text.match(/(\s+)$/) || [])[0]
  }
};

PM.markdown = {
  MarkdownParser: MarkdownParser,
  MarkdownSerializer: MarkdownSerializer,
  MarkdownSerializerState: MarkdownSerializerState,
  defaultParser: defaultMarkdownParser,
  defaultSerializer: defaultMarkdownSerializer,
  schema: schema
};
