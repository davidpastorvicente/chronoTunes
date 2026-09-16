# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it "chronotunes" (or whatever you prefer)
4. Disable Google Analytics (not needed)
5. Click "Create project"

## Step 2: Enable Realtime Database

1. In your Firebase project, go to "Build" → "Realtime Database"
2. Click "Create Database"
3. Choose location (closest to your users)
4. Start in **test mode** for now (we'll add security rules later)
5. Click "Enable"

## Step 3: Get Firebase Config

1. In Firebase console, click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Register app name: "chronotunes-web"
5. Don't check "Firebase Hosting" 
6. Click "Register app"
7. You'll see something like:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "chronotunes.firebaseapp.com",
  databaseURL: "https://chronotunes-default-rtdb.firebaseio.com",
  projectId: "chronotunes",
  storageBucket: "chronotunes.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. **Copy this entire object** - you'll need it next

## Step 4: Add Config to Project

Create a `.env` file with:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Password gate for the app (multi-device mode)
VITE_APP_PASSWORD=your_shared_password
# Optional: set to "true" to bypass the password gate during local development
VITE_DISABLE_AUTH=false
```

> The `.env` file is git-ignored and must never be committed.

## Step 5: Add to GitHub Secrets

For deployment, add each of these as GitHub Secrets:
- Repository → Settings → Secrets → Actions
- Add each `VITE_*` variable as a secret

