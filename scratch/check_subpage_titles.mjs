import axios from 'axios';

const cids = [46, 48, 49];
async function check(cid) {
  const url = `https://www.sdzk.cn/NewsList.aspx?BCID=1198&CID=${cid}`;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = res.data;
    console.log(`\n================= CID ${cid} =================`);
    
    // Broad regex to match <a href="...">...</a>
    const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let found = 0;
    while ((match = regex.exec(html)) !== null) {
      const link = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (link.toLowerCase().includes('id=') && text) {
        console.log(`  - [${link}] ${text}`);
        found++;
      }
    }
    if (found === 0) {
      console.log("No NewsID links found.");
    }
  } catch (e) {
    console.error(`Error CID ${cid}:`, e.message);
  }
}

async function run() {
  for (const cid of cids) {
    await check(cid);
  }
}

run();
