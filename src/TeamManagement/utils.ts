import HttpClient from "../httpClient";
import type { PlayerAvailabilityInfo } from "./playerAvailability";
import { Player } from "./types";

// Valid formation options
export const validFormations = [
  "3-4-3",
  "3-5-2",
  "4-2-4",
  "4-3-3",
  "4-4-2",
  "5-2-3",
  "5-3-2",
  "3-6-1",
  "4-5-1",
  "5-4-1",
];

// Position mapping between string names and numeric values
export const positionMap = {
  forwards: 4,
  midfielders: 3,
  defenders: 2,
  goalkeepers: 1,
};

// Player positions as constants
const POSITIONS = [1, 2, 3, 4]; // goalkeepers, defenders, midfielders, forwards

/**
 * Find the best possible formation based on active players
 */
export const getBestPossibleFormation = (activePlayers: Player[]): string => {
  const defenders = activePlayers.filter((p) => p.position === 2).length;
  const midfielders = activePlayers.filter((p) => p.position === 3).length;
  const forwards = activePlayers.filter((p) => p.position === 4).length;
  const formation = `${defenders}-${midfielders}-${forwards}`;

  if (validFormations.includes(formation)) {
    return formation;
  }

  // Find the closest valid formation
  return [...validFormations].sort((a, b) => {
    const [aD, aM, aF] = a.split("-").map(Number);
    const [bD, bM, bF] = b.split("-").map(Number);
    const aDiff =
      Math.abs(aD - defenders) +
      Math.abs(aM - midfielders) +
      Math.abs(aF - forwards);
    const bDiff =
      Math.abs(bD - defenders) +
      Math.abs(bM - midfielders) +
      Math.abs(bF - forwards);
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
  if (destinationId === "auto-formation") {
    return true;
  }

  return (
    destinationId === "bench" ||
    movedPlayer.position ===
      positionMap[destinationId as keyof typeof positionMap] ||
    (sourceId !== "bench" &&
      destinationId !== "bench" &&
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
  { name: "3-4-3", positions: { forwards: 3, midfielders: 4, defenders: 3 } },
  { name: "3-5-2", positions: { forwards: 2, midfielders: 5, defenders: 3 } },
  { name: "4-2-4", positions: { forwards: 4, midfielders: 2, defenders: 4 } },
  { name: "4-3-3", positions: { forwards: 3, midfielders: 3, defenders: 4 } },
  { name: "4-4-2", positions: { forwards: 2, midfielders: 4, defenders: 4 } },
  { name: "5-2-3", positions: { forwards: 3, midfielders: 2, defenders: 5 } },
  { name: "5-3-2", positions: { forwards: 2, midfielders: 3, defenders: 5 } },
  { name: "3-6-1", positions: { forwards: 1, midfielders: 6, defenders: 3 } },
  { name: "4-5-1", positions: { forwards: 1, midfielders: 5, defenders: 4 } },
  { name: "5-4-1", positions: { forwards: 1, midfielders: 4, defenders: 5 } },
];

// API response interface
interface TeamAvailabilityResponse {
  availabilityMap: Record<
    string,
    {
      isLikelyToPlay: boolean;
      reason?: string;
      confidence?: number;
      lastChecked: string;
    }
  >;
  unavailablePlayers: string[];
}

/**
 * Check team availability using the provided HttpClient directly
 */
async function checkTeamAvailabilityDirect(
  httpClient: HttpClient,
  players: Player[]
): Promise<Map<string, PlayerAvailabilityInfo>> {
  const availabilityMap = new Map<string, PlayerAvailabilityInfo>();

  try {
    // Prepare the player data for the API
    const playerData = players.map((player) => ({
      id: player.id,
      firstName: player.firstName,
      teamId: player.teamId,
      teamName: player.teamName || "",
    }));

    // Call the team availability endpoint using HttpClient
    const response = await httpClient.post<TeamAvailabilityResponse>(
      "/api/check-team-availability",
      { players: playerData }
    );

    // Process the availability map
    if (response.availabilityMap) {
      Object.entries(response.availabilityMap).forEach(
        ([playerId, availabilityData]) => {
          // Ensure we have a Date object
          const parsedAvailability: PlayerAvailabilityInfo = {
            isLikelyToPlay: availabilityData.isLikelyToPlay,
            reason: availabilityData.reason,
            confidence: availabilityData.confidence,
            lastChecked: new Date(availabilityData.lastChecked || new Date()),
          };

          availabilityMap.set(playerId, parsedAvailability);
        }
      );
    }

    // Handle unavailable players
    if (response.unavailablePlayers && response.unavailablePlayers.length > 0) {
      console.warn(
        `Players to remove from starting eleven: ${response.unavailablePlayers.join(
          ", "
        )}`
      );

      // Ensure all unavailable players are properly marked in the availability map
      players.forEach((player) => {
        if (response.unavailablePlayers.includes(player.firstName)) {
          // If this player is in the unavailable list, make sure they're marked as unavailable
          const existingData = availabilityMap.get(player.id);

          if (!existingData || existingData.isLikelyToPlay) {
            // Only override if not already properly set
            availabilityMap.set(player.id, {
              isLikelyToPlay: false,
              reason: "Nicht im Kader",
              confidence: 0.95,
              lastChecked: new Date(),
            });
          }
        }
      });
    }
  } catch (error) {
    console.error(`Error checking team availability:`, error);

    // Simple fallback - mark all players as available
    players.forEach((player) => {
      availabilityMap.set(player.id, {
        isLikelyToPlay: true,
        lastChecked: new Date(),
      });
    });
  }

  return availabilityMap;
}

/**
 * Get the number of players needed for each position in a formation
 */
const getPositionCountsForFormation = (
  formation: string
): Record<number, number> => {
  const [defenders, midfielders, forwards] = formation.split("-").map(Number);
  return {
    1: 1, // Always one goalkeeper
    2: defenders,
    3: midfielders,
    4: forwards,
  };
};

export const generateBestEleven = async (
  players: Player[],
  httpClient: HttpClient
): Promise<Player[]> => {
  console.log("Generating best eleven from players:", players);

  if (!players || players.length === 0) {
    console.error("No players available to generate best eleven");
    return [];
  }

  // Ensure players have name property set
  const playersWithName = players.map((player) => ({
    ...player,
    name: player.name || `${player.firstName} ${player.lastName || ""}`.trim(),
    points: player.points || player.averagePoints,
  }));

  try {
    // Use the existing checkTeamAvailabilityDirect function to get availability data
    const availabilityMap = await checkTeamAvailabilityDirect(
      httpClient,
      playersWithName
    );

    // Create players with availability info
    const playersWithAvailability = playersWithName.map((player) => {
      const availability = availabilityMap.get(player.id);
      return {
        ...player,
        isAvailable: availability ? availability.isLikelyToPlay : true,
      };
    });

    // Filter out unavailable players
    const availablePlayers = playersWithAvailability.filter(
      (player) => player.isAvailable
    );

    // Sort by points (adjusted for availability)
    const sortedPlayers = [...availablePlayers].sort((a, b) => {
      const adjustedPointsA = a.isAvailable
        ? a.points || a.averagePoints || 0
        : 0;
      const adjustedPointsB = b.isAvailable
        ? b.points || b.averagePoints || 0
        : 0;
      return adjustedPointsB - adjustedPointsA;
    });

    // Find the best formation based on available players
    const bestFormation = getBestPossibleFormation(sortedPlayers);
    console.log(`Best possible formation: ${bestFormation}`);

    // Map of positions to number of players needed for that position in the formation
    const positionCounts = getPositionCountsForFormation(bestFormation);

    // Group players by position
    const playersByPosition: Record<number, Player[]> = {};
    POSITIONS.forEach((position) => {
      playersByPosition[position] = sortedPlayers
        .filter((player) => player.position === position)
        .sort(
          (a, b) =>
            (b.points || b.averagePoints || 0) -
            (a.points || a.averagePoints || 0)
        );
    });

    // Select the best players for each position based on the formation
    const bestEleven: Player[] = [];

    for (const position of POSITIONS) {
      const count = positionCounts[position] || 0;
      const bestPlayersForPosition =
        playersByPosition[position]?.slice(0, count) || [];
      bestEleven.push(...bestPlayersForPosition);
    }

    return bestEleven.slice(0, 11);
  } catch (error) {
    throw handleTeamManagementError(error, "generating best eleven");
  }
};

/**
 * Helper function for error handling in team management functions
 */
export const handleTeamManagementError = (
  error: unknown,
  context: string
): Error => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Unknown error";

  console.error(`Error in ${context}:`, error);

  return new Error(`${context}: ${errorMessage}`);
};
