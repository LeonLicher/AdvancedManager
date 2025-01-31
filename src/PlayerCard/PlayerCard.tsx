import React, { useMemo, useState } from 'react';
import { FaArrowDown, FaArrowUp, FaChevronLeft, FaChevronRight, FaClock, FaGavel } from 'react-icons/fa';
import CustomPriceInput from '../CustomPriceInput';
import { useHttpClient } from '../HttpClientContext';
import { IMarketPlayer } from '../PlayerMarket/PlayerMarket';
import { IPlayerStats } from '../PlayerStats/PlayerStats';
import './PlayerCard.css';


interface IPlayerCardProps {
  player: IMarketPlayer;
  isSelected: boolean;
  onPlayerClick: (player: IMarketPlayer) => void;
  onBuyPlayer: (playerId: string, player: IMarketPlayer, price: number) => void;
  formatPrice: (price: number) => string;
  formatExpiryDate: (date: string, expiry: number) => string;
  getTimeRemaining: (expiry: number) => string;
  playerId: string;
  playerStats?: IPlayerStats;
}

const PlayerCard: React.FC<IPlayerCardProps> = ({
  player,
  isSelected,
  onPlayerClick,
  onBuyPlayer,
  formatPrice,
  formatExpiryDate,
  getTimeRemaining,
  playerId,
  playerStats
}) => {
  const httpClient = useHttpClient();
  const [customPrice, setCustomPrice] = useState<string>('');
  const [currentPriceChangeIndex, setCurrentPriceChangeIndex] = useState(0);

  const handlePercentageClick = (percentage: number) => {
    const newPrice = Math.ceil(player.prc * percentage);
    setCustomPrice(newPrice.toString());
  };

  const percentages = [
    { value: 0.99, display: '99%' },
    { value: 1.1, display: '110%' },
    { value: 1.3, display: '130%' }
  ];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRecentPriceChanges = useMemo(() => {
    if (!playerStats?.marketValues?.length) {
      return [];
    }

    const sortedValues = [...playerStats.marketValues].sort((a, b) => 
      new Date(b.d).getTime() - new Date(a.d).getTime()
    );

    const changes = [];
    for (let i = 0; i < sortedValues.length - 1; i++) {
      const change = sortedValues[i].m - sortedValues[i + 1].m;
      if (change !== 0) {
        changes.push({
          change,
          currentPrice: sortedValues[i].m,
          date: sortedValues[i].d
        });
      }
    }

    return changes;
  }, [playerStats]);

  const renderPriceChange = (change: number, currentPrice: number, date: string) => {
    const color = change > 0 ? 'green' : change < 0 ? 'red' : 'grey';
    const Icon = change > 0 ? FaArrowUp : change < 0 ? FaArrowDown : null;
    const percentage = ((change / (currentPrice - change)) * 100).toFixed(1);
    return (
      <div className="price-change" style={{ color }}>
        <div className="price-change-date">{formatDate(date)}</div>
        <div className="price-change-value">
          {Icon && <Icon />} {formatPrice(Math.abs(change))}
        </div>
        <div className="price-change-percentage">
          {percentage}%
        </div>
      </div>
    );
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPriceChangeIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPriceChangeIndex(prev => Math.min(getRecentPriceChanges.length - 1, prev + 1));
  };
  
  return (
    <div
      className={`player-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onPlayerClick(player)}
    >
      <div className="player-image-container">
        <img 
          src={httpClient.getPlayerImageUrl(playerId)}
          alt={player.fn + ' ' + player.n}
          className="player-image"
          onError={(e) => {
            if(!httpClient.usedPlayerIds.has(player.i)) {
              httpClient.usedPlayerIds.add(player.i);
              e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${player.i}.png`;
            }
          }}
        />
      </div>
      <h3 className="player-name">{player.fn} {player.n}</h3>
      <p className="player-price">{formatPrice(player.prc)}</p>
      <div className="player-expiry">
        <FaClock className="expiry-icon" />
        <span className="expiry-time">{getTimeRemaining(player.exs)}</span>
        <span className="expiry-date">{formatExpiryDate(player.dt, player.exs)}</span>
      </div>
      <div className="user-bid">
        {player.ofs && player.ofs.length > 0 ? (
          <>
            <FaGavel className="bid-icon" />
            <span>{formatPrice(player.ofs[0].uop)}</span>
          </>
        ) : null}
      </div>
      <div className="buy-options">
        {percentages.map(({ value, display }) => (
          <button 
            key={value}
            className="percentage-button" 
            onClick={(e) => {
              e.stopPropagation();
              handlePercentageClick(value);
            }}
          >
            {display}
          </button>
        ))}
      </div>
      <CustomPriceInput
        customPrice={customPrice}
        onCustomPriceChange={setCustomPrice}
        onBuy={() => onBuyPlayer(player.i, player, parseInt(customPrice, 10))}
        formatPrice={formatPrice}
      />
      <div className="price-changes-container">
        <button 
          className="carousel-button left" 
          onClick={handlePrevClick}
          disabled={currentPriceChangeIndex === 0}
        >
          <FaChevronLeft />
        </button>
        <div className="price-changes-wrapper">
          <div 
            className="price-changes-slider" 
            style={{ transform: `translateX(-${currentPriceChangeIndex * 33.33}%)` }}
          >
            {getRecentPriceChanges.map((priceChange, index) => (
              <div key={index} className="price-change-item">
                {renderPriceChange(priceChange.change, priceChange.currentPrice, priceChange.date)}
              </div>
            ))}
          </div>
        </div>
        <button 
          className="carousel-button right" 
          onClick={handleNextClick}
          disabled={currentPriceChangeIndex >= getRecentPriceChanges.length - 1}
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
};

export default PlayerCard;