import fs from 'node:fs';
import { withDb } from '../gaokao/lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function rowsFromCsv(filePath) {
  const parsed = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const headers = parsed.shift().map(normalizeKey);
  return { headers, rows: parsed };
}

const table = getArg('table');
const file = getArg('file');
if (!table || !file) {
  throw new Error('Usage: node scripts/worldcup/import-csv.mjs --table=sources|teams|venues|matches|rankings|recent_form|data_gaps --file=data.csv');
}

const { headers, rows } = rowsFromCsv(file);

await withDb(async (pool) => {
  let count = 0;
  let errorCount = 0;
  for (const row of rows) {

    const rowObj = Object.fromEntries(headers.map((key, index) => [key, row[index]?.trim() || null]));
    
    // Rename specific id keys to "id" in rowObj
    if (`${table.slice(0, -1)}_id` in rowObj) {
        rowObj['id'] = rowObj[`${table.slice(0, -1)}_id`];
        delete rowObj[`${table.slice(0, -1)}_id`];
    } else if (table === 'matches' && 'match_id' in rowObj) {
        rowObj['id'] = rowObj['match_id'];
        delete rowObj['match_id'];
    } else if (table === 'recent_form' && 'form_match_id' in rowObj) {
        rowObj['id'] = rowObj['form_match_id'];
        delete rowObj['form_match_id'];
    } else if (table === 'data_gaps' && 'gap_id' in rowObj) {
        rowObj['id'] = rowObj['gap_id'];
        delete rowObj['gap_id'];
    } else if (table === 'rankings' && 'ranking_id' in rowObj) {
        rowObj['id'] = rowObj['ranking_id'];
        delete rowObj['ranking_id'];
    }

    if (table === 'teams' && 'is_host' in rowObj) {
      const hVal = String(rowObj['is_host']).toLowerCase().trim().replace(/"/g, '');
      rowObj['is_host'] = hVal === 'true' || hVal === '1';
    }
    if (table === 'venues' && 'capacity' in rowObj) {
        rowObj['capacity'] = rowObj['capacity'] ? parseInt(rowObj['capacity'], 10) : null;
    }
    if (table === 'venues' && 'latitude' in rowObj) {
        rowObj['latitude'] = rowObj['latitude'] ? parseFloat(rowObj['latitude']) : null;
    }
    if (table === 'venues' && 'longitude' in rowObj) {
        rowObj['longitude'] = rowObj['longitude'] ? parseFloat(rowObj['longitude']) : null;
    }
    if (table === 'matches' && 'season' in rowObj) {
        rowObj['season'] = rowObj['season'] ? parseInt(rowObj['season'], 10) : null;
    }
    if (table === 'matches' && 'home_score_90' in rowObj) {
        rowObj['home_score_90'] = rowObj['home_score_90'] ? parseInt(rowObj['home_score_90'], 10) : null;
    }
    if (table === 'matches' && 'away_score_90' in rowObj) {
        rowObj['away_score_90'] = rowObj['away_score_90'] ? parseInt(rowObj['away_score_90'], 10) : null;
    }

    const columns = Object.keys(rowObj);
    const values = Object.values(rowObj);
    
    // Exclude source_name, source_url, fetched_at from insertion directly into DB 
    // unless they exist in the schema (the user's schema didn't include source_name in tables except worldcup_sources, it uses source_id)
    // Wait, the task says CSV has source_name, source_url, fetched_at. 
    // The schema has source_id. We need to handle this by UPSERTing into worldcup_sources if not sources table.
    let finalColumns = [...columns];
    let finalValues = [...values];
    
    if (table !== 'sources') {
        const sourceNameIdx = columns.indexOf('source_name');
        const sourceUrlIdx = columns.indexOf('source_url');
        const fetchedAtIdx = columns.indexOf('fetched_at');
        
        let sourceId = null;
        if (sourceNameIdx !== -1) {
            const sourceName = values[sourceNameIdx];
            const sourceUrl = sourceUrlIdx !== -1 ? values[sourceUrlIdx] : null;
            const fetchedAt = fetchedAtIdx !== -1 ? values[fetchedAtIdx] : null;
            
            if (sourceName) {
                // Upsert source
                const existRes = await pool.query(
                    `select id from worldcup_sources where source_name = $1 and coalesce(source_url, '') = coalesce($2, '') limit 1`,
                    [sourceName, sourceUrl]
                );
                if (existRes.rows.length > 0) {
                    sourceId = existRes.rows[0].id;
                } else {
                    const newRes = await pool.query(
                        `insert into worldcup_sources (id, source_type, source_name, source_url, fetched_at)
                         values (gen_random_uuid()::text, 'auto', $1, $2, $3)
                         returning id`,
                        [sourceName, sourceUrl, fetchedAt]
                    );
                    sourceId = newRes.rows[0].id;
                }
            }
        }
        
        // Remove source_name, source_url, fetched_at from columns and insert source_id
        finalColumns = finalColumns.filter(c => !['source_name', 'source_url', 'fetched_at'].includes(c));
        finalValues = finalColumns.map(c => rowObj[c]);
        
        // Add source_id
        if (sourceId) {
            finalColumns.push('source_id');
            finalValues.push(sourceId);
        }
    }
    
    const placeholders = finalColumns.map((_, i) => `$${i + 1}`).join(',');
    
    let actualTableName = `worldcup_${table}`;
    if (table === 'rankings') actualTableName = 'worldcup_team_rankings';
    if (table === 'recent_form') actualTableName = 'worldcup_team_form';
    if (table === 'data_gaps') actualTableName = 'worldcup_data_gaps';
    if (table === 'odds_snapshots') actualTableName = 'worldcup_odds_snapshots';
    if (table === 'availability_reports') actualTableName = 'worldcup_availability_reports';

    const query = `insert into ${actualTableName} (${finalColumns.join(',')}) values (${placeholders}) on conflict (id) do nothing`;
    
    try {
        await pool.query(query, finalValues);
        count++;
    } catch(e) {
        console.error(`Error inserting into ${actualTableName}: ${e.message}`, rowObj);
        errorCount++;
    }
  }
  console.log(`Imported ${count} rows into worldcup_${table} (Errors: ${errorCount})`);
  if (errorCount > 0) {
      console.error(`Import failed with ${errorCount} errors.`);
      process.exit(1);
  }
});
