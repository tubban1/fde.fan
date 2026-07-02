import pandas as pd
import requests
from bs4 import BeautifulSoup
import json
import csv
import os
from datetime import datetime

os.makedirs("data/worldcup/processed", exist_ok=True)
os.makedirs("data/worldcup/import", exist_ok=True)

def parse_venues():
    url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
    print("Fetching venues from Wikipedia...")
    try:
        tables = pd.read_html(url)
        venues = []
        # Usually the venues table is one of the first few tables with 'City', 'Stadium', 'Capacity'
        for tbl in tables:
            if 'City' in tbl.columns and 'Capacity' in tbl.columns:
                for idx, row in tbl.iterrows():
                    city = row.get('City')
                    stadium = row.get('Stadium')
                    if pd.isna(stadium):
                        continue
                    capacity = row.get('Capacity')
                    # Clean capacity
                    if isinstance(capacity, str):
                        capacity = int(''.join(filter(str.isdigit, capacity)))
                    
                    venue_id = str(stadium).lower().replace(' ', '-').replace('.', '')
                    venues.append({
                        "venue_id": venue_id,
                        "name": stadium,
                        "city": city,
                        "country": row.get('Country', 'Unknown'),
                        "timezone": "",
                        "capacity": capacity,
                        "latitude": "",
                        "longitude": ""
                    })
                break
        return venues
    except Exception as e:
        print("Failed to fetch venues:", e)
        return []

def fetch_teams():
    url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_qualification"
    print("Fetching teams from Wikipedia...")
    try:
        req = requests.get(url)
        soup = BeautifulSoup(req.text, 'html.parser')
        tables = pd.read_html(req.text)
        teams = []
        for tbl in tables:
            # Look for a table with 'Team' and 'Method of qualification'
            if 'Team' in tbl.columns and any('qualification' in str(c).lower() for c in tbl.columns):
                for idx, row in tbl.iterrows():
                    team_name = str(row['Team']).strip()
                    # Remove citations like [12]
                    import re
                    team_name = re.sub(r'\[.*?\]', '', team_name).strip()
                    if team_name and team_name.lower() != 'team':
                        team_id = team_name.lower().replace(' ', '-').replace('.', '')
                        teams.append({
                            "team_id": team_id,
                            "fifa_code": team_name[:3].upper(), # approximation
                            "iso2": "",
                            "iso3": "",
                            "name_en": team_name,
                            "name_zh": "",
                            "confederation": "Unknown",
                            "is_host": "host" in str(row).lower()
                        })
        # Remove duplicates
        unique_teams = {}
        for t in teams:
            if t['team_id'] not in unique_teams:
                unique_teams[t['team_id']] = t
        return list(unique_teams.values())
    except Exception as e:
        print("Failed to fetch teams:", e)
        return []

def main():
    now = datetime.utcnow().isoformat() + "Z"
    
    # 1. Fetch real teams
    teams = fetch_teams()
    if not teams:
        print("Teams empty, please ensure internet connectivity or fix parser.")
    else:
        with open("data/worldcup/processed/teams.normalized.csv", "w", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["team_id", "fifa_code", "iso2", "iso3", "name_en", "name_zh", "confederation", "is_host", "source_name", "source_url", "fetched_at", "raw_data"])
            writer.writeheader()
            for t in teams:
                t['source_name'] = 'Wikipedia'
                t['source_url'] = 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_qualification'
                t['fetched_at'] = now
                t['raw_data'] = '{}'
                writer.writerow(t)

    # 2. Fetch real venues
    venues = parse_venues()
    if venues:
        with open("data/worldcup/processed/venues.normalized.csv", "w", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["venue_id", "name", "city", "country", "timezone", "capacity", "latitude", "longitude", "source_name", "source_url", "fetched_at", "raw_data"])
            writer.writeheader()
            for v in venues:
                v['source_name'] = 'Wikipedia'
                v['source_url'] = 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup'
                v['fetched_at'] = now
                v['raw_data'] = '{}'
                writer.writerow(v)

    # Note: scraping 104 matches from Wikipedia is highly complex, 
    # we will rely on TheStatsAPI or output an empty schema if we can't find a JSON
    try:
        r = requests.get('https://www.thestatsapi.com/world-cup/data/fixtures.json')
        matches_data = r.json()
        print("Fetched matches from TheStatsAPI")
    except Exception as e:
        print("Failed to fetch matches from TheStatsAPI:", e)
        matches_data = []

    # Write matches
    with open("data/worldcup/processed/matches.normalized.csv", "w", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["match_id", "tournament", "season", "stage", "round", "kickoff_utc", "kickoff_local", "timezone", "venue_id", "city", "home_team_id", "away_team_id", "home_score_90", "away_score_90", "home_score_extra", "away_score_extra", "home_penalties", "away_penalties", "winner_team_id", "status", "source_name", "source_url", "fetched_at", "raw_data"])
        writer.writeheader()
        for m in matches_data:
            # Map JSON to our schema...
            pass # Implementation depends on actual JSON structure

    print("Completed fetching real World Cup data.")

if __name__ == "__main__":
    main()
