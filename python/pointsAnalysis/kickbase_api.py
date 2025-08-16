import requests
import json
from .config import BASE_URL, BEARER_TOKEN

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"  # Added Accept header for consistency
}


def get_player_events(player_id, day_number, competition_id):
    """Fetches event history for a player on a specific day."""
    endpoint = f"/competitions/{competition_id}/playercenter/{player_id}"
    url = f"{BASE_URL}{endpoint}"
    params = {
        'dayNumber': day_number
    }

    print(f"Fetching data from: {url} with params: {params}")

    try:
        response = requests.get(url, headers=HEADERS,
                                params=params, verify=False)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        print("Request Successful!")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error during request: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response Status Code: {e.response.status_code}")
            try:
                print(f"Response Body: {e.response.json()}")
            except json.JSONDecodeError:
                print(f"Response Body: {e.response.text}")
        return None
    except json.JSONDecodeError:
        print("Error decoding JSON response")
        print(
            f"Response Text: {response.text if 'response' in locals() else 'No response object'}")
        return None
