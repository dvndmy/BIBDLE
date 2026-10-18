const state = {
  calls: [],
  documents: new Map(),
  authListeners: new Set(),
  snapshotListeners: new Map(),
  auth: { currentUser: null },
  app: { name: "firebase-test-app" },
  db: { name: "firebase-test-db" },
  nextDocumentId: 0,
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
  const collectionReference = _db?.kind === "collection" && segments.length === 0
    ? _db
    : segments.length === 1 && segments[0]?.kind === "collection"
      ? segments[0]
      : null;
  const generatedId = collectionReference
    ? `mock-room-${++state.nextDocumentId}`
    : null;
  const path = generatedId
    ? `${collectionReference.path}/${generatedId}`
    : segments.join("/");
  record("doc", { path });
  return { path, id: generatedId || path.split("/").pop(), kind: "document" };
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
  let docs = reference.path.endsWith("/scores")
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
    : getCollectionDocs(reference.path);
  (reference.constraints || []).forEach((constraint) => {
    if (constraint.type === "where") {
      docs = docs.filter((entry) => {
        const value = entry.data()[constraint.field];
        return constraint.operator === "=="
          ? value === constraint.value
          : constraint.operator === "in" && constraint.value.includes(value);
      });
    } else if (constraint.type === "limit") {
      docs = docs.slice(0, constraint.count);
    }
  });
  return { docs, size: docs.length, empty: docs.length === 0 };
}

function getCollectionDocs(path) {
  const prefix = `${path}/`;
  return [...state.documents.entries()]
    .filter(([documentPath]) => documentPath.startsWith(prefix) &&
      !documentPath.slice(prefix.length).includes("/"))
    .map(([documentPath, value]) => ({
      id: documentPath.slice(prefix.length),
      data: () => value,
      exists: () => true,
    }));
}

function notify(path) {
  for (const [listenerPath, listeners] of state.snapshotListeners.entries()) {
    if (listenerPath === path || path.startsWith(`${listenerPath}/`) &&
      !path.slice(listenerPath.length + 1).includes("/")) {
      listeners.forEach((listener) => {
        queueMicrotask(() => {
          if (!state.snapshotListeners.get(listenerPath)?.has(listener)) return;
          if (listener.kind === "document") {
            listener.callback(snapshot(listenerPath, state.documents.get(listenerPath)));
          } else {
            const docs = getCollectionDocs(listenerPath);
            listener.callback({ docs, size: docs.length, empty: docs.length === 0 });
          }
        });
      });
    }
  }
}

export function onSnapshot(reference, callback, onError = () => {}) {
  record("onSnapshot", { path: reference.path });
  if (!state.snapshotListeners.has(reference.path)) {
    state.snapshotListeners.set(reference.path, new Set());
  }
  const listener = {
    callback,
    kind: reference.kind === "document" ? "document" : "collection",
    onError,
  };
  state.snapshotListeners.get(reference.path).add(listener);
  queueMicrotask(() => {
    if (listener.kind === "document") {
      callback(snapshot(reference.path, state.documents.get(reference.path)));
    } else {
      const docs = getCollectionDocs(reference.path);
      callback({ docs, size: docs.length, empty: docs.length === 0 });
    }
  });
  return () => state.snapshotListeners.get(reference.path)?.delete(listener);
}

export function serverTimestamp() {
  return new Date();
}

export function increment(amount) {
  return { __increment: amount };
}

export async function setDoc(reference, value, options = {}) {
  record("setDoc", { path: reference.path, merge: !!options.merge });
  const existing = state.documents.get(reference.path) || {};
  state.documents.set(reference.path, options.merge ? { ...existing, ...value } : value);
  notify(reference.path);
}

export async function updateDoc(reference, value) {
  record("updateDoc", { path: reference.path });
  const existing = state.documents.get(reference.path);
  if (!existing) throw new Error(`Document does not exist: ${reference.path}`);
  state.documents.set(reference.path, { ...existing, ...value });
  notify(reference.path);
}

export async function deleteDoc(reference) {
  record("deleteDoc", { path: reference.path });
  state.documents.delete(reference.path);
  notify(reference.path);
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
  const changedPaths = new Set();
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
    changedPaths.add(reference.path);
  }
  changedPaths.forEach(notify);
  return result;
}
