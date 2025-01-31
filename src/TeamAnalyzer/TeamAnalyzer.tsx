import React, { useEffect, useMemo, useState } from 'react';
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useHttpClient } from '../HttpClientContext';
import { useTransferHistory } from '../TransferHistoryContext';
import AnalyzerPlayerCard, { Alternative } from './AnalyzerPlayerCard';
import './TeamAnalyzer.scss';

interface TeamAnalyzerProps {
  leagueId: string;
  userId: string;
}

interface TransferHistoryItem {
  u?: string;
  unm?: string;
  dt: string;
  trp: number;
  t: number;
}

interface Player {
  i: string;    // id
  tid: string;  // teamId
  n: string;    // firstName
  ln: string;   // lastName
  st: number;   // status
  pos: number;  // position
  ap: number;   // averagePoints
  p: number;    // totalPoints
  mv: number;   // marketValue
  mdst: number; // dayStatus
  analysisScore?: number;
  alternatives?: Alternative[];
  currentOwner?: {
    name: string;
    price: number;
  };
}

interface AnalysisResponse {
  score: number;
  alternatives: Alternative[];
}

const calculateAdjustedScore = (player: Player, alternatives: Alternative[]): number => {
  if (!alternatives || alternatives.length === 0) return player.analysisScore || 0;

  const weights = {
    price: 0.2,    // 20% weight for price difference (reduced from 40%)
    ap: 0.4,       // 40% weight for average points (increased)
    tp: 0.4        // 40% weight for total points (increased)
  };
  const alternativeScores = alternatives.map(alt => {
    // Calculate price difference using either current price or market value
    const priceDiff = (() => {
      // If both have current owners, use their current prices
      if (player.currentOwner && alt.currentOwner) {
        return (alt.currentOwner.price - player.currentOwner.price) / player.currentOwner.price;
      }
      // If neither has current owner or only alternative has no owner, use market values
      return (alt.mv - player.mv) / player.mv;
    })();

    const apDiff = (alt.ap - player.ap) / player.ap;
    const tpDiff = (alt.tp - player.p) / player.p;

    // Scale the differences to be more manageable
    const weightedScore = (
      (priceDiff * weights.price * 0.5) + // Reduce price impact by half
      (apDiff * weights.ap) +
      (tpDiff * weights.tp)
    ) * 20;

    return weightedScore;
  });

  const averageAlternativeScore = alternativeScores.reduce((sum, score) => sum + score, 0) / alternativeScores.length;
  const baseScore = player.analysisScore || 0;
  
  // Instead of multiplying, we add/subtract the adjustment
  // This means the adjustment can add or subtract up to 2 points from the base score
  const finalScore = baseScore + averageAlternativeScore;
  


  return finalScore;
};

const TeamAnalyzer: React.FC<TeamAnalyzerProps> = ({ leagueId, userId }) => {
  const httpClient = useHttpClient();
  const transferHistory = useTransferHistory();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  const teamScore = useMemo(() => {
    if (!players.some(p => p.analysisScore !== undefined)) {
      return '-';
    }
    // boost team score by ten
    return (10 +players
      .filter(p => p.mdst === 1)
      .reduce((sum, p) => sum + (p.analysisScore || 0), 0) / 11
    ).toFixed(1);
  }, [players]);

  // Load squad on initial render
  useEffect(() => {
    const fetchSquad = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await httpClient.get<{ it: Player[] }>(`/v4/leagues/${leagueId}/squad`);
        const mappedPlayers = data.it.map(player => ({
          ...player,
          mdst: 'lo' in player ? 1 : 0
        }));
        setPlayers(mappedPlayers);
      } catch (error) {
        console.error('Error fetching squad:', error);
        setError('Failed to fetch squad. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSquad();

  }, [httpClient, leagueId, userId]);


  

  const analyzeTeam = async () => {
    setIsAnalyzing(true);
    try {
      const response = await httpClient.post<{ players: { id: string; analysis: AnalysisResponse }[] }>(
        '/auth/analysis/team',
        {
          players: players.map(player => ({
            id: player.i,
            teamId: player.tid,
            position: player.pos,
            status: player.st,
            marketValue: player.mv,
            averagePoints: player.ap,
            totalPoints: player.p,
            dayStatus: player.mdst
          }))
        }
      );

      // Fetch transfer histories for all players and their alternatives
      const analyzedPlayers = await Promise.all(players.map(async player => {
        const analysisResult = response.players?.find(p => p?.id === player.i);
        if (!analysisResult || !analysisResult.analysis) {
          return player;
        }

        // Fetch player's transfer history using cache
        let playerWithOwner = { ...player };
        try {
          const playerHistory = await transferHistory.getTransferHistory(leagueId, player.i);
          const lastTransfer = playerHistory[playerHistory.length-1];
          if (lastTransfer && lastTransfer.unm) {
            playerWithOwner.currentOwner = {
              name: lastTransfer.unm,
              price: lastTransfer.trp
            };
          }
        } catch (error) {
          console.error('Error fetching player transfer history:', error);
        }

        // Fetch alternatives' transfer histories using cache
        const alternativesWithOwners = await Promise.all(
          analysisResult.analysis.alternatives.map(async (alt) => {
            try {
              const history: TransferHistoryItem[] = await transferHistory.getTransferHistory(leagueId, alt.id);
              const lastTransfer = history[history.length-1];
              if (lastTransfer && lastTransfer.unm) {
                return {
                  ...alt,
                  currentOwner: {
                    name: lastTransfer.unm,
                    price: lastTransfer.trp
                  }
                };
              }
              return alt;
            } catch (error) {
              console.error('Error fetching alternative transfer history:', error);
              return alt;
            }
          })
        );

        const baseScore = analysisResult.analysis.score;
        const adjustedScore = calculateAdjustedScore(
          { ...playerWithOwner, analysisScore: baseScore },
          alternativesWithOwners
        );

        return {
          ...playerWithOwner,
          analysisScore: adjustedScore,
          alternatives: alternativesWithOwners
        };
      }));

      setPlayers(analyzedPlayers);
    } catch (error) {
      console.error('Error analyzing team:', error);
      setError('Failed to analyze team. Please try again later.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderPlayer = (player: Player) => (
    <div className="player-container" data-position={player.pos}>
      <AnalyzerPlayerCard 
        player={player} 
        alternatives={player.alternatives}
        isOpen={openPlayerId === player.i}
        onToggle={(isOpen) => setOpenPlayerId(isOpen ? player.i : null)}
      />
    </div>
  );

  const renderFormation = () => {
    const positions = [
      { name: 'forwards', filter: (p: Player) => p.pos === 4 && p.mdst === 1 },
      { name: 'midfielders', filter: (p: Player) => p.pos === 3 && p.mdst === 1 },
      { name: 'defenders', filter: (p: Player) => p.pos === 2 && p.mdst === 1 },
      { name: 'goalkeepers', filter: (p: Player) => p.pos === 1 && p.mdst === 1 },
    ];

    return (
      <div className="football-pitch">
        {positions.map(({ name, filter }) => (
          <div key={name} className={`row ${name}`}>
            {players.filter(filter).map((player) => renderPlayer(player))}
          </div>
        ))}
      </div>
    );
  };

  const renderBench = () => {
    const benchPlayers = players.filter(p => p.mdst !== 1);
    return (
      <div className="bench">
        <h3>Ersatzbank</h3>
        <div className="bench-players">
          {benchPlayers.map((player) => renderPlayer(player))}
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!players || players.length === 0) return <div>No players found.</div>;

  return (
    <div className="team-analyzer">
      <div className="header">
        <div className="header-content">
        <h2>Teambewertung</h2>
          <Button 
            variant="default" 
            size="lg"
            onClick={analyzeTeam}
            disabled={isAnalyzing || isLoading}
            className="analyze-button"
          >
            {isAnalyzing ? "Analysiere..." : "Team analysieren"}
          </Button>

        </div>
        

        <div className="team-stats">
          <div className="stat">
            <span>Team Score</span>
            <span className="value">
              {players.some(p => p.analysisScore !== undefined) ? teamScore : <Skeleton className="h-8 w-[60px] my-3" />}
            </span>
          </div>
        </div>
        
      </div>

      {renderFormation()}
      {renderBench()}
    </div>
  );
};

export default TeamAnalyzer; 