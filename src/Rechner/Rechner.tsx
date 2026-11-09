import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { useHttpClient } from '../HttpClientContext'
import { cn } from '../lib/utils'
import {
    PlayerDetails,
    POSITIONS,
    SellStatus,
    SquadPlayer,
    addDays,
    calculate,
    dailyChange,
    daysUntilFriday,
    formatEuro,
    formatSignedEuro,
} from './calc'
import {
    Card,
    Field,
    NumberInput,
    OptionSwitch,
    PlayerCard,
    Stat,
} from './parts'
import './Rechner.css'
import {
    LeagueState,
    SortMode,
    loadLeagueState,
    saveLeagueState,
    usePersistentOptions,
} from './storage'

interface RechnerProps {
    leagueId: string
}

interface League {
    i: string
    n: string
}

const SORT_LABELS: Record<SortMode, string> = {
    standard: 'Standard',
    position: 'Position (TW → ST)',
    'mv-desc': 'Marktwert ↓',
    'mv-asc': 'Marktwert ↑',
    'change-desc': 'MW-Änderung ↓',
    'change-asc': 'MW-Änderung ↑',
}

const DETAIL_CONCURRENCY = 4

const Rechner: React.FC<RechnerProps> = ({ leagueId: initialLeagueId }) => {
    const httpClient = useHttpClient()
    const [options, setOption] = usePersistentOptions()

    const [leagues, setLeagues] = useState<League[]>([])
    const [leagueId, setLeagueId] = useState(initialLeagueId)
    const [players, setPlayers] = useState<SquadPlayer[]>([])
    const [apiBalance, setApiBalance] = useState(0)
    const [balanceOverride, setBalanceOverride] = useState<number>()
    const [days, setDays] = useState(() => daysUntilFriday())
    const [leagueState, setLeagueState] = useState<LeagueState>(() =>
        loadLeagueState(initialLeagueId)
    )
    const [details, setDetails] = useState<Record<string, PlayerDetails>>({})
    const [loadingDetails, setLoadingDetails] = useState<Set<string>>(
        new Set()
    )
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showOptions, setShowOptions] = useState(true)
    const [reloadKey, setReloadKey] = useState(0)
    const requestedDetails = useRef<Set<string>>(new Set())

    // Leagues for the selector
    useEffect(() => {
        httpClient
            .get<{ it: League[] }>('/v4/leagues/selection')
            .then((res) => setLeagues(res.it ?? []))
            .catch(() => setLeagues([]))
    }, [httpClient])

    // Squad + budget
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const [squad, budget] = await Promise.all([
                    httpClient.get<{ it: SquadPlayer[] }>(
                        `/v4/leagues/${leagueId}/squad`
                    ),
                    httpClient.get<{ b: number }>(
                        `/v4/leagues/${leagueId}/me/budget`
                    ),
                ])
                if (cancelled) return
                const stored = loadLeagueState(leagueId)
                const squadPlayers = squad.it ?? []
                const status: Record<string, SellStatus> = {}
                for (const p of squadPlayers) {
                    status[p.i] =
                        stored.status[p.i] ??
                        (options.noPreselect ? 'keep' : 'sell')
                }
                const fixPrices: Record<string, number> = {}
                for (const p of squadPlayers) {
                    if (stored.fixPrices[p.i]) fixPrices[p.i] = stored.fixPrices[p.i]
                }
                setPlayers(squadPlayers)
                setApiBalance(budget.b ?? 0)
                setBalanceOverride(undefined)
                setLeagueState({ status, fixPrices })
                setDetails({})
                requestedDetails.current = new Set()
            } catch (err) {
                console.error('Rechner: Laden fehlgeschlagen', err)
                if (!cancelled)
                    setError(
                        'Kader oder Kontostand konnten nicht geladen werden. Bitte später erneut versuchen.'
                    )
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
        // options.noPreselect is only the start state for players without a saved status
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [httpClient, leagueId, reloadKey])

    // Persist sell status + fixed prices per league
    useEffect(() => {
        if (!isLoading && players.length > 0)
            saveLeagueState(leagueId, leagueState)
    }, [leagueState, leagueId, isLoading, players.length])

    const loadDetails = useCallback(
        async (ids: string[]) => {
            const todo = ids.filter((id) => !requestedDetails.current.has(id))
            if (todo.length === 0) return
            todo.forEach((id) => requestedDetails.current.add(id))
            setLoadingDetails((prev) => new Set([...prev, ...todo]))

            const queue = [...todo]
            const worker = async () => {
                while (queue.length > 0) {
                    const id = queue.shift()!
                    try {
                        const d = await httpClient.get<PlayerDetails>(
                            `/v4/competitions/1/players/${id}?leagueId=${leagueId}`
                        )
                        setDetails((prev) => ({ ...prev, [id]: d }))
                    } catch (err) {
                        console.error('Rechner: Details fehlgeschlagen', id, err)
                        requestedDetails.current.delete(id)
                    } finally {
                        setLoadingDetails((prev) => {
                            const next = new Set(prev)
                            next.delete(id)
                            return next
                        })
                    }
                }
            }
            await Promise.all(
                Array.from({ length: DETAIL_CONCURRENCY }, worker)
            )
        },
        [httpClient, leagueId]
    )

    useEffect(() => {
        if (options.autoLoadDetails && !isLoading && players.length > 0) {
            loadDetails(players.map((p) => p.i))
        }
    }, [options.autoLoadDetails, isLoading, players, loadDetails])

    const balance = balanceOverride ?? apiBalance
    const result = useMemo(
        () =>
            calculate(
                balance,
                players,
                leagueState.status,
                leagueState.fixPrices,
                details,
                { ...options, days }
            ),
        [balance, players, leagueState, details, options, days]
    )

    const setStatus = (id: string, status: SellStatus) =>
        setLeagueState((prev) => ({
            ...prev,
            status: { ...prev.status, [id]: status },
        }))

    const setFixPrice = (id: string, value: number | undefined) =>
        setLeagueState((prev) => {
            const fixPrices = { ...prev.fixPrices }
            if (value && value > 0) fixPrices[id] = value
            else delete fixPrices[id]
            return { ...prev, fixPrices }
        })

    const setAllCandidates = (status: 'sell' | 'keep') =>
        setLeagueState((prev) => {
            const next = { ...prev.status }
            for (const p of players) {
                if (next[p.i] !== 'locked') next[p.i] = status
            }
            return { ...prev, status: next }
        })

    const togglePreselect = (noPreselect: boolean) => {
        setOption('noPreselect', noPreselect)
        setAllCandidates(noPreselect ? 'keep' : 'sell')
    }

    const sortedPlayers = useMemo(() => {
        const list = [...players]
        const change = (p: SquadPlayer) => dailyChange(p, details[p.i])
        const byChange = (dir: 1 | -1) => (a: SquadPlayer, b: SquadPlayer) => {
            const ca = change(a)
            const cb = change(b)
            if (ca === undefined && cb === undefined) return 0
            if (ca === undefined) return 1 // players without details last
            if (cb === undefined) return -1
            return dir * (ca - cb)
        }
        switch (options.sort) {
            case 'position':
                return list.sort((a, b) => a.pos - b.pos || b.mv - a.mv)
            case 'mv-desc':
                return list.sort((a, b) => b.mv - a.mv)
            case 'mv-asc':
                return list.sort((a, b) => a.mv - b.mv)
            case 'change-desc':
                return list.sort(byChange(-1))
            case 'change-asc':
                return list.sort(byChange(1))
            default:
                return list
        }
    }, [players, details, options.sort])

    const candidates = sortedPlayers.filter(
        (p) => leagueState.status[p.i] !== 'locked'
    )
    const fixedSquad = sortedPlayers.filter(
        (p) => leagueState.status[p.i] === 'locked'
    )

    const renderPlayers = (list: SquadPlayer[]) => {
        const items: React.ReactNode[] = []
        list.forEach((p, idx) => {
            if (
                options.sort === 'position' &&
                (idx === 0 || list[idx - 1].pos !== p.pos)
            ) {
                const count = list.filter((x) => x.pos === p.pos).length
                items.push(
                    <div
                        key={`sep-${p.pos}`}
                        className="flex items-center gap-3 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                        <span>{POSITIONS[p.pos]?.long ?? 'Unbekannt'}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
                            {count}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                    </div>
                )
            }
            const status = leagueState.status[p.i] ?? 'keep'
            items.push(
                <PlayerCard
                    key={p.i}
                    player={p}
                    status={status}
                    fixPrice={leagueState.fixPrices[p.i]}
                    offsetPercent={options.offsetPercent}
                    details={details[p.i]}
                    detailsLoading={loadingDetails.has(p.i)}
                    onToggleSell={() =>
                        setStatus(p.i, status === 'sell' ? 'keep' : 'sell')
                    }
                    onToggleLock={() =>
                        setStatus(
                            p.i,
                            status === 'locked'
                                ? options.noPreselect
                                    ? 'keep'
                                    : 'sell'
                                : 'locked'
                        )
                    }
                    onFixPrice={(v) => setFixPrice(p.i, v)}
                    onLoadDetails={() => loadDetails([p.i])}
                />
            )
        })
        return <div className="space-y-2">{items}</div>
    }

    const targetDate = addDays(days).toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
    })

    if (isLoading && players.length === 0) {
        return (
            <div className="mx-auto max-w-6xl space-y-4">
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
                <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                    <div className="h-96 animate-pulse rounded-xl bg-muted" />
                    <div className="space-y-2">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div
                                key={i}
                                className="h-20 animate-pulse rounded-xl bg-muted"
                            />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="rechner-print mx-auto max-w-6xl space-y-4 pb-8">
            {/* Title row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Rechner
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Simuliere Verkäufe und deinen Kontostand bis{' '}
                        {targetDate}.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                    {leagues.length > 1 && (
                        <select
                            aria-label="Liga"
                            value={leagueId}
                            onChange={(e) => setLeagueId(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {leagues.map((l) => (
                                <option key={l.i} value={l.i}>
                                    {l.n}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReloadKey((k) => k + 1)}
                        disabled={isLoading}
                    >
                        <i
                            className={cn(
                                'bi bi-arrow-clockwise',
                                isLoading && 'animate-spin'
                            )}
                        />
                        Aktualisieren
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        title="Druck- / PDF-Ansicht"
                    >
                        <i className="bi bi-printer" />
                        Drucken
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <i className="bi bi-exclamation-circle mr-2" />
                    {error}
                </div>
            )}

            {/* Sticky summary */}
            <div className="sticky top-0 z-30 -mx-4 bg-background/80 px-4 py-2 backdrop-blur md:top-14 print:static">
                <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
                    <Stat
                        label="Konto nach Verkauf"
                        value={formatEuro(result.balanceAfterSales)}
                        tone={
                            result.balanceAfterSales < 0 ? 'negative' : 'default'
                        }
                        emphasis
                    />
                    <Stat
                        label={`+ Einnahmen (${targetDate})`}
                        value={formatEuro(result.total)}
                        tone={result.total < 0 ? 'negative' : 'positive'}
                        emphasis
                    />
                    <Stat
                        label={`Kader · ${result.squadCount} Spieler`}
                        value={formatEuro(result.squadValue)}
                    />
                    <Stat
                        label="Mögliches Minus"
                        value={formatEuro(result.possibleMinus)}
                        tone="muted"
                    />
                    <Stat
                        label="Maximales Angebot"
                        value={formatEuro(result.maxOffer)}
                    />
                </Card>
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
                {/* Left column: settings */}
                <div className="space-y-4 print:hidden">
                    <Card>
                        <button
                            type="button"
                            onClick={() => setShowOptions((v) => !v)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                            <span className="font-semibold">
                                <i className="bi bi-sliders mr-2" />
                                Einstellungen
                            </span>
                            <i
                                className={cn(
                                    'bi bi-chevron-down transition-transform',
                                    showOptions && 'rotate-180'
                                )}
                            />
                        </button>
                        {showOptions && (
                            <div className="space-y-4 border-t px-4 pb-4 pt-4">
                                <Field
                                    label="Kontostand"
                                    htmlFor="balance"
                                    hint={
                                        balanceOverride !== undefined
                                            ? `Manuell geändert · Kickbase: ${formatEuro(apiBalance)}`
                                            : undefined
                                    }
                                >
                                    <div className="flex gap-2">
                                        <NumberInput
                                            id="balance"
                                            className="flex-1"
                                            value={balance}
                                            onChange={(v) =>
                                                setBalanceOverride(v ?? 0)
                                            }
                                            suffix="€"
                                            allowNegative
                                        />
                                        {balanceOverride !== undefined && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Auf Kickbase-Wert zurücksetzen"
                                                onClick={() =>
                                                    setBalanceOverride(undefined)
                                                }
                                            >
                                                <i className="bi bi-arrow-counterclockwise" />
                                            </Button>
                                        )}
                                    </div>
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field
                                        label="Erw. Ausgaben"
                                        htmlFor="expenses"
                                    >
                                        <NumberInput
                                            id="expenses"
                                            value={options.expectedExpenses}
                                            onChange={(v) =>
                                                setOption('expectedExpenses', v ?? 0)
                                            }
                                            suffix="€"
                                        />
                                    </Field>
                                    <Field
                                        label="Erw. Einnahmen"
                                        htmlFor="income"
                                    >
                                        <NumberInput
                                            id="income"
                                            value={options.expectedIncome}
                                            onChange={(v) =>
                                                setOption('expectedIncome', v ?? 0)
                                            }
                                            suffix="€"
                                        />
                                    </Field>
                                    <Field
                                        label="Offset Angebote"
                                        htmlFor="offset"
                                    >
                                        <NumberInput
                                            id="offset"
                                            value={options.offsetPercent}
                                            onChange={(v) =>
                                                setOption('offsetPercent', v ?? 0)
                                            }
                                            suffix="%"
                                            allowNegative
                                            allowDecimal
                                        />
                                    </Field>
                                    <Field
                                        label="Tage"
                                        htmlFor="days"
                                        hint={`bis ${targetDate}`}
                                    >
                                        <div className="flex gap-1">
                                            <NumberInput
                                                id="days"
                                                className="flex-1"
                                                value={days}
                                                onChange={(v) =>
                                                    setDays(Math.min(v ?? 0, 60))
                                                }
                                                suffix="d"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Bis Freitag"
                                                onClick={() =>
                                                    setDays(daysUntilFriday())
                                                }
                                            >
                                                Fr
                                            </Button>
                                        </div>
                                    </Field>
                                </div>
                                {options.includeAchievements && (
                                    <Field
                                        label="Erwartete Erfolge"
                                        htmlFor="achievements"
                                        hint="Prämien für Kickbase-Erfolge, die du bis zum Stichtag erwartest."
                                    >
                                        <NumberInput
                                            id="achievements"
                                            value={options.achievementsValue}
                                            onChange={(v) =>
                                                setOption(
                                                    'achievementsValue',
                                                    v ?? 0
                                                )
                                            }
                                            suffix="€"
                                        />
                                    </Field>
                                )}
                                <Field label="Sortierung" htmlFor="sort">
                                    <select
                                        id="sort"
                                        value={options.sort}
                                        onChange={(e) =>
                                            setOption(
                                                'sort',
                                                e.target.value as SortMode
                                            )
                                        }
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        {Object.entries(SORT_LABELS).map(
                                            ([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </Field>

                                <div className="-mx-3 space-y-0.5">
                                    <OptionSwitch
                                        id="opt-expenses"
                                        label="Erwartete Ausgaben einbeziehen"
                                        description="z. B. ausstehende Gebote"
                                        checked={options.includeExpenses}
                                        onChange={(v) =>
                                            setOption('includeExpenses', v)
                                        }
                                    />
                                    <OptionSwitch
                                        id="opt-income"
                                        label="Erwartete Einnahmen einbeziehen"
                                        checked={options.includeIncome}
                                        onChange={(v) =>
                                            setOption('includeIncome', v)
                                        }
                                    />
                                    <OptionSwitch
                                        id="opt-negative"
                                        label="Negative MW-Änderung einbeziehen"
                                        description="Fallende Marktwerte mindern die Einnahmen"
                                        checked={options.includeNegative}
                                        onChange={(v) =>
                                            setOption('includeNegative', v)
                                        }
                                    />
                                    <OptionSwitch
                                        id="opt-login"
                                        label="Login-Bonus einbeziehen"
                                        description="100.000 € pro Tag"
                                        checked={options.includeLoginBonus}
                                        onChange={(v) =>
                                            setOption('includeLoginBonus', v)
                                        }
                                    />
                                    <OptionSwitch
                                        id="opt-achievements"
                                        label="Erfolge einbeziehen"
                                        checked={options.includeAchievements}
                                        onChange={(v) =>
                                            setOption('includeAchievements', v)
                                        }
                                    />
                                    <OptionSwitch
                                        id="opt-autoload"
                                        label="Alle Details automatisch laden"
                                        checked={options.autoLoadDetails}
                                        onChange={(v) =>
                                            setOption('autoLoadDetails', v)
                                        }
                                    />
                                    <OptionSwitch
                                        id="opt-grouped"
                                        label="Kader gruppieren"
                                        description="Verkaufskandidaten / Fester Kader"
                                        checked={options.grouped}
                                        onChange={(v) => setOption('grouped', v)}
                                    />
                                    <OptionSwitch
                                        id="opt-preselect"
                                        label="Niemanden vormarkieren"
                                        description="Startzustand: kein Spieler zum Verkauf"
                                        checked={options.noPreselect}
                                        onChange={togglePreselect}
                                    />
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right column: players + breakdown */}
                <div className="space-y-4">
                    {options.grouped ? (
                        <>
                            <Card className="p-4">
                                <SectionHeader
                                    title="Verkaufskandidaten"
                                    count={candidates.length}
                                    subtitle={`${result.sellCount} zum Verkauf markiert · Erlös ${formatEuro(result.salesIncome)}`}
                                    actions={
                                        <BulkActions
                                            onAll={() => setAllCandidates('sell')}
                                            onNone={() => setAllCandidates('keep')}
                                        />
                                    }
                                />
                                {candidates.length > 0 ? (
                                    renderPlayers(candidates)
                                ) : (
                                    <EmptyHint text="Alle Spieler sind im festen Kader." />
                                )}
                            </Card>
                            <Card className="p-4">
                                <SectionHeader
                                    title="Fester Kader"
                                    count={fixedSquad.length}
                                    subtitle="Vom Verkauf ausgenommen und fest eingeplant."
                                />
                                {fixedSquad.length > 0 ? (
                                    renderPlayers(fixedSquad)
                                ) : (
                                    <EmptyHint text="Über das Schloss-Symbol schiebst du Spieler hierher." />
                                )}
                            </Card>
                        </>
                    ) : (
                        <Card className="p-4">
                            <SectionHeader
                                title="Kader"
                                count={players.length}
                                subtitle={`${result.sellCount} zum Verkauf markiert · Erlös ${formatEuro(result.salesIncome)}`}
                                actions={
                                    <BulkActions
                                        onAll={() => setAllCandidates('sell')}
                                        onNone={() => setAllCandidates('keep')}
                                    />
                                }
                            />
                            {renderPlayers(sortedPlayers)}
                        </Card>
                    )}

                    <Card className="p-4">
                        <h2 className="mb-1 font-semibold">Abrechnung</h2>
                        <p className="mb-3 text-xs text-muted-foreground">
                            Gewinn/Verlust bis {targetDate} ist nur geschätzt
                            (24h-Trend × {days} {days === 1 ? 'Tag' : 'Tage'}).
                        </p>
                        <dl className="divide-y text-sm">
                            <Row label="Kontostand" value={formatEuro(balance)} />
                            <Row
                                label="Einnahmen aus Verkäufen"
                                value={formatSignedEuro(result.salesIncome)}
                            />
                            {options.includeExpenses &&
                                options.expectedExpenses > 0 && (
                                    <Row
                                        label="Erwartete Ausgaben"
                                        value={formatSignedEuro(
                                            -options.expectedExpenses
                                        )}
                                    />
                                )}
                            {options.includeIncome &&
                                options.expectedIncome > 0 && (
                                    <Row
                                        label="Erwartete Einnahmen"
                                        value={formatSignedEuro(
                                            options.expectedIncome
                                        )}
                                    />
                                )}
                            <Row
                                label="Kontostand nach Verkäufen"
                                value={formatEuro(result.balanceAfterSales)}
                                strong
                            />
                            <Row
                                label="Täglicher Gewinn"
                                value={formatSignedEuro(result.dailyGain)}
                                muted
                            />
                            <Row
                                label="Täglicher Verlust"
                                value={formatSignedEuro(result.dailyLoss)}
                                muted
                            />
                            <Row
                                label={`MW-Einnahmen bis ${targetDate}${options.includeNegative ? '' : ' (ohne Verlust)'}`}
                                value={formatSignedEuro(result.incomeUntil)}
                            />
                            {options.includeLoginBonus && (
                                <Row
                                    label={`Login-Bonus (${days} × 100.000 €)`}
                                    value={formatSignedEuro(result.loginBonus)}
                                />
                            )}
                            {options.includeAchievements && (
                                <Row
                                    label="Erfolge"
                                    value={formatSignedEuro(result.achievements)}
                                />
                            )}
                            <Row
                                label={`Kontostand am ${targetDate}`}
                                value={formatEuro(result.total)}
                                strong
                            />
                            <Row
                                label="Kaderwert (verbleibend)"
                                value={formatEuro(result.squadValue)}
                                muted
                            />
                        </dl>
                    </Card>
                </div>
            </div>
        </div>
    )
}

const SectionHeader: React.FC<{
    title: string
    count: number
    subtitle?: string
    actions?: React.ReactNode
}> = ({ title, count, subtitle, actions }) => (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
            <h2 className="flex items-center gap-2 font-semibold">
                {title}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {count}
                </span>
            </h2>
            {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
        </div>
        {actions}
    </div>
)

const BulkActions: React.FC<{ onAll: () => void; onNone: () => void }> = ({
    onAll,
    onNone,
}) => (
    <div className="flex gap-1 print:hidden">
        <Button variant="ghost" size="sm" onClick={onAll}>
            Alle
        </Button>
        <Button variant="ghost" size="sm" onClick={onNone}>
            Keine
        </Button>
    </div>
)

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
    <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        {text}
    </p>
)

const Row: React.FC<{
    label: string
    value: string
    strong?: boolean
    muted?: boolean
}> = ({ label, value, strong, muted }) => (
    <div
        className={cn(
            'flex items-baseline justify-between gap-4 py-2',
            strong && 'font-semibold',
            muted && 'text-muted-foreground'
        )}
    >
        <dt>{label}</dt>
        <dd className="tabular-nums">{value}</dd>
    </div>
)

export default Rechner
