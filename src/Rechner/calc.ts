// Pure calculation logic for the Rechner (no React, no API).

export type SellStatus = 'sell' | 'keep' | 'locked'

export interface SquadPlayer {
    i: string // player id
    n: string // last name
    fn?: string // first name
    pos: number // 1 TW, 2 ABW, 3 MF, 4 ST
    mv: number // market value
    mvgl?: number // market value gain/loss since purchase
    tfhmvt?: number // market value change last 24h
    sdmvt?: number // market value change last 7 days
    mvt?: number // trend 0 = flat, 1 = up, 2 = down
    st?: number // status
    pim?: string // profile image path
    tid?: string // team id
}

export interface PlayerDetails {
    fn?: string
    ln?: string
    tn?: string // team name
    stxt?: string // status text
    ap?: number // average points
    tp?: number // total points
    tfhmvt?: number
    mvt?: number
    pim?: string
}

export interface CalcSettings {
    expectedExpenses: number
    expectedIncome: number
    offsetPercent: number
    includeExpenses: boolean
    includeIncome: boolean
    includeNegative: boolean
    includeAchievements: boolean
    achievementsValue: number
    includeLoginBonus: boolean
    days: number
}

export const LOGIN_BONUS_PER_DAY = 100_000
/** Kickbase allows a negative balance of up to 33 % of the remaining squad value. */
export const MAX_DEBT_RATIO = 0.33

export const POSITIONS: Record<number, { short: string; long: string }> = {
    1: { short: 'TW', long: 'Torwart' },
    2: { short: 'ABW', long: 'Abwehr' },
    3: { short: 'MF', long: 'Mittelfeld' },
    4: { short: 'ST', long: 'Sturm' },
}

/** Sale price used in the simulation: fixed price wins, otherwise MW +/- offset. */
export function salePrice(
    player: SquadPlayer,
    fixPrice: number | undefined,
    offsetPercent: number
): number {
    if (fixPrice !== undefined && fixPrice > 0) return fixPrice
    return Math.round(player.mv * (1 + offsetPercent / 100))
}

/** 24h market value change, preferring loaded details. */
export function dailyChange(
    player: SquadPlayer,
    details?: PlayerDetails
): number | undefined {
    if (details?.tfhmvt !== undefined) return details.tfhmvt
    return player.tfhmvt
}

export interface CalcResult {
    salesIncome: number
    balanceAfterSales: number
    dailyGain: number
    dailyLoss: number
    incomeUntil: number
    loginBonus: number
    achievements: number
    total: number
    squadValue: number
    squadCount: number
    sellCount: number
    possibleMinus: number
    maxOffer: number
}

export function calculate(
    balance: number,
    players: SquadPlayer[],
    status: Record<string, SellStatus>,
    fixPrices: Record<string, number>,
    details: Record<string, PlayerDetails>,
    s: CalcSettings
): CalcResult {
    let salesIncome = 0
    let dailyGain = 0
    let dailyLoss = 0
    let squadValue = 0
    let squadCount = 0
    let sellCount = 0

    for (const p of players) {
        if (status[p.i] === 'sell') {
            sellCount++
            salesIncome += salePrice(p, fixPrices[p.i], s.offsetPercent)
            const change = dailyChange(p, details[p.i]) ?? 0
            if (change > 0) dailyGain += change
            else dailyLoss += change
        } else {
            squadCount++
            squadValue += p.mv
        }
    }

    const days = Math.max(0, s.days)
    const balanceAfterSales =
        balance +
        salesIncome -
        (s.includeExpenses ? s.expectedExpenses : 0) +
        (s.includeIncome ? s.expectedIncome : 0)
    const incomeUntil =
        dailyGain * days + (s.includeNegative ? dailyLoss * days : 0)
    const loginBonus = s.includeLoginBonus ? LOGIN_BONUS_PER_DAY * days : 0
    const achievements = s.includeAchievements ? s.achievementsValue : 0
    const total = balanceAfterSales + incomeUntil + loginBonus + achievements
    const possibleMinus = Math.floor(squadValue * MAX_DEBT_RATIO)

    return {
        salesIncome,
        balanceAfterSales,
        dailyGain,
        dailyLoss,
        incomeUntil,
        loginBonus,
        achievements,
        total,
        squadValue,
        squadCount,
        sellCount,
        possibleMinus,
        maxOffer: balanceAfterSales + possibleMinus,
    }
}

/** Days from today until the next Friday (0 on a Friday). */
export function daysUntilFriday(now = new Date()): number {
    return (5 - now.getDay() + 7) % 7
}

export function addDays(days: number, now = new Date()): Date {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    return d
}

export const formatEuro = (value: number) =>
    new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(value)

export const formatSignedEuro = (value: number) =>
    (value > 0 ? '+' : '') + formatEuro(value)
