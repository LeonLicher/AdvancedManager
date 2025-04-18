import React, { useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import LoadingOverlay from '../components/LoadingOverlay/LoadingOverlay';
import HttpClient from '../httpClient';
import Bench from './Bench';
import TeamFormation from './TeamFormation';
import './TeamManagement.scss';
import { Player, TeamManagementProps } from './types';
import { useTeamManagement } from './useTeamManagement';
import { generateBestEleven, getBestPossibleFormation } from './utils';

/**
 * TeamManagement component for managing player positions
 */
const TeamManagement: React.FC<TeamManagementProps> = ({ leagueId, userId }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  
  const {
    players,
    isLoading,
    error,
    highlightedZones,
    onDragStart,
    onDragEnd,
    setPlayers
  } = useTeamManagement(leagueId, userId);

  // Add this function to ensure player properties are properly set
  const preparePlayersForProcessing = (players: Player[]): Player[] => {
    return players.map(player => ({
      ...player,
      // Ensure name property is set
      name: player.name || `${player.firstName} ${player.lastName || ''}`.trim(),
      // Ensure points property is set as alias for averagePoints
      points: player.points || player.averagePoints
    }));
  };

  const handleGenerateBestEleven = async () => {
    setIsOptimizing(true);
    setOptimizationError(null);
    try {
      // Create HttpClient
      const httpClient = new HttpClient(
        "https://kickbase.com", 
        "https://kickbackend.onrender.com"
      );
      
      // Prepare players before processing
      const preparedPlayers = preparePlayersForProcessing(players);
      
      // Generate best eleven
      const bestEleven = await generateBestEleven(preparedPlayers, httpClient);
      
      if (bestEleven && bestEleven.length > 0) {
        // Update players status based on best eleven
        const updatedPlayers = players.map(player => ({
          ...player,
          dayStatus: bestEleven.some(p => p.id === player.id) ? 1 : 0
        }));
        
        // Update the players state
        setPlayers(updatedPlayers);
        
        // Log the formation
        const formation = getBestPossibleFormation(bestEleven);
        console.log(`Generated best eleven with formation: ${formation}`);
      } else {
        setOptimizationError('Could not generate best eleven. Try again later.');
      }
    } catch (error) {
      console.error('Error generating best eleven:', error);
      setOptimizationError(error instanceof Error ? error.message : 'Failed to generate best eleven');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Error state
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Empty state
  if (!players || players.length === 0) {
    return <div>No players found.</div>;
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="team-management">
        <LoadingOverlay isLoading={isOptimizing} text="" />

        {(error || optimizationError) && (
          <div className="error-message">{error || optimizationError}</div>
        )}
        <div className="team-management__controls">
          <button 
            className="team-management__generate-btn"
            onClick={handleGenerateBestEleven}
            disabled={isOptimizing}
          >
            {isOptimizing ? '⏳' : '✨'} {
              isOptimizing ? 'Optimiere...' : 'Optimiere Startelf mit KI'
            }
          </button>
        </div>
        <TeamFormation 
          players={players} 
          highlightedZones={highlightedZones} 
        />
        <Bench 
          players={players} 
          highlightedZones={highlightedZones} 
        />
      </div>
    </DragDropContext>
  );
};

export default TeamManagement;
