# ChronoTunes - Agent Instructions

## Build, Test, and Lint

```bash
# Development
npm run dev          # Start Vite dev server at http://localhost:5173
npm run server       # Start the yt-dlp audio backend at http://localhost:3001
npm run dev:all      # Run web + audio backend together (concurrently)

# Production
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint on entire codebase
```

## Architecture Overview

### Game Modes

**Single-Device Mode:**
- All players share one device and take turns
- `GameBoard.jsx` manages all game state locally
- No Firebase, all state in React

**Multi-Device Mode (Multiplayer):**
- Each player has their own device
- Firebase Realtime Database syncs game state
- `MultiplayerGameBoard.jsx` orchestrates Firebase state
- `GameBoard.jsx` renders UI using the `overrideState` prop
- Pattern: MultiplayerGameBoard wraps GameBoard, passes Firebase state via `overrideState`

### Key Component Relationships

```
App.jsx
├── GameSetup.jsx (creates game config)
└── MultiplayerGameBoard.jsx (mode selector)
    ├── GameBoard.jsx (single-device mode)
    └── GameBoard.jsx (multi-device render, receives overrideState)
        ├── SongPlayer.jsx
        ├── Timeline.jsx
        └── PlacementButtons.jsx
```

### Firebase Architecture

- **Path structure:** `games/{gameCode}/`
  - `state`: Game state (currentItem, currentPlayerIndex, gamePhase, usedItemIds)
  - `players`: Array of player objects (name, score, timeline, deviceId)
  - `settings`: Game configuration (playerNames, winningScore, category, contentSet)

- **Critical pattern:** Host device initializes first item on mount (see `initializingRef` pattern)
- **Turn synchronization:** `isMyTurn` derived from `currentPlayerIndex === myPlayerIndex`

### Audio Playback Strategy

Music is played **exclusively from YouTube**, extracted server-side with `yt-dlp`.

1. The frontend calls `fetchAudioPreview()` (`src/utils/audio.js`) which returns a
   `previewUrl` of the form `/api/audio?v=<youtubeId>`.
2. `SongPlayer.jsx` points a plain `<audio>` element at that URL.
3. The Express backend (`server/index.js`) spawns `yt-dlp -f bestaudio[ext=m4a]/bestaudio`
   and streams the audio through the response (`audio/mp4`). Streaming through our
   own server avoids CORS issues with the raw googlevideo URLs.

**Requirements:**
- `yt-dlp` must be installed and on `PATH` (or set `YT_DLP_PATH`).
- The audio backend must be running (`npm run server` or `npm run dev:all`).
- In dev, Vite proxies `/api` to `http://localhost:3001` (see `vite.config.js`).
- In production, set `VITE_AUDIO_API_BASE` to the backend origin if it is not same-origin.

### Song Data Structure

Songs stored in `src/data/songs.json`:

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "year": 2020,
  "youtubeId": "youtube_video_id",
  "type": "song",
  "language": "en"
}
```

Movies stored in `src/data/movies.json`:

```json
{
  "title": "Movie Title",
  "year": 2020,
  "backdropUrl": "https://image.tmdb.org/t/p/original/...",
  "posterUrl": "https://image.tmdb.org/t/p/original/...",
  "tmdbId": "12345",
  "type": "movie",
  "language": "en"
}
```

TV shows stored in `src/data/shows.json` use the same shape with `"type": "show"`.

**Important:**
- `youtubeId` is the only ID required for audio playback.
- All media items have `type` and `language` fields.
- Types: "song", "movie", "show"
- Languages: "en", "es"

## Key Conventions

### Multiplayer State Management

**Critical pattern:** GameBoard must check `overrideState` before initializing local state:

```javascript
useEffect(() => {
  if (!overrideState) {
    // Only initialize in single-device mode
    void loadMedia();
  }
}, [loadMedia, overrideState]);
```

**Why:** Prevents race conditions where local state overwrites Firebase state on initial render.

### React Hook Patterns

**Multiplayer mode requires special useState initialization:**

```javascript
// ✅ Correct: Initialize with overrideState, sync via useEffect
const [currentItem, setCurrentItem] = useState(overrideState?.currentItem ?? null);

useEffect(() => {
  if (overrideState?.currentItem) setCurrentItem(overrideState.currentItem);
}, [overrideState]);

// ❌ Wrong: Conditional hook call
const [currentItem, setCurrentItem] = overrideState
  ? useState(overrideState.currentItem)
  : useState(null);
```

### Preventing setState-in-render

When passing React elements to parent components (e.g., turn indicator), always use `useEffect`:

```javascript
// ✅ Correct
useEffect(() => {
  if (onTurnIndicatorChange) {
    onTurnIndicatorChange(<TurnBadge />);
  }
}, [isMyTurn, gameData]);

// ❌ Wrong: setState during render
const element = <TurnBadge />;
if (onTurnIndicatorChange) onTurnIndicatorChange(element);
return <GameBoard />;
```

### Internationalization

Translations in `src/translations.js`:
- Currently supports English (`en`) and Spanish (`es`)
- Stored in localStorage as `chronotunes_language`
- Pass `language` prop down component tree

### Theme System

Two themes (light/dark) defined in `src/index.css`:
- Toggled via ThemeToggle.jsx
- Stored in localStorage as `chronotunes_theme`
- Uses CSS custom properties (e.g., `var(--bg-primary)`)

## Environment Variables

Required for Firebase (multi-device mode):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_APP_PASSWORD
```

Optional:

```
VITE_DISABLE_AUTH        # "true" bypasses the password gate in local dev
VITE_AUDIO_API_BASE      # Origin of the yt-dlp audio backend (if not same-origin)
```

Backend (`server/index.js`):

```
PORT                     # Audio server port (default 3001)
YT_DLP_PATH              # Path to the yt-dlp binary (default "yt-dlp")
```

**Deployment:** Set the `VITE_*` variables as GitHub Secrets for the GitHub Actions
workflow (`.github/workflows/deploy.yml`). The `.env` file is git-ignored and must
never be committed.

## Common Pitfalls

1. **Don't call `loadMedia()` in multiplayer mode** - It draws a random item, overriding Firebase state
2. **Don't update parent state during render** - Use useEffect for callbacks
3. **Host initialization race condition** - Use `useRef` flag to prevent double-initialization
4. **Audio won't play if the backend is down** - Start it with `npm run server` / `npm run dev:all` and ensure `yt-dlp` is installed

## File Organization

- **Media data:** All stored as JSON in `src/data/`:
  - `songs.json` - All songs (English + Spanish)
  - `movies.json` - All movies (English + Spanish)
  - `shows.json` - All TV shows (English + Spanish)
- **Utilities:**
  - `src/utils/audio.js` (resolves the YouTube/yt-dlp audio URL)
  - `src/utils/mediaLoader.js` (media set creation, filtering by language)
- **Backend:** `server/index.js` (Express + yt-dlp audio streaming)
- **Services:** `src/services/gameSession.js` (Firebase operations)
- **Components:** `src/components/` (co-located CSS files)
- **Python scripts (in `scripts/` folder):**
  - `common.py` - Shared utilities used by all scripts (YouTube Music / TMDB API calls)
  - `add-playlist.py` - Add YouTube playlists to the song database
  - `fetch-movies.py` - Fetch movies/shows: `fetch-movies.py movies` or `fetch-movies.py shows`
  - `check-duplicates.py` - Check for duplicate YouTube IDs or titles (use --fix to auto-update)
  - `update-ids.py` - Fetch missing YouTube IDs, or re-fetch all with --force flag

> Note: song metadata (IDs and release year) comes from YouTube Music; movie/show
> metadata comes from TMDB. Runtime music playback uses YouTube via yt-dlp only.

## Category System

ChronoTunes supports multiple media categories:

- **songs**: Audio-based gameplay with YouTube (yt-dlp) playback
- **movies**: Image-based gameplay with backdrop (hint) and poster (reveal) images
- **shows**: TV shows with same image-based gameplay as movies
- **all**: Mixed gameplay that interleaves all three types

**Key files:**
- `src/utils/mediaLoader.js` - Imports all media, creates filtered sets (everything/english/spanish/new)
- `src/components/GameSetup.jsx` - Category selection UI (🎵 Songs, 🎬 Movies, 📺 TV Shows, 🎭 Mixed)
- `src/translations.js` - Localized category names
