import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const dir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/浙江/2026/';
if (!fs.existsSync(dir)) {
  console.log("Zhejiang 2026 folder not found.");
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

function getPdfFirstPage(filePath) {
  try {
    const pythonCode = `import sys; from pypdf import PdfReader; reader = PdfReader(sys.argv[1]); print(reader.pages[0].extract_text()[:300].replace('\\n', ' '))`;
    const out = execSync(`python3 -c ${JSON.stringify(pythonCode)} ${JSON.stringify(filePath)}`, { encoding: 'utf8' });
    return out.trim();
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

const files = fs.readdirSync(dir);
console.log(`Zhejiang 2026 files (${files.length}):`);
for (const f of files) {
  const fPath = path.join(dir, f);
  const ext = path.extname(f).toLowerCase();
  let info = '';
  if (ext === '.html' || ext === '.htm') {
    info = `HTML: "${getHtmlTitle(fPath)}"`;
  } else if (ext === '.pdf') {
    info = `PDF: "${getPdfFirstPage(fPath)}"`;
  } else {
    info = `Size: ${fs.statSync(fPath).size} bytes`;
  }
  console.log(`  - ${f} -> ${info}`);
}
