import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const registryPath = 'data/gaokao/source-registry.json';
if (!fs.existsSync(registryPath)) {
  console.error(`Registry file not found: ${registryPath}`);
  process.exit(1);
}

const sources = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const allProvinces = [...new Set(sources.map(s => s.province).filter(Boolean))];

const provinceArg = getArg('provinces'); // e.g. --provinces=广东,广西
const year = Number(getArg('year', '2026'));
const maxItems = Number(getArg('max-items', '3'));
const limitChunks = Number(getArg('limit-chunks', '3'));

const targetProvinces = provinceArg ? provinceArg.split(',') : allProvinces;

console.log(`=== GAOKAO NATIONAL DATA PIPELINE PIPELINE ===`);
console.log(`Provinces to process: ${targetProvinces.join(', ')}`);
console.log(`Crawl Max Items: ${maxItems}, Target Year: ${year}\n`);

for (const prov of targetProvinces) {
  console.log(`\n==================================================`);
  console.log(`🚀 PROCESSING PROVINCE: [${prov}]`);
  console.log(`==================================================`);

  try {
    // 1. Seed sources in database
    console.log(`[1/4] Seeding registry sources for ${prov}...`);
    execSync(`node scripts/gaokao/seed-sources.mjs`, { stdio: 'inherit' });

    // 2. Run Crawler
    console.log(`[2/4] Crawling raw web pages / PDFs...`);
    execSync(`node scripts/gaokao/crawl-official-sources.mjs --provinces=${prov} --max-items=${maxItems} --write-db`, { stdio: 'inherit' });

    // 3. Extract Raw Texts & Chunk
    console.log(`[3/4] Running text extractor (chunking)...`);
    execSync(`node scripts/gaokao/extract-documents.mjs --province=${prov}`, { stdio: 'inherit' });

    // 4. LLM Structuring for Admission Records
    console.log(`[4/4] Invoking LLM Table Parser (admissions)...`);
    execSync(`node scripts/gaokao/parse-national-admissions.mjs --province=${prov} --year=${year} --type=admission_record --limit-chunks=${limitChunks}`, { stdio: 'inherit' });

    // 5. LLM Structuring for Score Rank Segments
    console.log(`[5/4] Invoking LLM Table Parser (score ranks)...`);
    execSync(`node scripts/gaokao/parse-national-admissions.mjs --province=${prov} --year=${year} --type=score_rank --limit-chunks=${limitChunks}`, { stdio: 'inherit' });

    console.log(`🟢 Finished ingestion for [${prov}] successfully!\n`);
  } catch (error) {
    console.error(`🔴 Error processing province [${prov}]:`, error.message);
  }
}

console.log(`🎉 National Data Pipeline processing complete!`);
