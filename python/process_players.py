import json
import pandas as pd
from pathlib import Path

def process_players_data():
    # Read the detailed players JSON file
    with open('../public/detailed_players.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Convert players data to list
    players_list = []
    for player_id, player in data['players'].items():
        player_data = {
            'id': player['i'],
            'firstName': player['fn'],
            'lastName': player['ln'],
            'fullName': f"{player['fn']} {player['ln']}",
            'team': player.get('tn', ''),
            'position': player['pos'],
            'status': player.get('st', 0),
            'statusText': player.get('stxt', ''),
            'totalPoints': player.get('tp', 0),
            'averagePoints': player.get('ap', 0),
            'marketValue': player.get('mv', 0),
            'goals': player.get('g', 0),
            'assists': player.get('a', 0),
            'minutesPlayed': player.get('sec', 0) / 60,  # Convert seconds to minutes
        }
        
        # Calculate additional metrics
        if player_data['marketValue'] > 0:
            player_data['pointsPerMillion'] = round(player_data['averagePoints'] / (player_data['marketValue'] / 1000000), 2)
        else:
            player_data['pointsPerMillion'] = 0

        # Add position text
        position_map = {1: 'Torwart', 2: 'Abwehr', 3: 'Mittelfeld', 4: 'Sturm'}
        player_data['positionText'] = position_map.get(player_data['position'], '')

        players_list.append(player_data)

    # Convert to DataFrame for easier processing
    df = pd.DataFrame(players_list)

    # Calculate market value ranges for better visualization
    df['marketValueRange'] = pd.qcut(df['marketValue'], q=5, labels=['Very Low', 'Low', 'Medium', 'High', 'Very High'])
    
    # Calculate performance score (normalized)
    df['performanceScore'] = (
        df['totalPoints'] * 0.4 +
        df['averagePoints'] * 0.3 +
        df['pointsPerMillion'] * 0.3
    )
    
    # Normalize performance score
    df['performanceScore'] = (df['performanceScore'] - df['performanceScore'].min()) / (df['performanceScore'].max() - df['performanceScore'].min())

    # Save processed data
    output = {
        'players': df.to_dict(orient='records'),
        'metadata': {
            'totalPlayers': len(df),
            'averageMarketValue': round(df['marketValue'].mean(), 2),
            'averageTotalPoints': round(df['totalPoints'].mean(), 2),
            'positionCounts': df['position'].value_counts().to_dict(),
            'teamCounts': df['team'].value_counts().to_dict()
        }
    }

    # Save to file
    with open('../public/processed_players.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("Data processing completed. File saved as processed_players.json")

    # Create position-specific files for better performance
    for pos in df['position'].unique():
        pos_data = {
            'players': df[df['position'] == pos].to_dict(orient='records')
        }
        with open(f'../public/players_position_{pos}.json', 'w', encoding='utf-8') as f:
            json.dump(pos_data, f, ensure_ascii=False, indent=2)

    print("Position-specific files created")

if __name__ == "__main__":
    process_players_data() 