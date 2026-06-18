const { JSDOM } = require("jsdom");
const dom = new JSDOM(`
  <div id="container">
    <p id="text">The ancient baobabs of Madagascar</p>
  </div>
`);
const document = dom.window.document;
const Node = dom.window.Node;

const p = document.getElementById("text");
const textNode = p.firstChild;

// Select "ancient" (4 to 11)
let range = document.createRange();
range.setStart(textNode, 4);
range.setEnd(textNode, 11);

const wrapTextNode = (node, range, spanAttrs) => {
    let start = 0;
    let end = node.nodeValue?.length ?? 0;
    if (node === range.startContainer) start = range.startOffset;
    if (node === range.endContainer) end = range.endOffset;
    if (start >= end) return;

    const text = node.nodeValue || '';
    const span = document.createElement('span');
    span.setAttribute('style', spanAttrs.style);
    span.className = spanAttrs.className;
    span.setAttribute('data-fmt', spanAttrs.dataAttr);
    span.appendChild(document.createTextNode(text.substring(start, end)));

    const parent = node.parentNode;
    parent.insertBefore(document.createTextNode(text.substring(0, start)), node);
    parent.insertBefore(span, node);
    parent.insertBefore(document.createTextNode(text.substring(end)), node);
    parent.removeChild(node);
};

wrapTextNode(textNode, range, {
  style: 'font-weight: 700 !important; color: inherit !important;',
  className: 'custom-bold',
  dataAttr: 'bold',
});

console.log("After BOLD:", document.getElementById("container").innerHTML);

// Now select inside the bold to highlight
const boldSpan = p.childNodes[1]; // Should be the span
const boldTextNode = boldSpan.firstChild;

let range2 = document.createRange();
range2.setStart(boldTextNode, 1);
range2.setEnd(boldTextNode, 6);

wrapTextNode(boldTextNode, range2, {
  style: 'background-color: yellow !important; border-radius: 2px; color: inherit !important;',
  className: 'custom-hl',
  dataAttr: 'highlight',
});

console.log("After HIGHLIGHT:", document.getElementById("container").innerHTML);
