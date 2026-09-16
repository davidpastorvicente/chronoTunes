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
  app.use(express.static(distDir));
  // SPA fallback: send index.html for any non-API GET route.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
} else {
  console.warn('dist/ not found - run `npm run build` first to serve the app from this server.');
}

app.listen(PORT, () => {
  console.log(`ChronoTunes server listening on http://localhost:${PORT}`);
  if (existsSync(distDir)) {
    console.log(`App:   http://localhost:${PORT}/`);
  }
  console.log(`Audio: http://localhost:${PORT}/api/audio?v=<youtubeId>`);
});
