import React, { useCallback, useEffect, useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import PlayerComponent from '../components/PlayerComponent';
import PlayerEventLog from '../components/PlayerEventLog';
import './LiveMatchday.css';
import { useHttpClient } from '../HttpClientContext';
import CustomDropdown from '../components/CustomDropdown/CustomDropdown';

interface Manager {
  i: string;         // User ID
  lp: number[];      // Points history
  mdp: number;       // Matchday points
  pa: boolean;       // Participation active
  unm: string;       // User name
}

// Update the Player interface
export interface Player {
  i: string;       // Player ID
  n: string;       // Name
  tid: number;     // Team ID
  p: number;       // Points
  st: number;      // Status (0 = not started, 3/5 = playing)
  md?: string;     // Match date
  mi: number;      // Match ID
  mst?: number;    // Match status
  mt?: number;     // Minutes played
  mtd?: string;    // Minutes detail
}

interface LiveMatchdayProps {
  leagueId: string;
  userId: string;
}

interface LeagueUser {
  pt: number;        // Season points
  i: string;         // User ID
  name: string;      // User name
  profile: string;   // Profile image
  mdp: number;       // Matchday points
  rank: number;      // Season rank
  mdRank: number;    // Matchday rank
  teamValue: number; // Team value
  pointsHistory: number[]; // Points history
}
interface LeagueRanking {
  ti: string;      // League title
  cpi: string;     // Current period ID
  ish: boolean;    // Is something hidden?
  us: User[];      // Users array
  day: number;     // Current day
  shmdn: number;   // Show matchday number
  sn: string;      // Season
  il: boolean;     // Is live?
  nd: number;      // Number of days
  lfmd: number;    // Last finished matchday
  ia: boolean;     // Is active?
}

interface User {
  iapl: boolean;   // Is something?
  i: string;       // User ID
  n: string;       // Name
  adm: boolean;    // Is admin
  sp: number;      // Season points
  mdp: number;     // Matchday points
  shp: number;     // Something points
  tv: number;      // Team value
  spl: number;     // Season position/rank
  mdpl: number;    // Matchday position/rank
  pa: boolean;     // Participation active
  lp: number[];    // List of points (historical)
}

export interface PlayerData {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  position: number;  // 1 = GK, 2 = DEF, 3 = MID, 4 = FWD
  marketValue: number;
  averagePoints: number;
  totalPoints: number;
}

export interface AllPlayersData {
  players: {
    [key: string]: PlayerData;
  };
}

// Add these new interfaces
interface PlayerEvent {
  ei: string;    // Event ID
  eti: number;   // Event Type ID
  p: number;     // Points
  mt: number;    // Match Time
  att?: number;  // Attribute
  ke?: number;   // Key Event
  cei?: string;  // Connected Event ID
  ddi?: string;  // Detail Data ID
  ddp?: {        // Detail Data Parameters
    goalBy?: string;
    // Add other possible parameters as needed
  };
}

export interface PlayerLiveData {
  i: string;      // Player ID
  tid: string;    // Team ID
  n: string;      // Name
  t1: number;     // Team 1 ID
  t2: number;     // Team 2 ID
  t1g: number;    // Team 1 Goals
  t2g: number;    // Team 2 Goals
  p: number;      // Points
  st: number;     // Status
  mi: number;     // Match ID
  mt: number;     // Match Time
  mtd: string;    // Match Time Display
  md: string;     // Match Date
  mst: number;    // Match Status
  k: number[];    // Key Events
  events: PlayerEvent[];
}

const LiveMatchday: React.FC<LiveMatchdayProps> = ({ leagueId, userId }) => {
  const httpClient = useHttpClient();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [matchData, setMatchData] = useState<Player[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [leagueUsers, setLeagueUsers] = useState<LeagueUser[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerLiveData, setPlayerLiveData] = useState<PlayerLiveData | null>(null);
  const [showEventLog, setShowEventLog] = useState(false);
  const [allPlayers, setAllPlayers] = useState<AllPlayersData | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const liveData = await httpClient.get<{ us: Manager[], lp: Player[] }>(
        `/v4/leagues/${leagueId}/users/${selectedManager || userId}/teamcenter`
      );
      setManagers(liveData.us);
      setMatchData(liveData.lp);
      
      if (liveData.us.length > 0 && !selectedManager) {
        setSelectedManager(userId);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  }, [leagueId, httpClient, userId, selectedManager]);

  const fetchLeagueUsers = useCallback(async () => {
    try {
      const response = await httpClient.get<LeagueRanking>(`/v4/leagues/${leagueId}/ranking`); // ?dayNumber=10 possible
      
      // Transform the data to match your component's needs
      const leagueUsers: LeagueUser[] = response.us.map(user => ({
        pt: user.sp,           // Season points
        i: user.i,             // User ID
        name: user.n,          // User name
        profile: '',           // Profile image (if needed)
        mdp: user.mdp,         // Matchday points
        rank: user.spl,        // Season rank
        mdRank: user.mdpl,     // Matchday rank
        teamValue: user.tv,    // Team value
        pointsHistory: user.lp // Points history
      }));

      setLeagueUsers(leagueUsers);
    } catch (error) {
      console.error('Error fetching league users:', error);
    }
  }, [leagueId, httpClient]);

  const handlePlayerClick = useCallback(async (player: Player) => {
    setSelectedPlayer(player);
    try {
      const liveData = await httpClient.get<PlayerLiveData>(
        `/v4/competitions/1/playercenter/${player.i}?leagueId=${leagueId}`
      );
      setPlayerLiveData(liveData);
      setShowEventLog(true);
    } catch (error) {
      console.error('Error fetching player live data:', error);
      setPlayerLiveData(null);
    }
  }, [httpClient, leagueId]);

  useEffect(() => {
    fetchLiveData();
    fetchLeagueUsers();

    const intervalId = setInterval(() => {
      fetchLiveData();
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [fetchLiveData, fetchLeagueUsers]);

  useEffect(() => {
    fetch('/Kickbase/all_players.json')
      .then(response => response.json())
      .then((data: AllPlayersData) => setAllPlayers(data))
      .catch(error => console.error('Error loading player data:', error));
  }, []);

  const renderFormation = () => {
    if (!matchData || !allPlayers) return null;

    // Create formation lines based on player position from all_players.json
    const formation: Player[][] = [[], [], [], []]; // FWD, MID, DEF, GK (reversed order)
    
    matchData.forEach(player => {
      const playerData = allPlayers.players[player.i];
      if (playerData) {
        // Reverse the position index (4 - position instead of position - 1)
        const positionIndex = 4 - playerData.position;
        formation[positionIndex].push(player);
      } else {
        // Fallback if player not found in all_players.json
        console.warn(`Player ${player.n} (ID: ${player.i}) not found in player data`);
        formation[0].push(player); // Default to forwards (now at index 0)
      }
    });

    return (
      <div className="formation-container">
        {formation.map((line, index) => (
          <div key={index} className={`formation-line position-${3-index}`}>  {/* Reverse the position class */}
            {line.map(player => (
              <PlayerComponent
                key={player.i}
                player={{
                  id: player.i,
                  firstName: "",
                  lastName: player.n,
                  marketValue: 0,
                  totalPoints: player.p || 0,
                  averagePoints: 0,
                  gameDate: player.md || '',
                }}
                showOnlyPoints={true}
                onClick={() => handlePlayerClick(player)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };
  // Add this function to get sorted managers with ranks
  const getSortedManagersWithRanks = () => {

    return managers
      .sort((a, b) => b.mdp - a.mdp)  // Sort by matchday points
      .map((manager, index) => ({
        ...manager,
        rank: index + 1,
        totalPoints: manager.mdp
      }));
  };

  return (
    <div className="live-matchday">

      <div className="live-matchday-content">
        <div className="team-display">
          <div className="team-summary">
          <div className="manager-selector">
        <CustomDropdown
          options={getSortedManagersWithRanks()}
          value={selectedManager}
          onChange={setSelectedManager}
          imagePath="/Kickbase"
        />
      </div>
            <div className="total-points">
              Punkte: <span className="points-value">{managers.find(m => m.i === selectedManager)?.mdp || 0}</span>
            </div>
          </div>
          <div className="formation-container">
            {renderFormation()}
          </div>
        </div>
        <Leaderboard managers={managers} leagueUsers={leagueUsers} />
      </div>
      {showEventLog && selectedPlayer && playerLiveData && (
        <PlayerEventLog 
          player={selectedPlayer} 
          liveData={playerLiveData} 
          onClose={() => setShowEventLog(false)}
        />
      )}
      
    </div>
    
  );
};

export default LiveMatchday;