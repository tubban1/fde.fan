import { loadLocalEnv } from './lib/env.mjs';
import { withDb } from './lib/db.mjs';

loadLocalEnv();

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const province = getArg('province');
const year = getArg('year');

const filters = ['(min_score is null or min_rank is null)'];
const params = [];

if (province) {
  params.push(province);
  filters.push(`province = $${params.length}`);
}

if (year) {
  params.push(Number(year));
  filters.push(`year = $${params.length}`);
}

await withDb(async pool => {
  const preview = await pool.query(
    `select province, year, count(*)::int as count
       from gaokao_admission_records
      where ${filters.join(' and ')}
      group by province, year
      order by province, year`,
    params
  );

  if (!preview.rows.length) {
    console.log('No invalid admission records found.');
    return;
  }

  console.table(preview.rows);

  const deleted = await pool.query(
    `delete from gaokao_admission_records
      where ${filters.join(' and ')}`,
    params
  );

  console.log(`Deleted ${deleted.rowCount} invalid admission record(s).`);
});
