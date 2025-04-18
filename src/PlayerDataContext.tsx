import React, { createContext, useContext, useEffect, useState } from 'react'

interface DetailedPlayer {
    i: string // id
    fn: string // first name
    ln: string // last name
    st: number // status
    stxt: string // status text
    pos: number // position
    ap: number // average points
    tp: number // total points
    mv: number // market value
    tid: string // team id
    tn: string // team name
    oui: string // owner user id
}

interface PlayerDataContextType {
    players: DetailedPlayer[]
    isLoading: boolean
    error: Error | null
}

const PlayerDataContext = createContext<PlayerDataContextType>({
    players: [],
    isLoading: true,
    error: null,
})

export const usePlayerData = () => useContext(PlayerDataContext)

export const PlayerDataProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [players, setPlayers] = useState<DetailedPlayer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        const loadPlayers = async () => {
            try {
                // Check if we already have the data cached
                const cachedData = sessionStorage.getItem('detailedPlayers')
                if (cachedData) {
                    setPlayers(JSON.parse(cachedData))
                    setIsLoading(false)
                    return
                }

                const response = await fetch(
                    '/AdvancedManager/detailed_players.json'
                )
                const rawData = await response.json()
                const processedPlayers = Object.values(rawData.players)
                    .filter(
                        (player: any): player is DetailedPlayer =>
                            player &&
                            typeof player === 'object' &&
                            'i' in player
                    )
                    .sort((a, b) => b.tp - a.tp)

                setPlayers(processedPlayers)
                sessionStorage.setItem(
                    'detailedPlayers',
                    JSON.stringify(processedPlayers)
                )
                setIsLoading(false)
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err
                        : new Error('Failed to load player data')
                )
                setIsLoading(false)
            }
        }

        loadPlayers()
    }, [])

    return (
        <PlayerDataContext.Provider value={{ players, isLoading, error }}>
            {children}
        </PlayerDataContext.Provider>
    )
}
