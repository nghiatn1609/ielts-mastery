const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function readDocxToFile(docxPath, outPath) {
    try {
        const result = await mammoth.extractRawText({path: docxPath});
        fs.writeFileSync(outPath, result.value, 'utf8');
        console.log(`Saved ${docxPath} to ${outPath}`);
    } catch (e) {
        console.error("Error reading " + docxPath, e);
    }
}

async function main() {
    await readDocxToFile("/Users/nghia/Downloads/Vol9/Reading/TEST 1 -R.docx", "test1_reading.txt");
    await readDocxToFile("/Users/nghia/Downloads/Vol9/Key/KEY TEST 1-R.docx", "test1_key.txt");
    await readDocxToFile("/Users/nghia/Downloads/Vol9/Reading/TEST 2-R.docx", "test2_reading.txt");
    await readDocxToFile("/Users/nghia/Downloads/Vol9/Key/KET TEST 2-R.docx", "test2_key.txt");
}

main();
