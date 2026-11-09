import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { PlayerSearch } from '../components/PlayerSearch'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { useHttpClient } from '../HttpClientContext'
import './ShowAvailable.scss'

type Ownership = 'mine' | 'free' | 'taken'
type OwnershipFilter = 'all' | 'free' | 'freeAndMine'

interface PlayerData {
    i: string // id
    ln: string // lastName
    mv: number // marketValue
    pos: number // position
    ap: number // averagePoints
    tp: number // totalPoints
    ppm?: number // points per million
    searchValue?: string
    fill?: string // for scatter plot coloring
    fillOpacity?: number
    ownership?: Ownership
    ownerName?: string
}

interface Position {
    id: number
    name: string
}

const POSITIONS: Position[] = [
    { id: 0, name: 'Alle' },
    { id: 1, name: 'Torwart' },
    { id: 2, name: 'Abwehr' },
    { id: 3, name: 'Mittelfeld' },
    { id: 4, name: 'Sturm' },
]

const OWNERSHIP_FILTERS: { value: OwnershipFilter; label: string }[] = [
    { value: 'all', label: 'Alle Spieler' },
    { value: 'free', label: 'Nur freie' },
    { value: 'freeAndMine', label: 'Freie + meine' },
]

const MINE_COLOR = '#16a34a'
const TAKEN_COLOR = '#9ca3af'
const SELECTED_COLOR = '#ef4444'
const FILTER_STORAGE_KEY = 'spieleranalyse.ownershipFilter'

// Draw order: taken players at the bottom, own players on top
const OWNERSHIP_ORDER: Record<Ownership, number> = { taken: 0, free: 1, mine: 2 }

const loadStoredFilter = (): OwnershipFilter => {
    try {
        const stored = localStorage.getItem(FILTER_STORAGE_KEY)
        if (stored === 'all' || stored === 'free' || stored === 'freeAndMine') {
            return stored
        }
    } catch {
        // storage unavailable – use default
    }
    return 'all'
}

// Squad items differ between endpoints (pi vs. i)
interface SquadItem {
    i?: string
    pi?: string
}

interface ShowAvailableProps {
    leagueId: string
    userId: string
}

/**
 * Builds a map playerId -> owner userId for the current league by loading
 * every manager's squad. Falls back to the teamcenter lineup if the squad
 * endpoint is unavailable for a manager.
 */
const useLeagueOwnership = (
    httpClient: any,
    leagueId: string,
    userId: string
) => {
    const [owners, setOwners] = useState<Map<string, string>>(new Map())
    const [managerNames, setManagerNames] = useState<Map<string, string>>(
        new Map()
    )
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!leagueId) {
            setLoading(false)
            return
        }
        let cancelled = false

        const toIds = (items: SquadItem[] | undefined) =>
            (items ?? [])
                .map((item) => item.pi ?? item.i)
                .filter((id): id is string => !!id)
                .map(String)

        const fetchSquadIds = async (managerId: string) => {
            if (managerId === userId) {
                const own = await httpClient.get(
                    `/v4/leagues/${leagueId}/squad`
                )
                return toIds(own.it)
            }
            try {
                const squad = await httpClient.get(
                    `/v4/leagues/${leagueId}/managers/${managerId}/squad`
                )
                return toIds(squad.it)
            } catch (err) {
                console.warn(
                    `Squad endpoint failed for manager ${managerId}, using teamcenter`,
                    err
                )
                const teamcenter = await httpClient.get(
                    `/v4/leagues/${leagueId}/users/${managerId}/teamcenter`
                )
                return toIds(teamcenter.lp)
            }
        }

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const ranking: { us: { i: string; n: string }[] } =
                    await httpClient.get(`/v4/leagues/${leagueId}/ranking`)

                let failed = 0
                const squads = await Promise.all(
                    ranking.us.map(async (manager) => {
                        try {
                            return [
                                manager.i,
                                await fetchSquadIds(manager.i),
                            ] as const
                        } catch (err) {
                            failed++
                            console.error(
                                `Error fetching squad for manager ${manager.i}:`,
                                err
                            )
                            return [manager.i, [] as string[]] as const
                        }
                    })
                )

                const ownerMap = new Map<string, string>()
                squads.forEach(([managerId, ids]) =>
                    ids.forEach((id) => ownerMap.set(id, managerId))
                )

                if (!cancelled) {
                    setManagerNames(
                        new Map(ranking.us.map((u) => [u.i, u.n]))
                    )
                    setOwners(ownerMap)
                    if (failed > 0) {
                        setError(
                            `Kader von ${failed} Manager(n) konnten nicht geladen werden – Angaben evtl. unvollständig.`
                        )
                    }
                }
            } catch (err) {
                console.error('Error fetching ownership data:', err)
                if (!cancelled) {
                    setError(
                        'Besitzer konnten nicht geladen werden – alle Spieler gelten als frei.'
                    )
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [httpClient, leagueId, userId])

    return { owners, managerNames, loading, error }
}

interface TooltipProps {
    active?: boolean
    payload?: any[]
    coordinate?: any
    selectedPlayer: PlayerData | null
    tooltipPos: { x: number; y: number } | null
    httpClient: any
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return isMobile
}

const formatPrice = (price: number): string => {
    return (
        new Intl.NumberFormat('de-DE', {
            currency: 'EUR',
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
        }).format(price / 1000000)
    )
}

// Memoize the CustomTooltip component
const CustomTooltip = React.memo(
    ({
        active,
        payload,
        selectedPlayer,
        tooltipPos,
        httpClient,
    }: TooltipProps) => {
        const shouldShow =
            (active && payload && payload.length) ||
            (selectedPlayer && tooltipPos)
        const player = shouldShow
            ? payload?.[0]?.payload || selectedPlayer
            : null

        if (!player) return null

        return (
            <div
                className="custom-tooltip"
                style={
                    tooltipPos
                        ? {
                              position: 'absolute',
                              left: tooltipPos.x,
                              top: tooltipPos.y,
                              transform: 'translate(-50%, -100%)',
                              pointerEvents: 'none',
                          }
                        : undefined
                }
            >
                <div className="player-image-container">
                    <img
                        src={httpClient.getPlayerImageUrl(player.i)}
                        alt={player.ln}
                        onError={(e) => {
                            if (!httpClient.usedPlayerIds.has(player.i)) {
                                httpClient.usedPlayerIds.add(player.i)
                                e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${player.i}.png`
                            }
                        }}
                    />
                </div>
                <div className="tooltip-content">
                    <div className="player-name">{player.ln}</div>
                    {player.ownership && (
                        <div className={`owner-badge owner-${player.ownership}`}>
                            {player.ownership === 'mine'
                                ? 'Dein Spieler'
                                : player.ownership === 'taken'
                                  ? `Besitzer: ${player.ownerName ?? 'Unbekannt'}`
                                  : 'Frei'}
                        </div>
                    )}
                    <p className="market-value">
                        <span>Marktwert</span>
                        <span>{formatPrice(player.mv)}</span>
                    </p>
                    <p className="avg-points">
                        <span>Durschnittspunkte</span>
                        <span>{player.ap}</span>
                    </p>
                    <p className="points">
                        <span>Gesamtpunkte</span>
                        <span>{player.tp}</span>
                    </p>
                    <p className="ppm">
                        <span>Punkte / Millionen</span>
                        <span>{player.ppm}</span>
                    </p>
                </div>
            </div>
        )
    }
)

CustomTooltip.displayName = 'CustomTooltip'

const AvailablePlayers: React.FC<ShowAvailableProps> = ({
    leagueId,
    userId,
}) => {
    const httpClient = useHttpClient()
    const isMobile = useIsMobile()
    const {
        owners,
        managerNames,
        loading: ownersLoading,
        error: ownersError,
    } = useLeagueOwnership(httpClient, leagueId, userId)
    const [players, setPlayers] = useState<PlayerData[]>([])
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(
        null
    )
    const [tooltipPos, setTooltipPos] = useState<{
        x: number
        y: number
    } | null>(null)
    const [showTotalPoints, setShowTotalPoints] = useState(false)
    const [showNames, setShowNames] = useState(false)
    const [selectedPosition, setSelectedPosition] = useState<number>(0) // 0 means all positions
    const [useOldData, setUseOldData] = useState(true) // false means current data, true means 2425 data
    const [ownershipFilter, setOwnershipFilter] =
        useState<OwnershipFilter>(loadStoredFilter)

    const handleOwnershipFilterChange = useCallback(
        (value: OwnershipFilter) => {
            setOwnershipFilter(value)
            try {
                localStorage.setItem(FILTER_STORAGE_KEY, value)
            } catch {
                // ignore
            }
        },
        []
    )

    // Players of the selected position, enriched with ownership info
    const positionPlayers = useMemo(
        () =>
            players
                .filter(
                    (player) =>
                        selectedPosition === 0 ||
                        player.pos === selectedPosition
                )
                .map((player) => {
                    const ownerId = owners.get(String(player.i))
                    const ownership: Ownership = !ownerId
                        ? 'free'
                        : ownerId === userId
                          ? 'mine'
                          : 'taken'
                    return {
                        ...player,
                        ownership,
                        ownerName: ownerId
                            ? managerNames.get(ownerId)
                            : undefined,
                    }
                }),
        [players, selectedPosition, owners, managerNames, userId]
    )

    const ownershipCounts = useMemo(() => {
        const counts: Record<Ownership, number> = { mine: 0, free: 0, taken: 0 }
        positionPlayers.forEach((p) => counts[p.ownership]++)
        return counts
    }, [positionPlayers])

    // Memoize filtered scatter data
    const scatterData = useMemo(() => {
        const defaultColor = showTotalPoints
            ? 'var(--total-points-color)'
            : 'var(--avg-points-color)'

        return positionPlayers
            .filter(
                (player) =>
                    ownershipFilter === 'all' ||
                    player.ownership === 'free' ||
                    (ownershipFilter === 'freeAndMine' &&
                        player.ownership === 'mine')
            )
            .map((player) => ({
                ...player,
                ppm:
                    player.mv > 0
                        ? Number(
                              (player.tp / (player.mv / 1000000)).toFixed(2)
                          )
                        : 0,
                fill:
                    selectedPlayer?.i === player.i
                        ? SELECTED_COLOR
                        : player.ownership === 'mine'
                          ? MINE_COLOR
                          : player.ownership === 'taken'
                            ? TAKEN_COLOR
                            : defaultColor,
                fillOpacity:
                    player.ownership === 'taken' &&
                    selectedPlayer?.i !== player.i
                        ? 0.35
                        : 1,
            }))
            .sort(
                (a, b) =>
                    OWNERSHIP_ORDER[a.ownership] - OWNERSHIP_ORDER[b.ownership]
            )
    }, [positionPlayers, ownershipFilter, selectedPlayer, showTotalPoints])

    // Find the max market value for X axis, rounded up to next full million
    const maxMarketValue = useMemo(() => {
        if (scatterData.length === 0) return 0
        const max = Math.max(...scatterData.map((p) => p.mv))
        // round up to next full million
        return Math.ceil(max / 1_000_000) * 1_000_000
    }, [scatterData])

    const handlePlayerClick = useCallback((data: any) => {
        if (data && data.payload) {
            setSelectedPlayer(data.payload)
            // Calculate tooltip position based on click event
            if (data.event) {
                setTooltipPos({
                    x: data.event.clientX,
                    y: data.event.clientY,
                })
            }
        }
    }, [])

    // Fetch data only once and process it efficiently
    useEffect(() => {
        const controller = new AbortController()

        const dataFile = useOldData ? '/AdvancedManager/detailed_players2425.json' : '/AdvancedManager/detailed_players.json'

        fetch(dataFile, {
            signal: controller.signal,
        })
            .then((response) => response.json())
            .then((data: { players: { [key: string]: PlayerData } }) => {
                const available = Object.values(data.players)
                    .map((player) => ({
                        ...player,
                        ppm:
                            player.mv > 0
                                ? Number(
                                      (
                                          player.ap /
                                          (player.mv / 1000000)
                                      ).toFixed(2)
                                  )
                                : 0,
                    }))
                    .sort((a, b) => b.mv - a.mv)

                setPlayers(available)
            })
            .catch((error) => {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error('Error loading player data:', error)
                }
            })

        return () => controller.abort()
    }, [useOldData])

    const handleSelectPlayer = useCallback((player: any) => {
        const playerData: PlayerData = {
            i: player.i,
            ln: `${player.n} ${player.ln}`,
            mv: player.mv,
            pos: player.pos,
            ap: player.ap,
            tp: player.tp,
            searchValue: `${player.n} ${player.ln}`,
        }
        setSelectedPlayer(playerData)
    }, [])

    return (
        <div className="available-players">
            <div className="header-container">
                <div className="flex flex-col w-full gap-4">
                    <div className="flex flex-wrap items-center justify-between w-full gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <h2>
                                Marktwert gegen{' '}
                                {showTotalPoints
                                    ? 'Gesamtpunkte'
                                    : 'Durschnittspunkte'}
                            </h2>
                            <PlayerSearch
                                onSelectPlayer={handleSelectPlayer}
                                buttonLabel="Spieler suchen"
                            />
                        </div>
                        <div className="switch-container">
                            <div className="flex">
                                <Label
                                    htmlFor="data-mode"
                                    className={!useOldData ? 'active' : ''}
                                >
                                    Aktuelle Daten
                                </Label>
                                <Switch
                                    id="data-mode"
                                    checked={useOldData}
                                    onCheckedChange={setUseOldData}
                                />
                                <Label
                                    htmlFor="data-mode"
                                    className={useOldData ? 'active' : ''}
                                >
                                    24/25 Daten
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end w-full">
                        <div className="switch-container">
                            <div className="flex">
                                <Label
                                    htmlFor="points-mode"
                                    className={!showTotalPoints ? 'active' : ''}
                                >
                                    Durschnittspunkte
                                </Label>
                                <Switch
                                    id="points-mode"
                                    checked={showTotalPoints}
                                    onCheckedChange={setShowTotalPoints}
                                />
                                <Label
                                    htmlFor="points-mode"
                                    className={showTotalPoints ? 'active' : ''}
                                >
                                    Gesamtpunkte
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end w-full">
                        <div className="switch-container">
                            <div className="flex">
                                <Label
                                    htmlFor="names-mode"
                                    className={!showNames ? 'active' : ''}
                                >
                                    Namen ausblenden
                                </Label>
                                <Switch
                                    id="names-mode"
                                    checked={showNames}
                                    onCheckedChange={setShowNames}
                                />
                                <Label
                                    htmlFor="names-mode"
                                    className={showNames ? 'active' : ''}
                                >
                                    Namen anzeigen
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="position-selector flex items-center gap-2">
                {POSITIONS.map((position) => (
                    <button
                        key={position.id}
                        onClick={() => setSelectedPosition(position.id)}
                        className={`px-3 py-1 rounded-md text-sm ${
                            selectedPosition === position.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80'
                        }`}
                    >
                        {position.name}
                    </button>
                ))}
            </div>
            <div className="ownership-selector">
                <div className="flex items-center gap-2">
                    {OWNERSHIP_FILTERS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() =>
                                handleOwnershipFilterChange(option.value)
                            }
                            aria-pressed={ownershipFilter === option.value}
                            className={`px-3 py-1 rounded-md text-sm ${
                                ownershipFilter === option.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary hover:bg-secondary/80'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="ownership-legend">
                    {ownersLoading ? (
                        <span>Lade Besitzer…</span>
                    ) : (
                        <>
                            <span>
                                <i
                                    className="legend-dot"
                                    style={{
                                        background: showTotalPoints
                                            ? 'var(--total-points-color)'
                                            : 'var(--avg-points-color)',
                                    }}
                                />
                                Frei ({ownershipCounts.free})
                            </span>
                            <span>
                                <i
                                    className="legend-dot"
                                    style={{ background: MINE_COLOR }}
                                />
                                Meine ({ownershipCounts.mine})
                            </span>
                            <span>
                                <i
                                    className="legend-dot legend-dot-taken"
                                    style={{ background: TAKEN_COLOR }}
                                />
                                Vergeben ({ownershipCounts.taken})
                            </span>
                        </>
                    )}
                </div>
            </div>
            {ownersError && <p className="ownership-error">{ownersError}</p>}
            <div className="graph-container">
                <ResponsiveContainer width="100%" height={isMobile ? 400 : 600}>
                    <ScatterChart
                        margin={isMobile
                            ? { top: 10, right: 5, bottom: 30, left: 10 }
                            : { top: 20, right: 20, bottom: 20, left: 70 }
                        }
                    >
                        <CartesianGrid strokeDasharray="9 9" stroke="#eee" />
                        <XAxis
                            type="number"
                            dataKey="mv"
                            name="Market Value"
                            tickFormatter={(value: number) =>
                                `${value / 1000000}M`
                            }
                            domain={[0, maxMarketValue]}
                            label={{
                                value: 'Marktwert in Millionen',
                                position: 'bottom',
                                offset: 5,
                            }}
                            stroke="#666"
                        />
                        <YAxis
                            type="number"
                            dataKey={showTotalPoints ? 'tp' : 'ap'}
                            width={5}
                            name={
                                showTotalPoints
                                    ? 'Total Points'
                                    : 'Average Points'
                            }
                            domain={[0]}
                            label={{
                                value: showTotalPoints
                                    ? 'Gesamtpunkte'
                                    : 'Durschnittspunkte',
                                angle: -90,
                                position: 'insideLeft',
                                offset: -5,
                            }}
                            stroke="#666"
                        />
                        <Tooltip
                            content={
                                <CustomTooltip
                                    selectedPlayer={selectedPlayer}
                                    tooltipPos={tooltipPos}
                                    httpClient={httpClient}
                                />
                            }
                            isAnimationActive={false}
                            cursor={{ strokeDasharray: '3 3' }}
                            position={tooltipPos || undefined}
                        />
                        <Scatter
                            name="Players"
                            data={scatterData}
                            fill={
                                showTotalPoints
                                    ? 'var(--total-points-color)'
                                    : 'var(--avg-points-color)'
                            }
                            onClick={handlePlayerClick}
                        >
                            {showNames && (
                                <LabelList
                                    dataKey="ln"
                                    position="top"
                                    style={{
                                        fontSize: isMobile ? '10px' : '11px',
                                        fill: '#666',
                                        pointerEvents: 'none',
                                    }}
                                    offset={8}
                                />
                            )}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default AvailablePlayers
