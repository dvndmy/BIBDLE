import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAppShell,
  createBootLogger,
  createBootStateSnapshot,
} from "../../js/app-shell.js";

describe("application boot shell", () => {
  beforeEach(() => {
    delete globalThis.window;
  });

  it("creates independent default snapshots and optional debug logging", () => {
    const first = createBootStateSnapshot();
    const second = createBootStateSnapshot();
    expect(first.readiness).toMatchObject({
      dom: false,
      authReady: false,
      eventsBound: false,
    });
    first.meta.changed = true;
    expect(second.meta.changed).toBeUndefined();

    const logger = createBootLogger({ enabled: true, prefix: "[test]" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.log("ready");
    expect(log).toHaveBeenCalledWith("[test]", "ready");

    const quietLogger = createBootLogger();
    quietLogger.warn("hidden");
    expect(log).toHaveBeenCalledOnce();
  });

  it("publishes lifecycle events and snapshots readiness, metadata, and dependencies", () => {
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const shell = createAppShell({ name: "Test Bibdle", logger });
    const stageListener = vi.fn();
    const readyListener = vi.fn();
    const unsubscribe = shell.on("stage", stageListener);
    shell.on("ready", readyListener);

    shell.attachDependencies({ storage: "local" });
    shell.attachDependencies({ auth: "firebase" });
    shell.setStage("hydrate", { step: "preferences" });
    shell.updateReadiness({ dom: true });
    shell.setFlag("authReady", true);
    shell.setMeta("puzzleId", "daily-1");

    const snapshot = shell.getSnapshot();
    expect(snapshot).toMatchObject({
      name: "Test Bibdle",
      stage: "hydrate",
      readiness: { dom: true, authReady: true },
      meta: { puzzleId: "daily-1" },
    });
    expect(shell.getDependencies()).toEqual({
      storage: "local",
      auth: "firebase",
    });
    expect(stageListener).toHaveBeenCalledOnce();
    expect(shell.getStage()).toBe("hydrate");

    unsubscribe();
    shell.markReady();
    expect(stageListener).toHaveBeenCalledOnce();
    expect(readyListener).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ ready: true }),
    });
    expect(shell.getSnapshot().completedAt).toBeTruthy();
  });

  it("normalizes failures, logs broken listeners, and can transition back to ready", () => {
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const shell = createAppShell({ logger });
    const onError = vi.fn();
    shell.on("error", onError);
    shell.on("stage", () => {
      throw new Error("listener failed");
    });

    shell.setValidation({ ok: false, missingRequired: ["guessInput"] });
    shell.setStage("hydrate");
    const failure = new Error("service unavailable");
    shell.fail("init-services", failure, { service: "test" });

    expect(logger.warn).toHaveBeenCalledWith(
      "boot validation issues",
      { ok: false, missingRequired: ["guessInput"] },
    );
    expect(logger.error).toHaveBeenCalledWith(
      "listener failure for stage",
      expect.any(Error),
    );
    expect(onError).toHaveBeenCalledWith({
      error: expect.objectContaining({
        stage: "init-services",
        message: "service unavailable",
        details: { service: "test" },
      }),
      snapshot: expect.objectContaining({ failed: true, ready: false }),
    });

    shell.markReady();
    expect(shell.getSnapshot()).toMatchObject({ failed: false, ready: true });
  });
});
