import fs from 'node:fs';
import path from 'node:path';

const dir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/江苏/2025/';
if (!fs.existsSync(dir)) {
  console.log("Jiangsu 2025 folder not found.");
  process.exit(1);
}

function getHtmlTitle(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1].trim() : 'No Title';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

const files = fs.readdirSync(dir);
console.log(`Jiangsu 2025 files (${files.length}):`);
for (const f of files) {
  const fPath = path.join(dir, f);
  const ext = path.extname(f).toLowerCase();
  if (ext === '.html' || ext === '.htm') {
    console.log(`  - ${f} -> Title: "${getHtmlTitle(fPath)}"`);
  } else {
    console.log(`  - ${f} -> Size: ${fs.statSync(fPath).size} bytes`);
  }
}
