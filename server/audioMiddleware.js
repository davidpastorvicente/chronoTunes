import { spawn } from 'node:child_process';
import { copyFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';

// Optional yt-dlp auth/extraction tuning (useful on cloud hosts where YouTube
// shows "Sign in to confirm you're not a bot"):
//   YT_DLP_COOKIES              path to a Netscape cookies.txt file (--cookies)
//   YT_DLP_COOKIES_FROM_BROWSER browser name for --cookies-from-browser
//   YT_DLP_EXTRACTOR_ARGS       value for --extractor-args
//                               (e.g. "youtube:player_client=android")
//   YT_DLP_PROXY                proxy URL (--proxy), e.g. a residential proxy
const YT_DLP_COOKIES_FROM_BROWSER = process.env.YT_DLP_COOKIES_FROM_BROWSER;
// YouTube enforces PO tokens for the default `web` client's audio streams,
// which fails on datacenter IPs ("Requested format is not available"). Try a
// set of clients that don't require a PO token (with cookies, `tv` formats are
// not DRM'd). Override with YT_DLP_EXTRACTOR_ARGS if needed.
const YT_DLP_EXTRACTOR_ARGS =
  process.env.YT_DLP_EXTRACTOR_ARGS || 'youtube:player_client=default,tv,web_embedded,web_safari';
const YT_DLP_PROXY = process.env.YT_DLP_PROXY;

// yt-dlp writes refreshed cookies back to the --cookies file, but hosts like
// Render mount secret files read-only (/etc/secrets/...). Copy the cookies to a
// writable temp file once at startup and point yt-dlp at that copy instead.
const YT_DLP_COOKIES = (() => {
  const src = process.env.YT_DLP_COOKIES;
  if (!src) return undefined;
  try {
    const dest = join(tmpdir(), 'chronotunes-cookies.txt');
    rmSync(dest, { force: true }); // clear any stale (possibly read-only) copy
    copyFileSync(src, dest);
    chmodSync(dest, 0o600); // copyFileSync preserves mode; ensure it's writable
    return dest;
  } catch (err) {
    console.error(`Could not copy cookies file (${src}) to a writable path:`, err.message);
    return src; // fall back to the original path
  }
})();

function buildYtDlpArgs(target) {
  const args = ['--no-playlist', '--quiet', '--no-warnings'];

  if (YT_DLP_COOKIES) args.push('--cookies', YT_DLP_COOKIES);
  if (YT_DLP_COOKIES_FROM_BROWSER) args.push('--cookies-from-browser', YT_DLP_COOKIES_FROM_BROWSER);
  if (YT_DLP_EXTRACTOR_ARGS) args.push('--extractor-args', YT_DLP_EXTRACTOR_ARGS);
  if (YT_DLP_PROXY) args.push('--proxy', YT_DLP_PROXY);

  // Prefer m4a (audio/mp4); then any audio-only; then an mp4 combined stream;
  // then anything available. The <audio> element ignores any video track.
  args.push('-f', 'bestaudio[ext=m4a]/bestaudio/best[ext=mp4]/best', '-o', '-', target);
  return args;
}

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

  const args = buildYtDlpArgs(target);

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
