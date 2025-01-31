import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../lib/utils";

interface Manager {
  i: string;         // User ID
  lp: number[];      // Points history
  mdp: number;       // Matchday points
  pa: boolean;       // Participation active
  unm: string;       // User name
}

interface LeagueUser {
  pt: number;        // Season points
  i: string;         // User ID
  name: string;      // User name
  profile: string;   // Profile image
  mdp: number;       // Matchday points
  rank: number;      // Season rank
  mdRank: number;    // Matchday rank
  teamValue: number; // Team value
  pointsHistory: number[]; // Points history
}

interface LeaderboardProps {
  managers: Manager[];
  leagueUsers: LeagueUser[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ managers, leagueUsers }) => {
  const [isLive, setIsLive] = useState(false);

  const sortedManagers = [...managers].sort((a, b) => b.mdp - a.mdp);
  const sortedLeagueUsers = [...leagueUsers].sort((a, b) => b.pt - a.pt);

  const data = isLive ? sortedLeagueUsers : sortedManagers;

  return (
    <div className="space-y-4">
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center rounded-lg border bg-card p-1">
          <button
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !isLive 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
            onClick={() => setIsLive(false)}
          >
            Live Matchday
          </button>
          <button
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isLive 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
            onClick={() => setIsLive(true)}
          >
            Gesamtwertung
          </button>
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Rang</TableHead>
                <TableHead className="w-[80px]"></TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-right w-[120px]">
                  {isLive ? 'Gesamt' : 'Live Punkte'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={typeof item === 'object' ? (item as LeagueUser).i : (item as Manager).i}>
                  <TableCell className="font-medium text-center">{index + 1}</TableCell>
                  <TableCell className="p-2 text-center">
                    <img
                      src={`/Kickbase/${(item as LeagueUser).i}.jpe`}
                      alt={isLive ? (item as LeagueUser).name : (item as Manager).unm}
                      className="min-w-12 max-w-12 min-h-12 max-h-12 rounded-full object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <span>{isLive ? (item as LeagueUser).name : (item as Manager).unm}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {isLive ? (item as LeagueUser).pt : (item as Manager).mdp}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;