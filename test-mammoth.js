const mammoth = require("mammoth");

async function test() {
  try {
    const result = await mammoth.convertToHtml({path: "/Users/nghia/Downloads/TEST 1 -R.docx"});
    const html = result.value;
    console.log("Extracted HTML length:", html.length);
    console.log("First 1000 chars:");
    console.log(html.substring(0, 1000));
    
    // Test the regex
    const parserRegex = /PASSAGE\s+([1-3])/gi;
    const matches = [...html.matchAll(parserRegex)];
    console.log("\nMatches found for PASSAGE X:");
    matches.forEach(m => console.log(m[0], "at index", m.index));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
