const _reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

let _announcer = null;
function getAnnouncer() {
  if (!_announcer) {
    _announcer = document.createElement("div");
    _announcer.id = "prematch-announcer";
    _announcer.setAttribute("role", "status");
    _announcer.setAttribute("aria-live", "polite");
    _announcer.setAttribute("aria-atomic", "true");
    _announcer.className = "sr-only";
    document.body.appendChild(_announcer);
  }
  return _announcer;
}

/** Event bus for phase transitions — audio/FX systems can subscribe */
const _phaseListeners = [];
export function onPhaseTransition(fn) {
  _phaseListeners.push(fn);
  return () => {
    const i = _phaseListeners.indexOf(fn);
    if (i >= 0) _phaseListeners.splice(i, 1);
  };
}
function _emitPhase(phaseKey, stepKey) {
  for (const fn of _phaseListeners) fn(phaseKey, stepKey);
}

const SCREEN_MAP = {
  mode: "modeScreen",
  queue: "queueScreen",
  "game-found": "gameFoundScreen",
  map: "mapScreen",
  build: "buildScreen",
  lobby: "lobbyScreen",
  loading: "loadingScreen",
  "room-browser": "roomBrowserScreen",
  "custom-lobby": "customLobbyScreen",
};

export class PrematchStepBase {
  constructor({ dom, setPrematchStep, stepKey, phaseKey }) {
    this.dom = dom;
    this.setPrematchStep = setPrematchStep;
    this.stepKey = stepKey;
    this.phaseKey = phaseKey;
    this.mounted = false;
  }

  get reduceMotion() {
    return _reduceMotion;
  }

  /** Get the screen DOM element for this step */
  getScreen() {
    return this.dom[SCREEN_MAP[this.stepKey]] ?? null;
  }

  mount() {
    this.setPrematchStep(this.stepKey);
    if (this.dom.prematchShell) {
      this.dom.prematchShell.dataset.prematchPhase = this.phaseKey;
    }
    this.mounted = true;
    this._announcePhase();
    this._triggerEnter();
    _emitPhase(this.phaseKey, this.stepKey);
  }

  unmount() {
    this.mounted = false;
  }

  update() {
    return null;
  }

  /* ── Helpers for subclasses ──────────────────────── */

  /** Announce phase to screen readers */
  _announcePhase() {
    getAnnouncer().textContent = `Phase: ${this.phaseKey}`;
  }

  /** Trigger enter animation on the screen element */
  _triggerEnter() {
    if (this.reduceMotion) return;
    const el = this.getScreen();
    if (!el) return;
    el.classList.remove("phase-enter");
    void el.offsetWidth;
    el.classList.add("phase-enter");
  }

  /** Add stagger delay to children matching selector */
  _staggerChildren(selector, baseDelayMs = 80) {
    if (this.reduceMotion) return;
    const screen = this.getScreen();
    if (!screen) return;
    const items = screen.querySelectorAll(selector);
    items.forEach((el, i) => {
      el.style.animationDelay = `${i * baseDelayMs}ms`;
    });
  }

  /** Toggle a CSS class on the timer element when time runs low */
  _updateTimerDanger(timerEl, remaining, threshold = 5) {
    if (!timerEl) return;
    timerEl.classList.toggle("danger", remaining <= threshold && remaining > 0);
  }
}
