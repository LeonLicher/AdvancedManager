import datetime
import requests
import json
import time
import logging
import random
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging with more verbose output
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

print("=== DEBUG: Starting script ===")
print(f"Current working directory: {os.getcwd()}")
print(f"Files in current directory: {os.listdir('.')}")

# Constants
BASE_URL = "https://api.kickbase.com/v4/competitions/1/players/{}?leagueId=5378755"

# Check environment variables with debugging
print("=== DEBUG: Checking environment variables ===")
KICKBASE_EMAIL = os.getenv('KICKBASE_EMAIL')
KICKBASE_PASSWORD = os.getenv('KICKBASE_PASSWORD')
BEARER_TOKEN = os.getenv('BEARER_TOKEN')

print(f"KICKBASE_EMAIL: {'SET' if KICKBASE_EMAIL else 'NOT SET'}")
print(f"KICKBASE_PASSWORD: {'SET' if KICKBASE_PASSWORD else 'NOT SET'}")
print(f"BEARER_TOKEN: {'SET' if BEARER_TOKEN else 'NOT SET'}")

if BEARER_TOKEN:
    print(f"BEARER_TOKEN first 10 chars: {BEARER_TOKEN[:10]}...")
else:
    print("❌ BEARER_TOKEN not found in environment variables")
    print("Available environment variables:")
    for key in sorted(os.environ.keys()):
        if 'TOKEN' in key.upper() or 'KICKBASE' in key.upper():
            print(f"  {key}: {'SET' if os.environ[key] else 'EMPTY'}")
    raise ValueError("BEARER_TOKEN not found in environment variables. Please check your .env file.")

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json"
}

def test_api_connection():
    """Test if we can connect to the API with a simple request"""
    print("=== DEBUG: Testing API connection ===")
    
    # Try to get data for a known player ID first
    test_url = BASE_URL.format("1")  # Test with player ID 1
    print(f"Testing URL: {test_url}")
    print(f"Headers: {{'Authorization': 'Bearer {BEARER_TOKEN[:10]}...', 'Content-Type': 'application/json'}}")
    
    try:
        response = requests.get(test_url, headers=HEADERS, timeout=30)
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ API connection successful")
            return True
        else:
            print(f"❌ API connection failed with status {response.status_code}")
            print(f"Response text: {response.text[:500]}...")
            return False
    except Exception as e:
        print(f"❌ API connection error: {e}")
        return False

def fetch_player_details(player_id):
    url = BASE_URL.format(player_id)
    logging.info(f"Fetching detailed data for player ID: {player_id}")

    # Add random delay between 0.001 and 0.1 seconds
    delay = random.uniform(0.01, 0.1)
    logging.info(f"Waiting {delay:.2f} seconds before request")
    time.sleep(delay)
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        print(f"Player {player_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            logging.info(f"Successfully fetched data for player ID: {player_id}")
            return response.json()
        elif response.status_code == 429:  # Too Many Requests
            logging.warning("Rate limit hit. Waiting 60 seconds...")
            time.sleep(60)  # Wait a minute if we hit rate limit
            return fetch_player_details(player_id)  # Retry the request
        else:
            logging.warning(f"Failed to fetch data for player {player_id}. Status code: {response.status_code}")
            print(f"Response text: {response.text[:200]}...")
            return None
    except Exception as e:
        print(f"Error fetching player {player_id}: {e}")
        return None

def save_detailed_data(all_player_details):
    logging.info("Saving detailed player data to JSON file")
    data = {
        "players": all_player_details,
        "date": datetime.datetime.today().strftime('%Y-%m-%d')
    }
    
    try:
        with open('detailed_players.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Successfully saved {len(all_player_details)} players to detailed_players.json")
        logging.info("Detailed data saved successfully")
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        raise

def main():
    print("=== DEBUG: Starting main function ===")
    logging.info("Starting to collect detailed player data")
    
    # Test API connection first
    if not test_api_connection():
        print("❌ Cannot connect to API. Exiting.")
        return
    
    # First, load the existing player IDs from all_players.json
    try:
        print("=== DEBUG: Loading all_players.json ===")
        with open('all_players.json', 'r', encoding='utf-8') as f:
            basic_data = json.load(f)
            player_ids = list(basic_data['players'].keys())
            total_players = len(player_ids)
            print(f"✅ Found {total_players} players to process")
            print(f"First 5 player IDs: {player_ids[:5]}")
            logging.info(f"Found {total_players} players to process")
    except FileNotFoundError:
        print("❌ all_players.json not found. Please run worthIt.ipynb first.")
        logging.error("all_players.json not found. Please run worthIt.ipynb first.")
        return
    except Exception as e:
        print(f"❌ Error loading all_players.json: {e}")
        return

    all_player_details = {}
    
    # Process only first 3 players for testing
    test_player_ids = player_ids[:3]
    print(f"=== DEBUG: Testing with first 3 players: {test_player_ids} ===")
    
    for idx, player_id in enumerate(test_player_ids, 1):
        print(f"\n--- Processing player {idx}/{len(test_player_ids)}: {player_id} ---")
        player_data = fetch_player_details(player_id)
        if player_data:
            all_player_details[player_id] = player_data
            print(f"✅ Player {player_id} data retrieved successfully")
            # Save after each successful fetch to prevent data loss
            save_detailed_data(all_player_details)
        else:
            print(f"❌ Failed to get data for player {player_id}")
        
        logging.info(f"Progress: {idx}/{len(test_player_ids)} players processed ({(idx/len(test_player_ids))*100:.1f}%)")

    print(f"\n=== DEBUG: Final results ===")
    print(f"Total number of detailed player records collected: {len(all_player_details)}")
    logging.info(f"Total number of detailed player records collected: {len(all_player_details)}")
    logging.info("Script execution completed")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Script failed with error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)