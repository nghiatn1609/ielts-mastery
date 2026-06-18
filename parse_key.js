const fs = require('fs');

const html = fs.readFileSync('key.html', 'utf8');

const json = {
  answers: {},
  transcripts: {}
};

// 1. Extract Answers
const answerRegex = /<p>Câu số (\d+)(?:-(\d+))?:<\/p><p><strong>(.*?)<\/strong><\/p>/g;
let match;
while ((match = answerRegex.exec(html)) !== null) {
  let startQ = parseInt(match[1]);
  let endQ = match[2] ? parseInt(match[2]) : startQ;
  let ans = match[3].replace(/<[^>]+>/g, '').trim();
  
  if (startQ !== endQ) {
      let parts = ans.split(',').map(s => s.trim());
      let idx = 0;
      for (let i = startQ; i <= endQ; i++) {
          json.answers[i.toString()] = parts[idx] || ans;
          idx++;
      }
  } else {
      json.answers[startQ.toString()] = ans;
  }
}

// 2. Extract Transcripts
const sectionRegex = /<p><strong>Section (\d+)<\/strong><\/p>([\s\S]*?)(?=<p><strong>Section \d+<\/strong><\/p>|That is the end of the listening test)/ig;
while ((match = sectionRegex.exec(html)) !== null) {
  let sec = match[1];
  let content = match[2].trim();
  json.transcripts[sec] = content;
}

fs.writeFileSync('parsed_test1.json', JSON.stringify(json, null, 2));
console.log("Done. Extracted", Object.keys(json.answers).length, "answers and", Object.keys(json.transcripts).length, "transcripts.");
