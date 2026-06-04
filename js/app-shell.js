function nowIso() {
  return new Date().toISOString();
}

export function createBootStateSnapshot() {
  return {
    name: "Bibdle",
    debug: false,
    ready: false,
    failed: false,
    stage: "idle",
    startedAt: null,
    completedAt: null,
    failedAt: null,
    validation: null,
    readiness: {
      dom: false,
      contentLoaded: false,
      hydrated: false,
      servicesInitialized: false,
      authReady: false,
      puzzleReady: false,
      renderReady: false,
      eventsBound: false,
    },
    diagnostics: [],
    errors: [],
    meta: {},
  };
}

export function createBootLogger({ enabled = false, prefix = "[boot]" } = {}) {
  return {
    enabled,
    log(message, detail = null) {
      if (!enabled) return;
      if (detail === null) {
        console.log(prefix, message);
        return;
      }
      console.log(prefix, message, detail);
    },
    warn(message, detail = null) {
      if (!enabled) return;
      if (detail === null) {
        console.warn(prefix, message);
        return;
      }
      console.warn(prefix, message, detail);
    },
    error(message, detail = null) {
      if (!enabled) return;
      if (detail === null) {
        console.error(prefix, message);
        return;
      }
      console.error(prefix, message, detail);
    },
  };
}

export function createAppShell({ name = "App", debug = false, logger = createBootLogger() } = {}) {
      const shellListeners = new Map();
  const snapshot = createBootStateSnapshot();
  snapshot.name = name;
  snapshot.debug = !!debug;
  snapshot.startedAt = nowIso();

  let dependencies = {};

  function pushDiagnostic(level, type, payload = {}) {
    snapshot.diagnostics.push({
      at: nowIso(),
      level,
      type,
      ...payload,
    });
  }

    function emit(eventName, payload = {}) {
    const listeners = shellListeners.get(eventName) || [];
    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        logger.error(`listener failure for ${eventName}`, error);
      }
    });
  }

  function syncWindowState() {
    if (typeof window === "undefined") return;
    if (!window.__BIBDLE_BOOT__) {
      window.__BIBDLE_BOOT__ = {};
    }
    window.__BIBDLE_BOOT__.snapshot = getSnapshot();
  }

  function setStage(stage, details = {}) {
    snapshot.stage = stage;
    pushDiagnostic("info", "stage", {
      stage,
      details,
    });
    logger.log(`stage -> ${stage}`, details);
        emit("stage", { stage, details, snapshot: getSnapshot() });
    syncWindowState();
  }

  function updateReadiness(partial = {}) {
    snapshot.readiness = {
      ...snapshot.readiness,
      ...partial,
    };
    syncWindowState();
  }

    function setFlag(key, value) {
    snapshot.readiness = {
      ...snapshot.readiness,
      [key]: value,
    };
    syncWindowState();
  }

  function setValidation(validation) {
    snapshot.validation = validation;
    pushDiagnostic("info", "validation", { validation });
    if (!validation?.ok) {
      logger.warn("boot validation issues", validation);
    } else {
      logger.log("boot validation ok", validation);
    }
    syncWindowState();
  }

  function setMeta(key, value) {
    snapshot.meta[key] = value;
    syncWindowState();
  }

  function attachDependencies(nextDependencies = {}) {
    dependencies = {
      ...dependencies,
      ...nextDependencies,
    };
    pushDiagnostic("info", "dependencies-attached", {
      keys: Object.keys(dependencies),
    });
    syncWindowState();
  }

  function fail(stage, error, details = {}) {
    snapshot.failed = true;
    snapshot.ready = false;
    snapshot.stage = stage || snapshot.stage || "failed";
    snapshot.failedAt = nowIso();

    const normalizedError = {
      at: snapshot.failedAt,
      stage: snapshot.stage,
      message: error?.message || String(error),
      stack: error?.stack || null,
      details,
    };

    snapshot.errors.push(normalizedError);
    pushDiagnostic("error", "failure", normalizedError);
    logger.error(`failure at ${snapshot.stage}`, normalizedError);
        emit("error", { error: normalizedError, snapshot: getSnapshot() });
    syncWindowState();
  }

  function markReady() {
    snapshot.ready = true;
    snapshot.failed = false;
    snapshot.completedAt = nowIso();
    pushDiagnostic("info", "ready", {
      stage: snapshot.stage,
      readiness: snapshot.readiness,
    });
    logger.log("boot ready", snapshot.readiness);
        emit("ready", { snapshot: getSnapshot() });
    syncWindowState();
  }

  function getSnapshot() {
    return JSON.parse(JSON.stringify(snapshot));
  }

  syncWindowState();

    return {
    on(eventName, listener) {
      if (!shellListeners.has(eventName)) {
        shellListeners.set(eventName, []);
      }
      shellListeners.get(eventName).push(listener);

      return () => {
        const nextListeners = (shellListeners.get(eventName) || []).filter(
          (item) => item !== listener,
        );
        shellListeners.set(eventName, nextListeners);
      };
    },
    attachDependencies,
    fail,
    getDependencies() {
      return { ...dependencies };
    },
    getSnapshot,
    getStage() {
      return snapshot.stage;
    },
    markReady,
    setFlag,
    setMeta,
    setStage,
    setValidation,
    updateReadiness,
  };
}