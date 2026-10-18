// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createModalService } from "../../js/modal-service.js";

describe("modal service", () => {
  let help;
  let settings;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="help" data-open="false"></div>
      <div id="settings" data-open="false"></div>
      <button data-modal-close="help">Close</button>
    `;
    help = document.getElementById("help");
    settings = document.getElementById("settings");
  });

  it("resolves, registers, opens, closes, and toggles modal elements", () => {
    const onOpen = vi.fn((element) => { element.dataset.open = "true"; });
    const onClose = vi.fn((element) => { element.dataset.open = "false"; });
    const service = createModalService({
      registry: { help },
      onOpen,
      onClose,
    });

    expect(service.getByKey("help")).toBe(help);
    expect(service.getElement("missing")).toBeNull();
    expect(service.getKey(help)).toBe("help");
    expect(service.register("settings", settings)).toBe(settings);
    expect(service.open("help", { trigger: "button" })).toBe(help);
    expect(onOpen).toHaveBeenCalledWith(help, {
      key: "help",
      trigger: "button",
    });
    expect(service.toggle(help)).toBe(help);
    expect(help.dataset.open).toBe("false");
    expect(service.getRegistry()).toEqual({ help, settings });
  });

  it("closes all open modals, only closes the topmost modal, and delegates escape", () => {
    const onOpen = vi.fn((element) => { element.dataset.open = "true"; });
    const onClose = vi.fn((element) => { element.dataset.open = "false"; });
    const onEscape = vi.fn();
    let topmost = help;
    const service = createModalService({
      registry: { help, settings },
      onOpen,
      onClose,
      onEscape,
      getTopmostModal: () => topmost,
    });

    service.open("help");
    service.open("settings");
    topmost = settings;
    service.closeTopmost();
    expect(settings.dataset.open).toBe("false");
    expect(help.dataset.open).toBe("true");

    document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    }));
    expect(onEscape).toHaveBeenCalledWith(
      settings,
      expect.objectContaining({ key: "Escape" }),
    );

    service.closeAll({ restoreFocus: false });
    expect(help.dataset.open).toBe("false");
    expect(settings.dataset.open).toBe("false");
  });

  it("closes a modal from its explicit close control", () => {
    const close = vi.fn((element) => { element.dataset.open = "false"; });
    createModalService({
      registry: { help },
      onClose: close,
    });

    document.querySelector("[data-modal-close='help']").click();
    expect(close).toHaveBeenCalledWith(help, { key: "help" });
  });
});
