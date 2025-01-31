import React, { useEffect, useState } from 'react';
import { useHttpClient } from '../HttpClientContext';
import './PlayerComponent.module.css';

interface PlayerProps {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    marketValue: number;
    totalPoints: number;
    averagePoints: number;
    gameDate?: string;
  };
  showOnlyPoints?: boolean;
  onClick?: () => void;
}

const PlayerComponent: React.FC<PlayerProps> = ({ player, showOnlyPoints = false, onClick }) => {
  const httpClient = useHttpClient();
  
  const [isFutureGame, setIsFutureGame] = useState(false);

  // Calculate points per million (PPM)
  const calculatePPM = () => {
    if (!player.marketValue || player.marketValue <= 0) return 0;
    if (!player.averagePoints) return 0;
    const ppm = player.averagePoints / (player.marketValue / 1000000);
    return Number.isFinite(ppm) ? Number(ppm.toFixed(2)) : 0;
  };

  const pointsPerMillionValue = calculatePPM();

  const getPointsColor = (points: number) => {
    if (!points || !Number.isFinite(points)) return 'hsl(0, 80%, 50%)';
    const maxPoints = 120;
    const percentage = Math.min(100, Math.max(0, (points / maxPoints) * 100));
    
    if (percentage <= 50) {
      // Red to yellow
      return `hsl(${percentage * 2}, 80%, 50%)`;
    } else {
      // Yellow to green
      return `hsl(${60 + (percentage - 50) * 2}, 80%, 50%)`;
    }
  };

  useEffect(() => {
    if(player.gameDate){
      const gameDate = new Date(player.gameDate);
      if (!isNaN(gameDate.getTime()) ) {
        setIsFutureGame(gameDate > new Date());
      } else {
        setIsFutureGame(false);
      }
    } else {
      setIsFutureGame(false);
    }
  }, [player.gameDate]);

  const formatGameDate = (date: string | undefined) => {
    if(!date) return "";
    const gameDate = new Date(date);
    const dayAbbreviations = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
    const dayAbbr = dayAbbreviations[gameDate.getDay()];
    const hours = gameDate.getHours().toString().padStart(2, '0');
    const minutes = gameDate.getMinutes().toString().padStart(2, '0');
    return `${dayAbbr} ${hours}:${minutes}`;
  };

  return (
    <div 
      className={`player-card ${showOnlyPoints ? 'points-only' : ''}`}
      // style={showOnlyPoints ? { background: getPointsGradient(player.totalPoints) } : {}}
      onClick={onClick}
    >
      <img 
        id={showOnlyPoints ? "player-card-points-only" : "player-card"}
        src={httpClient.getPlayerImageUrl(player.id)}
        alt={`${player.firstName} ${player.lastName}`}
        className="player-image"

        onError={(e) => {
          if(!httpClient.usedPlayerIds.has(player.id)) {
            httpClient.usedPlayerIds.add(player.id);
            e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${player.id}.png`;
          }
        }}
      />
      <div className="player-info">
        {showOnlyPoints ? (
          <div className="player-points">
            {isFutureGame ? (
              <span className="game-date">{formatGameDate(player.gameDate)}</span>
            ) : (
              <span className="points-value"
                style={{
                  color: getPointsColor(player.totalPoints)
                }}
              >{player.totalPoints}</span>
            )}
          </div>
        ) : (
          <div className="player-stats">
            <div className="stats-column">
              <div className="stat">
                <span className="stat-label">Wert</span>
                <span className="stat-value market-value">{(player.marketValue / 1000000).toFixed(1)}M</span>
              </div>
              <div className="stat">
                <span className="stat-label">Pkt</span>
                <span className="stat-value points">{player.totalPoints || '0'}</span>
              </div>
            </div>
            <div className="stats-column">
              <div className="stat">
                <span className="stat-label">ØPkt</span>
                <span className="stat-value avg-points">{player.averagePoints || '0'}</span>
              </div>
              <div className="stat">
                <span className="stat-label">PPM</span>
                <span className="stat-value points-per-value">{pointsPerMillionValue}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerComponent;