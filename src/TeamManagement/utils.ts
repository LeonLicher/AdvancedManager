import { Player } from './types';

// Valid formation options
export const validFormations = [
  '3-4-3', '3-5-2', '4-2-4', '4-3-3', '4-4-2', 
  '5-2-3', '5-3-2', '3-6-1', '4-5-1', '5-4-1'
];

// Position mapping between string names and numeric values
export const positionMap = {
  'forwards': 4,
  'midfielders': 3,
  'defenders': 2,
  'goalkeepers': 1
};

/**
 * Find the best possible formation based on active players
 */
export const getBestPossibleFormation = (activePlayers: Player[]): string => {
  const defenders = activePlayers.filter(p => p.position === 2).length;
  const midfielders = activePlayers.filter(p => p.position === 3).length;
  const forwards = activePlayers.filter(p => p.position === 4).length;
  const formation = `${defenders}-${midfielders}-${forwards}`;
  
  if (validFormations.includes(formation)) {
    return formation;
  }

  // Find the closest valid formation
  return [...validFormations].sort((a, b) => {
    const [aD, aM, aF] = a.split('-').map(Number);
    const [bD, bM, bF] = b.split('-').map(Number);
    const aDiff = Math.abs(aD - defenders) + Math.abs(aM - midfielders) + Math.abs(aF - forwards);
    const bDiff = Math.abs(bD - defenders) + Math.abs(bM - midfielders) + Math.abs(bF - forwards);
    return aDiff - bDiff;
  })[0];
};

/**
 * Sort bench players by position and then by market value
 */
export const sortBenchPlayers = (players: Player[]): Player[] => {
  return [...players].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return b.marketValue - a.marketValue;
  });
};

/**
 * Check if a move is valid based on source, destination and player position
 */
export const isValidMove = (
  movedPlayer: Player, 
  sourceId: string, 
  destinationId: string
): boolean => {
  return (
    destinationId === 'bench' || 
    movedPlayer.position === positionMap[destinationId as keyof typeof positionMap] ||
    (sourceId !== 'bench' && 
     destinationId !== 'bench' && 
     sourceId === destinationId)
  );
};