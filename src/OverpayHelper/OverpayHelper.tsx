import { Search } from "lucide-react";
import React, { useState } from 'react';
import { useHttpClient } from '../HttpClientContext';
import { useTransferHistory } from '../TransferHistoryContext';
import { Button } from "../components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "../components/ui/command";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import './OverpayHelper.scss';

interface OverpayHelperProps {
  leagueId: string;
}

interface Player {
  i: string;
  n: string;
  ln: string;
  mv: number;
  ap: number;
  tp: number;
  pos: number;
  st: number;
  tid: string;
}

interface Alternative {
  id: string;
  name: string;
  tp: number;
  ap: number;
  mv: number;
  difference: number;
  currentOwner?: {
    name: string;
    price: number;
  };
}

interface AnalysisResult {
  suggestedBid: number;
  confidence: number;
  recentSales: {
    date: string;
    price: number;
    mvAtTime: number;
    ratio: number;
    seller: string;
  }[];
  averageOverpayRatio: number;
  alternatives: {
    name: string;
    averageOverpayRatio: number;
    recentSales: {
      date: string;
      price: number;
      mvAtTime: number;
      ratio: number;
      seller: string;
    }[];
  }[];
}

interface MarketValueResponse {
  it: Array<{
    dt: number;
    mv: number;
  }>;
  trp: number;
  prlo: number;
  lmv: number;
  hmv: number;
  idp: boolean;
}

interface TransferHistoryItem {
  dt: string;
  trp: number;
  t: number;
  unm?: string;
}

const OverpayHelper: React.FC<OverpayHelperProps> = ({ leagueId }) => {
  const httpClient = useHttpClient();
  const transferHistory = useTransferHistory();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [open, setOpen] = useState(false);
  const [detailedPlayers, setDetailedPlayers] = useState<Player[]>([]);

  // Load detailed players data
  React.useEffect(() => {
    const loadDetailedPlayers = async () => {
      try {
        const response = await fetch('/AdvancedManager/detailed_players.json');
        const rawData = await response.json();
        const players: Player[] = [];

        Object.values(rawData).forEach((playerGroup: any) => {
          if (typeof playerGroup === 'object') {
            Object.values(playerGroup).forEach((player: any) => {
              if (player && typeof player === 'object' && 'i' in player) {
                players.push({
                  i: player.i,
                  n: player.fn,
                  ln: player.ln,
                  mv: player.mv,
                  ap: player.ap,
                  tp: player.tp,
                  pos: player.pos,
                  st: player.st,
                  tid: player.tid
                });
              }
            });
          }
        });

        setDetailedPlayers(players);
      } catch (error) {
        console.error('Error loading detailed players:', error);
      }
    };

    loadDetailedPlayers();
  }, []);

  const analyzePlayer = async (player: Player) => {
    try {
      // Get alternatives first
      const alternativesResponse = await httpClient.post<{ players: { id: string; analysis: { alternatives: Alternative[] } }[] }>(
        '/api/analysis/team',
        {
          players: [{
            id: player.i,
            teamId: player.tid,
            position: player.pos,
            status: player.st,
            marketValue: player.mv,
            averagePoints: player.ap,
            totalPoints: player.tp,
            dayStatus: 1
          }]
        }
      );

      // Get transfer history and market value history for main player
      const [history, mvResponse] = await Promise.all([
        transferHistory.getTransferHistory(leagueId, player.i),
        httpClient.get<MarketValueResponse>(`/v4/competitions/1/players/${player.i}/marketValue/365?leagueId=${leagueId}`)
      ]);

      // Analyze main player's purchases
      const mainPlayerAnalysis = await analyzeTransferHistory(history, mvResponse);

      // Analyze each alternative player
      const alternativeAnalyses = await Promise.all(
        alternativesResponse.players[0].analysis.alternatives.map(async (alt) => {
          const [altHistory, altMvResponse] = await Promise.all([
            transferHistory.getTransferHistory(leagueId, alt.id),
            httpClient.get<MarketValueResponse>(`/v4/competitions/1/players/${alt.id}/marketValue/365?leagueId=${leagueId}`)
          ]);

          const analysis = await analyzeTransferHistory(altHistory, altMvResponse);
          
          return {
            name: alt.name,
            averageOverpayRatio: analysis.averageOverpayRatio,
            recentSales: analysis.recentSales
          };
        })
      );

      // Calculate average overpay ratio from similar players
      const averageOverpayRatio = alternativeAnalyses.length > 0
        ? alternativeAnalyses.reduce((sum, alt) => sum + alt.averageOverpayRatio, 0) / alternativeAnalyses.length
        : 1.2; // Default 20% overpay if no alternatives

      // Calculate suggested bid based on similar players' average overpay
      const suggestedBid = Math.round(player.mv * averageOverpayRatio);
      const confidence = Math.min(
        alternativeAnalyses.reduce((sum, alt) => sum + alt.recentSales.length, 0) * 1, // 1.6% per purchase
        100
      );

      setAnalysis({
        suggestedBid,
        confidence,
        recentSales: mainPlayerAnalysis.recentSales,
        averageOverpayRatio: mainPlayerAnalysis.averageOverpayRatio,
        alternatives: alternativeAnalyses
      });

    } catch (error) {
      console.error('Error analyzing player:', error);
    }
  };

  const analyzeTransferHistory = async (history: any[], mvResponse: MarketValueResponse) => {
    // Create market value lookup
    const sortedMvResponse = [...mvResponse.it].sort((a, b) => a.dt - b.dt);
    const mvByDate = new Map(
      sortedMvResponse.map(mv => [mv.dt.toString(), mv.mv])
    );

    // Analyze each purchase, excluding market sales
    const purchaseAnalysis = history
      .filter((sale: TransferHistoryItem) => 
        sale.t === 1 && // Only purchases
        sale.trp > 0 // With valid price
      )
      .map((sale: TransferHistoryItem) => {
        const saleDate = new Date(sale.dt);
        const dayNumber = Math.floor(saleDate.getTime() / (1000 * 60 * 60 * 24));
        
        // Find closest market value
        let mvAtTime = mvResponse.it[0]?.mv || 0;
        const dayNumbers = Array.from(mvByDate.keys()).map(Number).sort((a, b) => a - b);
        
        if (dayNumbers.length > 0) {
          const closestDay = dayNumbers.reduce((prev, curr) => {
            const prevDiff = Math.abs(prev - dayNumber);
            const currDiff = Math.abs(curr - dayNumber);
            return prevDiff < currDiff ? prev : curr;
          });
          const closestMv = mvByDate.get(closestDay.toString());
          if (closestMv !== undefined) {
            mvAtTime = closestMv;
          }
        }

        return {
          date: sale.dt,
          price: sale.trp,
          mvAtTime,
          ratio: sale.trp / mvAtTime,
          seller: sale.unm || 'Markt'
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const averageOverpayRatio = purchaseAnalysis.length > 0
      ? purchaseAnalysis.reduce((sum, p) => sum + p.ratio, 0) / purchaseAnalysis.length
      : 1.2;

    return { recentSales: purchaseAnalysis, averageOverpayRatio };
  };

  const handleSelectPlayer = async (player: Player) => {
    setSelectedPlayer(player);
    setOpen(false);
    await analyzePlayer(player);
  };

  return (
    <div className="overpay-helper">
      <div className="header-container">
        <div className="flex items-center gap-4">
          <h2>Overpay Hilfe</h2>
          <Button 
            variant="outline"
            size="sm"
            className="h-8 px-3 flex items-center gap-2"
            onClick={() => setOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>Spieler analysieren</span>
          </Button>
        </div>
      </div>

      {selectedPlayer && analysis ? (
        <div className="analysis-results">
          <div className="player-info">
            <h3>{selectedPlayer.n} {selectedPlayer.ln}</h3>
            <div className="stats">
              <div>Marktwert: {(selectedPlayer.mv / 1000000).toFixed(1)}M</div>
              <div>Durchschnitt: {selectedPlayer.ap ? selectedPlayer.ap.toFixed(1) : 'N/A'}</div>
            </div>
          </div>

          <div className="bid-suggestion">
            <div className="suggested-bid">
              <h4>Empfohlenes Gebot</h4>
              <div className="amount">{(analysis.suggestedBid / 1000000).toFixed(1)}M</div>
              <div className="confidence">
                Konfidenz: {analysis.confidence}%
              </div>
              <div className="average-ratio">
                Ø Overpay: {((analysis.averageOverpayRatio * 100) - 100).toFixed(0)}%
              </div>
            </div>

            <div className="analysis-details">
              <div className="alternatives">
                <h4>Ähnliche Spieler</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Spieler</TableHead>
                      <TableHead className="text-right">Ø Overpay</TableHead>
                      <TableHead className="text-right">Anzahl Käufe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const sortedAlternatives = [...analysis.alternatives].sort((a, b) => a.averageOverpayRatio - b.averageOverpayRatio);
                      return sortedAlternatives.map((alt, index) => (
                        <TableRow key={index}>
                          <TableCell>{alt.name}</TableCell>
                          <TableCell className="text-right">{((alt.averageOverpayRatio * 100) - 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-right">{alt.recentSales.length}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
                <div className="alternatives-summary">
                  <span>Durchschnittlicher Overpay ähnlicher Spieler: </span>
                  <span className="font-medium">
                    {((analysis.alternatives.reduce((sum, alt) => sum + alt.averageOverpayRatio, 0) / 
                      analysis.alternatives.length * 100) - 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="recent-sales">
                <h4>Letzte Käufe</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Käufer</TableHead>
                      <TableHead className="text-right">Preis</TableHead>
                      <TableHead className="text-right">Overpay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.recentSales.map((sale, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                        <TableCell>{sale.seller}</TableCell>
                        <TableCell className="text-right">{(sale.price / 1000000).toFixed(1)}M</TableCell>
                        <TableCell className="text-right">{((sale.ratio * 100) - 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="analysis-results">
          <div className="player-info">
            <h3><Skeleton className="h-8 w-[200px] max-w-full" /></h3>
            <div className="stats">
              <div>Marktwert: <Skeleton className="h-4 w-16 inline-block align-middle" /></div>
              <div>Durchschnitt: <Skeleton className="h-4 w-16 inline-block align-middle" /></div>
            </div>
          </div>

          <div className="bid-suggestion">
            <div className="suggested-bid">
              <h4>Empfohlenes Gebot</h4>
              <div className="amount"><Skeleton className="h-10 w-24 mx-auto" /></div>
              <div className="confidence">
                Konfidenz: <Skeleton className="h-4 w-12 inline-block align-middle" />%
              </div>
              <div className="average-ratio">
                Ø Overpay: <Skeleton className="h-4 w-12 inline-block align-middle" />%
              </div>
            </div>

            <div className="analysis-details">
              <div className="alternatives">
                <h4>Ähnliche Spieler</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Spieler</TableHead>
                      <TableHead className="text-right">Ø Overpay</TableHead>
                      <TableHead className="text-right">Anzahl</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="alternatives-summary">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>

              <div className="recent-sales">
                <h4>Letzte Käufe</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Käufer</TableHead>
                      <TableHead className="text-right">Preis</TableHead>
                      <TableHead className="text-right">Overpay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* <DialogTitle>Spieler suchen</DialogTitle>
        <DialogDescription>
          Suche nach einem Spieler, um seine Overpayanalyse zu sehen.
        </DialogDescription> */}
        <CommandInput placeholder="Spieler suchen..." autoComplete="off" />
        <CommandList>
          <CommandEmpty>Keine Spieler gefunden</CommandEmpty>
          <CommandGroup>
            {detailedPlayers.map(player => (
              <CommandItem
                key={player.i}
                value={`${player.n} ${player.ln}`}
                onSelect={() => handleSelectPlayer(player)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.n} {player.ln}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{(player.mv / 1000000).toFixed(1)}M</span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

export default OverpayHelper; 