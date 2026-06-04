function resolveModalElement(input, registry) {
  if (!input) return null;

  if (typeof input === "string") {
    return registry[input] || null;
  }

  return input instanceof HTMLElement ? input : null;
}

function resolveModalKey(input, registry) {
  if (!input) return "";

  if (typeof input === "string") {
    return input;
  }

  return (
    Object.entries(registry).find(([, element]) => element === input)?.[0] || ""
  );
}

export function createModalService({
  registry = {},
  onOpen = () => {},
  onClose = () => {},
  onEscape = null,
  getTopmostModal = null,
} = {}) {
  const registered = { ...registry };
  let bound = false;

  function getByKey(key) {
    return registered[key] || null;
  }

  function getKey(input) {
    return resolveModalKey(input, registered);
  }

  function getElement(input) {
    return resolveModalElement(input, registered);
  }

  function register(key, element) {
    if (!key || !element) return null;
    registered[key] = element;
    return element;
  }

  function open(input, options = {}) {
    const element = getElement(input);
    if (!element) return null;
    onOpen(element, {
      key: getKey(input),
      ...options,
    });
    return element;
  }

  function close(input, options = {}) {
    const element = getElement(input);
    if (!element) return null;
    onClose(element, {
      key: getKey(input),
      ...options,
    });
    return element;
  }

  function toggle(input, options = {}) {
    const element = getElement(input);
    if (!element) return null;

    const isOpen = element.dataset.open === "true";
    return isOpen ? close(element, options) : open(element, options);
  }

  function closeTopmost(options = {}) {
    const topmost = typeof getTopmostModal === "function" ? getTopmostModal() : null;
    if (!topmost) return null;
    return close(topmost, options);
  }

  function closeAll(options = {}) {
    Object.values(registered).forEach((element) => {
      if (!element || element.dataset.open !== "true") return;
      close(element, options);
    });
  }

  function handleDocumentKeydown(event) {
    if (event.key !== "Escape") return;

    const topmost = typeof getTopmostModal === "function" ? getTopmostModal() : null;
    if (!topmost) return;

    event.preventDefault();

    if (typeof onEscape === "function") {
      onEscape(topmost, event);
      return;
    }

    close(topmost);
  }

  function handleDocumentMouseDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const isRegisteredBackdrop = Object.values(registered).includes(target);
    if (!isRegisteredBackdrop) return;
    if (target.dataset.open !== "true") return;

    const topmost = typeof getTopmostModal === "function" ? getTopmostModal() : null;
    if (topmost && topmost !== target) return;

    close(target);
  }

  function bindGlobalHandlers() {
    if (bound) return;
    document.addEventListener("keydown", handleDocumentKeydown);
    document.addEventListener("mousedown", handleDocumentMouseDown);
    bound = true;
  }

  function getRegistry() {
    return { ...registered };
  }

  bindGlobalHandlers();

  return {
    bindGlobalHandlers,
    close,
    closeAll,
    closeTopmost,
    getByKey,
    getElement,
    getKey,
    getRegistry,
    open,
    register,
    toggle,
  };
}