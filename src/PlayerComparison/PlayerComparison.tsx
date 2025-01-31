import { Info, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import { useTransferHistory } from '../TransferHistoryContext';
import { Player, PlayerSearch } from '../components/PlayerSearch';
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import './PlayerComparison.scss';

interface PlayerComparisonProps {
  leagueId: string;
}

interface NextMatch {
  opponent: string;
  iconUrl: string;
  date: string;
}

interface TeamMatches {
  [key: string]: NextMatch[];
}

interface Match {
  matchDateTime: string;
  team1: {
    teamId: number;
    shortName: string;
    teamIconUrl: string;
  };
  team2: {
    teamId: number;
    shortName: string;
    teamIconUrl: string;
  };
}

interface PlayerWithOwner extends Player {
  currentOwner?: {
    name: string;
    price: number;
  };
}

const PlayerComparison: React.FC<PlayerComparisonProps> = ({ leagueId }) => {
  const transferHistory = useTransferHistory();
  const [players, setPlayers] = useState<PlayerWithOwner[]>(() => {
    // Load initial players from localStorage
    const savedPlayers = localStorage.getItem(`comparison-players-${leagueId}`);
    return savedPlayers ? JSON.parse(savedPlayers) : [];
  });
  const [nextMatches, setNextMatches] = useState<TeamMatches>({});
  const [teamMapping, setTeamMapping] = useState<{ [key: string]: string }>({});

  // Save players to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem(`comparison-players-${leagueId}`, JSON.stringify(players));
  }, [players, leagueId]);

  // Load team mapping
  React.useEffect(() => {
    const loadTeamMapping = async () => {
      try {
        const response = await fetch('/AdvancedManager/detailed_players.json');
        const rawData = await response.json();
        const teamMap: { [key: string]: string } = {};

        Object.values(rawData).forEach((playerGroup: any) => {
          if (typeof playerGroup === 'object') {
            Object.values(playerGroup).forEach((player: any) => {
              if (player && typeof player === 'object' && player.tid && player.tn) {
                teamMap[player.tid] = player.tn;
              }
            });
          }
        });

        setTeamMapping(teamMap);
      } catch (error: any) {
        console.error('Error loading team mapping:', error);
      }
    };

    loadTeamMapping();
  }, []);

  useEffect(() => {
    const fetchNextMatches = async () => {
      try {
        const response = await fetch('/AdvancedManager/spielplan.json');
        const matches: Match[] = await response.json();
        
        const currentDate = new Date();
        const upcomingMatches: TeamMatches = {};
        
        matches
          .filter(match => new Date(match.matchDateTime) > currentDate)
          .sort((a, b) => new Date(a.matchDateTime).getTime() - new Date(b.matchDateTime).getTime())
          .forEach(match => {
            // For team1
            if (!upcomingMatches[match.team1.shortName]) {
              upcomingMatches[match.team1.shortName] = [];
            }
            upcomingMatches[match.team1.shortName].push({
              opponent: match.team2.shortName,
              iconUrl: match.team2.teamIconUrl,
              date: match.matchDateTime
            });
            
            // For team2
            if (!upcomingMatches[match.team2.shortName]) {
              upcomingMatches[match.team2.shortName] = [];
            }
            upcomingMatches[match.team2.shortName].push({
              opponent: match.team1.shortName,
              iconUrl: match.team1.teamIconUrl,
              date: match.matchDateTime
            });
          });
        
        setNextMatches(upcomingMatches);
      } catch (error) {
        console.error('Error fetching next matches:', error);
      }
    };

    fetchNextMatches();
  }, []);

  const handleSelectPlayer = useCallback(async (player: Player) => {
    try {
      // Get transfer history for ownership info
      const history = await transferHistory.getTransferHistory(leagueId, player.i);
      const lastTransfer = history[history.length - 1];
      
      const playerWithDetails: PlayerWithOwner = {
        ...player,
        currentOwner: lastTransfer && lastTransfer.unm ? {
          name: lastTransfer.unm,
          price: lastTransfer.trp
        } : undefined
      };
      if(!players.find(p => p.i === playerWithDetails.i)) {
        setPlayers(prev => [...prev, playerWithDetails]);
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
    }
  }, [leagueId, transferHistory, players]);

  const removePlayer = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(p => p.i !== playerId));
  }, []);

  const getBestPlayer = () => {
    if (players.length === 0) return null;
    return players.reduce((best, current) => 
      (best.tp > current.tp) ? best : current
    );
  };

  const getPercentageDiff = (value: number, key: keyof Player) => {
    const bestPlayer = getBestPlayer();
    if (!bestPlayer) return null;
    const bestValue = bestPlayer[key] as number;
    if (bestValue === 0) return null;
    return ((value / bestValue) * 100).toFixed(0);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(players);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPlayers(items);
  };

  return (
    <div className="player-comparison">
      <div className="header-container">
        <div className="flex items-center gap-4">
          <h2>Spielervergleich</h2>
          <PlayerSearch onSelectPlayer={handleSelectPlayer} />
        </div>
      </div>

      <div className="content">
        <div className="players-table">
          {players.length > 0 ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Spieler</TableHead>
                    <TableHead className="text-right">Punkte</TableHead>
                    <TableHead className="text-right">Durchschnitt</TableHead>
                    <TableHead className="text-right">Marktwert</TableHead>
                    <TableHead className="text-right">Kaufpreis</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        Nächster Gegner
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Spieler erhalten im Schnitt mehr Punkte gegen schwächere Gegner.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="players">
                  {(provided) => (
                    <TableBody
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {players.map((player, index) => (
                        <Draggable 
                          key={player.i} 
                          draggableId={player.i} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'bg-muted' : ''}
                            >
                              <TableCell>⋮⋮</TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {player.n} {player.ln}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {getPercentageDiff(player.tp, 'tp') !== null && (
                                    <span className="text-xs text-muted-foreground w-16 text-right">
                                      ({getPercentageDiff(player.tp, 'tp')}%)
                                    </span>
                                  )}
                                  <div>
                                    {player.tp}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {getPercentageDiff(player.ap, 'ap') !== null && (
                                    <span className="text-xs text-muted-foreground w-16 text-right">
                                      ({getPercentageDiff(player.ap, 'ap')}%)
                                    </span>
                                  )}
                                  <div>
                                    {player.ap.toFixed(0)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {getPercentageDiff(player.mv, 'mv') !== null && (
                                    <span className="text-xs text-muted-foreground w-16 text-right">
                                      ({getPercentageDiff(player.mv, 'mv')}%)
                                    </span>
                                  )}
                                  <div>
                                    {(player.mv / 1000000).toFixed(1)}M
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {player.currentOwner ? `${(player.currentOwner.price / 1000000).toFixed(1)}M` : '-'}
                              </TableCell>
                              <TableCell className="text-right" style={{ maxWidth: '200px' }}>
                                <div className="flex items-center justify-end gap-1 overflow-x-auto opponents-scroll">
                                  {nextMatches[teamMapping[player.tid]]?.slice(0, 6).map((match, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`flex-shrink-0 ${idx >= 3 ? 'scrollable-opponent' : ''}`}
                                      title={`${match.opponent} (${new Date(match.date).toLocaleDateString()})`}
                                    >
                                      <img 
                                        src={match.iconUrl} 
                                        alt={match.opponent}
                                        className="h-6"
                                      />
                                    </div>
                                  )) || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removePlayer(player.i)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spieler</TableHead>
                  <TableHead className="text-right">Punkte</TableHead>
                  <TableHead className="text-right">Durchschnitt</TableHead>
                  <TableHead className="text-right">Marktwert</TableHead>
                  <TableHead className="text-right">Kaufpreis</TableHead>
                  <TableHead className="text-right">Nächster Gegner</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-6" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerComparison; 