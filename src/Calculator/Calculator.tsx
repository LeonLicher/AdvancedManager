import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useHttpClient } from '../HttpClientContext'
import './Calculator.scss'

interface CalculatorProps {
    leagueId: string
}

// Squad player interface from /squad endpoint
interface SquadPlayer {
    i: string // player id
    n: string // first name
    ln?: string // last name
    mvgl: number // market value gain/loss to buyprice
    st: number // status
    mdst: number // match day status
    pos: number // position
    mv: number // market value
    mvt: number // market value trend
    lo?: number // lineup order
    p?: number // points
}

// Add new interface for budget response
interface BudgetResponse {
    pbas: number // Previous balance
    b: number // Current budget
    bs: number // Budget spent
}

interface DetailedPlayer extends SquadPlayer {
    fn: string // first name
    ln: string // last name
    tn: string // team name
    st: number // status
    stxt: string // status text
    pos: number // position
    tp: number // total points
    ap: number // average points
    g: number // goals
    a: number // assists
    mv: number // market value
    cv: number // current value
    tfhmvt: number // trend for next matchday
    mvt: number // market value trend
    mdsum: MatchDay[] // upcoming matches
    pim: string // player image
    tim: string // team image
}

interface MatchDay {
    t1: string // team 1 id
    t2: string // team 2 id
    t1g: number // team 1 goals
    t2g: number // team 2 goals
    day: number // matchday
    md: string // match date
    cur: boolean // is current matchday
    mdst: number // match day status
    t1im: string // team 1 image
    t2im: string // team 2 image
}

interface NextMatch {
    opponent: string
    iconUrl: string
    date: string
}

interface TeamMatches {
    [key: string]: NextMatch[]
}

interface Match {
    matchDateTime: string
    team1: {
        teamId: number
        shortName: string
        teamIconUrl: string
    }
    team2: {
        teamId: number
        shortName: string
        teamIconUrl: string
    }
}

// Add new type for sort options
type SortOption = 'mv-asc' | 'mv-desc' | 'daily-asc' | 'daily-desc'

const Calculator: React.FC<CalculatorProps> = ({ leagueId }) => {
    const httpClient = useHttpClient()
    const [players, setPlayers] = useState<DetailedPlayer[]>([])
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]) // Track selected player IDs
    const [budget, setBudget] = useState<BudgetResponse | null>(null)
    const [nextMatches, setNextMatches] = useState<TeamMatches>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<SortOption>('mv-desc')

    // Add team mapping effect
    useEffect(() => {
        const loadTeamMapping = async () => {
            try {
                const response = await fetch(
                    '/AdvancedManager/detailed_players.json'
                )
                const rawData = await response.json()
                const teamMap: { [key: string]: string } = {}

                Object.values(rawData).forEach((playerGroup: any) => {
                    if (typeof playerGroup === 'object') {
                        Object.values(playerGroup).forEach((player: any) => {
                            if (
                                player &&
                                typeof player === 'object' &&
                                player.tid &&
                                player.tn
                            ) {
                                teamMap[player.tid] = player.tn
                            }
                        })
                    }
                })
            } catch (error) {
                console.error('Error loading team mapping:', error)
            }
        }

        loadTeamMapping()
    }, [])

    // Add matches effect
    useEffect(() => {
        const fetchNextMatches = async () => {
            try {
                const response = await fetch('/AdvancedManager/spielplan.json')
                const matches: Match[] = await response.json()

                const currentDate = new Date()
                const upcomingMatches: TeamMatches = {}

                matches
                    .filter(
                        (match) => new Date(match.matchDateTime) > currentDate
                    )
                    .sort(
                        (a, b) =>
                            new Date(a.matchDateTime).getTime() -
                            new Date(b.matchDateTime).getTime()
                    )
                    .forEach((match) => {
                        // For team1
                        if (!upcomingMatches[match.team1.shortName]) {
                            upcomingMatches[match.team1.shortName] = []
                        }
                        upcomingMatches[match.team1.shortName].push({
                            opponent: match.team2.shortName,
                            iconUrl: match.team2.teamIconUrl,
                            date: match.matchDateTime,
                        })

                        // For team2
                        if (!upcomingMatches[match.team2.shortName]) {
                            upcomingMatches[match.team2.shortName] = []
                        }
                        upcomingMatches[match.team2.shortName].push({
                            opponent: match.team1.shortName,
                            iconUrl: match.team1.teamIconUrl,
                            date: match.matchDateTime,
                        })
                    })

                setNextMatches(upcomingMatches)
            } catch (error) {
                console.error('Error fetching next matches:', error)
            }
        }

        fetchNextMatches()
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Get squad and budget
                const [squadResponse, budgetResponse] = await Promise.all([
                    httpClient.get<{ it: SquadPlayer[] }>(
                        `/v4/leagues/${leagueId}/squad`
                    ),
                    httpClient.get<BudgetResponse>(
                        `/v4/leagues/${leagueId}/me/budget`
                    ),
                ])

                // Fetch detailed info for each player
                const detailedPlayers = await Promise.all(
                    squadResponse.it.map((player) =>
                        httpClient.get<DetailedPlayer>(
                            `/v4/competitions/1/players/${player.i}?leagueId=${leagueId}`
                        )
                    )
                )

                setPlayers(detailedPlayers)
                setBudget(budgetResponse)
            } catch (err) {
                console.error('Error fetching data:', err)
                setError('Failed to fetch data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [httpClient, leagueId])

    const calculateUpdatesUntilFriday = () => {
        const now = new Date()
        const targetDay = 5 // Friday is 5
        const targetHour = 20
        const targetMinute = 30

        const target = new Date()
        target.setDate(
            target.getDate() + ((targetDay + 7 - target.getDay()) % 7)
        )
        target.setHours(targetHour, targetMinute, 0, 0)

        // If target is in the past, get next Friday
        if (target < now) {
            target.setDate(target.getDate() + 7)
        }

        // Daily update time is 22:05
        const updateHour = 22
        const updateMinute = 5

        // Count remaining updates
        let updates = 0
        const currentTime = now.getHours() * 60 + now.getMinutes()
        const updateTime = updateHour * 60 + updateMinute

        // Check each day from now until target
        let checkDate = new Date(now)
        while (checkDate < target) {
            // If we haven't passed today's update time yet, count today's update
            if (checkDate.getDate() === now.getDate()) {
                if (currentTime < updateTime) {
                    updates++
                }
            } else {
                // For future days before target, count their updates
                if (
                    checkDate.getTime() + updateTime * 60 * 1000 <
                    target.getTime()
                ) {
                    updates++
                }
            }

            // Move to next day
            checkDate.setDate(checkDate.getDate() + 1)
            checkDate.setHours(0, 0, 0, 0)
        }

        return updates
    }

    const calculateDailyMarketValueChange = () =>
        players
            .filter((player) => selectedPlayers.includes(player.i))
            .reduce((sum, player) => sum + (player.tfhmvt || 0), 0)

    const calculateSelectedPlayersValue = () =>
        players
            .filter((player) => selectedPlayers.includes(player.i))
            .reduce((sum, player) => sum + player.mv, 0)

    const calculateProjectedTotalChange = () => {
        const dailyChange = calculateDailyMarketValueChange()
        const updates = calculateUpdatesUntilFriday()
        return dailyChange * updates
    }

    const calculateProjectedTotalBudget = () => {
        const currentBudget = budget?.b || 0
        const selectedPlayersValue = calculateSelectedPlayersValue()
        const projectedChange = calculateProjectedTotalChange()
        return currentBudget + selectedPlayersValue + projectedChange
    }

    const togglePlayerSelection = (playerId: string) => {
        setSelectedPlayers((prev) =>
            prev.includes(playerId)
                ? prev.filter((id) => id !== playerId)
                : [...prev, playerId]
        )
    }

    // Add sorting function
    const getSortedPlayers = () => {
        return [...players].sort((a, b) => {
            switch (sortBy) {
                case 'mv-asc':
                    return a.mv - b.mv
                case 'mv-desc':
                    return b.mv - a.mv
                case 'daily-asc':
                    return a.tfhmvt - b.tfhmvt
                case 'daily-desc':
                    return b.tfhmvt - a.tfhmvt
                default:
                    return 0
            }
        })
    }

    const selectAllPlayers = () => {
        setSelectedPlayers(players.map((player) => player.i))
    }

    const deselectAllPlayers = () => {
        setSelectedPlayers([])
    }

    if (isLoading) return <div className="loading">Loading...</div>
    if (error) return <div className="error">{error}</div>

    return (
        <div className="calculator">
            <div className="balance-info">
                <div className="current-stats">
                    <h3>
                        Kontostand: <span>{budget?.b.toLocaleString()} €</span>
                    </h3>
                    <h3>
                        Marktwertänderung ausgewählte Spieler:{' '}
                        <span>
                            {calculateDailyMarketValueChange().toLocaleString()}{' '}
                            €
                        </span>
                    </h3>
                </div>

                <div className="projected-stats">
                    <h3>
                        Kontostand am Freitag:
                        <span>
                            {calculateProjectedTotalBudget().toLocaleString()} €
                        </span>
                    </h3>
                </div>
            </div>

            <div className="controls">
                <div className="selection-controls">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllPlayers}
                    >
                        Alle auswählen
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllPlayers}
                    >
                        Alle abwählen
                    </Button>
                    <div className="selected-count">
                        {selectedPlayers.length} von {players.length} Spielern
                        ausgewählt
                    </div>
                </div>

                <div className="sorting-controls">
                    <div className="sort-group">
                        <span className="sort-label">Marktwert:</span>
                        <Button
                            variant={
                                sortBy === 'mv-desc' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setSortBy('mv-desc')}
                        >
                            <ArrowDownIcon className="h-4 w-4 mr-1" />
                            Höchster
                        </Button>
                        <Button
                            variant={
                                sortBy === 'mv-asc' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setSortBy('mv-asc')}
                        >
                            <ArrowUpIcon className="h-4 w-4 mr-1" />
                            Niedrigster
                        </Button>
                    </div>

                    <div className="sort-group">
                        <span className="sort-label">Tägliche Änderung:</span>
                        <Button
                            variant={
                                sortBy === 'daily-desc' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setSortBy('daily-desc')}
                        >
                            <ArrowDownIcon className="h-4 w-4 mr-1" />
                            Höchste
                        </Button>
                        <Button
                            variant={
                                sortBy === 'daily-asc' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setSortBy('daily-asc')}
                        >
                            <ArrowUpIcon className="h-4 w-4 mr-1" />
                            Niedrigste
                        </Button>
                    </div>
                </div>
            </div>

            <div className="players-grid">
                {getSortedPlayers().map((player) => (
                    <div
                        key={player.i}
                        className={`player-card ${selectedPlayers.includes(player.i) ? 'selected' : ''}`}
                        onClick={() => togglePlayerSelection(player.i)}
                    >
                        <div className="player-info">
                            <h3>
                                {player.fn} {player.ln}
                            </h3>
                            <p className="team-name">{player.tn}</p>

                            <div className="stats">
                                <div className="stat">
                                    <span>Market Value</span>
                                    <span>{player.mv.toLocaleString()} €</span>
                                </div>
                                <div className="stat">
                                    <span>Daily Change</span>
                                    <span
                                        className={
                                            player.tfhmvt > 0
                                                ? 'positive'
                                                : 'negative'
                                        }
                                    >
                                        {player.tfhmvt.toLocaleString()} €
                                    </span>
                                </div>
                            </div>

                            <div className="matches">
                                <span className="matches-label">
                                    Next Matches:
                                </span>
                                <div className="opponents-scroll">
                                    {nextMatches[player.tn]
                                        ?.slice(0, 6)
                                        .map((match, idx) => (
                                            <div
                                                key={idx}
                                                className={`opponent ${idx >= 3 ? 'scrollable-opponent' : ''}`}
                                                title={`${match.opponent} (${new Date(match.date).toLocaleDateString('de-DE')})`}
                                            >
                                                <img
                                                    src={match.iconUrl}
                                                    alt={match.opponent}
                                                />
                                            </div>
                                        )) || '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Calculator
