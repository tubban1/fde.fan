import fs from 'node:fs';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/unknown/2026/cc1d161bfb1dc0ff.html';
const content = fs.readFileSync(filePath, 'utf8');

// Find if there are any <table> tags
const tableMatches = content.match(/<table[\s\S]*?<\/table>/gi);
if (tableMatches) {
  console.log(`Found ${tableMatches.length} table(s).`);
  // Print the first table's first 1500 chars
  console.log("\nFirst table snippet:");
  console.log(tableMatches[0].slice(0, 1500));
} else {
  console.log("No table found.");
  // Print first 2000 chars of body
  const bodyMatch = content.match(/<body[\s\S]*?<\/body>/i);
  if (bodyMatch) {
    console.log("Body snippet:");
    console.log(bodyMatch[0].slice(0, 2000));
  } else {
    console.log("No body. Snippet:");
    console.log(content.slice(0, 2000));
  }
}
