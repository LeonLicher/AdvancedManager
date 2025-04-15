import { calculateAdjustedPoints, checkTeamAvailability } from './playerAvailability';
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
  // Allow auto-formation moves
  if (destinationId === 'auto-formation') {
    return true;
  }

  return (
    destinationId === 'bench' || 
    movedPlayer.position === positionMap[destinationId as keyof typeof positionMap] ||
    (sourceId !== 'bench' && 
     destinationId !== 'bench' && 
     sourceId === destinationId)
  );
};

interface Formation {
  name: string;
  positions: {
    forwards: number;
    midfielders: number;
    defenders: number;
  };
}

const FORMATIONS: Formation[] = [
  { name: '3-4-3', positions: { forwards: 3, midfielders: 4, defenders: 3 } },
  { name: '3-5-2', positions: { forwards: 2, midfielders: 5, defenders: 3 } },
  { name: '4-2-4', positions: { forwards: 4, midfielders: 2, defenders: 4 } },
  { name: '4-3-3', positions: { forwards: 3, midfielders: 3, defenders: 4 } },
  { name: '4-4-2', positions: { forwards: 2, midfielders: 4, defenders: 4 } },
  { name: '5-2-3', positions: { forwards: 3, midfielders: 2, defenders: 5 } },
  { name: '5-3-2', positions: { forwards: 2, midfielders: 3, defenders: 5 } },
  { name: '3-6-1', positions: { forwards: 1, midfielders: 6, defenders: 3 } },
  { name: '4-5-1', positions: { forwards: 1, midfielders: 5, defenders: 4 } },
  { name: '5-4-1', positions: { forwards: 1, midfielders: 4, defenders: 5 } }
];

export const generateBestEleven = async (players: Player[]): Promise<Player[]> => {
  // Get availability information for all players
  const availabilityMap = await checkTeamAvailability(players);
  
  // Sort players by adjusted points (considering availability) in descending order
  const sortedPlayers = [...players].sort((a, b) => {
    const aAvailability = availabilityMap.get(a.id);
    const bAvailability = availabilityMap.get(b.id);
    
    if (!aAvailability || !bAvailability) return 0;
    
    const aAdjustedPoints = calculateAdjustedPoints(a, aAvailability);
    const bAdjustedPoints = calculateAdjustedPoints(b, bAvailability);
    
    return bAdjustedPoints - aAdjustedPoints;
  });
  
  // Separate players by position
  const goalkeepers = sortedPlayers.filter(p => p.position === 1);
  const defenders = sortedPlayers.filter(p => p.position === 2);
  const midfielders = sortedPlayers.filter(p => p.position === 3);
  const forwards = sortedPlayers.filter(p => p.position === 4);

  let bestFormation: Formation | null = null;
  let bestTeam: Player[] = [];
  let maxTotalPoints = 0;

  // Try each formation to find the best combination
  for (const formation of FORMATIONS) {
    const team: Player[] = [];
    
    // Add best goalkeeper
    if (goalkeepers.length > 0) {
      team.push(goalkeepers[0]);
    }

    // Add best players for each position based on formation
    team.push(...defenders.slice(0, formation.positions.defenders));
    team.push(...midfielders.slice(0, formation.positions.midfielders));
    team.push(...forwards.slice(0, formation.positions.forwards));

    // Calculate total adjusted points for this formation
    let totalPoints = 0;
    for (const player of team) {
      const availability = availabilityMap.get(player.id);
      if (availability) {
        totalPoints += calculateAdjustedPoints(player, availability);
      }
    }

    if (totalPoints > maxTotalPoints && team.length === 11) {
      maxTotalPoints = totalPoints;
      bestTeam = team;
      bestFormation = formation;
    }
  }

  // Log the formation and availability info
  if (bestFormation && bestTeam.length === 11) {
    console.log(`🎯 Beste Formation: ${bestFormation.name}`);
    console.log('👥 Spieler Verfügbarkeit:');
    for (const player of bestTeam) {
      const availability = availabilityMap.get(player.id);
      if (availability) {
        console.log(`${player.firstName}: ${
          availability.isLikelyToPlay ? '✅' : '❌'
        } ${availability.reason || ''} (${Math.round(availability.confidence * 100)}% sicher)`);
      }
    }
  }

  return bestTeam;
};