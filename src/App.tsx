import { useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import HttpClient from './httpClient';
import { HttpClientProvider } from './HttpClientContext';
import './index.css';
import NavBar from './NavBar/NavBar';
import OverpayHelper from './OverpayHelper/OverpayHelper';
import PlayerComparison from './PlayerComparison/PlayerComparison';
import { PlayerDataProvider } from './PlayerDataContext';
import ShowAvailable from './ShowAvailable/ShowAvailable';
import SignIn, { League } from './SignIn/SignIn';
import TeamAnalyzer from './TeamAnalyzer/TeamAnalyzer';
import TeamManagement from './TeamManagement/TeamManagement';
import { TransferHistoryProvider } from './TransferHistoryContext';
import { getDeviceInfo } from './utils/getDeviceInfo';

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [leagueId, setLeagueId] = useState('');
  const [userId, setUserId] = useState('');

  // http://localhost:3001
  // https://kickbackend.onrender.com
  const [httpClient] = useState(() => new HttpClient('https://api.kickbase.com', 'https://kickbackend.onrender.com'));

  const handleSignInSuccess = (
    newToken: string,
    srvl: League[],
    newUserId: string,
    newUserName: string
  ) => {
    setLeagueId(srvl[0].id);
    setUserId(newUserId);
    setIsSignedIn(true);
    httpClient.setToken(newToken);

    httpClient.post('/auth/log', {
      userId: newUserId,
      userName: newUserName,
      action: 'login',
      success: true,
      leagueId: srvl[0].id,
      deviceInfo: getDeviceInfo(),
    });
  };
  const handleSignInAttempt = async (
    success: boolean,
    userName: string,
    error?: string
  ) => {
    const deviceInfo = getDeviceInfo();
    
    try {
      await httpClient.post('/auth/log', {
        userId: success ? userId : 'unknown',
        userName: userName,
        action: 'login',
        success: success,
        error: error,
        deviceInfo: deviceInfo,
      });
    } catch (err) {
      console.error('Failed to log authentication attempt:', err);
    }
  };

  return (
    <PlayerDataProvider>
      <HttpClientProvider value={httpClient}>
        <TransferHistoryProvider>
          <Router basename="/AdvancedManager">
            <div className="App">

              <Routes>
                <Route
                  path="/signin"
                  element={
                    isSignedIn ? (
                      <Navigate to="/team" replace />
                    ) : (
                      <SignIn onSignInSuccess={handleSignInSuccess} handleSignInAttempt={handleSignInAttempt} />
                    )
                  }
                />
                {isSignedIn ? (
                  <Route path="/" element={<NavBar />}>
                    {/* <Route path="/matchday" element={<LiveMatchday leagueId={leagueId} userId={userId} />} /> */}
                    {/* <Route path="/activity" element={<ActivityFeed leagueId={leagueId} />} /> */}
                    {/* <Route path="/market" element={<PlayerMarket leagueId={leagueId} />} /> */}
                    <Route path="/team" element={<TeamManagement leagueId={leagueId} userId={userId} />} />
                    {/* <Route path="/authlogs" element={<AuthLogs />} /> */}
                    <Route path="/available" element={<ShowAvailable />} />
                    <Route path="/team-analyzer" element={<TeamAnalyzer leagueId={leagueId} userId={userId} />} />
                    <Route path="/compare" element={<PlayerComparison leagueId={leagueId} />} />
                    <Route path="/overpay" element={<OverpayHelper leagueId={leagueId} />} />
                  </Route>
                ) : (
                  <Route path="*" element={<Navigate to="/signin" replace />} />
                )}
              </Routes>
            </div>
          </Router>
        </TransferHistoryProvider>
      </HttpClientProvider>
    </PlayerDataProvider>
  );
}

export default App;
