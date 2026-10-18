import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthService } from "../../js/core/auth/auth-client.js";

function createFirebaseMocks() {
  const auth = { currentUser: null };
  const app = { name: "test-app" };
  const db = { name: "test-db" };
  let authStateListener;

  class GoogleAuthProvider {}

  const firebase = {
    initializeApp: vi.fn(() => app),
    getAuth: vi.fn(() => auth),
    getFirestore: vi.fn(() => db),
    GoogleAuthProvider,
    onAuthStateChanged: vi.fn((_auth, listener) => {
      authStateListener = listener;
      return vi.fn();
    }),
    signInWithPopup: vi.fn(async () => ({ user: { uid: "signed-in" } })),
    signOut: vi.fn(async () => {}),
  };

  return {
    firebase,
    auth,
    app,
    db,
    emitAuthState(user) {
      auth.currentUser = user;
      return authStateListener(user);
    },
  };
}

describe("authentication service", () => {
  let mocks;

  beforeEach(() => {
    mocks = createFirebaseMocks();
  });

  it("reports disabled configuration without initializing Firebase", () => {
    const onDisabled = vi.fn();
    const service = createAuthService({
      enabled: false,
      firebase: mocks.firebase,
      hooks: { onDisabled },
    });

    expect(service.init()).toBeNull();
    expect(onDisabled).toHaveBeenCalledOnce();
    expect(mocks.firebase.initializeApp).not.toHaveBeenCalled();
    expect(service.getContext().enabled).toBe(false);
  });

  it("initializes services, subscribes once, and exposes its context", () => {
    const onInitialized = vi.fn();
    const service = createAuthService({
      enabled: true,
      config: { projectId: "test" },
      firebase: mocks.firebase,
      hooks: { onInitialized },
    });

    const unsubscribe = service.init();
    expect(unsubscribe).toBe(service.subscribe());
    expect(mocks.firebase.initializeApp).toHaveBeenCalledWith({ projectId: "test" });
    expect(mocks.firebase.getAuth).toHaveBeenCalledWith(mocks.app);
    expect(mocks.firebase.getFirestore).toHaveBeenCalledWith(mocks.app);
    expect(onInitialized).toHaveBeenCalledWith({
      app: mocks.app,
      auth: mocks.auth,
      db: mocks.db,
      provider: expect.any(mocks.firebase.GoogleAuthProvider),
      enabled: true,
    });
    expect(service.getContext()).toMatchObject({
      app: mocks.app,
      auth: mocks.auth,
      db: mocks.db,
      enabled: true,
    });
  });

  it("syncs an authenticated profile and seeds a missing cloud profile", async () => {
    const user = { uid: "user-1", isAnonymous: false };
    const loadCloudDataToLocal = vi.fn(async () => false);
    const syncLocalDataToCloud = vi.fn(async () => {});
    const onAuthStateReady = vi.fn();
    const service = createAuthService({
      enabled: true,
      config: {},
      firebase: mocks.firebase,
      sync: { loadCloudDataToLocal, syncLocalDataToCloud },
      hooks: { onAuthStateReady },
    });
    service.init();

    await mocks.emitAuthState(user);

    expect(loadCloudDataToLocal).toHaveBeenCalledWith(user);
    expect(syncLocalDataToCloud).toHaveBeenCalledWith(user);
    expect(onAuthStateReady).toHaveBeenCalledWith({
      user,
      hadCloudProfile: false,
    });
  });

  it("does not overwrite existing cloud profiles and handles anonymous sign-out safely", async () => {
    const loadCloudDataToLocal = vi.fn(async () => true);
    const syncLocalDataToCloud = vi.fn(async () => {});
    const service = createAuthService({
      enabled: true,
      config: {},
      firebase: mocks.firebase,
      sync: { loadCloudDataToLocal, syncLocalDataToCloud },
    });
    service.init();

    await mocks.emitAuthState({ uid: "existing", isAnonymous: false });
    expect(syncLocalDataToCloud).not.toHaveBeenCalled();

    mocks.auth.currentUser = { isAnonymous: true };
    await expect(service.signOut()).resolves.toBeNull();
    expect(mocks.firebase.signOut).not.toHaveBeenCalled();
  });

  it("forwards auth sync and initialization failures to hooks", async () => {
    const syncError = new Error("profile unavailable");
    const onAuthStateSyncError = vi.fn();
    const service = createAuthService({
      enabled: true,
      config: {},
      firebase: mocks.firebase,
      sync: { loadCloudDataToLocal: vi.fn(async () => { throw syncError; }) },
      hooks: { onAuthStateSyncError },
    });
    service.init();

    const user = { uid: "broken" };
    await mocks.emitAuthState(user);
    expect(onAuthStateSyncError).toHaveBeenCalledWith({ user, error: syncError });

    const initError = new Error("firebase unavailable");
    const onInitFailure = vi.fn();
    const failing = createAuthService({
      enabled: true,
      config: {},
      firebase: {
        ...mocks.firebase,
        initializeApp: vi.fn(() => { throw initError; }),
      },
      hooks: { onInitFailure },
    });
    expect(failing.init()).toBeNull();
    expect(onInitFailure).toHaveBeenCalledWith(initError);
  });

  it("surfaces sign-in/sign-out errors and rejects unavailable actions", async () => {
    const actionError = new Error("popup blocked");
    mocks.firebase.signInWithPopup.mockRejectedValue(actionError);
    const onActionError = vi.fn();
    const service = createAuthService({
      enabled: true,
      config: {},
      firebase: mocks.firebase,
      hooks: { onActionError },
    });
    service.init();

    await expect(service.signIn()).rejects.toBe(actionError);
    expect(onActionError).toHaveBeenCalledWith({
      type: "sign-in",
      error: actionError,
    });

    mocks.auth.currentUser = { isAnonymous: false };
    mocks.firebase.signOut.mockRejectedValue(actionError);
    await expect(service.signOut()).rejects.toBe(actionError);
    expect(onActionError).toHaveBeenLastCalledWith({
      type: "sign-out",
      error: actionError,
    });

    const unavailable = createAuthService();
    await expect(unavailable.signIn()).rejects.toThrow("Sign-in unavailable");
    await expect(unavailable.signOut()).rejects.toThrow("Sign-out unavailable");
  });
});
