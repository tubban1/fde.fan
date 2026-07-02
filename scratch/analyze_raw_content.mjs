import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import XLSX from 'xlsx';

const rawDir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw';
const targets = ['浙江', '山东', '江苏', '安徽'];

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

function getXlsSheets(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { bookSheets: true });
    return wb.SheetNames.join(', ');
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

for (const province of targets) {
  const pDir = path.join(rawDir, province);
  if (!fs.existsSync(pDir)) continue;
  console.log(`\n========================================`);
  console.log(`📂 PROVINCE: ${province}`);
  console.log(`========================================`);
  
  const years = fs.readdirSync(pDir).filter(y => fs.statSync(path.join(pDir, y)).isDirectory());
  for (const y of years) {
    const yDir = path.join(pDir, y);
    const files = fs.readdirSync(yDir);
    console.log(`\n📅 Year: ${y} (${files.length} files)`);
    for (const f of files) {
      const fPath = path.join(yDir, f);
      const ext = path.extname(f).toLowerCase();
      let info = '';
      if (ext === '.html' || ext === '.htm' || ext === '.jsp' || ext === '.aspx') {
        info = `HTML Title: "${getHtmlTitle(fPath)}"`;
      } else if (ext === '.pdf') {
        info = `PDF Intro: "${getPdfFirstPage(fPath)}"`;
      } else if (ext === '.xls' || ext === '.xlsx') {
        info = `XLS Sheets: "${getXlsSheets(fPath)}"`;
      } else {
        info = `Size: ${fs.statSync(fPath).size} bytes`;
      }
      console.log(`  - ${f} -> ${info}`);
    }
  }
}
