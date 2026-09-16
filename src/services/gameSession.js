import { getFirebase } from '../firebase';

// Generate random 6-character game code
export function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game session
export async function createGameSession(gameCode, gameSettings) {
  const { database, ref, set } = await getFirebase();
  const gameRef = ref(database, `games/${gameCode}`);

  await set(gameRef, {
    settings: gameSettings,
    state: {
      currentPlayerIndex: 0,
      gamePhase: 'waiting',
      currentSong: null,
      usedSongIds: [],
      lastPlacement: null
    },
    players: gameSettings.playerNames.map((name) => ({
      name,
      score: 0,
      timeline: [],
      connected: false,
      deviceId: null
    })),
    createdAt: Date.now(),
    hostDeviceId: null
  });

  return gameCode;
}

// Join an existing game session with player name
export async function joinGameSession(gameCode, playerName, deviceId) {
  const { database, ref, set, get } = await getFirebase();
  const playersRef = ref(database, `games/${gameCode}/players`);

  // Get current players
  const snapshot = await get(playersRef);
  const players = snapshot.exists() ? snapshot.val() : [];

  // Add new player
  const newPlayer = {
    name: playerName,
    score: 0,
    timeline: [],
    connected: true,
    deviceId: deviceId
  };

  players.push(newPlayer);
  const playerIndex = players.length - 1;

  await set(playersRef, players);

  return playerIndex;
}

// Check if game code exists
export async function checkGameExists(gameCode) {
  const { database, ref, get } = await getFirebase();
  const gameRef = ref(database, `games/${gameCode}`);
  const snapshot = await get(gameRef);
  return snapshot.exists();
}

// Subscribe to game updates.
// Returns a synchronous unsubscribe function even though Firebase loads lazily.
export function subscribeToGame(gameCode, callback) {
  let unsubscribe = () => {};
  let cancelled = false;

  getFirebase().then(({ database, ref, onValue }) => {
    if (cancelled) return;
    const gameRef = ref(database, `games/${gameCode}`);
    unsubscribe = onValue(gameRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    });
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

// Update game state
export async function updateGameState(gameCode, stateUpdates) {
  const { database, ref, update } = await getFirebase();
  const stateRef = ref(database, `games/${gameCode}/state`);
  await update(stateRef, stateUpdates);
}

// Update player data
export async function updatePlayerData(gameCode, playerIndex, playerData) {
  const { database, ref, update } = await getFirebase();
  const playerRef = ref(database, `games/${gameCode}/players/${playerIndex}`);
  await update(playerRef, playerData);
}

// Clean up game session
export async function deleteGameSession(gameCode) {
  const { database, ref, remove } = await getFirebase();
  const gameRef = ref(database, `games/${gameCode}`);
  await remove(gameRef);
}

// Mark device as host
export async function setHostDevice(gameCode, deviceId) {
  const { database, ref, set } = await getFirebase();
  const hostRef = ref(database, `games/${gameCode}/hostDeviceId`);
  await set(hostRef, deviceId);
}

// Generate unique device ID
export function getDeviceId() {
  let deviceId = localStorage.getItem('chronotunes_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chronotunes_device_id', deviceId);
  }
  return deviceId;
}
