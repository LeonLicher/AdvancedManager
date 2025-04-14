import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import PlayerComponent from '../components/PlayerComponent';
import { Player } from './types';

interface PlayerDraggableProps {
  player: Player;
  index: number;
  highlightedZones: string[];
}

const PlayerDraggable: React.FC<PlayerDraggableProps> = ({ player, index, highlightedZones }) => {
  return (
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
};

export default PlayerDraggable; 