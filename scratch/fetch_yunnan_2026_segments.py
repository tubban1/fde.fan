import urllib.request
import re
import csv
import ssl
import os

def scrape():
    url = "https://www.6617.com/p_3091248494.html"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    context = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers=headers)
    
    html = ""
    try:
        with urllib.request.urlopen(req, context=context) as response:
            html = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching URL: {e}")
        # Try backup URL
        url = "https://www.6617.com/p_1460259929.html"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=context) as response:
            html = response.read().decode('utf-8')

    # Find table rows
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
    td_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)

    physics_rows = []
    history_rows = []

    rows = tr_pattern.findall(html)
    for row in rows:
        tds = td_pattern.findall(row)
        if len(tds) >= 6:
            tds = [re.sub('<[^<]+?>', '', td).strip() for td in tds]
            score, count, cum_count, track, province, year = tds[:6]
            if score == "分数" or "首选科目" in score:
                continue
            
            if not re.search(r'\d+', score):
                continue
                
            row_data = [score, count, cum_count]
            if "物理" in track:
                physics_rows.append(row_data)
            elif "历史" in track:
                history_rows.append(row_data)

    out_dir = "/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/云南/2026"
    os.makedirs(out_dir, exist_ok=True)

    if physics_rows:
        physics_path = os.path.join(out_dir, "yunnan_physics_2026.csv")
        with open(physics_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["分数", "本段人数", "累计人数"])
            writer.writerows(physics_rows)
        print(f"Saved {len(physics_rows)} rows to {physics_path}")
    else:
        print("No Physics data found!")

    if history_rows:
        history_path = os.path.join(out_dir, "yunnan_history_2026.csv")
        with open(history_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["分数", "本段人数", "累计人数"])
            writer.writerows(history_rows)
        print(f"Saved {len(history_rows)} rows to {history_path}")
    else:
        print("No History data found!")

if __name__ == "__main__":
    scrape()
