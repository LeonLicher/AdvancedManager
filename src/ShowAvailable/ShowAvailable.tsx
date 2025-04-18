import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    CartesianGrid,
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

interface TooltipProps {
    active?: boolean
    payload?: any[]
    coordinate?: any
    selectedPlayer: PlayerData | null
    tooltipPos: { x: number; y: number } | null
    httpClient: any
}

const formatPrice = (price: number): string => {
    return (
        new Intl.NumberFormat('de-DE', {
            currency: 'EUR',
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
        }).format(price / 1000000) + 'M'
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

const AvailablePlayers: React.FC = () => {
    const httpClient = useHttpClient()
    const [players, setPlayers] = useState<PlayerData[]>([])
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(
        null
    )
    const [tooltipPos, setTooltipPos] = useState<{
        x: number
        y: number
    } | null>(null)
    const [showTotalPoints, setShowTotalPoints] = useState(false)
    const [selectedPosition, setSelectedPosition] = useState<number>(0) // 0 means all positions

    // Memoize filtered scatter data
    const scatterData = useMemo(
        () =>
            players
                .filter(
                    (player) =>
                        selectedPosition === 0 ||
                        player.pos === selectedPosition
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
                            ? '#ef4444'
                            : showTotalPoints
                              ? 'var(--total-points-color)'
                              : 'var(--avg-points-color)',
                })),
        [players, selectedPlayer, showTotalPoints, selectedPosition]
    )

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

        fetch('/AdvancedManager/detailed_players.json', {
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
    }, [])

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
                    <div className="flex items-center gap-6">
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
            <div className="graph-container">
                <ResponsiveContainer width="100%" height={600}>
                    <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 70 }}
                    >
                        <CartesianGrid strokeDasharray="9 9" stroke="#eee" />
                        <XAxis
                            type="number"
                            dataKey="mv"
                            name="Market Value"
                            tickFormatter={(value: number) =>
                                `${value / 1000000}M`
                            }
                            domain={['auto', 'auto']}
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
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default AvailablePlayers
