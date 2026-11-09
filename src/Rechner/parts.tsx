import React, { useEffect, useState } from 'react'
import { Switch } from '../components/ui/switch'
import { cn } from '../lib/utils'
import {
    PlayerDetails,
    POSITIONS,
    SellStatus,
    SquadPlayer,
    dailyChange,
    formatEuro,
    formatSignedEuro,
    salePrice,
} from './calc'

const numberFormat = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
})

/** Text input that shows de-DE thousands separators and reports a number. */
export const NumberInput: React.FC<{
    value: number | undefined
    onChange: (value: number | undefined) => void
    suffix: string
    placeholder?: string
    allowNegative?: boolean
    allowDecimal?: boolean
    className?: string
    id?: string
}> = ({
    value,
    onChange,
    suffix,
    placeholder,
    allowNegative,
    allowDecimal,
    className,
    id,
}) => {
    const [text, setText] = useState(
        value === undefined ? '' : numberFormat.format(value)
    )
    const [focused, setFocused] = useState(false)

    useEffect(() => {
        if (!focused) setText(value === undefined ? '' : numberFormat.format(value))
    }, [value, focused])

    const handleChange = (raw: string) => {
        let cleaned = raw.replace(allowDecimal ? /[^\d,-]/g : /[^\d-]/g, '')
        if (!allowNegative) cleaned = cleaned.replace(/-/g, '')
        else cleaned = cleaned.replace(/(?!^)-/g, '')
        setText(cleaned)
        if (cleaned === '' || cleaned === '-') return onChange(undefined)
        const parsed = Number(cleaned.replace(',', '.'))
        if (Number.isFinite(parsed)) onChange(parsed)
    }

    return (
        <div
            className={cn(
                'flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
                className
            )}
        >
            <input
                id={id}
                inputMode={allowDecimal ? 'decimal' : 'numeric'}
                className="w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground"
                value={text}
                placeholder={placeholder}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleChange(e.target.value)}
            />
            <span className="ml-2 text-muted-foreground">{suffix}</span>
        </div>
    )
}

export const Field: React.FC<{
    label: string
    htmlFor: string
    children: React.ReactNode
    hint?: string
}> = ({ label, htmlFor, children, hint }) => (
    <div className="space-y-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
        </label>
        {children}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
)

export const OptionSwitch: React.FC<{
    id: string
    label: string
    description?: string
    checked: boolean
    onChange: (checked: boolean) => void
}> = ({ id, label, description, checked, onChange }) => (
    <label
        htmlFor={id}
        className="flex cursor-pointer items-start justify-between gap-4 rounded-lg px-3 py-2.5 hover:bg-accent/60"
    >
        <span className="space-y-0.5">
            <span className="block text-sm font-medium leading-tight">
                {label}
            </span>
            {description && (
                <span className="block text-xs text-muted-foreground">
                    {description}
                </span>
            )}
        </span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
)

export const Card: React.FC<{
    className?: string
    children: React.ReactNode
}> = ({ className, children }) => (
    <section
        className={cn(
            'rounded-xl border bg-background shadow-sm print:shadow-none',
            className
        )}
    >
        {children}
    </section>
)

export const Stat: React.FC<{
    label: string
    value: string
    tone?: 'default' | 'positive' | 'negative' | 'muted'
    emphasis?: boolean
}> = ({ label, value, tone = 'default', emphasis }) => (
    <div className="min-w-0">
        <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
        </div>
        <div
            className={cn(
                'truncate tabular-nums',
                emphasis ? 'text-xl font-semibold sm:text-2xl' : 'text-base font-semibold',
                tone === 'positive' && 'text-emerald-600',
                tone === 'negative' && 'text-red-600',
                tone === 'muted' && 'text-muted-foreground'
            )}
        >
            {value}
        </div>
    </div>
)

const POSITION_STYLES: Record<number, string> = {
    1: 'bg-amber-100 text-amber-800',
    2: 'bg-sky-100 text-sky-800',
    3: 'bg-emerald-100 text-emerald-800',
    4: 'bg-rose-100 text-rose-800',
}

export const PositionBadge: React.FC<{ pos: number }> = ({ pos }) => (
    <span
        className={cn(
            'inline-flex h-5 min-w-[2.25rem] items-center justify-center rounded px-1.5 text-[11px] font-semibold',
            POSITION_STYLES[pos] ?? 'bg-muted text-muted-foreground'
        )}
    >
        {POSITIONS[pos]?.short ?? '?'}
    </span>
)

const PlayerAvatar: React.FC<{ player: SquadPlayer; pim?: string }> = ({
    player,
    pim,
}) => {
    const sources = [
        pim ? `https://kickbase.b-cdn.net/${pim}` : undefined,
        `/AdvancedManager/player-images/${player.i}.png`,
        `https://kickbase.b-cdn.net/pool/playersbig/${player.i}.png`,
    ].filter(Boolean) as string[]
    const [index, setIndex] = useState(0)

    if (index >= sources.length) {
        return (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {player.n.slice(0, 2).toUpperCase()}
            </div>
        )
    }
    return (
        <img
            src={sources[index]}
            alt=""
            loading="lazy"
            onError={() => setIndex((i) => i + 1)}
            className="h-12 w-12 shrink-0 rounded-full bg-muted object-cover object-top print:hidden"
        />
    )
}

const Trend: React.FC<{ value: number | undefined; label: string }> = ({
    value,
    label,
}) => (
    <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div
            className={cn(
                'text-sm font-medium tabular-nums',
                value === undefined && 'text-muted-foreground',
                value !== undefined && value > 0 && 'text-emerald-600',
                value !== undefined && value < 0 && 'text-red-600'
            )}
        >
            {value === undefined ? '–' : formatSignedEuro(value)}
        </div>
    </div>
)

export interface PlayerCardProps {
    player: SquadPlayer
    status: SellStatus
    fixPrice: number | undefined
    offsetPercent: number
    details: PlayerDetails | undefined
    detailsLoading: boolean
    onToggleSell: () => void
    onToggleLock: () => void
    onFixPrice: (value: number | undefined) => void
    onLoadDetails: () => void
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
    player,
    status,
    fixPrice,
    offsetPercent,
    details,
    detailsLoading,
    onToggleSell,
    onToggleLock,
    onFixPrice,
    onLoadDetails,
}) => {
    const selling = status === 'sell'
    const locked = status === 'locked'
    const change = dailyChange(player, details)
    const buyPrice =
        player.mvgl !== undefined ? player.mv - player.mvgl : undefined
    const price = salePrice(player, fixPrice, offsetPercent)
    const name = details?.ln || player.n
    const firstName = details?.fn || player.fn

    return (
        <div
            className={cn(
                'group relative rounded-xl border bg-background p-3 transition-all print:break-inside-avoid',
                selling
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                    : 'hover:border-foreground/20',
                locked && 'bg-muted/40'
            )}
        >
            <div className="flex items-center gap-3">
                {!locked ? (
                    <button
                        type="button"
                        role="checkbox"
                        aria-checked={selling}
                        aria-label={`${name} zum Verkauf markieren`}
                        onClick={onToggleSell}
                        className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                            selling
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-input hover:border-foreground/40'
                        )}
                    >
                        {selling && <i className="bi bi-check-lg text-sm" />}
                    </button>
                ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">
                        <i className="bi bi-lock-fill" />
                    </span>
                )}

                <PlayerAvatar player={player} pim={details?.pim ?? player.pim} />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <PositionBadge pos={player.pos} />
                        <span className="truncate font-semibold">{name}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[firstName, details?.tn].filter(Boolean).join(' · ') ||
                            ' '}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                        {formatEuro(player.mv)}
                    </div>
                    {change !== undefined && (
                        <div
                            className={cn(
                                'text-xs tabular-nums',
                                change > 0 && 'text-emerald-600',
                                change < 0 && 'text-red-600',
                                change === 0 && 'text-muted-foreground'
                            )}
                        >
                            {formatSignedEuro(change)}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onToggleLock}
                    title={
                        locked
                            ? 'Wieder als Verkaufskandidat führen'
                            : 'Vom Verkauf ausschließen (Fester Kader)'
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground print:hidden"
                >
                    <i
                        className={cn(
                            'bi',
                            locked ? 'bi-unlock' : 'bi-shield-lock'
                        )}
                    />
                </button>
            </div>

            {!locked && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-9">
                    <span className="text-xs text-muted-foreground">
                        Fixpreis
                    </span>
                    <NumberInput
                        id={`fix-${player.i}`}
                        className="h-8 w-44"
                        value={fixPrice}
                        onChange={onFixPrice}
                        suffix="€"
                        placeholder="optional"
                    />
                    {selling && (
                        <span className="text-xs text-muted-foreground">
                            Erlös{' '}
                            <span className="font-medium text-foreground tabular-nums">
                                {formatEuro(price)}
                            </span>
                        </span>
                    )}
                </div>
            )}

            <div className="mt-3 pl-9 print:hidden">
                {details ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/50 p-2.5 sm:grid-cols-4">
                        <Trend value={change} label="24h" />
                        <Trend value={player.sdmvt} label="7 Tage" />
                        <Trend
                            value={player.mvgl}
                            label={
                                buyPrice !== undefined
                                    ? `Seit Kauf (${formatEuro(buyPrice)})`
                                    : 'Seit Kauf'
                            }
                        />
                        <div>
                            <div className="text-[11px] text-muted-foreground">
                                Punkte Ø / Ges.
                            </div>
                            <div className="text-sm font-medium tabular-nums">
                                {details.ap ?? '–'} / {details.tp ?? '–'}
                            </div>
                        </div>
                        {details.stxt && (
                            <div className="col-span-full text-xs text-amber-700">
                                <i className="bi bi-exclamation-triangle mr-1" />
                                {details.stxt}
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onLoadDetails}
                        disabled={detailsLoading}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:no-underline"
                    >
                        {detailsLoading ? (
                            <>
                                <i className="bi bi-arrow-repeat mr-1 inline-block animate-spin" />
                                Details werden geladen…
                            </>
                        ) : (
                            'Tippen, um Details zu laden'
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
