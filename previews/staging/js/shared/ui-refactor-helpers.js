export function createModalHelpers({ elements, modalService, fallbackOpen, fallbackClose }) {
  function openModal(key, options = {}) {
    if (modalService?.open) {
      return modalService.open(key, options);
    }

    const element = elements?.[`${key}Modal`] ?? elements?.[key] ?? null;
    if (!element) return null;
    fallbackOpen?.(element, options);
    return element;
  }

  function closeModal(key, options = {}) {
    if (modalService?.close) {
      return modalService.close(key, options);
    }

    const element = elements?.[`${key}Modal`] ?? elements?.[key] ?? null;
    if (!element) return null;
    fallbackClose?.(element, options);
    return element;
  }

  function createModalPair(key, beforeOpen = null) {
    return {
      open(trigger = document.activeElement) {
        beforeOpen?.();
        return openModal(key, { trigger });
      },
      close(options = {}) {
        return closeModal(key, options);
      }
    };
  }

  return {
    openModal,
    closeModal,
    createModalPair
  };
}

export function createPreferenceUpdater({
  state,
  savePreferences,
  renderPipeline,
  applyAccessibilityPreferences,
  afterChangeByKey = {}
}) {
  return function updatePreference(key, value, reason) {
    if (!state?.preferences) return;

    state.preferences[key] = value;

    if (
      key === "reducedAnimation" ||
      key === "highContrast" ||
      key === "largeText"
    ) {
      applyAccessibilityPreferences?.();
    }

    const afterChange = afterChangeByKey?.[key];
    if (typeof afterChange === "function") {
      afterChange(value);
    }

    savePreferences?.();
    renderPipeline?.renderPreferencesChanged?.({ reason });
  };
}

export function createToggleHandler(updatePreference, key, reason, getValue = null) {
  return function handleToggle(event) {
    const value = typeof getValue === "function"
      ? getValue(event)
      : !!event?.target?.checked;

    updatePreference(key, value, reason);
  };
}

export function bindActionMap(root, actionMap, options = {}) {
  if (!root || !actionMap) return;

  const eventName = options.eventName ?? "click";

  root.addEventListener(eventName, (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    for (const descriptor of actionMap) {
      const match = target.closest(descriptor.selector);
      if (!match) continue;

      if (descriptor.preventDefault) {
        event.preventDefault();
      }

      descriptor.handler?.(event, match);
      return;
    }
  });
}

export function buildPlacementViewModel(rankEntry) {
  const rank = Number.isInteger(rankEntry?.rank) && rankEntry.rank > 0
    ? rankEntry.rank
    : Number.isInteger(rankEntry?.position) && rankEntry.position > 0
      ? rankEntry.position
      : Number.isInteger(rankEntry?.place) && rankEntry.place > 0
        ? rankEntry.place
        : null;

  const solved = rankEntry?.result === "won" || rankEntry?.result === "solved";

  return {
    rank,
    solved,
    placementLabel: rank ? `#${rank}` : solved ? "Solved" : "Unranked",
    placementMeta: rank
      ? `You are currently #${rank} on today's leaderboard.`
      : solved
        ? "Your result is recorded, but a numeric placement is not available yet."
        : "Your result is recorded, but a ranked position is not available yet."
  };
}

export function renderPlacementCard(rankEntry, formatTime) {
  const view = buildPlacementViewModel(rankEntry);

  return `
    <div class="leaderboard-user-rank-card">
      <div>
        <div class="label">Your place</div>
        <div class="value">${view.placementLabel}</div>
      </div>
      <div>
        <div class="label">Result</div>
        <div class="value">${view.solved ? "Solved" : "Played"}</div>
      </div>
      <div>
        <div class="label">Guesses</div>
        <div class="value">${rankEntry?.guesses ?? "—"}</div>
      </div>
      <div>
        <div class="label">Time</div>
        <div class="value">${formatTime?.(rankEntry?.completedAt) ?? "—"}</div>
      </div>
      <div class="leaderboard-user-rank-note">${view.placementMeta}</div>
    </div>
  `;
}