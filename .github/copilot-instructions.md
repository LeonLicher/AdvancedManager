# Kickbase Advanced Manager - AI Agent Instructions

## Project Overview

Kickbase Advanced Manager is a fantasy football management tool with React/TypeScript frontend and Python data pipeline. The app provides player analysis, team optimization, and transfer tracking for the Kickbase fantasy football platform.

## Architecture

### Frontend (React + TypeScript + Vite)

- **Base Path**: `/AdvancedManager/` - All routes and asset paths use this prefix (see [vite.config.ts](vite.config.ts))
- **State Management**: React Context pattern, not Redux
    - `PlayerDataContext`: Loads `/AdvancedManager/detailed_players.json` on startup, caches in sessionStorage
    - `TransferHistoryContext`: Manages transfer history across components
    - `HttpClientContext`: Provides shared HTTP client instance
- **Routing**: React Router v6 for SPA navigation
- **Backend Integration**:
    - Kickbase API: `https://api.kickbase.com` (requires bearer token)
    - Custom backend: `https://kickbackend.onrender.com` (for logging, analytics)
    - See [src/httpClient.tsx](src/httpClient.tsx) for API wrapper

### Python Data Pipeline

- **Location**: `python/` directory
- **Purpose**: Fetches detailed player data from Kickbase API weekly
- **Key Scripts**:
    - `login.py`: Authenticates with email/password, returns bearer token
    - `getDetailedPlayers.py`: Main script - auto-authenticates if no token, fetches all players
    - Output: `detailed_players.json` (copied to `public/` for frontend consumption)
- **GitHub Actions**: `.github/workflows/update-player-data.yml` runs weekly, requires `KICKBASE_EMAIL` and `KICKBASE_PASSWORD` secrets

## Key Patterns & Conventions

### Component Structure

```typescript
// Feature components live in their own directories with co-located styles
src/TeamManagement/
  ├── TeamManagement.tsx        // Main component
  ├── TeamManagement.scss       // Styles (SCSS, not CSS modules)
  ├── useTeamManagement.ts      // Custom hook for logic
  ├── utils.ts                  // Helper functions
  └── types.ts                  // TypeScript interfaces
```

### Styling Approach

- **SCSS for feature components** (e.g., `Calculator.scss`, `TeamManagement.scss`)
- **CSS Modules for shared components** (e.g., `PlayerComponent.module.css`)
- **TailwindCSS + shadcn/ui** for utility classes and UI primitives
- Import SCSS files directly in components: `import './Component.scss'`

### Data Flow

1. Frontend loads `detailed_players.json` on mount via `PlayerDataContext`
2. Player data has **abbreviated keys** for size optimization:
    ```typescript
    { i: "id", fn: "firstName", ln: "lastName", pos: "position",
      ap: "averagePoints", tp: "totalPoints", mv: "marketValue",
      tid: "teamId", tn: "teamName", oui: "ownerUserId" }
    ```
3. Python pipeline updates this file weekly via GitHub Actions
4. Frontend uses bearer token auth for real-time API calls (team management, transfers)

### HTTP Client Usage

```typescript
// Always use the shared HttpClient instance from context
const httpClient = useContext(HttpClientContext)
// Or in components that receive it as props
const { leagueId, userId } = props
```

## Development Workflows

### Local Development

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # TypeScript check + Vite build
npm run deploy           # Build + deploy to GitHub Pages
```

### Python Data Updates (Local Testing)

```bash
cd python
# Create .env with KICKBASE_EMAIL and KICKBASE_PASSWORD
python test_workflow.py  # Test credentials and setup
python getDetailedPlayers.py  # Fetch player data
cp detailed_players.json ../public/  # Copy to frontend
```

**Windows shortcut**: Double-click `python/test_local.bat`

### Adding New Features

1. Create feature directory in `src/` with component, styles, types
2. Add route in [src/App.tsx](src/App.tsx) if page-level
3. Update NavBar in [src/NavBar/NavBar.tsx](src/NavBar/NavBar.tsx)
4. Use `usePlayerData()` hook to access player data globally

## Critical Integration Points

### Kickbase API Authentication

- **Token Management**: Bearer token from `login.py` or user sign-in
- **Token Expiry**: Short-lived (hours) - scripts auto-refresh via email/password
- **Environment Variables**: Use `.env` file with `KICKBASE_EMAIL`, `KICKBASE_PASSWORD`
- Never commit tokens or credentials

### GitHub Actions Secrets

Required secrets in repository settings:

- `KICKBASE_EMAIL`: Kickbase account email
- `KICKBASE_PASSWORD`: Kickbase account password
- `GITHUB_TOKEN`: Auto-provided by Actions (for git commits)

### Player Data Schema

The `detailed_players.json` structure (minified keys):

- Root object has `players` object (keyed by player ID) and `date` string
- Frontend expects this exact structure in `PlayerDataContext`
- Python scripts must maintain this format when updating

## Kickbase API Reference

For up-to-date details on endpoints, authentication, and data structures, see the community-maintained API doc:
[Kickbase API Documentation (kevinskyba)](https://github.com/kevinskyba/kickbase-api-doc/blob/master/kickbase-v4.swagger.json)

**Important API Details:**
- All endpoints use `/v4/` versioning (e.g., `https://api.kickbase.com/v4/user/login`)
- Login requires specific field names: `em` (email), `pass` (password), `ext` (true), `loy` (false), `rep` (empty object)
- API returns `tkn` (token) and `tknex` (token expiry), not `token`
- User-Agent header is required for successful authentication
- Token lifespan is approximately 7 days

## Common Tasks

### Update Player Data Structure

1. Modify `python/getDetailedPlayers.py` - update `save_detailed_data()` function
2. Update `src/PlayerDataContext.tsx` - adjust `DetailedPlayer` interface
3. Test locally with `python test_workflow.py` before deploying

### Add New Component with shadcn/ui

```bash
# Install shadcn component (e.g., dialog)
npx shadcn-ui@latest add dialog
# Components go to src/components/ui/
# Import: import { Dialog } from '@/components/ui/dialog'
```

### Debugging API Calls

- Check Network tab for Kickbase API responses (401 = token expired)
- Backend logs available in browser console (see `handleSignInAttempt` in App.tsx)
- Python scripts have verbose logging - check stdout for API errors

## Project-Specific Gotchas

1. **Base Path**: All asset URLs need `/AdvancedManager/` prefix for GitHub Pages deployment
2. **Player Names**: Use `firstName + lastName`, not a single `name` field in API responses
3. **Context Providers**: Wrap order matters in [src/App.tsx](src/App.tsx) - `PlayerDataProvider` must be outermost
4. **SCSS API**: Using `modern-compiler` API - old `@import` syntax may not work
5. **Python Imports**: Run python scripts as modules from root: `python -m python.getDetailedPlayers` or with correct working directory

## Testing & Validation

- **Frontend**: No test suite currently - manual testing in browser
- **Python**: `test_workflow.py` validates credentials and data pipeline
- **Linting**: `npm run lint` (ESLint with TypeScript rules)
- **Type Checking**: Automatic in build process (`tsc -b`)

## Questions to Clarify

When working on new features, verify:

- Is this a page-level route or a component?
- Does it need access to player data? (Use `usePlayerData()` hook)
- Does it need authentication? (Check `isSignedIn` in App.tsx)
- Will it interact with Kickbase API? (Use shared `HttpClient`)
- Is this data meant to be persisted? (Check backend logging in `httpClient.tsx`)
