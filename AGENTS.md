# ChronoTunes — Agent Guide

Timeline party game (songs, movies, TV shows). React 19 + Vite SPA deployed to
GitHub Pages under `/chronoTunes/`. Firebase Realtime Database powers optional
multi-device play.

## Commands

Node.js 22.22+ / 24.15+ (`.nvmrc`; CI uses it too).

```bash
npm run dev            # http://localhost:5173/chronoTunes/ (add `-- --host` to test on phones over LAN)
npm test               # Vitest (unit + component + integration)
npm run lint           # ESLint
npm run docs:machines  # regenerate docs/state-machines.md (a test fails if stale)
npm run check          # lint + test + build — run before declaring work done
```

## Architecture in one minute

```
App (appMachine: setup → game)
├── PreferencesProvider   language + theme (single source of truth)
└── AuthGate              authMachine (VITE_DISABLE_AUTH=true skips it)
    ├── SetupScreen       useSetup → setupMachine (+ Firebase side effects)
    └── GameScreen        useLocalGame | useOnlineGame → GameView (mode-agnostic)
```

- **All non-trivial state is an explicit machine** in `src/machines/`, built
  with the tiny `createMachine` helper. See `docs/state-machines.md` for the
  diagrams. States are plain JSON objects with a `value` field.
- **`gameMachine` is the only source of game rules.** Single-device runs it in
  `useReducer`; multi-device runs it inside Firebase `runTransaction` via
  `src/game/session.js` (`applySessionEvent`). Never duplicate rules in
  components.
- **Side effects live at the edges.** Machines are pure. Hooks (`src/hooks/`)
  perform I/O when the machine enters a state (`loading` → draw an item,
  `creating` → create a session) and feed results back as events.
- **Ignored events are a feature.** `transition()` returns the *same object*
  when an event isn't accepted. This makes double clicks and stale devices
  harmless; use `machine.can(state, 'EVENT')` to drive UI (e.g. Back button).
- **Multi-device driver rule:** the device whose turn it is performs PLACE,
  NEXT_TURN and the next draw. Events carry `by: playerIndex`; the machine
  rejects events from the wrong player. If the driver's draw fails or is
  rejected, `useOnlineGame` shows an error banner whose "Try again" re-draws.

## Where things live

| Need to… | Go to |
| --- | --- |
| Change game rules / phases | `src/machines/gameMachine.js`, `src/game/rules.js` |
| Change setup steps | `src/machines/setupMachine.js`, `src/components/setup/` |
| Change Firebase schema / writes | `src/game/session.js` (pure), `src/services/gameSession.js` (I/O) |
| Change how items are drawn / previews | `src/game/deck.js`, `src/utils/deezer.js`, `src/utils/jsonp.js` (see "Song previews") |
| Resume a game or lobby after a page reload | `src/game/savedGame.js` (`sessionStorage`; used by `App`, `useLocalGame` and `useSetup`) |
| Add UI text | `src/i18n/en.json` **and** `src/i18n/es.json`, use `t('a.b', { param })` |
| Styling | Tokens in `src/styles/tokens.css`; follow `DESIGN.md` (Genesis + "ChronoTunes adaptations") |
| Timeline item colours | `.tone-*` in `tokens.css`, picked per item by `src/components/game/tones.js` |
| Media data | `src/data/{songs,movies,shows}.json` (validated by `mediaLoader.test.js`) |

## Firebase layout (`games/{CODE}`)

```
settings: { category, contentSet, winningScore }
state:    { gamePhase, currentPlayerIndex, currentItem, usedItemIds, lastPlacement, winner, endReason }
players:  [{ id, name, score, timeline, deviceId }]
createdAt, hostDeviceId
```

Firebase drops `null` and empty arrays — always read through
`sessionToGame` / `normalizePlayers`. Firebase is lazy-loaded (`src/firebase.js`);
single-device play must keep working without any `VITE_FIREBASE_*` variables.

## Song previews (Deezer via JSONP)

`src/game/deck.js#prepareItem` resolves a song's preview when it is drawn
(Deezer preview URLs expire after ~24 h, so they are never stored in `src/data`):

1. `src/utils/deezer.js` loads `https://api.deezer.com/track/{deezerId}?output=jsonp`
   with the tiny JSONP loader in `src/utils/jsonp.js` (5 s timeout) and uses
   `preview` (30 s MP3) and `album.cover_medium`.
2. If Deezer has no preview, errors or times out, it falls back to a hidden
   YouTube embed (`youtubeEmbedUrl`), which `SongPlayer` controls via `postMessage`.

**Why JSONP:** the Deezer API sends no `Access-Control-Allow-Origin` header, so
`fetch()` from the browser is blocked by CORS, and the app is a static site
(GitHub Pages) with no backend to proxy through. Public CORS proxies
(`corsproxy.io`, `cors.eu.org`) were used before and stopped working
(403 / 429). Don't reintroduce `fetch()` or third-party proxies for Deezer.
The MP3 itself plays through `<audio>`, which doesn't need CORS.

In tests, pass a fake loader as the second argument of `fetchDeezerPreview`
(see `src/utils/deezer.test.js`); `src/utils/jsonp.test.js` covers the loader.

## Conventions

- Item ids are namespaced: `song:<youtubeId>`, `movie:<tmdbId>`, `show:<tmdbId>` (`itemId()`).
- Randomness goes through `src/utils/random.js` (crypto-based; mockable in tests).
  Use `randomId()`, never `crypto.randomUUID()` directly: it doesn't exist on
  plain-HTTP origins (phones testing the dev server over LAN).
- Components only export components (react-refresh); put helpers in `.js` files.
- Error messages are i18n keys (`errors.*`) produced by machines/services.
- Expose state for tests and agents with `data-*` attributes:
  `main[data-screen]`, `main[data-step]` (setup), `main[data-phase]` (game),
  `.song-player[data-state]`, `.image-hint[data-state]`.
- Never put secrets in code. `.env` is git-ignored; document new variables in `.env.example`.
- Accessibility: labelled controls, native inputs, no `autoFocus`, visible focus,
  respect `prefers-reduced-motion`, alt text must not reveal the answer.

## Testing

- Pure logic: test machines/rules directly (`machine.transition(state, event)`).
- Components: Testing Library, query by role/label. `src/test/setup.js` stubs media + matchMedia.
- Firebase: `src/services/gameSession.test.js` uses an in-memory fake with
  transaction semantics; `src/test/fixtures.js#firebaseRoundTrip` mimics storage.
- Integration: `src/App.test.jsx` (single device) and `src/App.online.test.jsx` (multi-device, mocked service).

## Python scripts (`scripts/`)

Data maintenance only (not used at runtime): `add-playlist.py`, `fetch-movies.py
movies|shows`, `update-ids.py`, `check-duplicates.py`, `check-titles.py`, shared
helpers in `common.py`. Require `TMDB_API_KEY` for TMDB scripts.
