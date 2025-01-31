import React, { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import PlayerComponent from '../components/PlayerComponent';
import { useHttpClient } from '../HttpClientContext';
import '../LiveMatchday/LiveMatchday.css';
import './TeamManagement.css';
interface TeamManagementProps {
  leagueId: string;
  userId: string;
}

interface Player {
  id: string; // Player ID
  teamId: string; // Team ID
  teamName: string; // Team name (if applicable)
  teamSymbol: string; // Team symbol (if applicable)
  userId: string; // User ID (if applicable)
  firstName: string; // Player's first name
  lastName: string; // Player's last name (optional)
  profile?: string; // Player profile (optional)
  status: number; // Player status
  position: number; // Player position
  number: number; // Player number
  averagePoints: number; // Average points
  totalPoints: number; // Total points
  marketValue: number; // Market value
  marketValueTrend: number; // Market value trend
  dayStatus: number; // Day status
  lo? : number
  mvgl?: number; // Market value gain/loss (optional)
  lst?: number; // Last status (optional)
}

const validFormations = ['3-4-3', '3-5-2', '4-2-4', '4-3-3', '4-4-2', '5-2-3', '5-3-2', '3-6-1', '4-5-1', '5-4-1'];

const TeamManagement: React.FC<TeamManagementProps> = ({ leagueId, userId }) => {
  const httpClient = useHttpClient();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedZones, setHighlightedZones] = useState<string[]>([]);

  const nameMapping: { [key: string]: string } = {
    'i': 'id',
    'tid': 'teamId',
    'n': 'firstName',
    'st': 'status',
    'pos': 'position',
    'mv': 'marketValue',
    'mvt': 'marketValueTrend',
    'p': 'totalPoints',
    'ap': 'averagePoints',
    'mdst': 'dayStatus',
    'mvgl': 'mvgl',
    'lst': 'lst',
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await httpClient.get<{ it: Player[] }>(`/v4/leagues/${leagueId}/squad`);
        setPlayers(data.it.map(player => {
          const mappedPlayer: Partial<Player> = {};
          for (const [shortName, longName] of Object.entries(nameMapping)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mappedPlayer[longName as keyof Player] = player[shortName as keyof typeof player] as any;
          }
          mappedPlayer.dayStatus = 'lo' in player ? 1 : 0;
          return mappedPlayer as Player;
        }) || []);
      } catch (error) {
        console.error('Error fetching players:', error);
        setError('Failed to fetch players. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, [httpClient, leagueId, userId]);

  const getBestPossibleFormation = (activePlayers: Player[]): string => {
    const defenders = activePlayers.filter(p => p.position === 2).length;
    const midfielders = activePlayers.filter(p => p.position === 3).length;
    const forwards = activePlayers.filter(p => p.position === 4).length;
    const formation = `${defenders}-${midfielders}-${forwards}`;
    
    if (validFormations.includes(formation)) {
      return formation;
    }

    // Find the closest valid formation
    const validFormationsCopy = [...validFormations];
    const validFormationsSorted = validFormationsCopy.sort((a, b) => {
      const [aD, aM, aF] = a.split('-').map(Number);
      const [bD, bM, bF] = b.split('-').map(Number);
      const aDiff = Math.abs(aD - defenders) + Math.abs(aM - midfielders) + Math.abs(aF - forwards);
      const bDiff = Math.abs(bD - defenders) + Math.abs(bM - midfielders) + Math.abs(bF - forwards);
      return aDiff - bDiff;
    });

    return validFormationsSorted[0];
  };

  const updateFormation = async (newPlayers: Player[]) => {
    const activePlayers = newPlayers.filter(p => p.dayStatus === 1);
    const formationType = getBestPossibleFormation(activePlayers);

    // Group players by position
    const goalkeepers = activePlayers.filter(p => p.position === 1);
    const defenders = activePlayers.filter(p => p.position === 2);
    const midfielders = activePlayers.filter(p => p.position === 3);
    const forwards = activePlayers.filter(p => p.position === 4);

    // Parse the formation
    const [defCount, midCount, fwdCount] = formationType.split('-').map(Number);

    // Create the players array with proper ordering and null placeholders
    const playerIds = [
      goalkeepers[0]?.id || null,
      ...defenders.slice(0, defCount).map(p => p.id),
      ...Array(defCount - defenders.length).fill(null),
      ...midfielders.slice(0, midCount).map(p => p.id),
      ...Array(midCount - midfielders.length).fill(null),
      ...forwards.slice(0, fwdCount).map(p => p.id),
      ...Array(fwdCount - forwards.length).fill(null)
    ].slice(0, 11); // Ensure we only have 11 entries

    const requestBody = {
      type: formationType,
      players: playerIds
    };

    try {
      await httpClient.post(`/v4/leagues/${leagueId}/lineup`, requestBody);
      setPlayers(newPlayers);
      setError(null);
    } catch (error) {
      console.error('Error updating formation:', error);
      setError('Failed to update formation. Please try again.');
    }
  };

  const highlightValidDropZones = useCallback((player: Player) => {
    const validZones = ['bench'];
    switch (player.position) {
      case 1:
        validZones.push('goalkeepers');
        break;
      case 2:
        validZones.push('defenders');
        break;
      case 3:
        validZones.push('midfielders');
        break;
      case 4:
        validZones.push('forwards');
        break;
    }

    // Highlight replaceable players
    const replaceablePositions = players.filter(p => 
      p.position === player.position && 
      p.dayStatus === 1 && 
      p.id !== player.id
    ).map(p => `player-${p.id}`);

    setHighlightedZones([...validZones, ...replaceablePositions]);
  }, [players]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDragStart = (start: any) => {
    const player = players.find(p => p.id === start.draggableId);
    if (player) {
      highlightValidDropZones(player);
    }
  };

  const onDragEnd = (result: DropResult) => {
    setHighlightedZones([]);
    const { destination, draggableId } = result;

    if (!destination) {
      return;
    }

    let newPlayers = Array.from(players);
    const movedPlayer = newPlayers.find(p => p.id === draggableId);

    if (!movedPlayer) {
      return;
    }

    console.log("Player being moved:", movedPlayer);

    const positionMap = {
      'forwards': 4,
      'midfielders': 3,
      'defenders': 2,
      'goalkeepers': 1
    };

    const isValidMove = destination.droppableId === 'bench' || 
                       movedPlayer.position === positionMap[destination.droppableId as keyof typeof positionMap];

    if (isValidMove) {
      // Update player status based on destination
      movedPlayer.dayStatus = destination.droppableId === 'bench' ? 0 : 1;

      // Remove the moved player from its original position
      newPlayers = newPlayers.filter(p => p.id !== movedPlayer.id);

      // If moving to active position, handle player replacement
      if (destination.droppableId !== 'bench') {
        const positionPlayers = newPlayers.filter(p => 
          p.position === movedPlayer.position && p.dayStatus === 1
        );

        // If there's a player at the destination position, move them to bench
        if (destination.index < positionPlayers.length) {
          const replacedPlayer = positionPlayers[destination.index];
          replacedPlayer.dayStatus = 0;
        }
      }

      // Add the moved player at the correct position
      if (destination.droppableId === 'bench') {
        newPlayers.push(movedPlayer);
        const benchPlayers = newPlayers.filter(p => p.dayStatus === 0);
        const sortedBenchPlayers = sortBenchPlayers(benchPlayers);
        newPlayers = [...newPlayers.filter(p => p.dayStatus === 1), ...sortedBenchPlayers];
      } else {
        const insertIndex = newPlayers.findIndex(p => 
          p.position === movedPlayer.position && p.dayStatus === 1
        );
        if (insertIndex === -1) {
          newPlayers.push(movedPlayer);
        } else {
          newPlayers.splice(insertIndex + destination.index, 0, movedPlayer);
        }
      }

      // Ensure we don't have more than 11 active players
      const activePlayers = newPlayers.filter(p => p.dayStatus === 1);
      if (activePlayers.length > 11) {
        const excessPlayers = activePlayers.slice(11);
        excessPlayers.forEach(player => {
          player.dayStatus = 0;
        });
      }

      console.log("Updated player list:", newPlayers);
      updateFormation(newPlayers);
    } else {
      console.log("Invalid move - wrong position");
    }
  };

  const renderPlayer = (player: Player, index: number) => (
    <Draggable key={player.id} draggableId={player.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`player-container 
            ${highlightedZones.includes(`player-${player.id}`) ? 'highlighted' : ''}
            ${snapshot.isDragging ? 'is-dragging' : ''}
            ${snapshot.draggingOver ? 'replacement-indicator' : ''}`}
          data-position={player.position}
        >
          <PlayerComponent player={player} />
        </div>
      )}
    </Draggable>
  );

  const renderFormation = () => {
    const positions = [
      { name: 'forwards', filter: (p: Player) => p.position === 4 && p.dayStatus === 1 },
      { name: 'midfielders', filter: (p: Player) => p.position === 3 && p.dayStatus === 1 },
      { name: 'defenders', filter: (p: Player) => p.position === 2 && p.dayStatus === 1 },
      { name: 'goalkeepers', filter: (p: Player) => p.position === 1 && p.dayStatus === 1 },
    ];

    return (
      <div className="football-pitch">
        {positions.map(({ name, filter }) => (
          <Droppable key={name} droppableId={name} direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`row ${name} ${highlightedZones.includes(name) ? 'highlighted' : ''}`}
              >
                {players.filter(filter).map((player, index) =>
                  renderPlayer(player, index)
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    );
  };

  const sortBenchPlayers = (players: Player[]) => {
    return players.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return b.marketValue - a.marketValue;
    });
  };

  const renderBench = (benchPlayers: Player[]) => {
    const sortedBenchPlayers = sortBenchPlayers(benchPlayers);

    return (
      <div className="bench">
        <h3>Bank</h3>
        <Droppable droppableId="bench" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`bench-players ${highlightedZones.includes('bench') ? 'highlighted' : ''}`}
            >
              {sortedBenchPlayers.map((player, index) => renderPlayer(player, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!players || players.length === 0) {
    return <div>No players found.</div>;
  }

  // const activePlayers = players.filter(p => p.dayStatus === 1);
  const benchPlayers = players.filter(p => p.dayStatus !== 1);

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="team-management">
        {error && <div className="error-message">{error}</div>}
        {renderFormation()}
        {renderBench(benchPlayers)}
      </div>
    </DragDropContext>
  );
};

export default TeamManagement;
