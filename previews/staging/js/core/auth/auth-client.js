export function createAuthService({
  enabled = false,
  config = null,
  firebase = {},
  hooks = {},
  sync = {},
} = {}) {
  let app = null;
  let auth = null;
  let db = null;
  let provider = null;
  let unsubscribe = null;

  const {
    initializeApp,
    getAuth,
    getFirestore,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
  } = firebase;

  const {
    loadCloudDataToLocal,
    syncLocalDataToCloud,
  } = sync;

  function callHook(name, payload) {
    const handler = hooks?.[name];
    if (typeof handler === "function") {
      handler(payload);
    }
  }

  function isConfigured() {
    return !!enabled && !!config && typeof initializeApp === "function";
  }

  function init() {
    if (!isConfigured()) {
      callHook("onDisabled");
      return null;
    }

    try {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
      provider = new GoogleAuthProvider();

      callHook("onInitialized", {
        app,
        auth,
        db,
        provider,
        enabled: true,
      });

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        callHook("onAuthStateSyncStart", user);

        if (!user) {
          callHook("onAuthStateReady", {
            user: null,
            hadCloudProfile: false,
          });
          return;
        }

        try {
          const hadCloudProfile = await loadCloudDataToLocal(user);

          if (!hadCloudProfile) {
            await syncLocalDataToCloud(user);
          }

          callHook("onAuthStateReady", {
            user,
            hadCloudProfile,
          });
        } catch (error) {
          callHook("onAuthStateSyncError", {
            user,
            error,
          });
        }
      });

      return unsubscribe;
    } catch (error) {
      callHook("onInitFailure", error);
      return null;
    }
  }

  async function signIn() {
    if (!auth || !provider || typeof signInWithPopup !== "function") {
      throw new Error("Sign-in unavailable");
    }

    try {
      return await signInWithPopup(auth, provider);
    } catch (error) {
      callHook("onActionError", {
        type: "sign-in",
        error,
      });
      throw error;
    }
  }

  async function signOutUser() {
    if (!auth || typeof signOut !== "function") {
      throw new Error("Sign-out unavailable");
    }

    if (auth.currentUser?.isAnonymous) {
      return null;
    }

    try {
      return await signOut(auth);
    } catch (error) {
      callHook("onActionError", {
        type: "sign-out",
        error,
      });
      throw error;
    }
  }

  function getContext() {
    return {
      app,
      auth,
      db,
      provider,
      enabled: !!auth,
    };
  }

  return {
    getContext,
    init,
    signIn,
    signOut: signOutUser,
    subscribe() {
      return unsubscribe;
    },
  };
}