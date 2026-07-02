import urllib.request
import re
import json

def fetch_rankings():
    url = "https://en.wikipedia.org/wiki/FIFA_Men%27s_World_Ranking"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
    # Find the table rows in the top 50 table
    # It looks like: <td>1</td>\n<td><span class="flagicon">...</span> <a href="...">Argentina</a></td>\n<td>1855.2</td>
    
    pattern = re.compile(r'<tr>\s*<td>(\d+)</td>\s*<td[^>]*>.*?</td>\s*<td>.*?<a[^>]*>([^<]+)</a>.*?</td>\s*<td>([\d\.]+)</td>', re.IGNORECASE)
    
    matches = pattern.findall(html)
    
    rankings = []
    for m in matches:
        rank = m[0]
        team = m[1].strip()
        points = m[2]
        rankings.append({"rank": int(rank), "team": team, "points": float(points)})
        
    with open('data/worldcup/processed/real_fifa_rankings.json', 'w') as f:
        json.dump(rankings, f)
        
    print(f"Saved {len(rankings)} real rankings to real_fifa_rankings.json")

if __name__ == "__main__":
    fetch_rankings()
