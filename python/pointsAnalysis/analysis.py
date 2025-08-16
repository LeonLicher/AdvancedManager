from collections import Counter, defaultdict
from .mappings import EVENT_ID_TO_NAME


def analyze_events(data):
    """Analyzes the event data, counts events, and returns counts."""
    if not data or 'events' not in data or not isinstance(data['events'], list):
        print("Error: Invalid or missing 'events' data in the response.")
        return None

    # Corrected key: Use 'eti' instead of 'eventId'
    event_ids = [event.get('eti') for event in data['events']
                 if event.get('eti') is not None]

    if not event_ids:
        print("No event type IDs ('eti') found in the data.")
        return Counter()

    event_names = [EVENT_ID_TO_NAME.get(
        eid, f"Unknown Event ({eid})") for eid in event_ids]
    event_counts = Counter(event_names)

    print("\n--- Event Analysis ---")
    for name, count in event_counts.items():
        print(f"- {name}: {count}")
    print("--------------------\n")

    # Calculate total points for each event type
    event_points = defaultdict(int)
    for event in data['events']:
        event_id = event.get('eti')
        points = event.get('p', 0)
        if event_id is not None:
            event_name = EVENT_ID_TO_NAME.get(
                event_id, f"Unknown Event ({event_id})")
            event_points[event_name] += points

    print("\n--- Event Points Analysis ---")
    for name, total_points in event_points.items():
        print(f"- {name}: {total_points} points")
    print("-----------------------------\n")

    return dict(event_points)


def analyze_days_range(all_days_data, day_start=1, day_end=30):
    """Analyzes events across multiple days from the all_days_data structure.

    Args:
        all_days_data (dict): The all_days data loaded from storage
        day_start (int): First day to include in analysis
        day_end (int): Last day to include in analysis

    Returns:
        dict: Aggregated event points
    """
    if not all_days_data or "days" not in all_days_data:
        print("Error: Invalid or missing days data")
        return None

    total_event_points = defaultdict(int)
    events_by_day = {}

    for day in range(day_start, day_end + 1):
        day_str = str(day)
        if day_str in all_days_data["days"]:
            day_data = all_days_data["days"][day_str]
            # Analyze this day's data
            day_points = analyze_events(day_data)
            if day_points:
                events_by_day[day] = day_points
                # Accumulate points
                for event_name, points in day_points.items():
                    total_event_points[event_name] += points

    if not events_by_day:
        print(f"No data found for days {day_start}-{day_end}")
        return None

    # Print summary of all days
    print("\n=== Summary Across All Days ===")
    for event_name, total_points in sorted(total_event_points.items(),
                                           key=lambda x: x[1], reverse=True):
        print(f"- {event_name}: {total_points} points")
    print("=============================\n")

    return dict(total_event_points)
