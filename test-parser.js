const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
global.DOMParser = dom.window.DOMParser;
const html = "<h1>PASSAGE 1</h1><p>Questions 1-5</p><p>TRUE</p><p>PASSAGE 2</p><p>Questions 6-10</p>";

function parseIeltsDocxHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const passages = [];
  let currentPassage = null;
  let currentGroup = null;
  let mode = 'PASSAGE_TEXT';
  const childNodes = Array.from(doc.body.childNodes);
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    const text = node.textContent?.trim() || '';
    if (!text && node.nodeType !== 1) continue;
    const passageMatch = text.match(/PASSAGE\s+([1-3])/i);
    if (passageMatch && text.length < 100 && !text.toLowerCase().includes('according to passage')) {
      if (currentPassage) {
         if (currentGroup) currentPassage.questionGroups.push(currentGroup);
         passages.push(currentPassage);
      }
      currentPassage = { id: parseInt(passageMatch[1]), title: `Passage ${passageMatch[1]}`, startQ: 1, endQ: 40, content: '', questionGroups: [], rawHtml: '' };
      currentGroup = null;
      mode = 'PASSAGE_TEXT';
    }
    if (!currentPassage) continue;
    const qMatch = text.match(/^Questions\s+(\d+)[\s\-–]+(\d+)/i);
    if (qMatch && text.length < 100) {
      mode = 'QUESTIONS';
      if (currentGroup) currentPassage.questionGroups.push(currentGroup);
      currentGroup = { start: parseInt(qMatch[1]), end: parseInt(qMatch[2]), type: 'UNKNOWN', html: '' };
    }
  }
  if (currentPassage) {
    if (currentGroup) currentPassage.questionGroups.push(currentGroup);
    passages.push(currentPassage);
  }
  return passages;
}

console.log(JSON.stringify(parseIeltsDocxHtml(html), null, 2));
