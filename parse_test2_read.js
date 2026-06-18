const fs = require('fs');
const html = fs.readFileSync('ket2_reading.html', 'utf8');

const json = {};
let currentQuestion = 1;
let foundAnswers = 0;

const listRegex = /<li>(.*?)<\/li>|<p><strong>(\d+)-(\d+)\.\s*<\/strong>(.*?)<\/p>/ig;
let match;
while ((match = listRegex.exec(html)) !== null) {
    if (match[1]) {
        let ans = match[1].replace(/<[^>]+>/g, '').trim();
        json[currentQuestion.toString()] = ans;
        currentQuestion++;
        foundAnswers++;
    } else if (match[2] && match[3] && match[4]) {
        let startQ = parseInt(match[2]);
        let endQ = parseInt(match[3]);
        let ansText = match[4].replace(/<[^>]+>/g, '').trim();
        let parts = ansText.split(',').map(s => s.trim());
        
        if (currentQuestion < startQ) currentQuestion = startQ;

        let idx = 0;
        for (let i = startQ; i <= endQ; i++) {
            json[i.toString()] = parts[idx] || ansText;
            idx++;
            currentQuestion++;
            foundAnswers++;
        }
    }
}
console.log("Found:", foundAnswers);
console.log(json);
