import fs from 'node:fs';

const filePath = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/2025/94ed727e3463ffa1.aspx';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find all links (href)
  const matches = content.match(/href="([^"]+)"/gi) || [];
  console.log("Found links in href:", matches);
  
  // Find all file extensions like .xls, .xlsx, .pdf, .zip in general text
  const fileMatches = content.match(/["']([^"']+\.(?:xls|xlsx|pdf|zip|doc|docx|rar)(?:\?[^"']*)?)["']/gi) || [];
  console.log("Found download links:", fileMatches);

  // Search for div with class content or newsInfo
  const textIdx = content.indexOf('id="NewsContent"');
  if (textIdx !== -1) {
    console.log("NewsContent div snippet:\n", content.slice(textIdx, textIdx + 1500));
  } else {
    // Print middle text
    console.log("Middle text:\n", content.slice(10000, 13000));
  }
} else {
  console.log("File not found");
}
