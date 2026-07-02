import fs from 'node:fs';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/unknown/2026/cc1d161bfb1dc0ff.html';
const content = fs.readFileSync(filePath, 'utf8');

// Look for article content divs
const divRegex = /<div[^>]+class=["']([^"']*(?:content|article|body|text|news)[^"']*)["'][^>]*>([\s\S]*?)<\/div>/gi;
let match;
console.log("=== Matching div classes and content lengths ===");
while ((match = divRegex.exec(content)) !== null) {
  const className = match[1];
  const innerHtml = match[2];
  console.log(`Class: "${className}" | HTML Length: ${innerHtml.length}`);
  
  // If it's a good class, dump first 300 chars of content
  if (innerHtml.length > 50) {
    const text = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    console.log(`  Snippet: "${text}"`);
  }
}

console.log("\n=== Checking all links (including relative ones) ===");
const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
while ((match = linkRegex.exec(content)) !== null) {
  const url = match[1];
  const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (url.includes('.pdf') || url.includes('.xls') || url.includes('.xlsx') || url.includes('ynzs') || url.includes('ynzk')) {
    console.log(`  - [${url}] -> ${text}`);
  }
}
