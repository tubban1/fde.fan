import fs from 'node:fs';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/2025/94ed727e3463ffa1.aspx';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log("File length:", content.length);
  // Look for table or tbody tags
  const tableIdx = content.indexOf('<table');
  if (tableIdx !== -1) {
    console.log("Found table tag at index:", tableIdx);
    console.log("Table snippet:\n", content.slice(tableIdx, tableIdx + 2000));
  } else {
    console.log("No table tag found. printing snippet:\n", content.slice(0, 2000));
  }
} else {
  console.log("File not found:", filePath);
}
