export const NETWORK_STATE_CHANGED_EVENT = "p0-network-state-changed";

let networkServiceInitialized = false;
let networkState = createNetworkSnapshot({
  initialized: false,
  isOnline: readNavigatorOnline(),
  offlineShellReady: false,
  changedAt: new Date().toISOString(),
});

function readNavigatorOnline() {
  try {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  } catch {
    return true;
  }
}

function createNetworkSnapshot({ initialized, isOnline, offlineShellReady, changedAt }) {
  const nextOnline = Boolean(isOnline);
  const nextOfflineShellReady = Boolean(offlineShellReady);

  return {
    initialized: Boolean(initialized),
    isOnline: nextOnline,
    offlineShellReady: nextOfflineShellReady,
    mode: nextOnline ? "online" : "offline",
    canUseRemoteFeatures: nextOnline,
    canUseOfflineSoloModes: true,
    detail: nextOnline
      ? "Connexion active. Tous les modes sont disponibles."
      : nextOfflineShellReady
        ? "Mode hors ligne actif. Training, Survie et Versus IA local restent disponibles."
        : "Mode hors ligne actif. Les modes locaux restent jouables, mais un rechargement complet depend du cache deja installe.",
    changedAt: changedAt ?? new Date().toISOString(),
  };
}

function cloneNetworkSnapshot() {
  return { ...networkState };
}

function emitNetworkChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(NETWORK_STATE_CHANGED_EVENT, {
    detail: cloneNetworkSnapshot(),
  }));
}

function patchNetworkState(patch = {}) {
  const nextIsOnline = patch.isOnline ?? networkState.isOnline;
  const nextOfflineShellReady = patch.offlineShellReady ?? networkState.offlineShellReady;
  const changed = nextIsOnline !== networkState.isOnline
    || nextOfflineShellReady !== networkState.offlineShellReady
    || Boolean(patch.initialized) !== networkState.initialized;

  networkState = createNetworkSnapshot({
    initialized: patch.initialized ?? networkState.initialized,
    isOnline: nextIsOnline,
    offlineShellReady: nextOfflineShellReady,
    changedAt: changed ? new Date().toISOString() : networkState.changedAt,
  });

  if (changed) {
    emitNetworkChanged();
  }
}

function handleNetworkOnline() {
  patchNetworkState({ initialized: true, isOnline: true });
}

function handleNetworkOffline() {
  patchNetworkState({ initialized: true, isOnline: false });
}

export function initNetworkService() {
  if (!networkServiceInitialized && typeof window !== "undefined") {
    window.addEventListener("online", handleNetworkOnline);
    window.addEventListener("offline", handleNetworkOffline);
    networkServiceInitialized = true;
  }

  patchNetworkState({ initialized: true, isOnline: readNavigatorOnline() });
  return cloneNetworkSnapshot();
}

export function getNetworkSnapshot() {
  return cloneNetworkSnapshot();
}

export function subscribeNetworkState(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listener(cloneNetworkSnapshot());

  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event) => {
    listener(event.detail ?? cloneNetworkSnapshot());
  };

  window.addEventListener(NETWORK_STATE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(NETWORK_STATE_CHANGED_EVENT, handler);
}

export function markOfflineShellReady(ready = true) {
  patchNetworkState({ initialized: true, offlineShellReady: ready });
}