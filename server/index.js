import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { ytdlpAudioMiddleware } from './audioMiddleware.js';

const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const app = express();

// yt-dlp audio streaming + health check (/api/audio, /api/health)
app.use(ytdlpAudioMiddleware);

// Serve the built frontend so a single process handles both app and API.
if (existsSync(distDir)) {
  app.use('/chronotunes', express.static(distDir));
  app.get('/', (_req, res) => res.redirect('/chronotunes/'));
} else {
  console.warn('dist/ not found - run `npm run build` first to serve the app from this server.');
}

app.listen(PORT, () => {
  console.log(`ChronoTunes server listening on http://localhost:${PORT}`);
  if (existsSync(distDir)) {
    console.log(`App:   http://localhost:${PORT}/chronotunes/`);
  }
  console.log(`Audio: http://localhost:${PORT}/api/audio?v=<youtubeId>`);
});
