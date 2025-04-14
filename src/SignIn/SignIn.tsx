/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useHttpClient } from '../HttpClientContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import './SignIn.scss';

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

// Login Form Component
interface LoginFormProps {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  rememberMe: boolean;
  setRememberMe: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  isLoading,
  error,
  onSubmit,
  rememberMe,
  setRememberMe
}) => (
  <div className="sign-in-container">
    <div className="header-container">
      <h2>Einloggen</h2>
      <img src="./logo/logo.png" alt="Logo" className="sign-in-logo" />
    </div>
    <p className="sign-in-subtext">mit Kickbase Anmeldedaten</p>
    {error && <p className="error-message">{error}</p>}
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@beispiel.com"
          required
          autoFocus
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <div className="form-group checkbox-group">
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="checkbox-label">Angemeldet bleiben</span>
        </label>
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? (
          <span className="loading-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </span>
        ) : (
          'Einloggen'
        )}
      </button>
    </form>
  </div>
);

// League Selection Component
interface LeagueSelectionProps {
  leagues: League[];
  onLeagueSelect: (leagueId: string) => void;
}

const LeagueSelection: React.FC<LeagueSelectionProps> = ({ leagues, onLeagueSelect }) => (
  <div className="choose-league-container">
    <h2>Liga auswählen</h2>
    <p className="selection-instructions">Bitte wähle deine Liga aus der Liste aus</p>
    <div>
      <Select onValueChange={onLeagueSelect} defaultOpen>
        <SelectTrigger className="league-select__trigger">
          <SelectValue placeholder="Wähle deine Liga" />
        </SelectTrigger>
        <SelectContent 
          className="league-select__content"
          position="popper"
          sideOffset={5}
        >
          {leagues.map((league) => (
            <SelectItem 
              key={league.id} 
              value={league.id}
              className="league-select__item"
            >
              {league.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

// Main SignIn Component
const SignIn: React.FC<SignInProps> = ({ onSignInSuccess, handleSignInAttempt }) => {
  const httpClient = useHttpClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null);
  
  // Load saved email if available
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }
      
      const response = await httpClient.post('/v4/user/login', {
        ext: true,
        em: email,
        loy: false,
        pass: password,
        rep: {}
      });
      
      const loginData = response as LoginResponse;
      
      // Filter leagues to only include real game mode (gm === 1)
      const realLeagues = loginData.srvl.filter(league => league.gm === 1);
      
      setLoginResponse({
        ...loginData,
        srvl: realLeagues
      });
      
      // Signal successful login attempt
      handleSignInAttempt(true, email);
      
      // If user only has one league, select it automatically
      if (realLeagues.length === 1) {
        handleLeagueSelection(realLeagues[0].id);
      }
    }
    catch (error: any) {
      console.error('Login failed:', error);
      setError('Login fehlgeschlagen. Bitte überprüfe deine Email und Passwort.');
      handleSignInAttempt(false, email, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueSelection = (leagueId: string) => {
    if (!loginResponse) return;

    // Find the selected league
    const selectedLeague = loginResponse.srvl.find(l => l.id === leagueId);
    if (!selectedLeague) return;

    // Put selected league first in the array for better UX
    const reorderedLeagues = [
      selectedLeague,
      ...loginResponse.srvl.filter(l => l.id !== leagueId)
    ];

    onSignInSuccess(
      loginResponse.tkn,
      reorderedLeagues,
      loginResponse.u.id,
      loginResponse.u.email
    );
  };

  return (
    <>
      {!loginResponse && <div className="signin-page-background"></div>}
      {loginResponse ? (
        <LeagueSelection 
          leagues={loginResponse.srvl} 
          onLeagueSelect={handleLeagueSelection} 
        />
      ) : (
        <LoginForm 
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isLoading={isLoading}
          error={error}
          onSubmit={handleLogin}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
        />
      )}
    </>
  );
};

export default SignIn;
