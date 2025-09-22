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

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
BASE_URL = "https://api.kickbase.com/v4/competitions/1/players/{}?leagueId=5378755"
BEARER_TOKEN = os.getenv('BEARER_TOKEN')
if not BEARER_TOKEN:
    raise ValueError("BEARER_TOKEN not found in environment variables. Please check your .env file.")

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json"
}

def fetch_player_details(player_id):
    url = BASE_URL.format(player_id)
    logging.info(f"Fetching detailed data for player ID: {player_id}")

    # Add random delay between 0.001 and 0.1 seconds
    delay = random.uniform(0.01, 0.1)
    logging.info(f"Waiting {delay:.2f} seconds before request")
    time.sleep(delay)
    
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        logging.info(f"Successfully fetched data for player ID: {player_id}")
        return response.json()
    elif response.status_code == 429:  # Too Many Requests
        logging.warning("Rate limit hit. Waiting 60 seconds...")
        time.sleep(60)  # Wait a minute if we hit rate limit
        return fetch_player_details(player_id)  # Retry the request
    else:
        logging.warning(f"Failed to fetch data for player {player_id}. Status code: {response.status_code}")
        return None

def save_detailed_data(all_player_details):
    logging.info("Saving detailed player data to JSON file")
    data = {
        "players": all_player_details,
        "date": datetime.datetime.today().strftime('%Y-%m-%d')
    }
    with open('detailed_players.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logging.info("Detailed data saved successfully")

def main():
    logging.info("Starting to collect detailed player data")
    
    # First, load the existing player IDs from all_players.json
    try:
        with open('all_players.json', 'r', encoding='utf-8') as f:
            basic_data = json.load(f)
            player_ids = list(basic_data['players'].keys())
            total_players = len(player_ids)
            logging.info(f"Found {total_players} players to process")
    except FileNotFoundError:
        logging.error("all_players.json not found. Please run worthIt.ipynb first.")
        return

    all_player_details = {}
    
    for idx, player_id in enumerate(player_ids, 1):
        player_data = fetch_player_details(player_id)
        if player_data:
            all_player_details[player_id] = player_data
            # Save after each successful fetch to prevent data loss
            save_detailed_data(all_player_details)
        
        logging.info(f"Progress: {idx}/{total_players} players processed ({(idx/total_players)*100:.1f}%)")

    logging.info(f"Total number of detailed player records collected: {len(all_player_details)}")
    logging.info("Script execution completed")