import React from 'react';
import './AnimatedFormationLoading.scss';

interface AnimatedFormationLoadingProps {
  isLoading: boolean;
  text?: string;
  formation?: string; // e.g., '4-3-3', not used yet
}

// Default 4-3-3 formation positions (percentages of pitch width/height)
const defaultPositions = [
  { x: 50, y: 90 }, // GK
  { x: 15, y: 70 }, { x: 35, y: 70 }, { x: 65, y: 70 }, { x: 85, y: 70 }, // DEF
  { x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 }, // MID
  { x: 30, y: 30 }, { x: 50, y: 25 }, { x: 70, y: 30 }, // FWD
];

const AnimatedFormationLoading: React.FC<AnimatedFormationLoadingProps> = ({ isLoading, text }) => {
  if (!isLoading) return null;

  return (
    <div className="formation-loading">
      <div className="formation-loading__pitch">
        {/* Pitch lines */}
        <div className="formation-loading__center-circle" />
        <div className="formation-loading__halfway-line" />
        <div className="formation-loading__penalty-box formation-loading__penalty-box--top" />
        <div className="formation-loading__penalty-box formation-loading__penalty-box--bottom" />
        {/* Players */}
        {defaultPositions.map((pos, idx) => (
          <div
            key={idx}
            className="formation-loading__player"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              animationDelay: `${idx * 0.12}s`,
            }}
          >
            <div className="formation-loading__player-icon" />
          </div>
        ))}
      </div>
      {text && <div className="formation-loading__text">{text}</div>}
    </div>
  );
};

export default AnimatedFormationLoading; 