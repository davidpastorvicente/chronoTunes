import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ytdlpAudioMiddleware } from './server/audioMiddleware.js'

// Runs the yt-dlp audio endpoint inside the Vite dev server so a single
// `npm run dev` process serves both the app and the audio API.
function ytdlpAudioPlugin() {
  return {
    name: 'ytdlp-audio',
    configureServer(server) {
      server.middlewares.use(ytdlpAudioMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(ytdlpAudioMiddleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ytdlpAudioPlugin()],
  base: '/',
})
