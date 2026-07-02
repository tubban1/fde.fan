import axios from 'axios';

const url = 'https://www.sdzk.cn/NewsList.aspx?BCID=1198&CID=47';
async function run() {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    // Look for all links matching NewsList.aspx?BCID=1198
    const html = res.data;
    const regex = /href=["'](NewsList\.aspx\?BCID=1198[^"']+)["']/gi;
    let match;
    const links = new Set();
    while ((match = regex.exec(html)) !== null) {
      links.add(match[1]);
    }
    
    console.log("Found Summer Gaokao links:");
    for (const link of links) {
      // Find the tag text around the link if possible
      const escapedLink = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const textRegex = new RegExp(`href=["']${escapedLink}["'][^>]*>([^<]+)</a>`, 'i');
      const textMatch = html.match(textRegex);
      const text = textMatch ? textMatch[1].trim() : 'Unknown';
      console.log(`- ${link} | Text: ${text}`);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
