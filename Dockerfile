# ---- Build stage: compile the Vite frontend ----
FROM node:20-slim AS build

WORKDIR /app

# Vite bakes VITE_* env vars into the bundle at build time. Render passes a
# service's environment variables to Docker builds as build args, so we accept
# them here and expose them to `npm run build`.
ARG VITE_DISABLE_AUTH=true
ARG VITE_APP_PASSWORD
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_DATABASE_URL
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_AUDIO_API_BASE
ENV VITE_DISABLE_AUTH=$VITE_DISABLE_AUTH \
    VITE_APP_PASSWORD=$VITE_APP_PASSWORD \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_DATABASE_URL=$VITE_FIREBASE_DATABASE_URL \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_AUDIO_API_BASE=$VITE_AUDIO_API_BASE

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: Express server + yt-dlp ----
FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Install ffmpeg (audio muxing) and yt-dlp. yt-dlp is pure Python, so installing
# it via pip keeps the image architecture-independent (works on amd64 and arm64).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-pip \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# App code + built frontend
COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["node", "server/index.js"]
