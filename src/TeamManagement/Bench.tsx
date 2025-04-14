import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import PlayerDraggable from './PlayerDraggable';
import { Player } from './types';
import { sortBenchPlayers } from './utils';

interface BenchProps {
  players: Player[];
  highlightedZones: string[];
}

const Bench: React.FC<BenchProps> = ({ players, highlightedZones }) => {
  const benchPlayers = players.filter(p => p.dayStatus !== 1);
  const sortedBenchPlayers = sortBenchPlayers(benchPlayers);
  const isBenchHighlighted = highlightedZones.includes('bench');

  return (
    <div className="bench">
      <h3>Bank</h3>
      <Droppable droppableId="bench" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`bench-players ${isBenchHighlighted ? 'highlighted' : ''}`}
          >
            {sortedBenchPlayers.map((player: Player, index: number) => (
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
    </div>
  );
};

export default Bench; 