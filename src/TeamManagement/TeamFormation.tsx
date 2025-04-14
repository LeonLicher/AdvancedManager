import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import PlayerDraggable from './PlayerDraggable';
import { Player, PositionConfig } from './types';

interface TeamFormationProps {
  players: Player[];
  highlightedZones: string[];
}

const TeamFormation: React.FC<TeamFormationProps> = ({ players, highlightedZones }) => {
  // Define position configurations
  const positions: PositionConfig[] = [
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
              {players.filter(filter).map((player, index) => (
                <PlayerDraggable 
                  key={player.id}
                  player={player} 
                  index={index} 
                  highlightedZones={highlightedZones} 
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ))}
    </div>
  );
};

export default TeamFormation; 