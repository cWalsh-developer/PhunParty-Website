<div align=center>

# PhunParty
</div>

Cozy indie trivia game. React + Vite + Tailwind frontend, Python backend API (`api.phun.party`). Host on desktop, join on mobile.

## Quick Start

1. `npm i`
2. Copy `.env.example` to `.env.local` and set your API key
3. `npm run dev` (automatically handles CORS via development proxy)
4. Open http://localhost:5173

## Backend Repo
The backend is managed on an another repo by Connor Walsh. The repo uses FastAPI and Twilio for the API and SMS sending through the API link. Here is the [link to the repo](https://github.com/cWalsh-developer/PhunParty)

## Prod - CORS Development Notes

The development server automatically proxies `/api/*` requests to `https://api.phun.party` to avoid CORS issues. No additional configuration needed for local development.

If you encounter CORS errors during login:
- The app includes a built-in CORS troubleshooting helper with diagnostics
- Use the DevTools panel (bottom-right) to test API connectivity
- Ensure you're using the development server (not build files)
- Check that `VITE_API_URL` is set correctly in `.env.local`S

## Environment Variables

- `VITE_API_URL`: Backend API URL (defaults to `https://api.phun.party`)
- `VITE_API_KEY`: Required API key for backend authentication

## Build & Deploy

- `npm run build` produces `dist` for static hosting (e.g. GitHub Pages).
- CI/CD workflow deploys on pushes to `main`.

## Testing

- `npm run test` runs unit tests with Vitest.

## Game Modes

- **Easy:** No timer, multiple choice
- **Medium:** 30s timer, multiple choice
- **Hard:** 20s timer, free text

## Architecture

- **Frontend:** React, Vite, TailwindCSS
- **Backend:** Python FastAPI REST API (`api.phun.party`)
- **API Client:** All game state, questions, sessions, and player actions are handled via backend endpoints in `src/lib/api.ts`
- **Authentication:** API key required via `X-API-Key` header for all backend requests
- **Pages:** NewSession, Join, ActiveQuiz, ActiveSessions, PostGameStats, Account

## Features

- Host creates game sessions and controls quiz flow
- Players join via QR code or session link
- All state and questions are managed by backend API
- Live leaderboard and game stats

## Notes

- QR code encodes `#/join/:sessionId` for mobile join

## API Endpoints

The backend provides the following main endpoints:

- **Game Management:** `/game/` - Create games, sessions, join sessions
- **Players:** `/players/` - Create, get, update, delete players  
- **Questions:** `/questions/` - Get and add trivia questions
- **Scores:** `/scores/` - Get session scores and leaderboards
- **Game Logic:** `/game-logic/` - Submit answers, get current questions, session status
- **Authentication:** `/auth/` - Player login
- **Password Reset:** `/password-reset/` - OTP-based password reset via SMS

All endpoints require authentication via `X-API-Key` header.

<br/>

---


## WebSocket Integration

The application features comprehensive WebSocket support for real-time game updates. For detailed documentation, troubleshooting guides, and testing tools, see:

**[WebSocket Documentation](docs/websockets/README.md)**

### Quick Overview
- ✅ **Real-time game updates** with automatic HTTP fallback
- ✅ **Enhanced error handling** and connection monitoring
- ✅ **Comprehensive diagnostic tools** for debugging
- ✅ **Production-ready deployment** with testing scripts

## Contributing

PRs welcome! See `src/lib/api.ts` for backend integration details.
