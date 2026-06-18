const mammoth = require("mammoth");
const fs = require("fs");

async function test() {
  const filePath = "/Users/nghia/Downloads/Vol9/Reading/TEST 1 -R.docx";
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    fs.writeFileSync("output_test.html", result.value);
    console.log("Done");
  } catch(e) {
    console.error(e);
  }
}
test();
