import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { withDb } from './lib/db.mjs';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function textChunks(text, size = 1800, overlap = 180) {
  const clean = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const chunks = [];
  let cursor = 0;
  while (cursor < clean.length) {
    const end = Math.min(clean.length, cursor + size);
    chunks.push(clean.slice(cursor, end));
    if (end === clean.length) break;
    cursor = Math.max(0, end - overlap);
  }
  return chunks.filter(Boolean);
}

function extractPdfText(pdfPath) {
  const script = `
import sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
parts = []
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ''
    if text.strip():
        parts.append(f"\\n\\n--- page {i + 1} ---\\n" + text)
print("\\n".join(parts))
`;
  return execFileSync('python3', ['-c', script, pdfPath], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
}

function extractZip(zipPath, outDir) {
  ensureDir(outDir);
  const script = `
import os
import sys
import zipfile

zip_path, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
with zipfile.ZipFile(zip_path) as zf:
    for index, info in enumerate(zf.infolist(), start=1):
        if info.is_dir():
            continue
        original = info.filename
        ext = os.path.splitext(original)[1].lower()
        if not ext:
            ext = '.bin'
        target = os.path.join(out_dir, f'file_{index:03d}{ext}')
        with zf.open(info) as src, open(target, 'wb') as dst:
            dst.write(src.read())
`;
  execFileSync('python3', ['-c', script, zipPath, outDir], { stdio: 'pipe' });
  return fs.readdirSync(outDir, { recursive: true })
    .map(file => path.join(outDir, file))
    .filter(file => fs.statSync(file).isFile());
}

function extractHtmlText(htmlPath) {
  const script = `
import sys
from html.parser import HTMLParser

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.ignore = False

    def handle_starttag(self, tag, attrs):
        if tag in ['script', 'style']:
            self.ignore = True

    def handle_endtag(self, tag):
        if tag in ['script', 'style']:
            self.ignore = False

    def handle_data(self, data):
        if not self.ignore:
            val = data.strip()
            if val:
                self.result.append(val)

with open(sys.argv[1], 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

parser = HTMLTextExtractor()
parser.feed(html)
print("\\n".join(parser.result))
`;
  return execFileSync('python3', ['-c', script, htmlPath], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
}

function extractWordText(wordPath) {
  return execFileSync('textutil', ['-convert', 'txt', '-stdout', wordPath], {
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024
  });
}

function discoverDocuments(localPath) {
  const ext = path.extname(localPath).toLowerCase();
  if (ext === '.pdf') return [localPath];
  if (['.html', '.htm', '.jsp', '.dhtml', '.aspx', '.shtml'].includes(ext)) return [localPath];
  if (['.doc', '.docx', '.rtf'].includes(ext)) return [localPath];
  if (ext === '.zip') {
    const outDir = path.join('data', 'gaokao', 'extracted', path.basename(localPath, ext));
    return extractZip(localPath, outDir).filter(file => path.extname(file).toLowerCase() === '.pdf');
  }
  return [];
}

async function saveChunks(pool, sourceId, source, docPath, text) {
  const chunks = textChunks(text);
  await pool.query(`delete from gaokao_document_chunks where source_id = $1`, [sourceId]);
  for (let index = 0; index < chunks.length; index += 1) {
    await pool.query(
      `insert into gaokao_document_chunks (source_id, chunk_index, content, metadata)
       values ($1, $2, $3, $4::jsonb)
       on conflict (source_id, chunk_index) do update
         set content = excluded.content, metadata = excluded.metadata`,
      [
        sourceId,
        index,
        chunks[index],
        JSON.stringify({
          title: source.title,
          province: source.province,
          year: source.year,
          local_path: source.local_path,
          document_path: docPath
        })
      ]
    );
  }
  await pool.query(`update gaokao_source_documents set parse_status = 'parsed', updated_at = now() where id = $1`, [sourceId]);
  return chunks.length;
}

const province = getArg('province');
const limit = Number(getArg('limit', 50));

await withDb(async (pool) => {
  const params = [];
  let where = `raw_data ? 'local_path' and (parse_status is null or parse_status = 'pending')`;
  if (province) {
    params.push(province);
    where += ` and province = $${params.length}`;
  }
  params.push(limit);
  const rows = await pool.query(
    `select id, province, year, title, url, file_url, file_hash, raw_data
       from gaokao_source_documents
      where ${where}
      order by fetched_at desc
      limit $${params.length}`,
    params
  );

  let parsedSources = 0;
  let totalChunks = 0;
  for (const row of rows.rows) {
    const localPath = row.raw_data?.local_path;
    if (!localPath || !fs.existsSync(localPath)) continue;
    const docs = discoverDocuments(localPath);
    if (!docs.length) continue;

    let combinedText = '';
    for (const docPath of docs) {
      try {
        const ext = path.extname(docPath).toLowerCase();
        if (ext === '.pdf') {
          combinedText += `\n\n# ${path.basename(docPath)}\n\n${extractPdfText(docPath)}`;
        } else if (['.html', '.htm', '.jsp', '.dhtml', '.aspx', '.shtml'].includes(ext)) {
          combinedText += `\n\n# ${path.basename(docPath)}\n\n${extractHtmlText(docPath)}`;
        } else if (['.doc', '.docx', '.rtf'].includes(ext)) {
          combinedText += `\n\n# ${path.basename(docPath)}\n\n${extractWordText(docPath)}`;
        }
      } catch (error) {
        console.warn(`Failed to extract ${docPath}: ${error.message}`);
      }
    }
    if (!combinedText.trim()) {
      await pool.query(`update gaokao_source_documents set parse_status = 'failed', updated_at = now() where id = $1`, [row.id]);
      continue;
    }
    const chunkCount = await saveChunks(pool, row.id, { ...row, local_path: localPath }, docs.join(';'), combinedText);
    parsedSources += 1;
    totalChunks += chunkCount;
    console.log(`Parsed ${row.title}: ${chunkCount} chunk(s)`);
  }
  console.log(`Parsed ${parsedSources} source(s), wrote ${totalChunks} chunk(s).`);
});
