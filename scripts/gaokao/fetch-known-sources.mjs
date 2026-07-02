import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { upsertSource, withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeSegment(value) {
  return String(value || 'unknown').replace(/[^\p{Script=Han}\w.-]+/gu, '_').slice(0, 80);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(decodeEntities(href), baseUrl).toString();
  } catch {
    return null;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html, fallback) {
  return stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || fallback);
}

function extractAttachmentLinks(html, baseUrl) {
  const links = [];
  const patterns = [
    /<meta\b[^>]*(?:content|href)=["']([^"']+(?:filename=|showname=|\.pdf|\.xls|\.xlsx|\.csv|\.zip|\.doc|\.docx|\.rar)[^"']*)["'][^>]*>/gi,
    /<a\b[^>]*href=["']([^"']+(?:filename=|showname=|\.pdf|\.xls|\.xlsx|\.csv|\.zip|\.doc|\.docx|\.rar)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      const url = toAbsoluteUrl(match[1], baseUrl);
      if (!url) continue;
      const title = match[2] ? stripHtml(match[2]) : decodeURIComponent(new URL(url).searchParams.get('showname') || path.basename(new URL(url).pathname));
      links.push({ url, title });
    }
  }
  return [...new Map(links.map(link => [link.url, link])).values()];
}

function inferYear(text, fallback) {
  const match = String(text || '').match(/20\d{2}/);
  return match ? Number(match[0]) : fallback || null;
}

function saveRaw({ province, year, url, buffer, contentType }) {
  const hash = sha256(buffer);
  const pathname = new URL(url).pathname;
  let ext = path.extname(pathname).toLowerCase();
  if (!ext || ext === '.jsp') {
    if (contentType.includes('pdf')) ext = '.pdf';
    else if (contentType.includes('zip')) ext = '.zip';
    else if (contentType.includes('excel') || contentType.includes('spreadsheet')) ext = '.xlsx';
    else if (contentType.includes('html')) ext = '.html';
    else ext = '.bin';
  }
  const dir = path.join('data', 'gaokao', 'raw', safeSegment(province), String(year || 'unknown'));
  ensureDir(dir);
  const filePath = path.join(dir, `${hash.slice(0, 16)}${ext}`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buffer);
  return { hash, filePath };
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'fde-fan-gaokao-data-crawler/0.1 (+https://www.fde.fan)',
      'accept': '*/*'
    }
  });
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

const sourcePath = getArg('file', 'data/gaokao/known-public-sources.json');
const knownSources = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

await withDb(async (pool) => {
  let count = 0;
  for (const source of knownSources) {
    const page = await fetchBuffer(source.url);
    if (!page.ok) {
      console.warn(`Skipped ${source.url}: HTTP ${page.status}`);
      continue;
    }
    const pageInfo = saveRaw({
      province: source.province,
      year: source.year,
      url: source.url,
      buffer: page.buffer,
      contentType: page.contentType
    });
    const html = page.contentType.includes('html') ? page.buffer.toString('utf8') : '';
    const sourceId = await upsertSource(pool, {
      ...source,
      title: html ? extractTitle(html, source.title) : source.title,
      file_hash: pageInfo.hash,
      parse_status: 'pending',
      raw_data: {
        ...source,
        local_path: pageInfo.filePath,
        content_type: page.contentType,
        http_status: page.status,
        crawled_by: 'fetch-known-sources'
      }
    });
    count += 1;

    for (const attachment of html ? extractAttachmentLinks(html, source.url) : []) {
      const file = await fetchBuffer(attachment.url);
      if (!file.ok) continue;
      const attachmentYear = inferYear(attachment.title, source.year);
      const fileInfo = saveRaw({
        province: source.province,
        year: attachmentYear,
        url: attachment.url,
        buffer: file.buffer,
        contentType: file.contentType
      });
      await upsertSource(pool, {
        source_type: source.source_type,
        province: source.province,
        year: attachmentYear,
        title: attachment.title,
        publisher: source.publisher,
        url: attachment.url,
        file_url: attachment.url,
        file_hash: fileInfo.hash,
        parse_status: 'pending',
        raw_data: {
          parent_source_id: sourceId,
          parent_url: source.url,
          local_path: fileInfo.filePath,
          content_type: file.contentType,
          http_status: file.status,
          crawled_by: 'fetch-known-sources'
        }
      });
      count += 1;
    }
  }
  console.log(`Fetched and upserted ${count} known source record(s).`);
});
