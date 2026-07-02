import { execSync } from 'node:child_process';
import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

async function getPendingCount(pool) {
  const res = await pool.query(`
    select count(*) as cnt
      from gaokao_source_documents
     where raw_data ? 'local_path' and (parse_status is null or parse_status = 'pending')
  `);
  return parseInt(res.rows[0].cnt, 10);
}

await withDb(async pool => {
  let pending = await getPendingCount(pool);
  console.log(`Initial pending count: ${pending}`);

  while (pending > 0) {
    console.log(`Running batch of 50...`);
    try {
      execSync('node scripts/gaokao/extract-documents.mjs --limit=50', { stdio: 'inherit' });
    } catch (e) {
      console.error(`Batch failed: ${e.message}`);
    }
    
    const newPending = await getPendingCount(pool);
    if (newPending === pending) {
      console.log(`Pending count did not decrease (still ${pending}). Breaking to avoid infinite loop.`);
      break;
    }
    pending = newPending;
    console.log(`Remaining pending: ${pending}`);
  }
  
  console.log('All batches completed.');
});
