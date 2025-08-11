import json
import os
import sys
from pathlib import Path
from collections import defaultdict


def ensure_data_directory():
    """Creates data directory if it doesn't exist."""
    # Get the package directory path
    package_dir = Path(__file__).parent
    data_dir = package_dir / "data"
    data_dir.mkdir(exist_ok=True)
    return data_dir


def save_player_events(player_id, day_number, data):
    """Saves player event data to a JSON file.

    Args:
        player_id (str): The player's ID
        day_number (str or int): The day number of the event
        data (dict): The player event data to save
    """
    data_dir = ensure_data_directory()
    player_dir = data_dir / f"player_{player_id}"
    player_dir.mkdir(exist_ok=True)

    # Save daily data
    file_path = player_dir / f"day_{day_number}.json"
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Data saved to {file_path}")

    # Update the all_days summary file
    summary_file = player_dir / "all_days.json"

    if summary_file.exists():
        # Load existing summary
        with open(summary_file, 'r') as f:
            all_data = json.load(f)
    else:
        # Create new summary structure
        all_data = {"days": {}}

    # Add or update the current day's data
    all_data["days"][str(day_number)] = data

    # Save updated summary
    with open(summary_file, 'w') as f:
        json.dump(all_data, f, indent=2)

    print(f"Summary data updated in {summary_file}")


def load_player_events(player_id, day_number=None):
    """Loads player event data from a JSON file.

    Args:
        player_id (str): The player's ID
        day_number (str or int, optional): The specific day to load. If None, loads all days.

    Returns:
        dict: The player event data or None if file doesn't exist
    """
    data_dir = ensure_data_directory()
    player_dir = data_dir / f"player_{player_id}"

    if not player_dir.exists():
        print(f"No data directory for player {player_id}")
        return None

    if day_number is not None:
        # Load specific day
        file_path = player_dir / f"day_{day_number}.json"
        if not file_path.exists():
            print(f"No data for player {player_id} on day {day_number}")
            return None

        with open(file_path, 'r') as f:
            return json.load(f)
    else:
        # Load all days summary
        summary_file = player_dir / "all_days.json"
        if not summary_file.exists():
            print(f"No summary data for player {player_id}")
            return None

        with open(summary_file, 'r') as f:
            return json.load(f)


def aggregate_player_stats(player_id, day_start=1, day_end=30):
    """Aggregates player statistics across multiple days.

    Args:
        player_id (str): The player's ID
        day_start (int): First day to include
        day_end (int): Last day to include

    Returns:
        dict: Aggregated event points or None if no data found
    """
    data = load_player_events(player_id)
    if not data or "days" not in data:
        return None

    # Initialize counters
    total_event_points = defaultdict(int)
    days_processed = []

    # Process each day in the specified range
    for day in range(day_start, day_end + 1):
        day_str = str(day)
        if day_str in data["days"]:
            day_data = data["days"][day_str]

            # Process events for this day
            if "events" in day_data:
                for event in day_data["events"]:
                    event_id = event.get("eti")
                    points = event.get("p", 0)

                    if event_id is not None:
                        from .mappings import EVENT_ID_TO_NAME
                        event_name = EVENT_ID_TO_NAME.get(
                            event_id, f"Unknown Event ({event_id})")
                        total_event_points[event_name] += points

            days_processed.append(day)

    if not days_processed:
        print(
            f"No data found for player {player_id} in days {day_start}-{day_end}")
        return None

    print(f"Processed data for player {player_id} from days: {days_processed}")
    return dict(total_event_points)
