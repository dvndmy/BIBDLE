export function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = !!hidden;
}

export function setContentVisibility(element, shouldShow, renderWhenHidden = false) {
  if (!element) return;
  setHidden(element, !shouldShow);

  if (!shouldShow && !renderWhenHidden) {
    element.innerHTML = "";
  }
}

export function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

export function hasTextContent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

export function hasRenderableMarkup(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderInto(container, markup, options = {}) {
  if (!container) return;

  const { visible = true, preserveWhenHidden = false } = options;

  setContentVisibility(container, visible, preserveWhenHidden);

  if (!visible && !preserveWhenHidden) {
    return;
  }

  container.innerHTML = markup;
}

export function renderWhen(container, condition, markup = "", options = {}) {
  renderInto(container, markup, {
    visible: !!condition,
    preserveWhenHidden: !!options.preserveWhenHidden,
  });

  return !!condition;
}

export function setVisibility(element, visible) {
  setHidden(element, !visible);
}

export function showWhen(element, condition) {
  setVisibility(element, !!condition);
  return !!condition;
}

export function showWhenHasItems(element, items) {
  return showWhen(element, isNonEmptyArray(items));
}

export function showWhenHasText(element, text) {
  return showWhen(element, hasTextContent(text));
}

export function renderBusyInto(container, markup, label = "Loading") {
  if (!container) return;
  container.setAttribute("aria-busy", "true");
  container.setAttribute("data-loading-label", label);
  container.innerHTML = markup;
}

export function clearBusyState(container) {
  if (!container) return;
  container.setAttribute("aria-busy", "false");
  container.removeAttribute("data-loading-label");
}

export function renderEmptyState({
  title = "",
  body = "",
  actions = "",
  compact = false,
  inline = false,
  showMarker = true,
  tone = "empty",
}) {
  const classes = [
    "empty-state",
    compact ? "empty-state--compact" : "empty-state--standard",
    inline ? "empty-state--inline" : "",
    tone ? `empty-state--${tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const normalizedActions = Array.isArray(actions) ? actions.filter(Boolean).join("") : actions;

  return `
    <div class="${classes}" ${tone === "error" ? 'role="alert"' : ""}>
      ${showMarker ? '<div class="empty-state-marker" aria-hidden="true"></div>' : ""}
      <div class="empty-state-content">
        ${title ? `<p class="empty-state-title">${title}</p>` : ""}
        ${body ? `<p class="empty-state-body">${body}</p>` : ""}
        ${normalizedActions ? `<div class="empty-state-actions">${normalizedActions}</div>` : ""}
      </div>
    </div>
  `;
}

export function renderRetryButtonMarkup(label = "Try again", action) {
  if (!action) return "";
  return `<button type="button" class="pill-btn" data-empty-action="${action}">${label}</button>`;
}

export function renderLoadingBlock({
  label = "Loading",
  variant = "list",
  rows = 3,
}) {
  const items = Array.from({ length: rows });

  const renderedItems = items
    .map(() => {
      if (variant === "kpis") {
        return `
          <div class="loading-card" aria-hidden="true">
            <div class="loading-card-lines">
              <div class="loading-line loading-line--short"></div>
              <div class="loading-line loading-line--mid"></div>
            </div>
          </div>
        `;
      }

      if (variant === "rank") {
        return `
          <div class="loading-card" aria-hidden="true">
            <div class="loading-card-lines">
              <div class="loading-line loading-line--rank"></div>
              <div class="loading-line loading-line--name"></div>
              <div class="loading-line loading-line--meta"></div>
            </div>
          </div>
        `;
      }

      return `
        <div class="loading-row" aria-hidden="true">
          <div class="loading-row-lines">
            <div class="loading-line loading-line--rank"></div>
            <div class="loading-line loading-line--name"></div>
            <div class="loading-line loading-line--meta"></div>
          </div>
        </div>
      `;
    })
    .join("");

  const gridClass =
    variant === "kpis"
      ? "loading-block-grid loading-block-grid--kpis"
      : "loading-block-grid loading-block-grid--list";

  return `
    <div class="loading-block" role="status" aria-live="polite" aria-label="${escapeHtml(label)}">
      <div class="loading-block-status">${escapeHtml(label)}</div>
      <div class="${gridClass}">
        ${renderedItems}
      </div>
    </div>
  `;
}

export function renderSurfaceEmptyState(
  container,
  options,
  bindActions = null,
) {
  if (!container) return false;

  clearBusyState(container);

  const {
    title = "",
    body = "",
    actions = "",
    compact = false,
    inline = false,
    showMarker = true,
    tone = "empty",
  } = options ?? {};

  renderInto(
    container,
    renderEmptyState({
      title,
      body,
      actions,
      compact,
      inline,
      showMarker,
      tone,
    }),
  );

  if (typeof bindActions === "function") {
    bindActions(container);
  }

  return true;
}

export function renderSurfaceLoadingState(container, options = {}) {
  if (!container) return false;

  const {
    label = "Loading",
    variant = "list",
    rows = 3,
  } = options;

  renderBusyInto(
    container,
    renderLoadingBlock({
      label,
      variant,
      rows,
    }),
    label,
  );

  return true;
}