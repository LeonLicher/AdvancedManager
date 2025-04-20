import { useEffect, useState } from 'react'
import {
    Navigate,
    Route,
    BrowserRouter as Router,
    Routes,
} from 'react-router-dom'
import Calculator from './Calculator/Calculator'
import HttpClient from './httpClient'
import { HttpClientProvider } from './HttpClientContext'
import './index.css'
import NavBar from './NavBar/NavBar'
import OverpayHelper from './OverpayHelper/OverpayHelper'
import PlayerComparison from './PlayerComparison/PlayerComparison'
import { PlayerDataProvider } from './PlayerDataContext'
import ShowAvailable from './ShowAvailable/ShowAvailable'
import SignIn, { League } from './SignIn/SignIn'
import TeamAnalyzer from './TeamAnalyzer/TeamAnalyzer'
import TeamManagement from './TeamManagement/TeamManagement'
import { TransferHistoryProvider } from './TransferHistoryContext'
import { getDeviceInfo } from './utils/getDeviceInfo'
// Import legal pages
import AGB from './pages/legal/AGB'
import './pages/legal/AppLegal.css'
import Datenschutz from './pages/legal/Datenschutz'
import Impressum from './pages/legal/Impressum'

function App() {
    const [isSignedIn, setIsSignedIn] = useState(false)
    const [leagueId, setLeagueId] = useState('')
    const [userId, setUserId] = useState('')
    const [showCookieConsent, setShowCookieConsent] = useState(true)

    // Also change in  Teammanagement.tsx
    // http://localhost:3001
    // https://kickbackend.onrender.com
    const [httpClient] = useState(
        () =>
            new HttpClient(
                'https://api.kickbase.com',
                'https://kickbackend.onrender.com'
            )
    )

    // Check if cookie consent was already given
    useEffect(() => {
        const cookieConsent = localStorage.getItem('cookieConsent')
        if (cookieConsent) {
            setShowCookieConsent(false)
        }
    }, [])

    const handleCookieConsent = () => {
        localStorage.setItem('cookieConsent', 'true')
        setShowCookieConsent(false)
    }

    const handleSignInSuccess = (
        newToken: string,
        srvl: League[],
        newUserId: string,
        newUserName: string
    ) => {
        setLeagueId(srvl[0].id)
        setUserId(newUserId)
        setIsSignedIn(true)
        httpClient.setToken(newToken)

        httpClient.post('/api/log', {
            userId: newUserId,
            userName: newUserName,
            action: 'login',
            success: true,
            leagueId: srvl[0].id,
            deviceInfo: getDeviceInfo(),
        })
    }
    const handleSignInAttempt = async (
        success: boolean,
        userName: string,
        error?: string
    ) => {
        const deviceInfo = getDeviceInfo()

        try {
            await httpClient.post('/api/log', {
                userId: success ? userId : 'unknown',
                userName: userName,
                action: 'login',
                success: success,
                error: error,
                deviceInfo: deviceInfo,
            })
        } catch (err) {
            console.error('Failed to log authentication attempt:', err)
        }
    }

    return (
        <PlayerDataProvider>
            <HttpClientProvider value={httpClient}>
                <TransferHistoryProvider>
                    <Router basename="/AdvancedManager">
                        <div className="App">
                            <div className="app-content">
                                <Routes>
                                    <Route
                                        path="/signin"
                                        element={
                                            isSignedIn ? (
                                                <Navigate to="/team" replace />
                                            ) : (
                                                <SignIn
                                                    onSignInSuccess={
                                                        handleSignInSuccess
                                                    }
                                                    handleSignInAttempt={
                                                        handleSignInAttempt
                                                    }
                                                />
                                            )
                                        }
                                    />

                                    {/* Legal routes outside the main navigation */}
                                    <Route
                                        path="/impressum"
                                        element={<Impressum />}
                                    />
                                    <Route
                                        path="/datenschutz"
                                        element={<Datenschutz />}
                                    />
                                    <Route path="/agb" element={<AGB />} />

                                    {isSignedIn ? (
                                        <Route path="/" element={<NavBar />}>
                                            {/* <Route path="/matchday" element={<LiveMatchday leagueId={leagueId} userId={userId} />} /> */}
                                            {/* <Route path="/activity" element={<ActivityFeed leagueId={leagueId} />} /> */}
                                            {/* <Route path="/market" element={<PlayerMarket leagueId={leagueId} />} /> */}
                                            <Route
                                                path="/team"
                                                element={
                                                    <TeamManagement
                                                        leagueId={leagueId}
                                                        userId={userId}
                                                    />
                                                }
                                            />
                                            {/* <Route path="/authlogs" element={<AuthLogs />} /> */}
                                            <Route
                                                path="/available"
                                                element={<ShowAvailable />}
                                            />
                                            <Route
                                                path="/team-analyzer"
                                                element={
                                                    <TeamAnalyzer
                                                        leagueId={leagueId}
                                                        userId={userId}
                                                    />
                                                }
                                            />
                                            <Route
                                                path="/compare"
                                                element={
                                                    <PlayerComparison
                                                        leagueId={leagueId}
                                                    />
                                                }
                                            />
                                            <Route
                                                path="/overpay"
                                                element={
                                                    <OverpayHelper
                                                        leagueId={leagueId}
                                                    />
                                                }
                                            />
                                            <Route
                                                path="/calculator"
                                                element={
                                                    <Calculator
                                                        leagueId={leagueId}
                                                    />
                                                }
                                            />
                                        </Route>
                                    ) : (
                                        <Route
                                            path="*"
                                            element={
                                                <Navigate
                                                    to="/signin"
                                                    replace
                                                />
                                            }
                                        />
                                    )}
                                </Routes>
                            </div>

                            {/* Legal Footer */}
                            <footer className="app-legal-footer">
                                <div className="legal-links">
                                    <div
                                        onClick={() =>
                                            (window.location.href =
                                                '/AdvancedManager/impressum')
                                        }
                                    >
                                        Impressum
                                    </div>
                                    <div
                                        onClick={() =>
                                            (window.location.href =
                                                '/AdvancedManager/datenschutz')
                                        }
                                    >
                                        Datenschutzerklärung
                                    </div>
                                    <div
                                        onClick={() =>
                                            (window.location.href =
                                                '/AdvancedManager/agb')
                                        }
                                    >
                                        AGB
                                    </div>
                                </div>
                                <div className="copyright">
                                    &copy; {new Date().getFullYear()}{' '}
                                    AdvancedManager. Alle Rechte vorbehalten.
                                </div>
                            </footer>

                            {/* Cookie Consent Banner */}
                            {showCookieConsent && (
                                <div className="app-cookie-consent">
                                    <p>
                                        Diese Website verwendet Cookies, um
                                        Ihnen die bestmögliche Funktionalität zu
                                        bieten. Durch die Nutzung der Website
                                        stimmen Sie der Verwendung von Cookies
                                        zu.
                                    </p>
                                    <div className="cookie-buttons">
                                        <button
                                            onClick={handleCookieConsent}
                                            className="cookie-accept"
                                        >
                                            Akzeptieren
                                        </button>
                                        <div
                                            onClick={() =>
                                                (window.location.href =
                                                    '/AdvancedManager/datenschutz')
                                            }
                                            className="cookie-more-info"
                                        >
                                            Mehr erfahren
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Router>
                </TransferHistoryProvider>
            </HttpClientProvider>
        </PlayerDataProvider>
    )
}

export default App
