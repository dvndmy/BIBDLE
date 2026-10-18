const state = {
  calls: [],
  documents: new Map(),
  authListeners: new Set(),
  auth: { currentUser: null },
  app: { name: "firebase-test-app" },
  db: { name: "firebase-test-db" },
};

globalThis.__firebaseMockState = state;

function record(method, details = {}) {
  state.calls.push({ method, ...details });
}

function snapshot(path, value) {
  return {
    exists: () => value !== undefined,
    data: () => value,
    id: path.split("/").pop(),
  };
}

function updateAuth(user) {
  state.auth.currentUser = user;
  for (const listener of state.authListeners) {
    queueMicrotask(() => listener(user));
  }
}

export function initializeApp(config) {
  record("initializeApp", { projectId: config.projectId });
  return state.app;
}

export function getAuth() {
  record("getAuth");
  return state.auth;
}

export function getFirestore() {
  record("getFirestore");
  return state.db;
}

export class GoogleAuthProvider {}

export function onAuthStateChanged(_auth, listener) {
  state.authListeners.add(listener);
  queueMicrotask(() => listener(state.auth.currentUser));
  return () => state.authListeners.delete(listener);
}

export async function signInAnonymously() {
  const user = { uid: "mock-anonymous-user", isAnonymous: true };
  record("signInAnonymously", { uid: user.uid });
  updateAuth(user);
  return { user };
}

export async function signInWithPopup() {
  const user = {
    uid: "mock-user",
    isAnonymous: false,
    displayName: "Test Player",
    email: "player@example.test",
    photoURL: null,
  };
  record("signInWithPopup", { uid: user.uid });
  updateAuth(user);
  return { user, credential: null };
}

export async function signInWithCredential(_auth, credential) {
  record("signInWithCredential");
  const user = credential?.user || {
    uid: "mock-user",
    isAnonymous: false,
    displayName: "Test Player",
    email: "player@example.test",
  };
  updateAuth(user);
  return { user };
}

export async function linkWithCredential(_user, credential) {
  record("linkWithCredential");
  return { user: credential?.user || state.auth.currentUser };
}

export async function linkWithPopup() {
  record("linkWithPopup");
  const user = { ...state.auth.currentUser, isAnonymous: false };
  updateAuth(user);
  return { user };
}

export async function signOut() {
  record("signOut");
  updateAuth(null);
}

export async function fetchSignInMethodsForEmail() {
  record("fetchSignInMethodsForEmail");
  return [];
}

export function doc(_db, ...segments) {
  const path = segments.join("/");
  record("doc", { path });
  return { path, kind: "document" };
}

export function collection(_db, ...segments) {
  const path = segments.join("/");
  record("collection", { path });
  return { path, kind: "collection" };
}

export async function getDoc(reference) {
  record("getDoc", { path: reference.path });
  return snapshot(reference.path, state.documents.get(reference.path));
}

export function where(field, operator, value) {
  return { type: "where", field, operator, value };
}

export function orderBy(field, direction = "asc") {
  return { type: "orderBy", field, direction };
}

export function limit(count) {
  return { type: "limit", count };
}

export function query(reference, ...constraints) {
  return { ...reference, constraints };
}

export async function getDocs(reference) {
  record("getDocs", {
    path: reference.path,
    constraints: reference.constraints || [],
  });
  const docs = reference.path.endsWith("/scores")
    ? [{
      id: "mock-leaderboard-entry",
      data: () => ({
        uid: "mock-leaderboard-user",
        displayName: "Sample Player",
        result: "won",
        guesses: 3,
        completedAt: new Date("2026-01-01T12:00:00Z"),
      }),
    }]
    : [];
  return { docs, size: docs.length, empty: docs.length === 0 };
}

export function serverTimestamp() {
  return new Date("2026-01-01T00:00:00Z");
}

export function increment(amount) {
  return { __increment: amount };
}

export async function setDoc(reference, value, options = {}) {
  record("setDoc", { path: reference.path, merge: !!options.merge });
  const existing = state.documents.get(reference.path) || {};
  state.documents.set(reference.path, options.merge ? { ...existing, ...value } : value);
}

export async function runTransaction(_db, callback) {
  record("runTransaction");
  const writes = [];
  const transaction = {
    get: async (reference) => {
      record("transaction.get", { path: reference.path });
      return snapshot(reference.path, state.documents.get(reference.path));
    },
    set: (reference, value, options = {}) => {
      writes.push({ reference, value, options });
      record("transaction.set", { path: reference.path });
      return transaction;
    },
    update: (reference, value) => {
      writes.push({ reference, value, options: { merge: true } });
      record("transaction.update", { path: reference.path });
      return transaction;
    },
  };
  const result = await callback(transaction);
  for (const { reference, value, options } of writes) {
    const existing = state.documents.get(reference.path) || {};
    const nextValue = { ...(options.merge ? existing : {}) };
    for (const [key, fieldValue] of Object.entries(value)) {
      nextValue[key] =
        fieldValue && typeof fieldValue === "object" && "__increment" in fieldValue
          ? (existing[key] || 0) + fieldValue.__increment
          : fieldValue;
    }
    state.documents.set(reference.path, nextValue);
  }
  return result;
}
