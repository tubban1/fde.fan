import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

const newsItems = [
  { id: 6577, year: 2024, name: '2024年夏季高考文化成绩一分一段表' },
  { id: 6943, year: 2025, name: '2025年夏季高考文化成绩一分一段表' }
];

async function run() {
  for (const item of newsItems) {
    const url = `https://www.sdzk.cn/NewsInfo.aspx?NewsID=${item.id}`;
    console.log(`Fetching page for ${item.year}: ${url}`);
    
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const html = res.data;
      // Search for .xls or .xlsx hrefs
      const regex = /href=["']([^"']*\.(?:xls|xlsx))["']/gi;
      const matches = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        matches.push(match[1]);
      }
      
      if (matches.length === 0) {
        console.warn(`No Excel link found in page ${item.id}`);
        continue;
      }
      
      // Usually the first match is the file we want
      let downloadUrl = matches[0];
      if (!downloadUrl.startsWith('http')) {
        downloadUrl = new URL(downloadUrl, 'https://www.sdzk.cn').toString();
      }
      
      console.log(`Found Excel download URL: ${downloadUrl}`);
      
      const dir = `/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/${item.year}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const filename = path.basename(new URL(downloadUrl).pathname);
      const targetPath = path.join(dir, filename);
      
      console.log(`Downloading to: ${targetPath}`);
      const fileRes = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': url
        }
      });
      
      const writer = fs.createWriteStream(targetPath);
      fileRes.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      console.log(`Successfully downloaded ${filename}`);
      
    } catch (e) {
      console.error(`Error for year ${item.year}:`, e.message);
    }
  }
}

run();
