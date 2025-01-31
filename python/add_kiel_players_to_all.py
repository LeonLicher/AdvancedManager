import json

# Load the existing all players
with open('./all_players.json', 'r', encoding='utf-8') as f:
    all_players = json.load(f)

# Kiel players data
kiel_players = [
    {"i": "380", "ln": "Holtby", "pos": 3, "mv": 765535, "ap": 27, "tp": 27 * 11},
    {"i": "1529", "ln": "Skrzybski", "pos": 4, "mv": 1575871, "ap": 33, "tp": 33 * 11},
    {"i": "1565", "ln": "Schulz", "pos": 3, "mv": 500000, "ap": 5, "tp": 5 * 11},
    {"i": "1691", "ln": "Porath", "pos": 3, "mv": 3264532, "ap": 38, "tp": 38 * 11},
    {"i": "1844", "ln": "Erras", "pos": 2, "mv": 4879430, "ap": 80, "tp": 80 * 11},
    {"i": "2024", "ln": "Engelhardt", "pos": 1, "mv": 500000, "ap": 0, "tp": 0},
    {"i": "2135", "ln": "Arp", "pos": 4, "mv": 500000, "ap": -7, "tp": -7 * 11},
    {"i": "2568", "ln": "Weiner", "pos": 1, "mv": 4365302, "ap": 55, "tp": 55 * 11},
    {"i": "2762", "ln": "Becker", "pos": 2, "mv": 1629643, "ap": 33, "tp": 33 * 11},
    {"i": "2943", "ln": "Geschwill", "pos": 2, "mv": 3050033, "ap": 65, "tp": 65 * 11},
    {"i": "3020", "ln": "Puchacz", "pos": 2, "mv": 1012911, "ap": 23, "tp": 23 * 11},
    {"i": "3100", "ln": "Kleine-Bekel", "pos": 2, "mv": 500000, "ap": 0, "tp": 0},
    {"i": "3267", "ln": "Dähne", "pos": 1, "mv": 500000, "ap": 0, "tp": 0},
    {"i": "3268", "ln": "Komenda", "pos": 2, "mv": 1855308, "ap": 29, "tp": 29 * 11},
    {"i": "3275", "ln": "Pichler", "pos": 4, "mv": 1328915, "ap": 34, "tp": 34 * 11},
    {"i": "3545", "ln": "Rosenboom", "pos": 2, "mv": 3766343, "ap": 37, "tp": 37 * 11},
    {"i": "6199", "ln": "Machino", "pos": 4, "mv": 5758824, "ap": 54, "tp": 54 * 11},
    {"i": "6200", "ln": "Ivezic", "pos": 3, "mv": 1827079, "ap": 51, "tp": 51 * 11},
    {"i": "6201", "ln": "Remberg", "pos": 3, "mv": 690817, "ap": 29, "tp": 29 * 11},
    {"i": "6203", "ln": "Johansson", "pos": 2, "mv": 1743068, "ap": 50, "tp": 50 * 11},
    {"i": "7484", "ln": "Bernhardsson", "pos": 4, "mv": 1836268, "ap": 33, "tp": 33 * 11},
    {"i": "8224", "ln": "Knudsen", "pos": 3, "mv": 2487564, "ap": 27, "tp": 27 * 11},
    {"i": "8249", "ln": "Harres", "pos": 4, "mv": 6672480, "ap": 74, "tp": 74 * 11},
    {"i": "8383", "ln": "Gigovic", "pos": 3, "mv": 4395663, "ap": 43, "tp": 43 * 11},
    {"i": "9504", "ln": "Kelati", "pos": 3, "mv": 500000, "ap": 43, "tp": 43 * 11},
    {"i": "9639", "ln": "Javorçek", "pos": 2, "mv": 500000, "ap": -13, "tp": -13 * 11},
    {"i": "9796", "ln": "Zec", "pos": 2, "mv": 4610101, "ap": 0, "tp": 0}
]


# Add Kiel players to all_players
for player in kiel_players:
    player_id = player["i"]
    if player_id not in all_players["players"]:
        all_players["players"][player_id] = {
            "id": player["i"],
            "name": player["ln"],
            "teamId": "51",  # Kiel's team ID
            "position": player["pos"],
            "marketValue": player["mv"],
            "averagePoints": player["ap"],
            "totalPoints": 0  # Set to 0 as per the format in all_players.json
        }

# Add Kiel's team ID to valid_team_ids if not present
if 51 not in all_players["valid_team_ids"]:
    all_players["valid_team_ids"].append(51)

# Save the updated all players
with open('all_players.json', 'w', encoding='utf-8') as f:
    json.dump(all_players, f, ensure_ascii=False, indent=2) 