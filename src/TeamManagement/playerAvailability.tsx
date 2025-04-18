import { useCallback } from 'react'
import { useHttpClient } from '../HttpClientContext'
import { DomFilter } from '../components/FilterDropdown/FilterDropdown'
import { Player } from './types'

export interface PlayerAvailabilityInfo {
    isLikelyToPlay: boolean
    reason?: string
    confidence?: number
    lastChecked: Date
}

// API response interfaces
interface SingleAvailabilityResponse {
    isLikelyToPlay: boolean
    reason?: string
    confidence?: number
    lastChecked: string
}

interface TeamAvailabilityResponse {
    availabilityMap: Record<string, SingleAvailabilityResponse>
    unavailablePlayers: string[]
}

// Logger implementation
const logger = {
    info: (message: string, ...args: any[]) =>
        console.log(`[INFO] ${message}`, ...args),
    warning: (message: string, ...args: any[]) =>
        console.warn(`[WARNING] ${message}`, ...args),
    error: (message: string, ...args: any[]) =>
        console.error(`[ERROR] ${message}`, ...args),
    debug: (message: string, ...args: any[]) =>
        console.debug(`[DEBUG] ${message}`, ...args),
}

// Throttle log messages to prevent duplicate logs
const LOG_THROTTLE_DURATION = 5000 // 5 seconds
const lastLogTimes = new Map<string, number>()

// Keep track of the last calculated points to avoid duplicate logs
const lastCalculatedPoints = new Map<string, number>()

/**
 * Throttled logging to prevent duplicate messages
 */
function throttledLog(
    playerId: string,
    logType: string,
    message: string,
    ...args: any[]
): void {
    const key = `${playerId}_${logType}`
    const now = Date.now()
    const lastTime = lastLogTimes.get(key) || 0

    if (now - lastTime > LOG_THROTTLE_DURATION) {
        if (logType === 'info') {
            logger.info(message, ...args)
        } else if (logType === 'warning') {
            logger.warning(message, ...args)
        } else if (logType === 'error') {
            logger.error(message, ...args)
        } else {
            logger.debug(message, ...args)
        }
        lastLogTimes.set(key, now)
    }
}

/**
 * Calculate an adjusted score for a player based on their availability
 */
export function calculateAdjustedPoints(
    player: Player,
    availability: PlayerAvailabilityInfo
): number {
    let adjustedPoints = 0

    if (!availability.isLikelyToPlay) {
        adjustedPoints = 0 // Player won't play, so expected points are 0
    } else {
        // Adjust points based on confidence in availability (default to 0.8 if not provided)
        const confidence = availability.confidence ?? 0.8
        adjustedPoints = player.averagePoints * confidence
    }

    // Check if the points changed since last calculation
    const lastPoints = lastCalculatedPoints.get(player.id)
    if (lastPoints !== adjustedPoints) {
        if (!availability.isLikelyToPlay) {
            throttledLog(
                player.id,
                'info',
                `${player.firstName} is not likely to play, adjusted points: 0`
            )
        } else {
            throttledLog(
                player.id,
                'info',
                `${player.firstName} adjusted points: ${adjustedPoints} (avg: ${
                    player.averagePoints
                }, confidence: ${availability.confidence ?? 0.8})`
            )
        }
        lastCalculatedPoints.set(player.id, adjustedPoints)
    }

    return adjustedPoints
}

/**
 * Custom hook to provide player availability functions
 * This properly uses the HttpClient via React Context
 */
export function usePlayerAvailability() {
    const httpClient = useHttpClient()

    /**
     * Check if a player is likely to play
     */
    const checkPlayerAvailability = useCallback(
        async (
            player: Player,
            filter?: DomFilter
        ): Promise<PlayerAvailabilityInfo> => {
            try {
                throttledLog(
                    player.id,
                    'info',
                    `Checking availability for player ${player.firstName} (${
                        player.lastName || ''
                    }, ${player.teamName || ''}, ID: ${player.teamId})`
                )

                // Prepare player data for API
                const playerData = {
                    firstName: player.firstName,
                    teamId: player.teamId,
                    teamName: player.teamName,
                }

                // Call the API endpoint for a single player using HttpClient
                const response =
                    await httpClient.post<SingleAvailabilityResponse>(
                        '/api/check-availability',
                        { player: playerData, filter }
                    )

                // Ensure we have a Date object
                const availability: PlayerAvailabilityInfo = {
                    isLikelyToPlay: response.isLikelyToPlay,
                    reason: response.reason,
                    confidence: response.confidence,
                    lastChecked: new Date(response.lastChecked || new Date()),
                }

                throttledLog(
                    player.id,
                    'info',
                    `API returned status for ${player.firstName}: isLikelyToPlay=${availability.isLikelyToPlay}`
                )

                return availability
            } catch (error) {
                throttledLog(
                    player.id,
                    'error',
                    `Error checking availability for ${player.firstName}:`,
                    error
                )

                // Default fallback on error
                return {
                    isLikelyToPlay: true,
                    lastChecked: new Date(),
                }
            }
        },
        [httpClient]
    )

    /**
     * Get availability status for multiple players
     */
    const checkTeamAvailability = useCallback(
        async (
            players: Player[],
            filter?: DomFilter
        ): Promise<Map<string, PlayerAvailabilityInfo>> => {
            logger.info(`Checking availability for ${players.length} players`)
            const availabilityMap = new Map<string, PlayerAvailabilityInfo>()

            try {
                // Prepare the player data for the API
                const playerData = players.map((player) => ({
                    id: player.id,
                    firstName: player.firstName,
                    teamId: player.teamId,
                    teamName: player.teamName || '',
                }))

                // Call the team availability endpoint using HttpClient
                const response =
                    await httpClient.post<TeamAvailabilityResponse>(
                        '/api/check-team-availability',
                        { players: playerData, filter }
                    )

                // Process the availability map
                if (response.availabilityMap) {
                    Object.entries(response.availabilityMap).forEach(
                        ([playerId, availabilityData]) => {
                            // Ensure we have a Date object
                            const parsedAvailability: PlayerAvailabilityInfo = {
                                isLikelyToPlay: availabilityData.isLikelyToPlay,
                                reason: availabilityData.reason,
                                confidence: availabilityData.confidence,
                                lastChecked: new Date(
                                    availabilityData.lastChecked || new Date()
                                ),
                            }

                            availabilityMap.set(playerId, parsedAvailability)

                            // Find the player for logging
                            const player = players.find(
                                (p) => p.id === playerId
                            )
                            if (player) {
                                throttledLog(
                                    playerId,
                                    'info',
                                    `Player ${player.firstName}: isLikelyToPlay=${parsedAvailability.isLikelyToPlay}`
                                )
                            }
                        }
                    )
                }

                // Handle unavailable players
                if (
                    response.unavailablePlayers &&
                    response.unavailablePlayers.length > 0
                ) {
                    logger.warning(
                        `Players to remove from starting eleven: ${response.unavailablePlayers.join(
                            ', '
                        )}`
                    )

                    // Ensure all unavailable players are properly marked in the availability map
                    players.forEach((player) => {
                        if (
                            response.unavailablePlayers.includes(
                                player.firstName
                            )
                        ) {
                            // If this player is in the unavailable list, make sure they're marked as unavailable
                            const existingData = availabilityMap.get(player.id)

                            if (!existingData || existingData.isLikelyToPlay) {
                                // Only override if not already properly set
                                availabilityMap.set(player.id, {
                                    isLikelyToPlay: false,
                                    reason: 'Nicht im Kader',
                                    confidence: 0.95,
                                    lastChecked: new Date(),
                                })

                                throttledLog(
                                    player.id,
                                    'warning',
                                    `Player ${player.firstName} marked as unavailable based on API response`
                                )
                            }
                        }
                    })
                }
            } catch (error) {
                logger.error(`Error checking team availability:`, error)

                // Simple fallback - mark all players as available
                players.forEach((player) => {
                    availabilityMap.set(player.id, {
                        isLikelyToPlay: true,
                        lastChecked: new Date(),
                    })
                })
            }

            logger.info(`Finished checking availability for all players`)
            return availabilityMap
        },
        [httpClient]
    )

    return {
        checkPlayerAvailability,
        checkTeamAvailability,
        calculateAdjustedPoints,
    }
}
