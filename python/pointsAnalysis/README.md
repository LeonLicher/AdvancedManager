# Kickbase Player Event Analysis

A Python tool for analyzing player events in Kickbase.

## Features

- Fetch player event data from the Kickbase API
- Save data to local files for later analysis (appends, doesn't overwrite)
- Analyze events to identify positive and negative points
- Visualize event data with pie charts
- Support for analyzing multiple days and ranges

## Usage

### Basic Usage

Run the tool with default settings:

```bash
python -m pointsAnalysis.getAllPlayersEvents
```

This will fetch and analyze data for the default player (configured in config.py) for days 1-30.

### Command-Line Options

```bash
python -m pointsAnalysis.getAllPlayersEvents --help
```

Available options:

- `--fetch`: Only fetch and save player data
- `--analyze`: Only analyze previously saved data
- `--player`: Player ID to analyze (defaults to PLAYER_ID in config.py)
- `--day-start`: Starting day number (default: 1)
- `--day-end`: Ending day number (default: 30)
- `--competition`: Competition ID (defaults to COMPETITION_ID in config.py)

### Examples

Fetch data for a specific player:
```bash
python -m pointsAnalysis.getAllPlayersEvents --fetch --player 7226
```

Analyze previously saved data:
```bash
python -m pointsAnalysis.getAllPlayersEvents --analyze --player 7226 --day-start 1 --day-end 10
```

## Data Storage

Event data is stored within the package directory:

```
pointsAnalysis/
├── data/
│   └── player_{PLAYER_ID}/
│       ├── day_{DAY_NUMBER}.json
│       ├── day_{DAY_NUMBER+1}.json
│       └── all_days.json
```

- Individual day data files contain the raw API response for that day
- The `all_days.json` file contains a summary of all days for quicker analysis