import datetime
import requests
import json
import time
import logging
import random
import os
import sys
from dotenv import load_dotenv
from login import login_to_kickbase

# Load environment variables from .env file
load_dotenv()

# Set up logging with more detailed output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
LEAGUE_ID = "5378755"
BASE_URL = "https://api.kickbase.com/v4/competitions/1/players/{}?leagueId=" + LEAGUE_ID
TABLE_URL = "https://api.kickbase.com/v4/competitions/1/table"
TEAM_PROFILE_URL = "https://api.kickbase.com/v4/leagues/" + LEAGUE_ID + "/teams/{}/teamprofile"
MIN_EXPECTED_PLAYERS = 300  # sanity check for the live roster fetch

# Try to get BEARER_TOKEN from environment, if not present, attempt login
BEARER_TOKEN = os.getenv('BEARER_TOKEN')

# Enhanced environment variable validation
print(f"🔍 Environment validation:")
print(f"BEARER_TOKEN exists: {'Yes' if BEARER_TOKEN else 'No'}")

if not BEARER_TOKEN:
    print("⚠️  BEARER_TOKEN not found in environment, attempting login...")
    BEARER_TOKEN = login_to_kickbase()
    
    if BEARER_TOKEN:
        print("✅ Successfully obtained token via login")
        os.environ['BEARER_TOKEN'] = BEARER_TOKEN
    else:
        print("❌ Failed to obtain BEARER_TOKEN")
        print("Make sure KICKBASE_EMAIL and KICKBASE_PASSWORD are set")
        sys.exit(1)

print(f"BEARER_TOKEN length: {len(BEARER_TOKEN)}")
print(f"BEARER_TOKEN starts with: {BEARER_TOKEN[:10]}...")

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json"
}

def fetch_player_details(player_id):
    url = BASE_URL.format(player_id)
    logging.info(f"Fetching detailed data for player ID: {player_id}")

    # Add random delay between 0.01 and 0.1 seconds
    delay = random.uniform(0.001, 0.01)
    logging.debug(f"Waiting {delay:.2f} seconds before request")
    time.sleep(delay)
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        
        if response.status_code == 200:
            logging.info(f"Successfully fetched data for player ID: {player_id}")
            return response.json()
        elif response.status_code == 401:
            error_msg = f"❌ Authentication failed (401) for player {player_id}. Check BEARER_TOKEN."
            print(error_msg)
            logging.error(error_msg)
            return None
        elif response.status_code == 403:
            error_msg = f"❌ Access forbidden (403) for player {player_id}. Token may lack permissions."
            print(error_msg)
            logging.error(error_msg)
            return None
        elif response.status_code == 429:  # Too Many Requests
            print(f"⚠️ Rate limit hit for player {player_id}. Waiting 60 seconds...")
            logging.warning("Rate limit hit. Waiting 60 seconds...")
            time.sleep(60)  # Wait a minute if we hit rate limit
            return fetch_player_details(player_id)  # Retry the request
        else:
            error_msg = f"❌ Failed to fetch data for player {player_id}. Status code: {response.status_code}, Response: {response.text[:200]}"
            print(error_msg)
            logging.warning(error_msg)
            return None
            
    except requests.exceptions.Timeout:
        error_msg = f"❌ Timeout while fetching data for player {player_id}"
        print(error_msg)
        logging.error(error_msg)
        return None
    except requests.exceptions.RequestException as e:
        error_msg = f"❌ Request error for player {player_id}: {e}"
        print(error_msg)
        logging.error(error_msg)
        return None
    except json.JSONDecodeError as e:
        error_msg = f"❌ JSON decode error for player {player_id}: {e}"
        print(error_msg)
        logging.error(error_msg)
        return None

def fetch_current_player_ids():
    """Fetch the IDs of all players currently in a Bundesliga squad.

    Returns a list of player IDs, or None if the live rosters could not be
    fetched completely (caller should then fall back to all_players.json).
    """
    try:
        response = requests.get(TABLE_URL, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            print(f"⚠️ Could not fetch league table (status {response.status_code})")
            return None
        teams = response.json().get('it', [])
        if not teams:
            print("⚠️ League table contained no teams")
            return None

        player_ids = []
        seen = set()
        for team in teams:
            tid = team.get('tid')
            r = requests.get(TEAM_PROFILE_URL.format(tid), headers=HEADERS, timeout=30)
            if r.status_code != 200:
                print(f"⚠️ Could not fetch roster for team {tid} (status {r.status_code})")
                return None
            squad = r.json().get('it', [])
            print(f"  👥 {team.get('tn', tid)}: {len(squad)} players")
            for player in squad:
                pid = str(player.get('i'))
                if pid and pid not in seen:
                    seen.add(pid)
                    player_ids.append(pid)
            time.sleep(random.uniform(0.05, 0.2))

        if len(player_ids) < MIN_EXPECTED_PLAYERS:
            print(f"⚠️ Only {len(player_ids)} players found in live rosters, suspicious")
            return None
        return player_ids
    except (requests.exceptions.RequestException, ValueError) as e:
        print(f"⚠️ Error fetching live rosters: {e}")
        return None


def load_player_ids_from_file():
    """Fallback: load player IDs from the static all_players.json."""
    possible_paths = [
        'all_players.json',  # Current directory
        os.path.join(os.path.dirname(__file__), 'all_players.json'),  # Same directory as script
        os.path.join(os.path.dirname(__file__), '..', 'public', 'all_players.json'),  # public folder
    ]

    all_players_file = next((p for p in possible_paths if os.path.exists(p)), None)
    if not all_players_file:
        print("❌ all_players.json not found in any of these locations:")
        for path in possible_paths:
            print(f"  - {os.path.abspath(path)}")
        sys.exit(1)

    print(f"✅ Found all_players.json at: {all_players_file}")
    try:
        with open(all_players_file, 'r', encoding='utf-8') as f:
            return list(json.load(f)['players'].keys())
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing {all_players_file}: {e}")
        sys.exit(1)


def save_detailed_data(all_player_details):
    logging.info("Saving detailed player data to JSON file")
    print(f"💾 Saving {len(all_player_details)} player records...")
    
    try:
        data = {
            "players": all_player_details,
            "date": datetime.datetime.today().strftime('%Y-%m-%d'),
            "count": len(all_player_details)
        }
        
        # Write to a temporary file first, then rename to avoid corruption
        temp_filename = 'detailed_players_temp.json'
        with open(temp_filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # If temp file was written successfully, replace the main file
        import shutil
        shutil.move(temp_filename, 'detailed_players.json')
        
        print(f"✅ Successfully saved {len(all_player_details)} player records")
        logging.info("Detailed data saved successfully")
        
    except Exception as e:
        error_msg = f"❌ Error saving data: {e}"
        print(error_msg)
        logging.error(error_msg)
        raise

def main():
    print("🚀 Starting to collect detailed player data")
    logging.info("Starting to collect detailed player data")
    
    # Print current working directory for debugging
    current_dir = os.getcwd()
    print(f"📁 Current working directory: {current_dir}")
    
    # Get the current Bundesliga squads so new arrivals are included and
    # departed players drop out. Fall back to the static list if that fails.
    print("🔎 Fetching current squads from Kickbase...")
    player_ids = fetch_current_player_ids()
    if player_ids:
        print("✅ Using live squad data")
    else:
        print("⚠️ Falling back to all_players.json (may be outdated)")
        player_ids = load_player_ids_from_file()

    total_players = len(player_ids)
    print(f"📊 Found {total_players} players to process")
    logging.info(f"Found {total_players} players to process")

    all_player_details = {}
    
    # Test the API with the first player to ensure everything works
    if player_ids:
        print(f"🧪 Testing API with first player ID: {player_ids[0]}")
        test_data = fetch_player_details(player_ids[0])
        if not test_data:
            error_msg = "❌ Failed to fetch test player data. Check authentication and API availability."
            print(error_msg)
            logging.error(error_msg)
            sys.exit(1)
        else:
            print("✅ API test successful")
            all_player_details[player_ids[0]] = test_data
    
    for idx, player_id in enumerate(player_ids[1:], 2):  # Start from 2 since we already processed the first
        try:
            player_data = fetch_player_details(player_id)
            if player_data:
                all_player_details[player_id] = player_data
                # Save after every 10 successful fetches to prevent data loss
                if idx % 10 == 0:
                    save_detailed_data(all_player_details)
                    print(f"💾 Intermediate save completed at {idx} players")
            
            if idx % 50 == 0:  # More frequent progress updates
                print(f"📈 Progress: {idx}/{total_players} players processed ({(idx/total_players)*100:.1f}%)")
            logging.info(f"Progress: {idx}/{total_players} players processed ({(idx/total_players)*100:.1f}%)")
        except Exception as e:
            error_msg = f"❌ Error processing player {player_id}: {e}"
            print(error_msg)
            logging.error(error_msg)
            continue

    # Final save
    try:
        save_detailed_data(all_player_details)
        print(f"✅ Final save completed with {len(all_player_details)} players")
        logging.info(f"Total number of detailed player records collected: {len(all_player_details)}")
        print("🎉 Script execution completed successfully")
        logging.info("Script execution completed")
    except Exception as e:
        error_msg = f"❌ Error during final save: {e}"
        print(error_msg)
        logging.error(error_msg)
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        logging.error(f"Unexpected error: {e}")
        sys.exit(1)