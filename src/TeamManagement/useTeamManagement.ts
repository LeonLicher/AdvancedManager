import { useCallback, useEffect, useState } from 'react';
import { DropResult } from 'react-beautiful-dnd';
import { useHttpClient } from '../HttpClientContext';
import { PlayerMovementHandler } from './PlayerMovementHandler';
import { nameMapping, Player } from './types';
import { getBestPossibleFormation } from './utils';

/**
 * Custom hook to manage team state and operations
 */
export const useTeamManagement = (leagueId: string, userId: string) => {
  const httpClient = useHttpClient();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedZones, setHighlightedZones] = useState<string[]>([]);

  // Fetch players data
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

  // Update formation on the server
  const updateFormation = useCallback(async (newPlayers: Player[]) => {
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
  }, [httpClient, leagueId]);

  // Highlight valid drop zones for a player
  const highlightValidDropZones = useCallback((player: Player) => {
    const validZones = ['bench'];
    
    // Allow specific position zones
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

    // Highlight all player positions of the same type for repositioning
    const samePositionPlayers = players.filter(p => 
      p.position === player.position && 
      p.id !== player.id
    ).map(p => `player-${p.id}`);

    setHighlightedZones([...validZones, ...samePositionPlayers]);
  }, [players]);

  // Handle drag start
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDragStart = useCallback((start: any) => {
    const player = players.find(p => p.id === start.draggableId);
    if (player) {
      highlightValidDropZones(player);
    }
  }, [players, highlightValidDropZones]);

  // Handle drag end
  const onDragEnd = useCallback((result: DropResult) => {
    setHighlightedZones([]);
    
    const newPlayers = PlayerMovementHandler.handlePlayerMovement(result, players);
    if (newPlayers) {
      console.log("Updated player list:", newPlayers);
      updateFormation(newPlayers);
    }
  }, [players, updateFormation]);

  return {
    players,
    isLoading,
    error,
    highlightedZones,
    onDragStart,
    onDragEnd
  };
}; 