import fs from 'node:fs';
import path from 'node:path';

const baseDir = 'data/gaokao/raw';
const keywords = ['计划', '目录', '选科', '要求', '分段', '一段', '一分', '录取', '分校'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.includes('/2026/')) {
        results.push({
          path: filePath,
          size: stat.size
        });
      }
    }
  }
  return results;
}

if (!fs.existsSync(baseDir)) {
  console.log("Base directory not found.");
  process.exit(0);
}

const allFiles = walk(baseDir);
const filtered = allFiles.filter(f => {
  const name = path.basename(f.path);
  return keywords.some(k => name.includes(k)) || f.path.includes('score-rank') || f.path.includes('admissions');
});

console.log(`Found ${filtered.length} filtered raw files for 2026:`);
filtered.forEach(f => {
  console.log(`- ${f.path} (${(f.size / 1024).toFixed(1)} KB)`);
});
