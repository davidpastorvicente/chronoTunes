import { spawn } from 'node:child_process';

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';

// Basic validation for YouTube video IDs (11 chars, URL-safe base64 alphabet)
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Connect-style middleware that streams the best audio track for a YouTube
 * video through yt-dlp. Works with both the Vite dev server and Express, so
 * the same code path serves audio in development and production.
 *
 * Handles: GET /api/audio?v=VIDEO_ID  and  GET /api/health
 * Anything else is passed to `next()`.
 */
export function ytdlpAudioMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname !== '/api/audio') {
    next();
    return;
  }

  const videoId = url.searchParams.get('v') || '';
  if (!VIDEO_ID_RE.test(videoId)) {
    sendJson(res, 400, { error: 'Invalid or missing YouTube video id (?v=)' });
    return;
  }

  const target = `https://www.youtube.com/watch?v=${videoId}`;

  // Prefer m4a (audio/mp4) so the browser gets a widely-supported container.
  const args = [
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
    '-o',
    '-',
    target,
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
      sendJson(res, 500, { error: 'yt-dlp not available on server' });
    } else {
      res.end();
    }
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code} for ${videoId}: ${stderr.trim()}`);
      if (!res.headersSent) {
        sendJson(res, 502, { error: 'Failed to extract audio' });
      } else {
        res.end();
      }
    }
  });

  // If the client disconnects, kill the yt-dlp process.
  req.on('close', () => {
    child.kill('SIGKILL');
  });
}
