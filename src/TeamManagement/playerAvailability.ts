import { HTMLParser } from "./services/htmlParser";
import { Player } from "./types";
import { getLogger } from "./utils/logger";
import { teamUrlMapper } from "./utils/teamUrlMapper";

// Setup logging
const logger = getLogger("playerAvailability");

export interface PlayerAvailabilityInfo {
  isLikelyToPlay: boolean;
  reason?: string;
  confidence: number; // 0-1
  lastChecked: Date;
}

// Cache management
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const availabilityCache = new Map<string, PlayerAvailabilityInfo>();

// Throttle log messages to prevent duplicate logs
const LOG_THROTTLE_DURATION = 5000; // 5 seconds
const lastLogTimes = new Map<string, number>();

/**
 * Throttled logging to prevent duplicate messages
 */
function throttledLog(
  playerId: string,
  logType: string,
  message: string,
  ...args: any[]
): void {
  const key = `${playerId}_${logType}`;
  const now = Date.now();
  const lastTime = lastLogTimes.get(key) || 0;

  if (now - lastTime > LOG_THROTTLE_DURATION) {
    if (logType === "info") {
      logger.info(message, ...args);
    } else if (logType === "warning") {
      logger.warning(message, ...args);
    } else if (logType === "error") {
      logger.error(message, ...args);
    } else {
      logger.debug(message, ...args);
    }
    lastLogTimes.set(key, now);
  }
}

/**
 * Check if a player is likely to play based on ligainsider.com data
 */
export async function checkPlayerAvailability(
  player: Player
): Promise<PlayerAvailabilityInfo> {
  const playerName = player.firstName;
  const cacheKey = `${playerName}_${player.teamId}`;
  const cachedInfo = availabilityCache.get(cacheKey);

  // Return cached data if it's less than 1 hour old
  if (
    cachedInfo &&
    new Date().getTime() - cachedInfo.lastChecked.getTime() < CACHE_DURATION
  ) {
    throttledLog(
      player.id,
      "info",
      `Returning cached availability info for ${playerName} (Team ID: ${player.teamId})`
    );
    return cachedInfo;
  }

  try {
    const teamId = player.teamId;
    throttledLog(
      player.id,
      "info",
      `Checking availability for player ${playerName} (${
        player.lastName || ""
      }, ${player.teamName}, ID: ${teamId})`
    );

    // Get the team URL from our mapper
    const teamUrl = teamUrlMapper.getTeamUrl(teamId, playerName);
    throttledLog(
      player.id,
      "info",
      `Using URL: ${teamUrl} to check availability for ${playerName}`
    );

    // Use HTML parser to check player status
    throttledLog(player.id, "info", `Using HTML parser for ${playerName}`);
    const htmlParser = new HTMLParser(logger);
    const status = await htmlParser.fetchAndParsePlayerStatus(
      teamUrl,
      playerName
    );

    if (status) {
      throttledLog(
        player.id,
        "info",
        `HTML parsing found status for ${playerName}: isLikelyToPlay=${status.isLikelyToPlay}, confidence=${status.confidence}`
      );
      // Cache the result
      availabilityCache.set(cacheKey, status);
      return status;
    }

    // Default fallback if we couldn't determine status
    throttledLog(
      player.id,
      "warning",
      `Could not determine status for ${playerName}, using default`
    );
    const defaultInfo: PlayerAvailabilityInfo = {
      isLikelyToPlay: true,
      confidence: 0.6,
      lastChecked: new Date(),
    };

    availabilityCache.set(cacheKey, defaultInfo);
    return defaultInfo;
  } catch (error) {
    throttledLog(
      player.id,
      "error",
      `Error checking availability for ${playerName}:`,
      error
    );
    return {
      isLikelyToPlay: true, // Assume player is available if check fails
      confidence: 0.5,
      lastChecked: new Date(),
    };
  }
}

/**
 * Get availability status for multiple players
 */
export async function checkTeamAvailability(
  players: Player[]
): Promise<Map<string, PlayerAvailabilityInfo>> {
  logger.info(`Checking availability for ${players.length} players`);
  const availabilityMap = new Map<string, PlayerAvailabilityInfo>();
  const unavailablePlayers: string[] = [];

  // Check availability for all players in parallel
  const checks = players.map(async (player) => {
    // const playerlist = ["Schmid", "Ducksch", "Weiser", "Undav"];
    // if (!playerlist.includes(player.firstName)) return;

    const availability = await checkPlayerAvailability(player);

    // If player status has reason "Nicht im Kader" or "Nicht im Kader gefunden",
    // they should be removed from starting eleven
    if (
      !availability.isLikelyToPlay ||
      availability.reason === "Nicht im Kader" ||
      availability.reason === "Nicht im Kader gefunden"
    ) {
      unavailablePlayers.push(player.firstName);
      throttledLog(
        player.id,
        "warning",
        `Player ${player.firstName} not found on team site or unavailable - REMOVING FROM STARTING ELEVEN`
      );

      // Force player as unavailable with high confidence
      availability.isLikelyToPlay = false;
      availability.confidence = 0.95;
      availability.reason = availability.reason || "Nicht im Kader gefunden";
    }

    availabilityMap.set(player.id, availability);
    throttledLog(
      player.id,
      "info",
      `Player ${player.firstName}: isLikelyToPlay=${availability.isLikelyToPlay}, confidence=${availability.confidence}`
    );
  });

  await Promise.all(checks);

  if (unavailablePlayers.length > 0) {
    logger.warning(
      `The following players should be removed from starting eleven: ${unavailablePlayers.join(
        ", "
      )}`
    );
  }

  logger.info(`Finished checking availability for all players`);
  return availabilityMap;
}

// Keep track of the last calculated points to avoid duplicate logs
const lastCalculatedPoints = new Map<string, number>();

/**
 * Calculate an adjusted score for a player based on their availability
 */
export function calculateAdjustedPoints(
  player: Player,
  availability: PlayerAvailabilityInfo
): number {
  let adjustedPoints = 0;

  if (!availability.isLikelyToPlay) {
    adjustedPoints = 0; // Player won't play, so expected points are 0
  } else {
    // Adjust points based on confidence in availability
    adjustedPoints = player.averagePoints * availability.confidence;
  }

  // Check if the points changed since last calculation
  const lastPoints = lastCalculatedPoints.get(player.id);
  if (lastPoints !== adjustedPoints) {
    if (!availability.isLikelyToPlay) {
      throttledLog(
        player.id,
        "info",
        `${player.firstName} is not likely to play, adjusted points: 0`
      );
    } else {
      throttledLog(
        player.id,
        "info",
        `${player.firstName} adjusted points: ${adjustedPoints} (avg: ${player.averagePoints}, confidence: ${availability.confidence})`
      );
    }
    lastCalculatedPoints.set(player.id, adjustedPoints);
  }

  return adjustedPoints;
}
