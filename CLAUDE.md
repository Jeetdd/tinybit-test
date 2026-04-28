# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (Expo)
npm start              # Start Expo dev server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator
npm run web            # Run on web
npm run lint           # Run ESLint

# Backend (Express)
cd server && node src/index.js   # Start backend server (port 5000)
```

No test suite is configured.

## Architecture

TinyBit is an elderly health companion app built with **Expo 55 + TypeScript** (frontend) and **Node.js/Express** (backend).

### Frontend

- **Routing:** Expo Router (file-based). Root layout at `app/_layout.tsx` wraps everything in `AuthProvider` + `LanguageProvider`. Unauthenticated users are redirected to `app/onboarding/`.
- **Tabs:** 5 visible tabs (Home, Medicine, Sathi AI, Journal, Profile) plus hidden screens (SOS, health-vault, daily-check-in, care-calendar, family-messages, mind-games) accessed programmatically. Custom `NotchedTabBar` component renders the tab bar.
- **State:** React Context only — `AuthContext` (Supabase user + profile + streak) and `LanguageContext` (6-language i18n + accessibility settings like text size and night mode).
- **Persistence:** AsyncStorage for tokens, streak counters, and accessibility preferences.
- **AI features:** `utils/openai.ts` integrates GPT-4o-mini (chat), Whisper (voice transcription), and TTS `tts-1` with "nova" voice for the "Sathi" AI companion screen.

### Auth

Authentication is handled by **Supabase** (`utils/supabase.ts`). After login, the Supabase session token is also forwarded as a Bearer token to the custom backend. The `AuthContext` manages the session lifecycle and exposes `user`, `profile`, `streak`, `logout`, and `refreshProfile`.

### Backend

Node.js/Express server in `server/src/`. Uses **MongoDB/Mongoose** for all app data. Supabase handles auth only; the custom server handles everything else.

- `server/src/index.js` — Express entry point, MongoDB connection, route registration, global error handler
- `server/src/models/` — Mongoose schemas (User, Medicine, DailyCheckIn, MoodEntry, AIConversation, SOSAlert, etc.)
- `server/src/controllers/` — Business logic per feature
- `server/src/routes/` — Express routers mounted under `/api/`
- API base URL configured at `config/api.ts` (default: `http://192.168.1.100:5000/api`) — update this for your local network IP

### Key paths

| Path | Purpose |
|------|---------|
| `context/AuthContext.tsx` | Auth state, Supabase session, profile, streak |
| `context/LanguageContext.tsx` | i18n (EN/HI/GU/TA/BN/MR), accessibility prefs |
| `utils/supabase.ts` | Supabase client (project URL hardcoded) |
| `utils/openai.ts` | OpenAI client (GPT-4o-mini, Whisper, TTS) |
| `services/api.ts` | Axios wrapper for custom backend |
| `config/api.ts` | Backend base URL — update for local dev |
| `components/NotchedTabBar.tsx` | Custom bottom tab bar |
| `constants/` | Country list, translation strings |
| `supabase/` | Supabase migrations |

### Environment

The backend reads `process.env.MONGODB_URI` and `process.env.PORT`. OpenAI and Supabase keys are likely in `.env` files (not committed). The Expo app uses `config/api.ts` for the backend URL — change the IP when switching networks.
