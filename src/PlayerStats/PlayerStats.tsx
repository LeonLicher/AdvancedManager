import { format } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AxisDomain } from 'recharts/types/util/types';
import { IMarketPlayer } from '../types/MarketPlayer';
import './PlayerStats.css';

export interface IPlayerStats {
  marketValues: { d: string; m: number }[];
  mvHigh: number;
  mvHighDate: string;
  mvLow: number;
  mvLowDate: string;
}

interface PlayerStatsProps {
  player: IMarketPlayer;
  stats: IPlayerStats;
  formatPrice: (price: number) => string;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ player, stats, formatPrice }) => {
  const [showLast3Weeks, setShowLast3Weeks] = useState(false);
  
  if (!stats || !stats.marketValues) {
    return <div>Loading player stats...</div>;
  }


  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filteredAndFormattedData = useMemo(() => {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    return stats.marketValues
      .filter(value => !showLast3Weeks || new Date(value.d) >= threeWeeksAgo)
      .map(value => ({
        ...value,
        d: new Date(value.d),
        isFriday: new Date(value.d).getDay() === 5
      }));
  }, [stats.marketValues, showLast3Weeks]);

  const CustomLabel = ({ x, y, value }: { x?: number; y?: number; value: number }) => (
    <text x={x} y={y} fill="#666" textAnchor="middle" dy={-10}>
      {formatPrice(value)}
    </text>
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const yAxisDomain = useMemo(() => {
    const minValue = Math.min(...filteredAndFormattedData.map(d => d.m));
    const maxValue = Math.max(...filteredAndFormattedData.map(d => d.m));
    const padding = (maxValue - minValue) * 0.1;
    return [minValue - padding, 'auto'];
  }, [filteredAndFormattedData]);

  return (
    <div className="player-stats">
      <h3>{player.fn} {player.n} - Market Value History</h3>
      <p>Highest Value: {formatPrice(stats.mvHigh)} on {format(new Date(stats.mvHighDate), 'dd.MM.yyyy')}</p>
      <p>Lowest Value: {formatPrice(stats.mvLow)} on {format(new Date(stats.mvLowDate), 'dd.MM.yyyy')}</p>
      <button 
        className="toggle-history-button"
        onClick={() => setShowLast3Weeks(!showLast3Weeks)}
      >
        {showLast3Weeks ? 'Show Full History' : 'Show Last 3 Weeks'}
      </button>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filteredAndFormattedData} margin={{ top: 20, right: 30, left: 60, bottom: 50 }}>
          <XAxis 
            dataKey="d" 
            tickFormatter={(tick: Date) => format(tick, 'dd.MM')}
            interval={showLast3Weeks ? 0 : 'preserveStartEnd'}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tickFormatter={(tick: number) => formatPrice(tick)} 
            domain={yAxisDomain as AxisDomain}
            width={60}
          />
          <Tooltip
            labelFormatter={(label: Date) => format(label, 'dd.MM.yyyy')}
            formatter={(value: string | number) => formatPrice(Number(value))}
          />
          <Line 
            type="monotone" 
            dataKey="m" 
            stroke="#8884d8" 
            isAnimationActive={false}
          />
          {filteredAndFormattedData
            .filter(value => value.isFriday)
            .map((value, index) => (
              <Label
                key={index}
                content={<CustomLabel value={value.m} />}
                position="top"
                x={`${(index / (filteredAndFormattedData.length - 1)) * 100}%`}
                y={0}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlayerStats;