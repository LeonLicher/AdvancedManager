import { format } from 'date-fns'
import React, { useEffect, useState } from 'react'
import { useHttpClient } from '../HttpClientContext'
import { cn } from '../lib/utils'
import { DeviceInfo } from '../types/DeviceInfo'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table'

interface AuthLog {
    userId: string
    userName: string
    timestamp: any
    action: 'login' | 'logout'
    success: boolean
    deviceInfo: DeviceInfo
    error?: string
    leagueId?: string
}

const getBrowserInfo = (userAgent: string) => {
    let browser = 'Unknown'
    let os = 'Unknown'
    let device = 'Desktop'

    // Detect browser
    if (userAgent.includes('CriOS/')) {
        browser = `Chrome iOS ${userAgent.match(/CriOS\/([0-9.]+)/)?.[1] || ''}`
    } else if (userAgent.includes('Chrome/')) {
        browser = `Chrome ${userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || ''}`
    } else if (userAgent.includes('Firefox/')) {
        browser = `Firefox ${userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || ''}`
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
        browser = `Safari ${userAgent.match(/Version\/([0-9.]+)/)?.[1] || ''}`
    } else if (userAgent.includes('Edge/')) {
        browser = `Edge ${userAgent.match(/Edge\/([0-9.]+)/)?.[1] || ''}`
    }

    // Detect OS and Device
    if (userAgent.includes('iPhone')) {
        os = `iOS ${userAgent.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || ''}`
        device = 'iPhone'
    } else if (userAgent.includes('iPad')) {
        os = `iOS ${userAgent.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || ''}`
        device = 'iPad'
    } else if (userAgent.includes('Android')) {
        os = `Android ${userAgent.match(/Android ([0-9.]+)/)?.[1] || ''}`
        device = 'Mobile'
        if (userAgent.includes('Tablet') || userAgent.includes('SM-T')) {
            device = 'Tablet'
        }
    } else if (userAgent.includes('Windows')) {
        os = `Windows ${userAgent.match(/Windows NT ([0-9.]+)/)?.[1] || ''}`
    } else if (userAgent.includes('Mac OS')) {
        os = `macOS ${userAgent.match(/Mac OS X ([0-9._]+)/)?.[1]?.replace(/_/g, '.') || ''}`
    } else if (userAgent.includes('Linux')) {
        os = 'Linux'
    }

    return { browser, os, device }
}

// These logs contain every user's email and device fingerprint, so the Worker
// requires an admin token to read them. A static site cannot hide a secret in
// its bundle, so the token is entered once and kept in localStorage.
const TOKEN_STORAGE_KEY = 'authLogsAdminToken'

const AuthLogs: React.FC = () => {
    const httpClient = useHttpClient()
    const [logs, setLogs] = useState<AuthLog[]>([])
    const [loading, setLoading] = useState(false)
    const [token, setToken] = useState(
        () => localStorage.getItem(TOKEN_STORAGE_KEY) || ''
    )
    const [tokenInput, setTokenInput] = useState('')
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = async (adminToken: string) => {
        setLoading(true)
        setError(null)
        try {
            const response = await httpClient.get<AuthLog[]>('/api/logs', {
                'X-Admin-Token': adminToken,
            })
            setLogs(response)
        } catch (err: any) {
            // The client throws on any non-2xx, so a rejected token shows up
            // here as a 401 and should drop the stored value rather than
            // leaving the page stuck retrying it.
            if (String(err?.message).includes('401')) {
                localStorage.removeItem(TOKEN_STORAGE_KEY)
                setToken('')
                setError('That admin token was rejected.')
            } else {
                setError(`Could not load logs: ${err?.message ?? 'unknown error'}`)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (token) fetchLogs(token)
    }, [token])

    const handleSubmitToken = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = tokenInput.trim()
        if (!trimmed) return
        localStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
        setTokenInput('')
        setToken(trimmed)
    }

    if (!token) {
        return (
            <form onSubmit={handleSubmitToken} className="p-6 space-y-4">
                <p className="text-sm">
                    Enter the admin token to view authentication logs.
                </p>
                <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Admin token"
                    className="border rounded-md px-3 py-2 w-full max-w-sm bg-background"
                />
                <button
                    type="submit"
                    className="rounded-md border px-4 py-2 text-sm"
                >
                    Load logs
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </form>
        )
    }

    if (loading) return <div>Loading logs...</div>

    if (error) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-red-500">{error}</p>
                <button
                    onClick={() => fetchLogs(token)}
                    className="rounded-md border px-4 py-2 text-sm"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-4 auth-logs">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Time</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>Browser</TableHead>
                            <TableHead>OS</TableHead>
                            <TableHead>Screen</TableHead>
                            <TableHead>Timezone</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log, index) => {
                            const { device, browser, os } = getBrowserInfo(
                                log.deviceInfo.userAgent
                            )
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-mono">
                                        {format(
                                            new Date(log.timestamp),
                                            'MMM d, yyyy HH:mm:ss'
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {log.userName}
                                    </TableCell>
                                    <TableCell>{log.action}</TableCell>
                                    <TableCell>
                                        <span
                                            className={cn(
                                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                                                log.success
                                                    ? 'bg-green-500/50 text-foreground'
                                                    : 'bg-red-500/50 text-foreground'
                                            )}
                                        >
                                            {log.success ? 'Success' : 'Failed'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{device}</TableCell>
                                    <TableCell>{browser}</TableCell>
                                    <TableCell>{os}</TableCell>
                                    <TableCell className="font-mono">
                                        {`${log.deviceInfo.screenWidth}x${log.deviceInfo.screenHeight}`}
                                    </TableCell>
                                    <TableCell>
                                        {log.deviceInfo.timezone}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

export default AuthLogs
