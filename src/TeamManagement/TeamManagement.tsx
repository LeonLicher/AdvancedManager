import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import Bench from './Bench';
import TeamFormation from './TeamFormation';
import './TeamManagement.scss';
import { TeamManagementProps } from './types';
import { useTeamManagement } from './useTeamManagement';
import { generateBestEleven } from './utils';

/**
 * TeamManagement component for managing player positions
 */
const TeamManagement: React.FC<TeamManagementProps> = ({ leagueId, userId }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const {
    players,
    isLoading,
    error,
    highlightedZones,
    onDragStart,
    onDragEnd
  } = useTeamManagement(leagueId, userId);

  const handleGenerateBestEleven = async () => {
    setIsOptimizing(true);
    try {
      const bestEleven = await generateBestEleven(players);
      // Trigger a drag end event to update the formation
      if (bestEleven.length > 0) {
        const dropResult: DropResult = {
          draggableId: bestEleven[0].id,
          type: 'player',
          source: { index: 0, droppableId: 'bench' },
          destination: { index: 0, droppableId: 'auto-formation' },
          reason: 'DROP',
          mode: 'FLUID',
          combine: null
        };
        await onDragEnd(dropResult);
      }
    } catch (error) {
      console.error('Error generating best eleven:', error);
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
        {error && <div className="error-message">{error}</div>}
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
