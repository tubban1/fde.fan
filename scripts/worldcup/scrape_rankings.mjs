import fs from 'node:fs';
import * as cheerio from 'cheerio';

async function fetchRankings() {
  const res = await fetch('https://en.wikipedia.org/wiki/FIFA_Men%27s_World_Ranking');
  const text = await res.text();
  const $ = cheerio.load(text);
  let rankings = [];
  $('table.wikitable tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length >= 4) {
          const rank = $(tds[0]).text().trim();
          let team = $(tds[2]).text().trim();
          const points = $(tds[3]).text().trim();
          team = team.replace(/\[.*\]/g, ''); // remove citations
          if (rank && team && points) rankings.push({rank, team, points});
      }
  });
  console.log('Found', rankings.length, 'rankings');
  console.log(rankings.slice(0, 10));
}
fetchRankings().catch(console.error);
