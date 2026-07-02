import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb, upsertSource } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

const rawDir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw';
const unknownDir = path.join(rawDir, 'unknown', '2026');

if (!fs.existsSync(unknownDir)) {
  console.log(`Directory ${unknownDir} does not exist!`);
  process.exit(1);
}

// 11 files mapping
const fileMapping = {
  '16110ea8245a3762.jsp': { province: null, publisher: '阳光高考', type: 'official_policy' },
  '659aecc6d4f88d22.html': { province: null, publisher: '阳光高考', type: 'official_policy' },
  '81c964ab4c1dd43b.html': { province: '湖北', publisher: '湖北省教育考试院', type: 'official_policy' },
  '85c164c771119d7b.html': { province: null, publisher: '阳光高考', type: 'official_policy' },
  '8f783e1c0ada7c1f.dhtml': { province: '福建', publisher: '阳光高考', type: 'other' },
  'cc1d161bfb1dc0ff.html': { province: '云南', publisher: '云南省招生考试院', type: 'official_policy' },
  'cc3c37e2348c1d9f.html': { province: '江苏', publisher: '江苏省教育考试院', type: 'official_policy', isExisting: true, id: 'd0802270-f172-4567-bc26-79160aa4ef25' },
  'cd1bc4b120ed5f55.html': { province: null, publisher: '阳光高考', type: 'official_policy' },
  'db4563850c046e2c.html': { province: '云南', publisher: '云南省招生考试院', type: 'official_policy', isExisting: true, id: '21b9661a-1310-4e1a-8e1c-9ade8cc62281' },
  'ebb790e8c79b971f.html': { province: null, publisher: '阳光高考', type: 'official_policy' },
  'f093a291ee15345c.html': { province: null, publisher: '阳光高考', type: 'official_policy' }
};

function getHtmlTitle(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const match = html.match(/<title>([\s\S]*?)<\/title>/i);
    return match ? match[1].trim() : 'Untitled Document';
  } catch {
    return 'Untitled Document';
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

await withDb(async pool => {
  const files = fs.readdirSync(unknownDir);
  console.log(`Processing ${files.length} files...`);

  for (const file of files) {
    const info = fileMapping[file];
    if (!info) {
      console.log(`⚠️ Unrecognized file in directory: ${file}`);
      continue;
    }

    const srcPath = path.join(unknownDir, file);
    const title = getHtmlTitle(srcPath);
    
    // Determine new destination path
    const destProvinceSegment = info.province || '全国';
    const destDir = path.join(rawDir, destProvinceSegment, '2026');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, file);
    
    // Read buffer for hash calculation
    const buffer = fs.readFileSync(srcPath);
    const hash = sha256(buffer);
    
    // Calculate database relative path (relative to fde.fan workspace root for consistency)
    const dbLocalPath = `data/gaokao/raw/${destProvinceSegment}/2026/${file}`;

    console.log(`\n----------------------------------------`);
    console.log(`Processing File: ${file}`);
    console.log(`  Title: "${title}"`);
    console.log(`  Province: ${info.province || '全国 (null)'}`);
    console.log(`  Dest Path: ${dbLocalPath}`);

    // Check if file is already existing in DB
    if (info.isExisting) {
      console.log(`  🔄 Existing document. Updating local_path in database (ID: ${info.id})...`);
      // Update raw_data local_path
      const res = await pool.query(
        `select raw_data from gaokao_source_documents where id = $1`,
        [info.id]
      );
      if (res.rows.length > 0) {
        const rawData = res.rows[0].raw_data || {};
        rawData.local_path = dbLocalPath;
        rawData.updated_by = 'manual-reorganize';
        await pool.query(
          `update gaokao_source_documents 
              set raw_data = $1::jsonb, 
                  parse_status = 'pending',
                  updated_at = now() 
            where id = $2`,
          [JSON.stringify(rawData), info.id]
        );
        console.log(`  ✅ DB updated successfully.`);
      } else {
        console.log(`  ❌ Error: ID ${info.id} not found in database!`);
      }
    } else {
      console.log(`  🆕 New document. Inserting into database...`);
      const docRecord = {
        source_type: info.type,
        province: info.province,
        year: 2026,
        title: title,
        publisher: info.publisher,
        url: `https://gaokao.chsi.com.cn/local/unknown/2026/${file}`,
        file_url: null,
        file_hash: hash,
        parse_status: 'pending',
        raw_data: {
          local_path: dbLocalPath,
          crawled_by: 'manual-ingest-unknown',
          ingested_at: new Date().toISOString()
        }
      };
      const newId = await upsertSource(pool, docRecord);
      console.log(`  ✅ DB inserted successfully. ID: ${newId}`);
    }

    // Move the physical file
    fs.renameSync(srcPath, destPath);
    console.log(`  📁 Moved physical file to ${destPath}`);
  }

  // Cleanup unknown/2026 if empty
  const remaining = fs.readdirSync(unknownDir);
  if (remaining.length === 0) {
    fs.rmdirSync(unknownDir);
    console.log(`\n🧹 Cleaned up empty unknown/2026 directory.`);
  } else {
    console.log(`\n⚠️ Directory not empty, remaining files:`, remaining);
  }
});
