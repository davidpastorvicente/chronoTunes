const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let firebasePromise;

/**
 * Lazily load and initialize Firebase.
 *
 * The `firebase` SDK is large and only needed for multi-device (multiplayer)
 * mode, so it is dynamically imported here. This keeps it out of the initial
 * app bundle - it is only fetched the first time a multiplayer action runs.
 *
 * @returns {Promise<{ database: import('firebase/database').Database } & typeof import('firebase/database')>}
 *   The initialized database plus the Realtime Database helpers
 *   (ref, set, onValue, update, remove, get, ...).
 */
export function getFirebase() {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const [{ initializeApp }, db] = await Promise.all([
        import('firebase/app'),
        import('firebase/database'),
      ]);
      const app = initializeApp(firebaseConfig);
      return { database: db.getDatabase(app), ...db };
    })();
  }
  return firebasePromise;
}
