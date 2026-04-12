import { initNetworkService, subscribeNetworkState } from "../network/service.js";

export const MOBILE_LIFECYCLE_CHANGED_EVENT = "p0-mobile-lifecycle-changed";

let lifecycleServiceInitialized = false;
let lifecycleState = createLifecycleSnapshot({
  initialized: false,
  phase: readPhase(),
  visibilityState: readVisibilityState(),
  isOnline: initNetworkService().isOnline,
  updateReady: false,
  updateApplying: false,
  lastEvent: "boot",
  changedAt: new Date().toISOString(),
  lastBackgroundAt: null,
  lastResumeAt: null,
  resumeCount: 0,
  backgroundDurationMs: 0,
});

function readVisibilityState() {
  if (typeof document === "undefined") {
    return "visible";
  }

  return document.visibilityState === "hidden" ? "hidden" : "visible";
}

function readPhase() {
  return readVisibilityState() === "hidden" ? "background" : "active";
}

function createLifecycleSnapshot({
  initialized,
  phase,
  visibilityState,
  isOnline,
  updateReady,
  updateApplying,
  lastEvent,
  changedAt,
  lastBackgroundAt,
  lastResumeAt,
  resumeCount,
  backgroundDurationMs,
}) {
  const safePhase = phase === "background" ? "background" : "active";
  const safeVisibility = visibilityState === "hidden" ? "hidden" : "visible";
  const safeIsOnline = Boolean(isOnline);
  const safeUpdateReady = Boolean(updateReady);
  const safeUpdateApplying = Boolean(updateApplying);

  return {
    initialized: Boolean(initialized),
    phase: safePhase,
    visibilityState: safeVisibility,
    isOnline: safeIsOnline,
    updateReady: safeUpdateReady,
    updateApplying: safeUpdateApplying,
    lastEvent: lastEvent ?? "unknown",
    changedAt: changedAt ?? new Date().toISOString(),
    lastBackgroundAt: lastBackgroundAt ?? null,
    lastResumeAt: lastResumeAt ?? null,
    resumeCount: Number.isFinite(resumeCount) ? Math.max(0, resumeCount) : 0,
    backgroundDurationMs: Number.isFinite(backgroundDurationMs) ? Math.max(0, backgroundDurationMs) : 0,
    detail: createLifecycleDetail({
      phase: safePhase,
      isOnline: safeIsOnline,
      updateReady: safeUpdateReady,
      updateApplying: safeUpdateApplying,
      lastEvent,
      backgroundDurationMs,
    }),
  };
}

function createLifecycleDetail({ phase, isOnline, updateReady, updateApplying, lastEvent, backgroundDurationMs }) {
  if (updateApplying) {
    return "Mise a jour en cours d'application. Rechargement imminent.";
  }

  if (updateReady) {
    return "Nouvelle version prete. Recharge requise pour aligner cache et bundles.";
  }

  if (phase === "background") {
    return isOnline
      ? "Application en arriere-plan. Session locale sauvegardee."
      : "Application en arriere-plan hors ligne. Session locale sauvegardee.";
  }

  if (typeof lastEvent === "string" && (lastEvent.startsWith("pageshow") || lastEvent.startsWith("visibility:visible") || lastEvent === "focus")) {
    const seconds = Math.max(1, Math.round((backgroundDurationMs ?? 0) / 1000));
    return isOnline
      ? `Application reprise apres ${seconds}s. Reseau et runtime resynchronises.`
      : `Application reprise apres ${seconds}s en mode hors ligne.`;
  }

  return isOnline
    ? "Application active. Tous les services sont joignables."
    : "Application active hors ligne. Les modes reseau restent suspendus.";
}

function cloneLifecycleSnapshot() {
  return { ...lifecycleState };
}

function emitLifecycleChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(MOBILE_LIFECYCLE_CHANGED_EVENT, {
    detail: cloneLifecycleSnapshot(),
  }));
}

function patchLifecycleState(patch = {}) {
  const previousState = lifecycleState;
  const nextPhase = patch.phase ?? previousState.phase;
  const nextVisibilityState = patch.visibilityState ?? previousState.visibilityState;
  const nextIsOnline = patch.isOnline ?? previousState.isOnline;
  const nextUpdateReady = patch.updateReady ?? previousState.updateReady;
  const nextUpdateApplying = patch.updateApplying ?? previousState.updateApplying;
  const nextInitialized = patch.initialized ?? previousState.initialized;

  let nextLastBackgroundAt = patch.lastBackgroundAt ?? previousState.lastBackgroundAt;
  let nextLastResumeAt = patch.lastResumeAt ?? previousState.lastResumeAt;
  let nextResumeCount = patch.resumeCount ?? previousState.resumeCount;
  let nextBackgroundDurationMs = patch.backgroundDurationMs ?? previousState.backgroundDurationMs;

  if (previousState.phase !== "background" && nextPhase === "background") {
    nextLastBackgroundAt = new Date().toISOString();
    nextBackgroundDurationMs = 0;
  } else if (previousState.phase === "background" && nextPhase === "active") {
    nextLastResumeAt = new Date().toISOString();
    nextResumeCount += 1;
    if (nextLastBackgroundAt) {
      nextBackgroundDurationMs = Math.max(0, Date.now() - new Date(nextLastBackgroundAt).getTime());
    }
  }

  const changed = previousState.initialized !== Boolean(nextInitialized)
    || previousState.phase !== nextPhase
    || previousState.visibilityState !== nextVisibilityState
    || previousState.isOnline !== Boolean(nextIsOnline)
    || previousState.updateReady !== Boolean(nextUpdateReady)
    || previousState.updateApplying !== Boolean(nextUpdateApplying)
    || previousState.lastEvent !== (patch.lastEvent ?? previousState.lastEvent)
    || previousState.resumeCount !== nextResumeCount;

  lifecycleState = createLifecycleSnapshot({
    initialized: nextInitialized,
    phase: nextPhase,
    visibilityState: nextVisibilityState,
    isOnline: nextIsOnline,
    updateReady: nextUpdateReady,
    updateApplying: nextUpdateApplying,
    lastEvent: patch.lastEvent ?? previousState.lastEvent,
    changedAt: changed ? new Date().toISOString() : previousState.changedAt,
    lastBackgroundAt: nextLastBackgroundAt,
    lastResumeAt: nextLastResumeAt,
    resumeCount: nextResumeCount,
    backgroundDurationMs: nextBackgroundDurationMs,
  });

  if (changed) {
    emitLifecycleChanged();
  }
}

function syncPhaseFromDocument(lastEvent) {
  patchLifecycleState({
    initialized: true,
    phase: readPhase(),
    visibilityState: readVisibilityState(),
    lastEvent,
  });
}

function handleVisibilityChange() {
  syncPhaseFromDocument(`visibility:${readVisibilityState()}`);
}

function handlePageHide() {
  patchLifecycleState({
    initialized: true,
    phase: "background",
    visibilityState: "hidden",
    lastEvent: "pagehide",
  });
}

function handlePageShow(event) {
  syncPhaseFromDocument(event?.persisted ? "pageshow:persisted" : "pageshow");
}

function handleFocus() {
  syncPhaseFromDocument("focus");
}

function handleFreeze() {
  patchLifecycleState({
    initialized: true,
    phase: "background",
    visibilityState: "hidden",
    lastEvent: "freeze",
  });
}

export function initMobileLifecycleService() {
  if (!lifecycleServiceInitialized && typeof window !== "undefined") {
    window.addEventListener("pageshow", handlePageShow, { passive: true });
    window.addEventListener("pagehide", handlePageHide, { passive: true });
    window.addEventListener("focus", handleFocus, { passive: true });
    window.addEventListener("freeze", handleFreeze, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });
    subscribeNetworkState((snapshot) => {
      patchLifecycleState({
        initialized: true,
        isOnline: snapshot.isOnline,
        lastEvent: snapshot.isOnline ? "network:online" : "network:offline",
      });
    });
    lifecycleServiceInitialized = true;
  }

  patchLifecycleState({
    initialized: true,
    phase: readPhase(),
    visibilityState: readVisibilityState(),
    isOnline: initNetworkService().isOnline,
    lastEvent: "init",
  });

  return cloneLifecycleSnapshot();
}

export function getMobileLifecycleSnapshot() {
  return cloneLifecycleSnapshot();
}

export function subscribeMobileLifecycleState(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listener(cloneLifecycleSnapshot());

  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event) => {
    listener(event.detail ?? cloneLifecycleSnapshot());
  };

  window.addEventListener(MOBILE_LIFECYCLE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(MOBILE_LIFECYCLE_CHANGED_EVENT, handler);
}

export function markLifecycleUpdateReady(ready = true) {
  patchLifecycleState({
    initialized: true,
    updateReady: ready,
    updateApplying: false,
    lastEvent: ready ? "update:ready" : "update:cleared",
  });
}

export function markLifecycleUpdateApplying(applying = true) {
  patchLifecycleState({
    initialized: true,
    updateApplying: applying,
    lastEvent: applying ? "update:applying" : "update:idle",
  });
}