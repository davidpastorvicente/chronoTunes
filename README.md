[![Deploy to GitHub Pages](https://github.com/davidpastorvicente/chronotunes/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/davidpastorvicente/chronotunes/actions/workflows/deploy.yml)

# ChronoTunes

A timeline guessing game where players build chronological timelines by placing items in order. Play with songs, movies, or TV shows!

![ChronoTunes Logo](screenshots/light-en.png)

## 🎮 How to Play

1. **Choose Category**: Select between Songs, Movies, or TV Shows
2. **Setup Players**: Choose 2-6 players and set a winning score (5, 10, 15, or 20 items)
3. **Experience**: Each turn, a player experiences a mystery item (song audio or movie/show image)
4. **Guess**: Place the item in your timeline by its year (before, between, or after existing items)
5. **Build**: Correct placements add the item to your timeline
6. **Win**: First player to reach the target number of items wins!

## 📚 Content Library

### 🎵 Music

**English Songs:**
- 1960s-1990s: Classic hits from The Beatles, Queen, Michael Jackson, Nirvana
- 2000s-2020s: Modern anthems from Beyoncé, Ed Sheeran, The Weeknd, Billie Eilish  
- 2010s party hits: Rihanna, Lady Gaga, Calvin Harris, Ariana Grande, Justin Bieber

**Spanish/Latin Songs:**
- Heavy emphasis on reggaeton and Latin pop
- Artists: Bad Bunny, Karol G, Ozuna, Rauw Alejandro, Maluma, ROSALÍA, Shakira
- Spanish pop/rock: La Oreja de Van Gogh, Amaral, El Canto del Loco, Mecano, Héroes del Silencio
- Focus on post-2000 music with 70+ songs from 2020s alone

### 🎬 Movies & TV Shows

**English Movies/Shows:**
- Classic films and iconic TV series from 1960s-2020s
- Mix of blockbusters, critically acclaimed films, and popular TV shows

**Spanish Movies/Shows:**
- Spanish cinema and television from Spain specifically
- Filtered by origin country to ensure authentic Spanish content

## 🎧 Media Playback

**For Songs:**
- **YouTube via yt-dlp**: Audio is extracted server-side with `yt-dlp` and streamed
  through a small Express backend (`server/index.js`), then played in a plain
  `<audio>` element. Streaming through our own server avoids CORS issues.
- Requires `yt-dlp` on `PATH` and the audio backend running (`npm run server`).

**For Movies/TV Shows:**
- **Backdrop Images**: Scene stills shown during guessing phase (harder to identify)
- **Poster Images**: Official posters shown on reveal (clear identification)
- Images fetched from TMDB API with permanent URLs

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Make sure yt-dlp is installed and on PATH
#   macOS:   brew install yt-dlp
#   pip:     pip install -U yt-dlp

# Start the web app + audio backend together
npm run dev:all

# Open browser to http://localhost:5173
```

> `npm run dev` starts only the web app; run `npm run server` alongside it (or use
> `npm run dev:all`) so songs can play.

## 🛠 Tech Stack

- **React** - UI framework
- **Vite** - Build tool & dev server
- **Express + yt-dlp** - Server-side YouTube audio extraction/streaming
- **Firebase Realtime Database** - Multi-device sync
- **TMDB API** - Movie/TV show data and images
- **CSS3** - Modern styling with theme system

## 🎯 Content Sources

### Songs
- **Data structure**: Title, artist, year, youtubeId
- **Playback**: YouTube audio extracted at runtime with `yt-dlp`

### Movies/TV Shows
- **Data structure**: Title, year, backdropUrl, posterUrl, tmdbId, type
- **Images**: TMDB permanent URLs (don't expire)
- **Hint phase**: Backdrop images (scene stills)
- **Reveal phase**: Poster images (official artwork)
- **Origin filtering**: Spanish content filtered by Spain specifically

## 🔧 Key Features

### Color-Coded Timelines
- Each player gets a unique shuffled color sequence (8 colors)
- Colors assigned per-item, not per-position
- Item colors remain stable even when timeline reorders
- Uses seeded Fisher-Yates shuffle with Linear Congruential Generator (LCG)

### Media-Agnostic Architecture
- Generic terminology: "items" instead of "songs"
- `category` field: 'songs', 'movies', 'shows', or 'all'
- `contentSet` field: 'everything', 'english', 'spanish', or 'new' (2010+)
- Components work across all media types
- Easy to extend with new categories in future

## 📝 Features

- ✅ **Multiple categories**: Songs, Movies, and TV Shows
- ✅ Turn-based gameplay for multiple players
- ✅ **Single-device mode** (hot-seat multiplayer)
- ✅ **Multi-device mode** (real-time sync via Firebase)
- ✅ Configurable winning conditions
- ✅ **Content filtering**: Everything, English only, Spanish only, or Recent (2010+)
- ✅ Hidden media (audio for songs, scene images for movies/shows)
- ✅ Play/Pause controls for audio
- ✅ Visual timeline display with color-coded cards
- ✅ Per-item color stability (colors don't change between turns)
- ✅ Immediate feedback on correct/incorrect placements
- ✅ Winner announcement with full timeline
- ✅ Modern dark/light theme UI
- ✅ Bilingual support (English/Spanish)

## 🎨 Customization

### Adding Movies/TV Shows from TMDB

Use the automated script to fetch movies or TV shows separately:

```bash
# Fetch movies (250 per language = 500 total)
python3 scripts/fetch-movies.py movies --count 250

# Fetch TV shows (250 per language = 500 total)
python3 scripts/fetch-movies.py shows --count 250
```

**Requirements:**
- TMDB API key (set as `TMDB_API_KEY` environment variable)
- Both `backdrop_path` AND `poster_path` must be present
- All content uses ES region with language filtering (original_language=en/es)

The script will:
- ✅ Fetch movies or TV shows from TMDB `/discover` endpoints
- ✅ Use ES region filters with original language filtering
- ✅ Apply date distribution: 5% pre-1990, 80% 1990-2020, 15% 2020+
- ✅ Include backdrop URLs (for hint phase) and poster URLs (for reveal phase)
- ✅ Generate `src/data/movies.json` or `src/data/shows.json`
- ✅ Include title, year, backdrop, poster, TMDB ID, type, and language fields

### Checking for Duplicates

Check for duplicate songs in the database:

```bash
python3 scripts/check-duplicates.py
```

This will scan both English and Spanish song databases for:
- 🔴 Duplicate YouTube IDs  
- 🔴 Duplicate titles (case-insensitive)

**When duplicate YouTube IDs are found**, the script automatically:
1. Re-fetches the correct YouTube ID for each song (using `ytmusic.search()`)
2. Shows you the new correct IDs

**To automatically fix the files:**
```bash
python3 scripts/check-duplicates.py --fix
```

This will update the data files with the correct IDs.

### Adding Songs from YouTube Playlists

Use the automated script to add entire playlists:

```bash
python3 scripts/add-playlist.py PLAYLIST_ID

# Or with full URL:
python3 scripts/add-playlist.py "https://music.youtube.com/playlist?list=..."

# For Spanish songs:
python3 scripts/add-playlist.py PLAYLIST_ID --language es

# For large playlists, limit to first N successful imports:
python3 scripts/add-playlist.py PLAYLIST_ID --limit 50
```

The script will:
- ✅ Fetch all tracks from the playlist (titles and artists)
- ✅ Clean titles by removing parentheses/brackets (done twice: before search and after receiving YouTube data)
- ✅ Optionally process until N songs are successfully imported
- ✅ Search for official YouTube video IDs (ensures best/canonical versions)
- ✅ Get YouTube IDs and release years from YouTube Music
- ✅ Remove duplicates automatically
- ✅ Append formatted songs to `src/data/songs.json` (sorted by year)

**Note:** When using `--limit 50`, the script keeps processing songs until 50 are successfully imported (skipping any that fail).

### Adding Individual Songs

To add songs manually, edit `src/data/songs.json` and add entries **without any IDs**:

```json
{
  "title": "Your Song Title",
  "artist": "Artist Name",
  "year": 2024,
  "type": "song",
  "language": "en"
}
```

Then run the automatic ID updater:

```bash
python3 scripts/update-ids.py
```

The script will automatically:
- ✅ Fetch YouTube IDs from YouTube Music API
- ✅ Update the data file with the IDs

### Manual ID Entry

You can also add songs with IDs directly:

```json
{
  "title": "Your Song Title",
  "artist": "Artist Name",
  "year": 2024,
  "youtubeId": "youtube_video_id",
  "type": "song",
  "language": "en"
}
```

**Note:** Do NOT add `previewUrl` - it is resolved at runtime from `youtubeId`.

For movies/TV shows:

```json
{
  "title": "Movie Title",
  "year": 2024,
  "backdropUrl": "https://image.tmdb.org/t/p/original/...",
  "posterUrl": "https://image.tmdb.org/t/p/original/...",
  "tmdbId": "12345",
  "type": "movie",
  "language": "en"
}
```

For TV shows, use `"type": "show"` instead of `"movie"`.

## 📦 Project Structure

```
src/
├── components/
│   ├── GameSetup.jsx            # Player & category configuration
│   ├── GameBoard.jsx            # Main game logic (single-device)
│   ├── MultiplayerGameBoard.jsx # Multiplayer wrapper (Firebase sync)
│   ├── Timeline.jsx             # Timeline display (color-coded cards)
│   ├── MediaPlayer.jsx          # Routes to SongPlayer or ImageHint
│   ├── SongPlayer.jsx           # Audio player for songs
│   ├── ImageHint.jsx            # Image display for movies/shows
│   └── PlacementButtons.jsx     # Placement controls
├── data/
│   ├── songs.json               # All songs (English + Spanish)
│   ├── movies.json              # All movies (English + Spanish)
│   └── shows.json               # All TV shows (English + Spanish)
├── utils/
│   ├── audio.js                # Resolves the YouTube/yt-dlp audio URL
│   └── mediaLoader.js          # Media set creation and filtering
├── services/
│   └── gameSession.js          # Firebase operations
├── translations.js              # English/Spanish translations
└── App.jsx                      # Root component

server/
├── index.js                     # Express server (prod: serves app + audio API)
└── audioMiddleware.js           # yt-dlp audio streaming (used by Vite dev + Express)
```

## 🎯 No API Keys Required!

This version uses a curated song list - just clone and play!

---

Enjoy the game! 🎵
