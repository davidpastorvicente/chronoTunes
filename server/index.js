import express from 'express';
import cors from 'cors';
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || 3001;
const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';

const app = express();
app.use(cors());

// Basic validation for YouTube video IDs (11 chars, URL-safe base64 alphabet)
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * Stream the best audio track for a YouTube video through yt-dlp.
 * The browser <audio> element points at this endpoint, so the audio is
 * proxied through our server (avoids CORS issues with googlevideo URLs).
 *
 * Usage: GET /api/audio?v=VIDEO_ID
 */
app.get('/api/audio', (req, res) => {
  const videoId = String(req.query.v || '');

  if (!VIDEO_ID_RE.test(videoId)) {
    res.status(400).json({ error: 'Invalid or missing YouTube video id (?v=)' });
    return;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Prefer m4a (audio/mp4) so the browser gets a widely-supported container.
  const args = [
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
    '-o',
    '-',
    url,
  ];

  const child = spawn(YT_DLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Cache-Control', 'no-store');

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.stdout.pipe(res);

  child.on('error', (err) => {
    console.error('Failed to start yt-dlp:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'yt-dlp not available on server' });
    } else {
      res.end();
    }
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code} for ${videoId}: ${stderr.trim()}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to extract audio' });
      } else {
        res.end();
      }
    }
  });

  // If the client disconnects, kill the yt-dlp process.
  req.on('close', () => {
    child.kill('SIGKILL');
  });
});

app.listen(PORT, () => {
  console.log(`ChronoTunes audio server listening on http://localhost:${PORT}`);
});
