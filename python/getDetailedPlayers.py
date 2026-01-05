import datetime
import requests
import json
import time
import logging
import random
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging with more detailed output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
BASE_URL = "https://api.kickbase.com/v4/competitions/1/players/{}?leagueId=5378755"
BEARER_TOKEN = os.getenv('BEARER_TOKEN')
if not BEARER_TOKEN:
    BEARER_TOKEN = os.getenv('BEARER_TOKEN')  # Fallback to alternative env var

# Enhanced environment variable validation
print(f"🔍 Environment validation:")
print(f"BEARER_TOKEN exists: {'Yes' if BEARER_TOKEN else 'No'}")
if BEARER_TOKEN:
    print(f"BEARER_TOKEN length: {len(BEARER_TOKEN)}")
    print(f"BEARER_TOKEN starts with: {BEARER_TOKEN[:10]}...")
else:
    print("❌ BEARER_TOKEN not found in environment variables")
    print("Available environment variables:")
    for key in os.environ.keys():
        if 'TOKEN' in key.upper() or 'KICKBASE' in key.upper():
            print(f"  {key}: {'SET' if os.environ[key] else 'EMPTY'}")
    sys.exit(1)

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
    
    # Define possible paths for all_players.json
    possible_paths = [
        'all_players.json',  # Current directory
        os.path.join(os.path.dirname(__file__), 'all_players.json'),  # Same directory as script
        os.path.join(os.path.dirname(__file__), '..', 'public', 'all_players.json'),  # public folder
    ]
    
    # Try to find all_players.json in different locations
    all_players_file = None
    for path in possible_paths:
        if os.path.exists(path):
            all_players_file = path
            print(f"✅ Found all_players.json at: {path}")
            break
    
    if not all_players_file:
        print("❌ all_players.json not found in any of these locations:")
        for path in possible_paths:
            print(f"  - {os.path.abspath(path)}")
        print("Please ensure all_players.json exists or run the data collection notebook first.")
        sys.exit(1)
    
    # First, load the existing player IDs from all_players.json
    try:
        with open(all_players_file, 'r', encoding='utf-8') as f:
            basic_data = json.load(f)
            player_ids = list(basic_data['players'].keys())
            total_players = len(player_ids)
            print(f"📊 Found {total_players} players to process")
            logging.info(f"Found {total_players} players to process")
    except FileNotFoundError as e:
        error_msg = f"❌ {all_players_file} not found. Please run worthIt.ipynb first."
        print(error_msg)
        logging.error(error_msg)
        sys.exit(1)
    except json.JSONDecodeError as e:
        error_msg = f"❌ Error parsing {all_players_file}: {e}"
        print(error_msg)
        logging.error(error_msg)
        sys.exit(1)

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