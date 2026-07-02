import XLSX from 'xlsx';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/2025/6388855130412530367357143.xls';
try {
  const wb = XLSX.readFile(filePath);
  console.log("SheetNames:", wb.SheetNames);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log("Total Rows:", rows.length);
  console.log("First 15 Rows:");
  rows.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
} catch (e) {
  console.error("Error:", e.message);
}
