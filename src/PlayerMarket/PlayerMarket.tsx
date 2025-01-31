import React, { useEffect, useMemo, useState } from 'react';
import { useHttpClient } from '../HttpClientContext';
import PlayerCard from '../PlayerCard/PlayerCard';
import './PlayerMarket.css';


export interface IOffer {
  date: string;
  id: string;
  price: number;
  status: number;
  userId: string;
  userName: string;
  userProfileUrl: string;
}
// Update the interfaces first
interface IMarketResponse {
  it: IMarketPlayer[];  // items
  nps: number;          // number of players
  tv: number;           // total value
  mvud: string;         // market value update date
  dt: string;           // date
  day: number;          // day
}
export interface IMarketPlayer {
  i: string;            // id
  fn: string;          // firstName
  n: string;           // lastName
  tid: string;         // teamId
  pos: number;         // position
  st: number;          // status
  mvt: number;         // market value type
  mv: number;          // market value
  p: number;           // points
  ap: number;          // average points
  ofc: number;         // offers count
  exs: number;         // expiry seconds
  prc: number;         // price
  uoid: string;        // user offer id
  isn: boolean;        // is something new?
  iposl: boolean;      // is position locked?
  dt: string;          // date
  u?: {                // user (optional)
    i: string;         // user id
    n: string;         // user name
    s: number;         // status
    v: boolean;        // verified?
  };
  ofs?: {             // offers (optional)
    u: string;        // user id
    unm: string;      // user name
    uoid: string;     // user offer id
    uop: number;      // user offer price
    st: number;       // status
  }[];                // array of offers
}

interface IPlayerMarketProps {
  leagueId: string;
}

const PlayerMarket: React.FC<IPlayerMarketProps> = ({ leagueId }) => {
  const httpClient = useHttpClient();
  const [marketPlayers, setMarketPlayers] = useState<IMarketPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<IMarketPlayer | null>(null);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatExpiryDate = (date: string, expiry: number): string => {
    date = date + "not used";
    const expiryDate = new Date(new Date().getTime() + expiry * 1000);
    return expiryDate.toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiry: number): string => {
    if (expiry <= 0) return 'Expired';

    const hours = Math.floor(expiry / 3600);
    const minutes = Math.floor((expiry % 3600) / 60);

    return `${hours}h ${minutes}m`;
  };

  const fetchMarket = async () => {
    try {
      const response = await httpClient.get<IMarketResponse>(`/v4/leagues/${leagueId}/market/`);
      if (response && response.it) {
        setMarketPlayers(response.it);
      }
    } catch (error) {
      console.log("Error fetching market data", error);
    }
  };

  const buyPlayer = async (playerId: string, player: IMarketPlayer, price: number) => {
    try {
      await httpClient.post(`/v4/leagues/${leagueId}/market/${playerId}/offers`, { 
        price: Math.round(price) // Ensure price is rounded to whole number
      });
      fetchMarket();
    } catch (error) {
      console.log(`Error placing offer for player ${player.fn} ${player.n} at ${formatPrice(price)}`);
    }
  };

  const sortPlayersByExpiry = (players: IMarketPlayer[]): IMarketPlayer[] => {
    return [...players].sort((a, b) => a.exs - b.exs);
  };

  const availablePlayers = useMemo(() => {
    return sortPlayersByExpiry(marketPlayers);
  }, [marketPlayers]);

  useEffect(() => {
    fetchMarket();
  }, [leagueId]);


  const renderPlayerRow = (players: IMarketPlayer[]) => {
    function handlePlayerClick(player: IMarketPlayer): void {
      setSelectedPlayer(player);
      
    }

    return (
      <div className="player-list">
        {players.map(player => (
          <div key={player.i} className="player-card-wrapper">
            <PlayerCard
              player={player}
              isSelected={selectedPlayer?.i === player.i}
              onPlayerClick={handlePlayerClick}
              onBuyPlayer={buyPlayer}
              formatPrice={formatPrice}
              formatExpiryDate={formatExpiryDate}
              getTimeRemaining={getTimeRemaining}
              playerId={player.i}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="player-market">
      {availablePlayers.length > 0 && (
        renderPlayerRow(availablePlayers)
      )}
    </div>
  );
}

export default PlayerMarket;

