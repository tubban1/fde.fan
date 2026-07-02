import XLSX from 'xlsx';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/江苏/2026/2f323946e4ffeb6f.xls';
try {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total Rows in Jiangsu 2f323946e4ffeb6f.xls: ${rows.length}`);
  console.log("First 15 Rows:");
  rows.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
} catch (e) {
  console.error("Failed to read:", e.message);
}
