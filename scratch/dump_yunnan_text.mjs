import fs from 'node:fs';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/unknown/2026/cc1d161bfb1dc0ff.html';
let content = fs.readFileSync(filePath, 'utf8');

// Strip styles and scripts
content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
content = content.replace(/<script[\s\S]*?<\/script>/gi, '');

// Extract links
const links = [];
const linkRegex = /href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
let match;
while ((match = linkRegex.exec(content)) !== null) {
  links.push({ url: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() });
}

// Clean tags and print text
const cleanText = content
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

console.log("=== Text Snippet ===");
console.log(cleanText.slice(0, 1500));

console.log("\n=== Found Links ===");
for (const link of links) {
  if (link.url.includes('http') || link.url.includes('.') || link.url.includes('News')) {
    console.log(`  - [${link.url}] ${link.text}`);
  }
}
