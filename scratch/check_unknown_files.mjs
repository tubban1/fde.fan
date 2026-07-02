import fs from 'node:fs';
import path from 'node:path';

const dir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/unknown/2026';
const files = fs.readdirSync(dir);

console.log(`Analyzing ${files.length} unknown files:`);
for (const file of files) {
  const fPath = path.join(dir, file);
  const stat = fs.statSync(fPath);
  if (!stat.isFile()) continue;
  
  const content = fs.readFileSync(fPath, 'utf8');
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'No Title';
  
  // Clean tags to show a snippet
  const snippet = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 300)
    .trim();
    
  console.log(`\n----------------------------------------`);
  console.log(`📄 File: ${file} (${stat.size} bytes)`);
  console.log(`Title: "${title}"`);
  console.log(`Snippet: "${snippet}"`);
}
