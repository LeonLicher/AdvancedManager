/* eslint-disable react-hooks/exhaustive-deps */
import { useState } from 'react';
import { useHttpClient } from '../HttpClientContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import './SignIn.css';

interface SignInProps {
  onSignInSuccess: (chttkn: string, srvl: League[], userId: string, userName: string) => void;
  handleSignInAttempt: (success: boolean, userName: string, error?: string) => void;
}
export interface LoginResponse {
  u: User;
  srvl: League[];
  tkn: string;
  tknex: string;
  chttkn: string;
  chtknex: string;
  isnu: boolean;
  isnr: boolean;
}

export interface User {
  email: string;
  flags: number;
  proExpiry: string;
  vemail: string;
  perms: number[];
  id: string;
  name: string;
  profile: string;
  trd: number;
  sfb: string;
  efb: string;
}

export interface League {
  id: string;
  cpi: string;
  name: string;
  creator: string;
  creatorId: string;
  creation: string;
  ai: number;
  t?: number;
  au: number;
  mu: number;
  ap?: number;
  pub: boolean;
  lm: LeagueMember;
  gm: number;
  mpl: boolean;
  amd: boolean;
  vr?: number;
  adm: boolean;
  ch?: string;
  cht?: number;
  hni?: string;
}

export interface LeagueMember {
  budget: number;
  teamValue: number;
  placement: number;
  points: number;
  ttm: number;
  cmd: number;
  flags: number;
  se: boolean;
  nt: boolean;
  ntv: number;
  nb: number;
  ga: boolean;
  un: number;
}


const SignIn: React.FC<SignInProps> = ({ onSignInSuccess, handleSignInAttempt }) => {
  const httpClient = useHttpClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null);

  const logIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await httpClient.post('/v4/user/login', {
        ext: true,
        em: email,
        loy: false,
        pass: password,
        rep: {}
      });
      
      const loginData = response as LoginResponse;

      // Filter leagues but store in a new variable
      const realLeagues = loginData.srvl.filter(league => league.gm === 1)
      
      // Set the full loginData, but with filtered leagues
      setLoginResponse({
        ...loginData,
        srvl: realLeagues
      });
      
      // If user only has one league, select it automatically
      if (loginData.srvl.length === 1) {
        handleLeagueSelection(loginData.srvl[0].id);
      }
    }
    catch (error: any) {
      console.error('Login failed:', error);
      setError('Login failed. Please check your email and password.');
      handleSignInAttempt(false, email, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueSelection = (leagueId: string) => {
    if (!loginResponse) return;

    // Find the selected league
    const selectedLeagueObj = loginResponse.srvl.find(l => l.id === leagueId);
    if (!selectedLeagueObj) return;

    // Create new array with selected league at first position
    const reorderedLeagues = [
      selectedLeagueObj,
      ...loginResponse.srvl.filter(l => l.id !== leagueId)
    ];

    onSignInSuccess(
      loginResponse.tkn,
      reorderedLeagues,
      loginResponse.u.id,
      loginResponse.u.email
    );
  };

  // Render league selection after successful login
  if (loginResponse) {
    return (
      <div className="chooseLeagueContainer">
        <div className="bg-accent">
          <Select onValueChange={handleLeagueSelection} defaultOpen>
            <SelectTrigger className="bg-accent w-full">
              <SelectValue placeholder="Wähle deine Liga" />
            </SelectTrigger>
            <SelectContent 
              className="bg-background/80 backdrop-blur-sm"
              position="popper"
              sideOffset={5}
            >
              {loginResponse.srvl.map((league) => (
                <SelectItem 
                  key={league.id} 
                  value={league.id}
                  className="hover:bg-accent/50"
                >
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Render login form
  return (
    <div className="sign-in-container">
      <h2>Einloggen</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={logIn}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Einloggen...' : 'Einloggen'}
        </button>
      </form>
    </div>
  );
}

export default SignIn;
