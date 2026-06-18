const { JSDOM } = require("jsdom");
const dom = new JSDOM(`
  <div id="container">
    <p id="text">The ancient baobabs of Madagascar</p>
  </div>
`);
console.log("JSDOM is working");
