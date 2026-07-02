import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

const listUrl = 'https://www.sdzk.cn/NewsList.aspx?BCID=1198&CID=47';
const baseOutputDir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东';

async function run() {
  try {
    console.log("Fetching Shandong Admissions List page:", listUrl);
    const res = await axios.get(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = res.data;
    const regex = /NewsInfo\.aspx\?NewsID=(\d+)/gi;
    let match;
    const newsIds = new Set();
    while ((match = regex.exec(html)) !== null) {
      newsIds.add(match[1]);
    }
    
    console.log(`Found ${newsIds.size} articles on list page.`);
    for (const newsId of newsIds) {
      const articleUrl = `https://www.sdzk.cn/NewsInfo.aspx?NewsID=${newsId}`;
      console.log(`\nInspecting Article: ${articleUrl}`);
      const artRes = await axios.get(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const artHtml = artRes.data;
      const titleMatch = artHtml.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : `Article_${newsId}`;
      console.log(`Title: ${title}`);
      
      // Determine year
      let year = '';
      if (title.includes('2025')) year = '2025';
      else if (title.includes('2024')) year = '2024';
      
      if (!year || !title.includes('普通类常规批') || !title.includes('投档情况表')) {
        console.log("Skipping article.");
        continue;
      }
      
      const fileMatch = artHtml.match(/href="([^"]+\.xls)"/i);
      if (fileMatch) {
        let fileUrl = fileMatch[1];
        if (fileUrl.startsWith('/')) {
          fileUrl = 'https://www.sdzk.cn' + fileUrl;
        }
        console.log(`Found Excel Link: ${fileUrl}`);
        
        const fileName = path.basename(fileUrl);
        const yearDir = path.join(baseOutputDir, year);
        if (!fs.existsSync(yearDir)) {
          fs.mkdirSync(yearDir, { recursive: true });
        }
        
        const localPath = path.join(yearDir, fileName);
        if (fs.existsSync(localPath)) {
          console.log(`File already exists: ${fileName}. Skipping download.`);
          continue;
        }
        
        console.log(`Downloading to ${localPath}...`);
        const dlRes = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        fs.writeFileSync(localPath, Buffer.from(dlRes.data));
        console.log(`Download finished: ${fileName} (${dlRes.data.length} bytes)`);
      } else {
        console.log("No XLS link found in this article.");
      }
    }
    
    console.log("\nFinished scanning and downloading.");
  } catch (e) {
    console.error("Error running crawler:", e.message);
  }
}

run();
