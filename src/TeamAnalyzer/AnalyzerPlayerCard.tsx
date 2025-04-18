import React from 'react'
import { useHttpClient } from '../HttpClientContext'
import { Skeleton } from '../components/ui/skeleton'
import './AnalyzerPlayerCard.scss'

export interface Alternative {
    id: string
    name: string
    tp: number
    ap: number
    mv: number
    difference: number
    currentOwner?: {
        name: string
        price: number
    }
}

interface AnalyzerPlayerCardProps {
    player: {
        i: string
        n: string
        mv: number
        p: number
        ap: number
        analysisScore?: number
        currentOwner?: {
            name: string
            price: number
        }
    }
    alternatives?: Alternative[]
    isOpen: boolean
    onToggle: (isOpen: boolean) => void
}

const AnalyzerPlayerCard: React.FC<AnalyzerPlayerCardProps> = ({
    player,
    alternatives,
    isOpen,
    onToggle,
}) => {
    const httpClient = useHttpClient()
    const score = player.analysisScore

    return (
        <div className="analyzer-player-card-wrapper">
            {isOpen && (
                <div className="alternatives-popup">
                    <div className="alternative-card">
                        <div className="alternative-details">
                            <img
                                src={httpClient.getPlayerImageUrl(player.i)}
                                alt={`${player.n}`}
                                className="analyzerPlayerImage"
                                onError={(e) => {
                                    if (
                                        !httpClient.usedPlayerIds.has(player.i)
                                    ) {
                                        httpClient.usedPlayerIds.add(player.i)
                                        e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${player.i}.png`
                                    }
                                }}
                            />
                            <div className="name">{player.n}</div>
                            <div className="stats">
                                <span>TP: {player.p}</span>
                                <span>AP: {player.ap}</span>
                                <span>
                                    MV: {(player.mv / 1000000).toFixed(1)}M
                                </span>
                                {player.currentOwner && (
                                    <>
                                        <span className="owner">
                                            {player.currentOwner.name}
                                        </span>
                                        <span>
                                            {(
                                                player.currentOwner.price /
                                                1000000
                                            ).toFixed(1)}
                                            M
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {alternatives?.map((alt, index) => (
                        <div
                            key={alt.id}
                            className="alternative-card"
                            style={
                                {
                                    '--delay': `${index * 0.1}s`,
                                } as React.CSSProperties
                            }
                        >
                            <img
                                src={httpClient.getPlayerImageUrl(alt.id)}
                                alt={alt.name}
                                className="analyzerPlayerImage"
                                onError={(e) => {
                                    if (!httpClient.usedPlayerIds.has(alt.id)) {
                                        httpClient.usedPlayerIds.add(alt.id)
                                        e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${alt.id}.png`
                                    }
                                }}
                            />
                            <div className="alternative-details">
                                <div className="name">{alt.name}</div>
                                <div className="stats">
                                    <span>TP: {alt.tp}</span>
                                    <span>AP: {alt.ap}</span>
                                    <span>
                                        MV: {(alt.mv / 1000000).toFixed(1)}M
                                    </span>
                                    {alt.currentOwner && (
                                        <>
                                            <span className="owner">
                                                {alt.currentOwner.name}
                                            </span>
                                            <span>
                                                {(
                                                    alt.currentOwner.price /
                                                    1000000
                                                ).toFixed(1)}
                                                M
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div
                className={`analyzer-player-card ${alternatives?.length ? 'has-alternatives' : ''}`}
                onClick={() => onToggle(!isOpen)}
            >
                <img
                    src={httpClient.getPlayerImageUrl(player.i)}
                    alt={`${player.n}`}
                    className="analyzerPlayerImage"
                    onError={(e) => {
                        if (!httpClient.usedPlayerIds.has(player.i)) {
                            httpClient.usedPlayerIds.add(player.i)
                            e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${player.i}.png`
                        }
                    }}
                />
                <div className="score">
                    {score !== undefined ? (
                        score.toFixed(1)
                    ) : (
                        <Skeleton className="h-6 w-[40px] my-2" />
                    )}
                </div>
                <div className="name">{player.n}</div>
                {alternatives && alternatives.length > 0 && (
                    <div className="alternatives-indicator">
                        {alternatives.length} Alternativen
                    </div>
                )}
            </div>
        </div>
    )
}

export default AnalyzerPlayerCard
