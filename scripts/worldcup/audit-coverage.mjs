import { loadLocalEnv } from '../gaokao/lib/env.mjs';
import { withDb } from '../gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const reports = [];
  reports.push("# WORLDCUP DATA COVERAGE REPORT\n");
  
  const getCount = async (tbl) => {
    try {
        const res = await pool.query(`select count(*) from ${tbl}`);
        return parseInt(res.rows[0].count, 10);
    } catch (e) {
        return 0;
    }
  };

  const cSources = await getCount('worldcup_sources');
  const cTeams = await getCount('worldcup_teams');
  const cVenues = await getCount('worldcup_venues');
  const cMatches = await getCount('worldcup_matches');
  const cRankings = await getCount('worldcup_team_rankings');
  const cForm = await getCount('worldcup_team_form');
  const cGaps = await getCount('worldcup_data_gaps');
  const cOdds = await getCount('worldcup_odds_snapshots');
  const cAvail = await getCount('worldcup_availability_reports');
  
  reports.push("## Table Counts");
  reports.push(`- worldcup_sources: ${cSources}`);
  reports.push(`- worldcup_teams: ${cTeams} / 48`);
  reports.push(`- worldcup_venues: ${cVenues} / 16`);
  reports.push(`- worldcup_matches: ${cMatches} / 104`);
  reports.push(`- worldcup_team_rankings: ${cRankings}`);
  reports.push(`- worldcup_team_form: ${cForm}`);
  reports.push(`- worldcup_data_gaps: ${cGaps}`);
  reports.push(`- worldcup_odds_snapshots: ${cOdds}`);
  reports.push(`- worldcup_availability_reports: ${cAvail}`);
  
  reports.push("\n## Data Integrity & Completeness");
  
  // 1. Duplicate ISO check
  const dupFifa = await pool.query(`select fifa_code, count(*) from worldcup_teams group by fifa_code having count(*) > 1`);
  reports.push(`- Duplicate FIFA codes: ${dupFifa.rows.length}`);
  
  // 2. Missing fields in teams
  const missingIso = await pool.query(`select count(*) from worldcup_teams where iso2 = '' or iso2 is null`);
  reports.push(`- Teams missing ISO codes: ${missingIso.rows[0].count}`);
  
  // 3. Venues missing data
  const missingVenueFields = await pool.query(`select count(*) from worldcup_venues where country = '' or capacity is null or latitude is null`);
  reports.push(`- Venues missing critical geography/capacity data: ${missingVenueFields.rows[0].count}`);
  
  // 4. Stable Match ID check
  const mathRandomIds = await pool.query(`select count(*) from worldcup_matches where id like '%0.%' or id like '%math.random%'`);
  reports.push(`- Matches with unstable/random IDs: ${mathRandomIds.rows[0].count}`);
  
  // 5. Score Integrity for Finished Matches
  const brokenScores = await pool.query(`
    select count(*) from worldcup_matches 
    where status = 'finished' 
    and (home_score_90 is null or away_score_90 is null)
  `);
  reports.push(`- Finished matches with missing 90min scores: ${brokenScores.rows[0].count}`);
  
  // 6. Check host flags
  const usaHost = await pool.query(`select is_host from worldcup_teams where id = 'usa'`);
  const isUsaHost = usaHost.rows[0]?.is_host ? 'Yes' : 'No';
  reports.push(`- USA correctly flagged as host: ${isUsaHost}`);

  // 7. Check match times
  const missingTz = await pool.query(`select count(*) from worldcup_matches where timezone = '' or timezone is null`);
  reports.push(`- Matches missing timezone: ${missingTz.rows[0].count}`);
  const badUtc = await pool.query(`select count(*) from worldcup_matches where kickoff_utc::text not like '%:%'`);
  reports.push(`- Matches with invalid UTC kickoff (missing Z): ${badUtc.rows[0].count}`);
  
  // 8. Rankings & Form coverage
  const rankedTeams = await pool.query(`select count(distinct team_id) from worldcup_team_rankings`);
  reports.push(`- Teams with ranking data: ${rankedTeams.rows[0].count}`);
  // 8. Form Coverage
  const formCount = await pool.query(`
    select t.id as team_id, count(f.id) as match_count
    from worldcup_teams t
    left join worldcup_team_form f on t.id = f.team_id
    group by t.id
    having count(f.id) < 10
  `);
  reports.push(`- Teams with less than 10 recent form matches: ${formCount.rows.length}`);
  
  // 9. Synthetic and Random Data Audit
  const syntheticRankings = await pool.query(`select count(*) from worldcup_team_rankings r join worldcup_sources s on r.source_id = s.id where s.source_name = 'synthetic'`);
  const syntheticForm = await pool.query(`select count(*) from worldcup_team_form f join worldcup_sources s on f.source_id = s.id where s.source_name = 'synthetic'`);
  
  const synRankCount = parseInt(syntheticRankings.rows[0].count, 10);
  const synFormCount = parseInt(syntheticForm.rows[0].count, 10);
  const totalSynthetic = synRankCount + synFormCount;
  
  reports.push(`- synthetic_data_count (rankings): ${synRankCount}`);
  reports.push(`- synthetic_data_count (form): ${synFormCount}`);
  
  const randomMatches = await pool.query(`select count(*) from worldcup_matches where id like '%math.random%'`);
  reports.push(`- random_generated_count (matches): ${randomMatches.rows[0].count}`);
  
  const mismatchForm = await pool.query(`select count(*) from worldcup_team_form f join worldcup_sources s on f.source_id = s.id where s.source_name != 'synthetic' and s.source_name != 'martj42-results'`);
  reports.push(`- source_mismatch_count (form): ${mismatchForm.rows[0].count}`);
  
  // New Checks
  const rankOutOfRange = await pool.query(`select count(*) from worldcup_team_rankings where rank < 1 or rank > 250`);
  const rankNan = await pool.query(`select count(*) from worldcup_team_rankings where rating is null`);
  const formNan = await pool.query(`select count(*) from worldcup_team_form where goals_for is null or goals_against is null`);
  const formFuture = await pool.query(`select count(*) from worldcup_team_form where match_date > current_date`);
  
  const rankRawDataEmpty = await pool.query(`select count(*) from worldcup_team_rankings where raw_data::text = '{}'::text`);
  const rankBadSource = await pool.query(`select count(*) from worldcup_team_rankings r join worldcup_sources s on r.source_id = s.id where s.source_url not like '%inside.fifa.com%'`);
  
  reports.push(`- rank_out_of_range_count: ${rankOutOfRange.rows[0].count}`);
  reports.push(`- ranking_nan_rating_count: ${rankNan.rows[0].count}`);
  reports.push(`- ranking_raw_data_empty_count: ${rankRawDataEmpty.rows[0].count}`);
  reports.push(`- ranking_bad_source_url_count: ${rankBadSource.rows[0].count}`);
  reports.push(`- form_nan_score_count: ${formNan.rows[0].count}`);
  reports.push(`- future_unplayed_form_count: ${formFuture.rows[0].count}`);
  
  // Fetch latest official date
  let latestOfficialDate = '2026-06-11';
  try {
      const fifaRes = await fetch('https://inside.fifa.com/fifa-world-ranking/men', { headers: { 'User-Agent': 'Mozilla/5.0' }});
      const html = await fifaRes.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (match) {
          const nextData = JSON.parse(match[1]);
          const lastUpdate = nextData.props?.pageProps?.pageData?.ranking?.lastUpdateDate;
          if (lastUpdate) latestOfficialDate = lastUpdate.split('T')[0];
      }
  } catch (err) {}

  const snapDateRes = await pool.query(`select to_char(max(ranking_date), 'YYYY-MM-DD') as max_date from worldcup_team_rankings`);
  let snapshotDateStr = snapDateRes.rows[0].max_date || '';
  
  let rankingStaleCount = 0;
  if (snapshotDateStr && snapshotDateStr < latestOfficialDate) {
      rankingStaleCount = parseInt((await pool.query(`select count(*) from worldcup_team_rankings`)).rows[0].count, 10);
  }

  reports.push(`- ranking_latest_official_date: ${latestOfficialDate}`);
  reports.push(`- ranking_snapshot_date: ${snapshotDateStr}`);
  reports.push(`- ranking_stale_count: ${rankingStaleCount}`);
  
  reports.push("\n## Prediction Model Readiness");
  const hasErrors = totalSynthetic > 0 || rankOutOfRange.rows[0].count > 0 || rankNan.rows[0].count > 0 || formNan.rows[0].count > 0 || formFuture.rows[0].count > 0 || rankRawDataEmpty.rows[0].count > 0 || rankBadSource.rows[0].count > 0;
  
  const eloCoverage = await pool.query(`select count(*) from worldcup_team_form where opponent_elo is null`);
  const eloMissing = parseInt(eloCoverage.rows[0].count, 10);
  reports.push(`- opponent_elo_missing_count: ${eloMissing}`);
  
  const isStale = rankingStaleCount > 0;
  if (!hasErrors) {
    if (eloMissing === 0) {
      if (isStale) {
        reports.push(`- PARTIAL_READY: Data foundation is clean and opponent_elo is full, but rankings are stale (${snapshotDateStr} < ${latestOfficialDate}).`);
      } else {
        reports.push(`- READY: Data foundation is clean. Model can safely use ranking/form features, including full opponent_elo.`);
      }
    } else {
      reports.push(`- PARTIAL_READY: form coverage complete; ranking coverage ${rankedTeams.rows[0].count}/48; opponent strength partially available (${eloMissing} matches missing opponent_elo).`);
    }
  } else {
    reports.push(`- BLOCKED: Errors detected (synthetic_data_count: ${totalSynthetic}, rank_out_of_range: ${rankOutOfRange.rows[0].count}, ranking_nan: ${rankNan.rows[0].count}, form_nan: ${formNan.rows[0].count}, future_form: ${formFuture.rows[0].count}). Model must exclude these features.`);
  }
  
  reports.push("\n## Data Gaps Active Tasks");
  if (cGaps > 0) {
    const gapsByType = await pool.query(`select field_name, count(*) from worldcup_data_gaps group by field_name`);
    for (const row of gapsByType.rows) {
      reports.push(`- ${row.field_name}: ${row.count} open gaps generated`);
    }
  } else {
    reports.push("- No data gaps populated yet.");
  }
  
  reports.push("\n## Next Steps");
  reports.push("- Wait for final group draws to map placeholders to actual teams.");
  
  console.log(reports.join('\n'));
});
