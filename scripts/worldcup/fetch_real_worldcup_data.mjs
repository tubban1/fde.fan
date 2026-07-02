import fs from 'node:fs';
import path from 'node:path';

const TEAM_MAP = {
  "canada": { fifa: "CAN", iso2: "CA", iso3: "CAN", zh: "加拿大", conf: "CONCACAF" },
  "mexico": { fifa: "MEX", iso2: "MX", iso3: "MEX", zh: "墨西哥", conf: "CONCACAF" },
  "usa": { fifa: "USA", iso2: "US", iso3: "USA", zh: "美国", conf: "CONCACAF" },
  "argentina": { fifa: "ARG", iso2: "AR", iso3: "ARG", zh: "阿根廷", conf: "CONMEBOL" },
  "brazil": { fifa: "BRA", iso2: "BR", iso3: "BRA", zh: "巴西", conf: "CONMEBOL" },
  "colombia": { fifa: "COL", iso2: "CO", iso3: "COL", zh: "哥伦比亚", conf: "CONMEBOL" },
  "uruguay": { fifa: "URU", iso2: "UY", iso3: "URY", zh: "乌拉圭", conf: "CONMEBOL" },
  "ecuador": { fifa: "ECU", iso2: "EC", iso3: "ECU", zh: "厄瓜多尔", conf: "CONMEBOL" },
  "paraguay": { fifa: "PAR", iso2: "PY", iso3: "PRY", zh: "巴拉圭", conf: "CONMEBOL" },
  "france": { fifa: "FRA", iso2: "FR", iso3: "FRA", zh: "法国", conf: "UEFA" },
  "germany": { fifa: "GER", iso2: "DE", iso3: "DEU", zh: "德国", conf: "UEFA" },
  "spain": { fifa: "ESP", iso2: "ES", iso3: "ESP", zh: "西班牙", conf: "UEFA" },
  "england": { fifa: "ENG", iso2: "GB", iso3: "GBR", zh: "英格兰", conf: "UEFA" },
  "portugal": { fifa: "POR", iso2: "PT", iso3: "PRT", zh: "葡萄牙", conf: "UEFA" },
  "netherlands": { fifa: "NED", iso2: "NL", iso3: "NLD", zh: "荷兰", conf: "UEFA" },
  "belgium": { fifa: "BEL", iso2: "BE", iso3: "BEL", zh: "比利时", conf: "UEFA" },
  "italy": { fifa: "ITA", iso2: "IT", iso3: "ITA", zh: "意大利", conf: "UEFA" },
  "croatia": { fifa: "CRO", iso2: "HR", iso3: "HRV", zh: "克罗地亚", conf: "UEFA" },
  "switzerland": { fifa: "SUI", iso2: "CH", iso3: "CHE", zh: "瑞士", conf: "UEFA" },
  "denmark": { fifa: "DEN", iso2: "DK", iso3: "DNK", zh: "丹麦", conf: "UEFA" },
  "sweden": { fifa: "SWE", iso2: "SE", iso3: "SWE", zh: "瑞典", conf: "UEFA" },
  "serbia": { fifa: "SRB", iso2: "RS", iso3: "SRB", zh: "塞尔维亚", conf: "UEFA" },
  "poland": { fifa: "POL", iso2: "PL", iso3: "POL", zh: "波兰", conf: "UEFA" },
  "wales": { fifa: "WAL", iso2: "GB", iso3: "GBR", zh: "威尔士", conf: "UEFA" },
  "scotland": { fifa: "SCO", iso2: "GB", iso3: "GBR", zh: "苏格兰", conf: "UEFA" },
  "czech-republic": { fifa: "CZE", iso2: "CZ", iso3: "CZE", zh: "捷克", conf: "UEFA" },
  "austria": { fifa: "AUT", iso2: "AT", iso3: "AUT", zh: "奥地利", conf: "UEFA" },
  "norway": { fifa: "NOR", iso2: "NO", iso3: "NOR", zh: "挪威", conf: "UEFA" },
  "japan": { fifa: "JPN", iso2: "JP", iso3: "JPN", zh: "日本", conf: "AFC" },
  "iran": { fifa: "IRN", iso2: "IR", iso3: "IRN", zh: "伊朗", conf: "AFC" },
  "south-korea": { fifa: "KOR", iso2: "KR", iso3: "KOR", zh: "韩国", conf: "AFC" },
  "australia": { fifa: "AUS", iso2: "AU", iso3: "AUS", zh: "澳大利亚", conf: "AFC" },
  "saudi-arabia": { fifa: "KSA", iso2: "SA", iso3: "SAU", zh: "沙特阿拉伯", conf: "AFC" },
  "qatar": { fifa: "QAT", iso2: "QA", iso3: "QAT", zh: "卡塔尔", conf: "AFC" },
  "iraq": { fifa: "IRQ", iso2: "IQ", iso3: "IRQ", zh: "伊拉克", conf: "AFC" },
  "uzbekistan": { fifa: "UZB", iso2: "UZ", iso3: "UZB", zh: "乌兹别克斯坦", conf: "AFC" },
  "jordan": { fifa: "JOR", iso2: "JO", iso3: "JOR", zh: "约旦", conf: "AFC" },
  "senegal": { fifa: "SEN", iso2: "SN", iso3: "SEN", zh: "塞内加尔", conf: "CAF" },
  "morocco": { fifa: "MAR", iso2: "MA", iso3: "MAR", zh: "摩洛哥", conf: "CAF" },
  "tunisia": { fifa: "TUN", iso2: "TN", iso3: "TUN", zh: "突尼斯", conf: "CAF" },
  "algeria": { fifa: "ALG", iso2: "DZ", iso3: "DZA", zh: "阿尔及利亚", conf: "CAF" },
  "egypt": { fifa: "EGY", iso2: "EG", iso3: "EGY", zh: "埃及", conf: "CAF" },
  "nigeria": { fifa: "NGA", iso2: "NG", iso3: "NGA", zh: "尼日利亚", conf: "CAF" },
  "cameroon": { fifa: "CMR", iso2: "CM", iso3: "CMR", zh: "喀麦隆", conf: "CAF" },
  "ghana": { fifa: "GHA", iso2: "GH", iso3: "GHA", zh: "加纳", conf: "CAF" },
  "ivory-coast": { fifa: "CIV", iso2: "CI", iso3: "CIV", zh: "科特迪瓦", conf: "CAF" },
  "dr-congo": { fifa: "COD", iso2: "CD", iso3: "COD", zh: "刚果民主共和国", conf: "CAF" },
  "mali": { fifa: "MLI", iso2: "ML", iso3: "MLI", zh: "马里", conf: "CAF" },
  "south-africa": { fifa: "RSA", iso2: "ZA", iso3: "ZAF", zh: "南非", conf: "CAF" },
  "cape-verde": { fifa: "CPV", iso2: "CV", iso3: "CPV", zh: "佛得角", conf: "CAF" },
  "panama": { fifa: "PAN", iso2: "PA", iso3: "PAN", zh: "巴拿马", conf: "CONCACAF" },
  "costa-rica": { fifa: "CRC", iso2: "CR", iso3: "CRC", zh: "哥斯达黎加", conf: "CONCACAF" },
  "jamaica": { fifa: "JAM", iso2: "JM", iso3: "JAM", zh: "牙买加", conf: "CONCACAF" },
  "honduras": { fifa: "HON", iso2: "HN", iso3: "HND", zh: "洪都拉斯", conf: "CONCACAF" },
  "el-salvador": { fifa: "SLV", iso2: "SV", iso3: "SLV", zh: "萨尔瓦多", conf: "CONCACAF" },
  "haiti": { fifa: "HAI", iso2: "HT", iso3: "HTI", zh: "海地", conf: "CONCACAF" },
  "cura-ao": { fifa: "CUW", iso2: "CW", iso3: "CUW", zh: "库拉索", conf: "CONCACAF" },
  "new-zealand": { fifa: "NZL", iso2: "NZ", iso3: "NZL", zh: "新西兰", conf: "OFC" },
  "fiji": { fifa: "FIJ", iso2: "FJ", iso3: "FJI", zh: "斐济", conf: "OFC" },
  "bosnia-herzegovina": { fifa: "BIH", iso2: "BA", iso3: "BIH", zh: "波斯尼亚和黑塞哥维那", conf: "UEFA" },
  "turkey": { fifa: "TUR", iso2: "TR", iso3: "TUR", zh: "土耳其", conf: "UEFA" }
};

const VENUE_MAP = {
  "toronto": { name: "BMO Field", city: "Toronto", country: "Canada", tz: "America/Toronto", cap: 45000, lat: 43.633, lon: -79.418 },
  "vancouver": { name: "BC Place", city: "Vancouver", country: "Canada", tz: "America/Vancouver", cap: 54500, lat: 49.276, lon: -123.111 },
  "mexico-city": { name: "Estadio Azteca", city: "Mexico City", country: "Mexico", tz: "America/Mexico_City", cap: 83264, lat: 19.302, lon: -99.150 },
  "monterrey-guadalupe": { name: "Estadio BBVA", city: "Monterrey", country: "Mexico", tz: "America/Monterrey", cap: 53500, lat: 25.670, lon: -100.244 },
  "guadalajara-zapopan": { name: "Estadio Akron", city: "Guadalajara", country: "Mexico", tz: "America/Mexico_City", cap: 49850, lat: 20.681, lon: -103.462 },
  "atlanta": { name: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA", tz: "America/New_York", cap: 71000, lat: 33.755, lon: -84.400 },
  "boston-foxborough": { name: "Gillette Stadium", city: "Boston", country: "USA", tz: "America/New_York", cap: 65878, lat: 42.090, lon: -71.264 },
  "dallas-arlington": { name: "AT&T Stadium", city: "Dallas", country: "USA", tz: "America/Chicago", cap: 80000, lat: 32.747, lon: -97.092 },
  "houston": { name: "NRG Stadium", city: "Houston", country: "USA", tz: "America/Chicago", cap: 72220, lat: 29.684, lon: -95.410 },
  "kansas-city": { name: "Arrowhead Stadium", city: "Kansas City", country: "USA", tz: "America/Chicago", cap: 76416, lat: 39.048, lon: -94.483 },
  "los-angeles-inglewood": { name: "SoFi Stadium", city: "Los Angeles", country: "USA", tz: "America/Los_Angeles", cap: 70240, lat: 33.953, lon: -118.339 },
  "miami-miami-gardens": { name: "Hard Rock Stadium", city: "Miami", country: "USA", tz: "America/New_York", cap: 64767, lat: 25.957, lon: -80.238 },
  "new-york-new-jersey-east-rutherford": { name: "MetLife Stadium", city: "New York/New Jersey", country: "USA", tz: "America/New_York", cap: 82500, lat: 40.813, lon: -74.074 },
  "philadelphia": { name: "Lincoln Financial Field", city: "Philadelphia", country: "USA", tz: "America/New_York", cap: 69796, lat: 39.901, lon: -75.167 },
  "san-francisco-bay-area-santa-clara": { name: "Levi's Stadium", city: "San Francisco", country: "USA", tz: "America/Los_Angeles", cap: 68500, lat: 37.403, lon: -121.969 },
  "seattle": { name: "Lumen Field", city: "Seattle", country: "USA", tz: "America/Los_Angeles", cap: 69000, lat: 47.595, lon: -122.331 }
};

async function fetchRealData() {
  console.log('Fetching worldcup.json from openfootball...');
  const res = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
  const data = await res.json();
  
  const now = new Date().toISOString();
  
  const teamsMap = new Map();
  const venuesMap = new Map();
  const matches = [];
  const gaps = [];
  const rankings = [];
  const forms = [];
  
  let matchIdx = 1;
  let formMatchIdCounter = 1;

  for (const match of data.matches) {
    const isW = (t) => /^W\d+$/.test(t) || /^L\d+$/.test(t);

    for (const t of [match.team1, match.team2]) {
      if (t && !isW(t)) {
        const teamId = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!teamsMap.has(teamId)) {
          const mapping = TEAM_MAP[teamId] || {};
          teamsMap.set(teamId, {
            team_id: teamId,
            fifa_code: mapping.fifa || t.substring(0, 3).toUpperCase(),
            iso2: mapping.iso2 || '',
            iso3: mapping.iso3 || '',
            name_en: t,
            name_zh: mapping.zh || '',
            confederation: mapping.conf || 'Unknown',
            is_host: ['canada', 'mexico', 'usa'].includes(teamId) ? 'true' : 'false',
            source_name: 'openfootball',
            source_url: 'https://github.com/openfootball/worldcup.json',
            fetched_at: now,
            raw_data: '{}'
          });
        }
      }
    }
    
    let vId = '';
    let tz = '';
    if (match.ground) {
      vId = match.ground.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const mapping = VENUE_MAP[vId] || {};
      tz = mapping.tz || '';
      if (!venuesMap.has(vId)) {
        venuesMap.set(vId, {
          venue_id: vId,
          name: mapping.name || match.ground,
          city: mapping.city || match.ground.split('(')[0].trim(),
          country: mapping.country || '',
          timezone: tz,
          capacity: mapping.cap || '',
          latitude: mapping.lat || '',
          longitude: mapping.lon || '',
          source_name: 'openfootball',
          source_url: 'https://github.com/openfootball/worldcup.json',
          fetched_at: now,
          raw_data: '{}'
        });
      }
    }
    
    const t1Id = isW(match.team1) ? '' : match.team1.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const t2Id = isW(match.team2) ? '' : match.team2.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    let home_score_90 = '';
    let away_score_90 = '';
    let home_score_extra = '';
    let away_score_extra = '';
    let home_penalties = '';
    let away_penalties = '';
    let status = 'scheduled';
    let winnerId = '';
    
    if (match.score && (match.score.ft || match.score.et || match.score.p)) {
      status = 'finished';
      if (match.score.ft) {
        home_score_90 = match.score.ft[0];
        away_score_90 = match.score.ft[1];
        if (home_score_90 > away_score_90) winnerId = t1Id;
        else if (away_score_90 > home_score_90) winnerId = t2Id;
      }
      if (match.score.et) {
        home_score_extra = match.score.et[0];
        away_score_extra = match.score.et[1];
        if (home_score_extra > away_score_extra) winnerId = t1Id;
        else if (away_score_extra > home_score_extra) winnerId = t2Id;
      }
      if (match.score.p) {
        home_penalties = match.score.p[0];
        away_penalties = match.score.p[1];
        if (home_penalties > away_penalties) winnerId = t1Id;
        else if (away_penalties > home_penalties) winnerId = t2Id;
      }
    }
    
    const mId = match.num ? `match-${match.num}` : `match-gen-${matchIdx++}`;

    // Parse time to local and UTC
    let kickoff_local = '';
    let kickoff_utc = '';
    if (match.date && match.time) {
      // time could be '13:00-6', '13:00' etc.
      let timeStr = match.time.replace(' UTC', '');
      let offsetStr = '';
      const offsetMatch = timeStr.match(/([+-]\d+)$/);
      if (offsetMatch) {
        offsetStr = offsetMatch[1];
        timeStr = timeStr.replace(offsetStr, '');
      } else {
        // default to 0 offset if none found but data uses format
        offsetStr = '+0'; 
      }
      
      kickoff_local = `${match.date}T${timeStr}:00`;
      
      // Calculate UTC
      const offsetInt = parseInt(offsetStr, 10);
      const localDate = new Date(`${match.date}T${timeStr}:00Z`); // parse as UTC to just do math
      // Subtract offset to get true UTC
      const utcDate = new Date(localDate.getTime() - (offsetInt * 3600 * 1000));
      kickoff_utc = utcDate.toISOString();
    }

    let homeSourceRule = isW(match.team1) ? match.team1 : '';
    let awaySourceRule = isW(match.team2) ? match.team2 : '';
    
    const parseRuleMatch = (rule) => {
        if (/^[WL]\d+$/.test(rule)) {
            return `match-${rule.substring(1)}`;
        }
        return '';
    };
    
    let homeSourceMatchId = parseRuleMatch(homeSourceRule);
    let awaySourceMatchId = parseRuleMatch(awaySourceRule);

    matches.push({
      match_id: mId,
      tournament: 'FIFA World Cup',
      season: 2026,
      stage: match.group || match.round,
      round: match.round,
      kickoff_utc,
      kickoff_local,
      timezone: tz,
      venue_id: vId,
      city: match.ground ? match.ground.split('(')[0].trim() : '',
      home_team_id: t1Id,
      away_team_id: t2Id,
      home_source_rule: homeSourceRule,
      away_source_rule: awaySourceRule,
      home_source_match_id: homeSourceMatchId,
      away_source_match_id: awaySourceMatchId,
      home_score_90,
      away_score_90,
      home_score_extra,
      away_score_extra,
      home_penalties,
      away_penalties,
      winner_team_id: winnerId,
      status,
      source_name: 'openfootball',
      source_url: 'https://github.com/openfootball/worldcup.json',
      fetched_at: now,
      raw_data: '{}'
    });

    if (status === 'scheduled') {
      const g1 = { gap_id: `gap-odds-${mId}`, match_id: mId, team_id: '', field_name: 'odds_1x2', priority: 'high', reason: 'Missing match odds for upcoming match', suggested_source: 'The Odds API', status: 'open', created_at: now, resolved_at: '', resolved_by: '' };
      const g2 = { gap_id: `gap-lineup-${mId}`, match_id: mId, team_id: '', field_name: 'lineup_expected', priority: 'high', reason: 'Missing expected lineups', suggested_source: 'football-data', status: 'open', created_at: now, resolved_at: '', resolved_by: '' };
      const g3 = { gap_id: `gap-injury-${mId}`, match_id: mId, team_id: '', field_name: 'injury_suspension', priority: 'medium', reason: 'Missing injury/suspension lists', suggested_source: 'Transfermarkt', status: 'open', created_at: now, resolved_at: '', resolved_by: '' };
      gaps.push(g1, g2, g3);
    }
  }
  
  // Prepare to fetch real data
  console.log('Fetching real FIFA rankings from FIFA API...');
  let realRankings = {};
  let globalRankings = {};
  
  // Need to define sortedTeams early for matching
  const teamsList = Array.from(teamsMap.keys());
  const sortedTeams = [...teamsList].sort((a, b) => a.localeCompare(b));

  try {
    const fifaPageRes = await fetch('https://inside.fifa.com/fifa-world-ranking/men', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const fifaPageHtml = await fifaPageRes.text();
    const dateMatch = fifaPageHtml.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    let latestDateId = 'id14870';
    let latestDateIso = '2025-09-18';
    if (dateMatch) {
      const nextData = JSON.parse(dateMatch[1]);
      const lastUpdateDate = nextData.props?.pageProps?.pageData?.ranking?.lastUpdateDate;
      const datesList = nextData.props?.pageProps?.pageData?.ranking?.dates || [];
      const allDates = datesList.flatMap(d => d.dates || []);
      
      if (lastUpdateDate) {
         latestDateIso = lastUpdateDate.split('T')[0];
      } else if (allDates.length > 0) {
         latestDateIso = allDates[0].iso.split('T')[0];
      }

      // Map official latest date to internal API id (discovered via REST introspection)
      const dateIdMap = {
          '2026-06-11': 'id15136',
          '2026-04-01': 'id15065',
          '2026-01-19': 'id14993',
          '2025-12-22': 'id14963',
          '2025-11-19': 'id14930',
          '2025-10-17': 'id14898',
          '2025-09-18': 'id14870'
      };
      
      if (dateIdMap[latestDateIso]) {
          latestDateId = dateIdMap[latestDateIso];
      } else {
          const fallback = allDates.find(d => d.id && d.id.startsWith('id'));
          if (fallback) latestDateId = fallback.id;
      }
    }

    const fifaApiRes = await fetch(`https://inside.fifa.com/api/ranking-overview?locale=en&dateId=${latestDateId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const fifaApiJson = await fifaApiRes.json();
    
    for (const item of fifaApiJson.rankings || []) {
      const ri = item.rankingItem;
      const rank = ri.rank;
      const rating = ri.totalPoints;
      const teamStr = ri.name;
      
      if (rank >= 1 && rank <= 250 && !isNaN(rating) && teamStr) {
        let teamLower = teamStr.toLowerCase();
        globalRankings[teamLower] = rating;
        
        let matchedId = sortedTeams.find(tId => tId.toLowerCase() === teamLower.replace(/ /g, '-'));
        if (!matchedId) {
            const m = { 
              'united states': 'usa', 'usa': 'usa', 'ir iran': 'iran', 
              'korea republic': 'south-korea', 'congo dr': 'dr-congo', 
              'republic of ireland': 'ireland', 'bosnia and herzegovina': 'bosnia-herzegovina',
              'curaçao': 'cura-ao', 'cabo verde': 'cape-verde',
              'czechia': 'czech-republic', 'türkiye': 'turkey', 'côte d\'ivoire': 'ivory-coast'
            };
            if (m[teamLower]) matchedId = m[teamLower];
        }
        if (matchedId) {
            realRankings[matchedId] = { rank, rating, fifaName: teamStr, dateId: latestDateId, dateIso: latestDateIso };
        }
      }
    }
  } catch(e) {
    console.error('Error fetching FIFA API:', e.message);
  }

  console.log('Fetching real international results from GitHub...');
  const resultsRes = await fetch('https://raw.githubusercontent.com/martj42/international_results/master/results.csv');
  const resultsText = await resultsRes.text();
  const lines = resultsText.split('\n');
  let allMatches = [];
  const currentDate = new Date().toISOString().substring(0, 10);
  for (let i = 1; i < lines.length; i++) {
      const p = lines[i].split(',');
      if (p.length >= 9) {
          const matchDate = p[0];
          const home_score = parseInt(p[3], 10);
          const away_score = parseInt(p[4], 10);
          // Drop unplayed or future matches with NaN scores
          if (!isNaN(home_score) && !isNaN(away_score) && matchDate <= currentDate) {
              allMatches.push({
                  date: matchDate, home: p[1].toLowerCase(), away: p[2].toLowerCase(),
                  home_score, away_score,
                  tournament: p[5], neutral: p[8].toLowerCase() === 'true'
              });
          }
      }
  }
  allMatches.sort((a, b) => b.date.localeCompare(a.date));

  formMatchIdCounter = 1;
  for (let i = 0; i < sortedTeams.length; i++) {
      const tId = sortedTeams[i];
      
      const realRank = realRankings[tId];
      if (realRank) {
          rankings.push({
            ranking_id: `rank-${tId}`,
            team_id: tId,
            ranking_type: 'FIFA',
            ranking_date: realRank.dateIso,
            rank: realRank.rank,
            rating: realRank.rating,
            previous_rank: realRank.rank,
            source_name: 'fifa-rankings',
            source_url: `https://inside.fifa.com/api/ranking-overview?locale=en&dateId=${realRank.dateId}`,
            fetched_at: now,
            raw_data: JSON.stringify({ fifaName: realRank.fifaName, rank: realRank.rank, totalPoints: realRank.rating, dateId: realRank.dateId, rankingDate: realRank.dateIso })
          });
      } else {
          // Add data gap if ranking is missing
          gaps.push({ gap_id: `gap-ranking-${tId}`, match_id: '', team_id: tId, field_name: 'rankings', priority: 'medium', reason: 'Missing real FIFA ranking', suggested_source: 'FIFA Official', status: 'open', created_at: now, resolved_at: '', resolved_by: '' });
      }
      
      // Real Recent Form (last 10 matches)
      const aliases = [tId.replace(/-/g, ' ')];
      if (tId === 'usa') aliases.push('united states');
      if (tId === 'korea-republic') aliases.push('south korea');
      if (tId === 'bosnia-herzegovina') aliases.push('bosnia and herzegovina');
      if (tId === 'cura-ao') aliases.push('curaçao');
      
      let teamMatches = allMatches.filter(m => aliases.includes(m.home) || aliases.includes(m.away));
      teamMatches = teamMatches.slice(0, 10);
      
      for (const m of teamMatches) {
        const isHome = aliases.includes(m.home);
        const oppAlias = isHome ? m.away : m.home;
        let oppId = oppAlias.replace(/ /g, '-');
        
        let gf = isHome ? m.home_score : m.away_score;
        let ga = isHome ? m.away_score : m.home_score;
        let result = gf > ga ? 'W' : (gf < ga ? 'L' : 'D');

        let oppEloMatch = globalRankings[oppAlias];
        if (!oppEloMatch) {
            const eloFallback = {
                'south korea': globalRankings['korea republic'],
                'dr congo': globalRankings['congo dr'],
                'ivory coast': globalRankings['côte d\'ivoire'],
                'cape verde': globalRankings['cabo verde'],
                'turkey': globalRankings['türkiye'],
                'czech republic': globalRankings['czechia'],
                'republic of ireland': globalRankings['ireland'],
                'usa': globalRankings['usa'],
                'united states': globalRankings['usa'],
                'iran': globalRankings['ir iran'],
                'china': globalRankings['china pr'],
                'gambia': globalRankings['the gambia']
            };
            oppEloMatch = eloFallback[oppAlias];
        }

        forms.push({
          form_match_id: `form-${formMatchIdCounter++}`,
          team_id: tId,
          opponent_team_id: sortedTeams.includes(oppId) ? oppId : '',
          opponent_name_raw: oppAlias,
          match_date: m.date,
          competition: m.tournament,
          is_neutral: m.neutral ? 'true' : 'false',
          is_home: isHome ? 'true' : 'false',
          goals_for: gf,
          goals_against: ga,
          result: result, 
          opponent_elo: oppEloMatch || null,
          source_name: 'martj42-results',
          source_url: 'https://github.com/martj42/international_results',
          fetched_at: now,
          raw_data: JSON.stringify(m)
        });
      }
    }

  const writeCsv = (filename, items, fields) => {
    if (items.length === 0 && !fields) return;
    const keys = fields || (items.length > 0 ? Object.keys(items[0]) : []);
    const header = keys.join(',');
    const rows = items.map(item => keys.map(k => {
      let val = item[k] != null ? String(item[k]) : '';
      if (val.includes(',') || val.includes('"')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','));
    fs.writeFileSync(path.join('data/worldcup/processed', filename), [header, ...rows].join('\n') + '\n');
    console.log(`Wrote ${items.length} records to ${filename}`);
  };
  
  writeCsv('rankings.normalized.csv', rankings, ['ranking_id', 'team_id', 'ranking_type', 'ranking_date', 'rank', 'rating', 'previous_rank', 'source_name', 'source_url', 'fetched_at', 'raw_data']);
  writeCsv('recent_form.normalized.csv', forms, ['form_match_id', 'team_id', 'opponent_team_id', 'opponent_name_raw', 'match_date', 'competition', 'is_neutral', 'is_home', 'goals_for', 'goals_against', 'result', 'opponent_elo', 'source_name', 'source_url', 'fetched_at', 'raw_data']);
  writeCsv('teams.normalized.csv', Array.from(teamsMap.values()));
  writeCsv('venues.normalized.csv', Array.from(venuesMap.values()));
  writeCsv('matches.normalized.csv', matches, [
      'match_id', 'tournament', 'season', 'stage', 'round', 
      'kickoff_utc', 'kickoff_local', 'timezone', 'venue_id', 'city', 
      'home_team_id', 'away_team_id', 
      'home_source_rule', 'away_source_rule', 'home_source_match_id', 'away_source_match_id',
      'home_score_90', 'away_score_90', 'home_score_extra', 'away_score_extra', 
      'home_penalties', 'away_penalties', 'winner_team_id', 'status', 
      'source_name', 'source_url', 'fetched_at', 'raw_data'
  ]);
  writeCsv('data_gaps.normalized.csv', gaps, ['gap_id', 'match_id', 'team_id', 'field_name', 'priority', 'reason', 'suggested_source', 'status', 'created_at', 'resolved_at', 'resolved_by']);
  
  fs.rmSync('data/worldcup/import', { recursive: true, force: true });
  fs.mkdirSync('data/worldcup/import', { recursive: true });
  
  const sourcesCsv = `id,source_type,source_name,source_url,publisher,fetched_at,raw_data
fifa-official,official,FIFA Official Match Center,https://www.fifa.com,FIFA,2026-07-01T12:00:00Z,"{}"
fifa-rankings,official,FIFA Men's World Ranking,https://www.fifa.com/fifa-world-ranking/men,FIFA,2026-07-01T12:00:00Z,"{}"
elo-ratings,community,World Football Elo Ratings,https://www.eloratings.net/,Elo,2026-07-01T12:00:00Z,"{}"
open-meteo,api,Open-Meteo,https://open-meteo.com/,Open-Meteo,2026-07-01T12:00:00Z,"{}"
user-supplied,manual,User manual entry,,User,2026-07-01T12:00:00Z,"{}"
openfootball,community,openfootball,https://github.com/openfootball/worldcup.json,openfootball,2026-07-01T12:00:00Z,"{}"
martj42-results,community,martj42-results,https://github.com/martj42/international_results,martj42,2026-07-01T12:00:00Z,"{}"`;
  fs.writeFileSync('data/worldcup/import/001_sources.csv', sourcesCsv);
  
  fs.copyFileSync('data/worldcup/processed/teams.normalized.csv', 'data/worldcup/import/002_teams.csv');
  fs.copyFileSync('data/worldcup/processed/venues.normalized.csv', 'data/worldcup/import/003_venues.csv');
  fs.copyFileSync('data/worldcup/processed/matches.normalized.csv', 'data/worldcup/import/004_matches.csv');
  fs.copyFileSync('data/worldcup/processed/rankings.normalized.csv', 'data/worldcup/import/005_team_rankings.csv');
  fs.copyFileSync('data/worldcup/processed/recent_form.normalized.csv', 'data/worldcup/import/006_team_form.csv');
  fs.copyFileSync('data/worldcup/processed/data_gaps.normalized.csv', 'data/worldcup/import/008_data_gaps.csv');
  
  console.log('Real data prepared for import.');
}

fetchRealData().catch(console.error);
