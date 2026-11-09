import { useEffect, useState } from 'react'
import { CalcSettings, SellStatus } from './calc'

export type SortMode =
    | 'standard'
    | 'position'
    | 'mv-desc'
    | 'mv-asc'
    | 'change-desc'
    | 'change-asc'

export interface RechnerOptions extends Omit<CalcSettings, 'days'> {
    autoLoadDetails: boolean
    grouped: boolean
    noPreselect: boolean
    sort: SortMode
}

export const DEFAULT_OPTIONS: RechnerOptions = {
    expectedExpenses: 0,
    expectedIncome: 0,
    offsetPercent: 0,
    includeExpenses: true,
    includeIncome: true,
    includeNegative: false,
    includeAchievements: false,
    achievementsValue: 0,
    includeLoginBonus: true,
    autoLoadDetails: false,
    grouped: true,
    noPreselect: false,
    sort: 'standard',
}

export interface LeagueState {
    status: Record<string, SellStatus>
    fixPrices: Record<string, number>
}

const OPTIONS_KEY = 'rechner.options'
const leagueKey = (leagueId: string) => `rechner.league.${leagueId}`

function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key)
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
    } catch {
        return fallback
    }
}

function write(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // storage unavailable (private mode) – settings just won't persist
    }
}

export function usePersistentOptions() {
    const [options, setOptions] = useState<RechnerOptions>(() =>
        read(OPTIONS_KEY, DEFAULT_OPTIONS)
    )
    useEffect(() => write(OPTIONS_KEY, options), [options])
    const update = <K extends keyof RechnerOptions>(
        key: K,
        value: RechnerOptions[K]
    ) => setOptions((prev) => ({ ...prev, [key]: value }))
    return [options, update] as const
}

export function loadLeagueState(leagueId: string): LeagueState {
    return read<LeagueState>(leagueKey(leagueId), { status: {}, fixPrices: {} })
}

export function saveLeagueState(leagueId: string, state: LeagueState) {
    write(leagueKey(leagueId), state)
}
