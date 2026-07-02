import XLSX from 'xlsx';

const files = [
  '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/2024/6385492724297110442689837.xls',
  '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/2025/6388646133710894671069456.xls'
];

for (const file of files) {
  console.log(`\nInspecting ${file}:`);
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log("First 10 rows:");
  console.log(rows.slice(0, 10).map((r, i) => `Row ${i}: ${JSON.stringify(r)}`).join('\n'));
}
