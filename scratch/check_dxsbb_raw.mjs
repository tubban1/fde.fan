import axios from 'axios';

const url = 'https://www.dxsbb.com/news/149173.html';

async function run() {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = res.data;
    console.log(`HTML Length: ${html.length}`);
    
    // Check if there is any <table>
    const tableMatch = html.match(/<table[\s\S]*?<\/table>/gi);
    if (tableMatch) {
      console.log(`Found ${tableMatch.length} table(s).`);
      console.log("First table snippet:");
      console.log(tableMatch[0].slice(0, 1000));
    } else {
      console.log("No table found.");
      // Check for iframes or common content containers
      const bodyMatch = html.match(/<div class="content">([\s\S]*?)<\/div>/i) || html.match(/<div[^>]+id="content"[^>]*>([\s\S]*?)<\/div>/i);
      if (bodyMatch) {
        console.log("Content div found:");
        console.log(bodyMatch[1].slice(0, 1000));
      } else {
        console.log("No content div matched. Print first 2000 chars of body:");
        const bodyTag = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
        if (bodyTag) {
          console.log(bodyTag[1].slice(0, 2000));
        }
      }
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
