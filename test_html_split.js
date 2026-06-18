const fs = require("fs");

function test() {
  const html = fs.readFileSync("output_test.html", "utf-8");
  const regex = /(?:<p>|<p\s+[^>]*>)\s*(?:<(?:strong|b|em|u|span)[^>]*>\s*)*(?:READING\s+)?PASSAGE\s+\d+\s*(?:<\/(?:strong|b|em|u|span)>\s*)*<\/p>/ig;
  
  const matches = html.match(regex);
  console.log("Matches found:", matches);
  
  const blocks = html.split(regex).map(b => b.trim()).filter(b => b.length > 100);
  console.log("Number of blocks:", blocks.length);
  blocks.forEach((b, i) => console.log(`Block ${i} length: ${b.length}`));
}
test();
