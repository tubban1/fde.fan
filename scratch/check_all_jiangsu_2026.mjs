import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import XLSX from 'xlsx';

const dir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/江苏/2026/';
if (!fs.existsSync(dir)) {
  console.log("Jiangsu 2026 folder not found.");
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

function getDocxText(filePath) {
  try {
    // A quick hack using python or a simple word extractor, or we can use node modules
    // Since we have python3 in workspace, we can use docx extractor in python
    const pythonCode = `import docx; doc = docx.Document(r"${filePath}"); print(" ".join([p.text for p in doc.paragraphs[:10]])[:300])`;
    const out = execSync(`python3 -c ${JSON.stringify(pythonCode)}`, { encoding: 'utf8' });
    return out.trim();
  } catch (e) {
    return `Error reading docx: ${e.message}`;
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

function getXlsSheets(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { bookSheets: true });
    return wb.SheetNames.join(', ');
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

const files = fs.readdirSync(dir);
console.log(`Total files in Jiangsu 2026: ${files.length}`);
for (const f of files) {
  const fPath = path.join(dir, f);
  const ext = path.extname(f).toLowerCase();
  let info = '';
  if (ext === '.html' || ext === '.htm') {
    info = `HTML Title: "${getHtmlTitle(fPath)}"`;
  } else if (ext === '.pdf') {
    info = `PDF Intro: "${getPdfFirstPage(fPath)}"`;
  } else if (ext === '.xls' || ext === '.xlsx') {
    info = `XLS Sheets: "${getXlsSheets(fPath)}"`;
  } else if (ext === '.docx') {
    info = `DOCX Intro: "${getDocxText(fPath)}"`;
  } else {
    info = `Size: ${fs.statSync(fPath).size} bytes`;
  }
  console.log(`  - ${f} -> ${info}`);
}
