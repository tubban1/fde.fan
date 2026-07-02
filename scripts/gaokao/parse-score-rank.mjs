import { withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function parseRows(text) {
  const byScore = new Map();
  const cumulativeOnly = [];
  function addRow(row) {
    const existing = byScore.get(row.score);
    if (!existing || Number(row.cumulative_count) > Number(existing.cumulative_count)) {
      byScore.set(row.score, row);
    }
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    let match = trimmed.match(/^(\d{3})(?:分以上)?\s+(\d+)\s+(\d+)$/);
    if (match) {
      const score = Number(match[1]);
      const same = Number(match[2]);
      const cumulative = Number(match[3]);
      addRow({
        score,
        same_score_count: same,
        cumulative_count: cumulative,
        min_rank: cumulative - same + 1,
        max_rank: cumulative
      });
      continue;
    }

    match = trimmed.match(/^(\d{3})分\s+(\d+)$/);
    if (match) {
      cumulativeOnly.push({
        score: Number(match[1]),
        cumulative_count: Number(match[2])
      });
      continue;
    }

    match = trimmed.match(/^(\d{3})[↑+]\s+(\d+)$/);
    if (match) {
      const score = Number(match[1]);
      const cumulative = Number(match[2]);
      addRow({
        score,
        same_score_count: cumulative,
        cumulative_count: cumulative,
        min_rank: 1,
        max_rank: cumulative
      });
    }
  }

  const sortedCumulativeOnly = cumulativeOnly.sort((a, b) => b.score - a.score);
  for (let index = 0; index < sortedCumulativeOnly.length; index += 1) {
    const row = sortedCumulativeOnly[index];
    const previousCumulative = sortedCumulativeOnly[index - 1]?.cumulative_count || 0;
    const same = Math.max(0, row.cumulative_count - previousCumulative);
    addRow({
      score: row.score,
      same_score_count: same,
      cumulative_count: row.cumulative_count,
      min_rank: row.cumulative_count - same + 1,
      max_rank: row.cumulative_count
    });
  }
  return [...byScore.values()].sort((a, b) => b.score - a.score);
}

const province = getArg('province', '浙江');
const year = Number(getArg('year', '2026'));
const candidateTrack = getArg('candidate-track', '综合改革');
const subjectCombo = getArg('subject-combo', '不限');
const titleLike = getArg('title-like', '%成绩分数段表%');

await withDb(async (pool) => {
  const sourceRows = await pool.query(
    `select s.id, string_agg(c.content, E'\n' order by c.chunk_index) as content
      from gaokao_source_documents s
      join gaokao_document_chunks c on c.source_id = s.id
      where s.province = $1 and s.year = $2 and s.title like $3
      group by s.id
      order by max(s.fetched_at) desc
      limit 1`,
    [province, year, titleLike]
  );
  if (!sourceRows.rows.length) {
    throw new Error(`No score-rank document chunks found for ${province} ${year}.`);
  }

  const source = sourceRows.rows[0];
  const parsed = parseRows(source.content || '');
  if (!parsed.length) throw new Error('No score-rank rows parsed.');

  for (let offset = 0; offset < parsed.length; offset += 100) {
    const batch = parsed.slice(offset, offset + 100);
    const values = [];
    const placeholders = batch.map((row, index) => {
      const base = index * 11;
      values.push(
        province,
        year,
        candidateTrack,
        subjectCombo,
        row.score,
        row.same_score_count,
        row.cumulative_count,
        row.min_rank,
        row.max_rank,
        source.id,
        JSON.stringify(row)
      );
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11}::jsonb)`;
    }).join(',');

    await pool.query(
      `insert into gaokao_score_rank_segments
        (province, year, candidate_track, subject_combo, score, same_score_count, cumulative_count, min_rank, max_rank, source_id, raw_data)
       values ${placeholders}
       on conflict (province, year, candidate_track, subject_combo, score) do update
         set same_score_count = excluded.same_score_count,
             cumulative_count = excluded.cumulative_count,
             min_rank = excluded.min_rank,
             max_rank = excluded.max_rank,
             source_id = excluded.source_id,
             raw_data = excluded.raw_data`,
      values
    );
  }

  console.log(`Parsed ${parsed.length} score-rank rows for ${province} ${year}.`);
});
