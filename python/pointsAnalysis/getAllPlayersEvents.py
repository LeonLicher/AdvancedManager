from .config import PLAYER_ID, DAY_NUMBER, COMPETITION_ID, BASE_URL
from .kickbase_api import get_player_events
from .analysis import analyze_events, analyze_days_range
from .visualization import plot_event_counts
from .data_storage import save_player_events, load_player_events, aggregate_player_stats
import argparse


def fetch_and_save_data(player_id, day_start, day_end, competition_id):
    """Fetches player data for multiple days and saves it to files."""
    print(
        f"Fetching data for Player ID: {player_id}, Days: {day_start}-{day_end}...")

    for day in range(day_start, day_end + 1):
        print(f"Processing day {day}...")

        # Fetch data
        player_data = get_player_events(player_id, day, competition_id)

        if player_data:
            # Save the data
            save_player_events(player_id, day, player_data)
        else:
            print(f"Failed to retrieve player data for day {day}, skipping.")

    print(f"Data fetching and saving complete for days {day_start}-{day_end}.")


def analyze_saved_data(player_id, day_start, day_end):
    """Analyzes previously saved data."""
    print(
        f"Analyzing data for Player ID: {player_id}, Days: {day_start}-{day_end}...")

    # Load all days data
    all_days_data = load_player_events(player_id)

    if all_days_data:
        # Use the more detailed analysis function
        total_event_points = analyze_days_range(
            all_days_data, day_start, day_end)

        # Visualize aggregated data
        if total_event_points:
            plot_event_counts(total_event_points, player_id,
                              f"{day_start}-{day_end}")
        else:
            print("No data to analyze.")
    else:
        print(f"No saved data found for player {player_id}")

    print("Analysis complete.")


# --- Main Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Kickbase Player Event Analysis")
    parser.add_argument("--fetch", action="store_true",
                        help="Fetch and save player data")
    parser.add_argument("--analyze", action="store_true",
                        help="Analyze saved player data")
    parser.add_argument("--player", type=str,
                        default=PLAYER_ID, help="Player ID to analyze")
    parser.add_argument("--day-start", type=int, default=1,
                        help="Starting day number")
    parser.add_argument("--day-end", type=int, default=30,
                        help="Ending day number")
    parser.add_argument("--competition", type=str,
                        default=COMPETITION_ID, help="Competition ID")

    args = parser.parse_args()

    # If no specific action is specified, do both
    if not args.fetch and not args.analyze:
        args.fetch = True
        args.analyze = True

    if args.fetch:
        fetch_and_save_data(args.player, args.day_start,
                            args.day_end, args.competition)

    if args.analyze:
        analyze_saved_data(args.player, args.day_start, args.day_end)
