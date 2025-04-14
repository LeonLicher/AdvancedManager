import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import Bench from './Bench';
import TeamFormation from './TeamFormation';
import './TeamManagement.scss';
import { TeamManagementProps } from './types';
import { useTeamManagement } from './useTeamManagement';

/**
 * TeamManagement component for managing player positions
 */
const TeamManagement: React.FC<TeamManagementProps> = ({ leagueId, userId }) => {
  const {
    players,
    isLoading,
    error,
    highlightedZones,
    onDragStart,
    onDragEnd
  } = useTeamManagement(leagueId, userId);

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
