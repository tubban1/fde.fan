import fs from 'node:fs';
import path from 'node:path';

const rawDir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东';
if (!fs.existsSync(rawDir)) {
  console.log("Shandong folder not found.");
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

const years = ['2025', '2026'];
for (const y of years) {
  const yDir = path.join(rawDir, y);
  if (!fs.existsSync(yDir)) continue;
  console.log(`\nShandong ${y} files:`);
  const files = fs.readdirSync(yDir);
  for (const f of files) {
    const fPath = path.join(yDir, f);
    const ext = path.extname(f).toLowerCase();
    if (ext === '.aspx' || ext === '.html') {
      console.log(`  - ${f} -> Title: "${getHtmlTitle(fPath)}"`);
    } else {
      console.log(`  - ${f} -> Size: ${fs.statSync(fPath).size} bytes`);
    }
  }
}
