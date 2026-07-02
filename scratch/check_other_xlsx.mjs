import XLSX from 'xlsx';
import fs from 'node:fs';

const files = [
  '5a1c0ac0a511840b.xls',
  'df81b63d1a78b62a.xls',
  'ebb06553bfe14a60.xls',
  'fc49cfbd12d0d633.xlsx'
];
const dir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/江苏/2026/';

for (const file of files) {
  const filePath = dir + file;
  if (!fs.existsSync(filePath)) continue;
  try {
    const wb = XLSX.readFile(filePath);
    console.log(`\n=== File: ${file} ===`);
    console.log("Sheet names:", wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total Rows: ${rows.length}`);
    rows.slice(0, 10).forEach((row, i) => {
      console.log(`  Row ${i}:`, row);
    });
  } catch (e) {
    console.log(`Error reading ${file}: ${e.message}`);
  }
}
