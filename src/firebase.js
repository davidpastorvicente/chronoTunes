/**
 * Lazily initialised Firebase Realtime Database.
 *
 * Firebase is only downloaded and initialised when a multi-device feature is
 * used, so single-device play works (and loads faster) without any Firebase
 * configuration.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () => Boolean(config.databaseURL && config.apiKey);

let firebasePromise;

/** @returns {Promise<{ db: import('firebase/database').Database } & typeof import('firebase/database')>} */
export function loadFirebase() {
  firebasePromise ??= Promise.all([import('firebase/app'), import('firebase/database')]).then(
    ([{ initializeApp }, database]) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase is not configured. Set the VITE_FIREBASE_* variables (see .env.example).');
      }
      return { ...database, db: database.getDatabase(initializeApp(config)) };
    },
  );
  return firebasePromise;
}
