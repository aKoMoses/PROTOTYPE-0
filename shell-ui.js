import { initAccountService, subscribeAccountState } from "./src/lib/account/service.js";
import {
  initNetworkService,
  markOfflineShellReady,
  subscribeNetworkState,
} from "./src/lib/network/service.js";
import {
  initMobileLifecycleService,
  markLifecycleUpdateApplying,
  markLifecycleUpdateReady,
  subscribeMobileLifecycleState,
} from "./src/lib/mobile/lifecycle.js";

const shellViews = Array.from(document.querySelectorAll("[data-shell-view]"));
const shellPanels = new Map(
  Array.from(document.querySelectorAll("[data-shell-panel]"))
    .map((panel) => [panel.dataset.shellPanel, panel])
    .filter(([viewKey, panel]) => Boolean(viewKey && panel)),
);
const appShell = document.querySelector(".app-shell");
const mobileViewLabel = document.getElementById("shell-mobile-view-label");
const workspaceRoot = document.querySelector(".app-workspace");
const shellViewTitles = {
  landing: "Home",
  play: "Play",
  game: "Combat Live",
  profile: "Profile",
  collection: "Collection",
  loadouts: "Loadouts",
  dev: "Dev Status",
};
const narrowViewportQuery = window.matchMedia("(max-width: 560px)");
const handsetViewportQuery = window.matchMedia("(max-width: 820px)");
const compactViewportQuery = window.matchMedia("(max-width: 1080px)");
const standaloneViewportQuery = window.matchMedia("(display-mode: standalone)");
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const shellViewportQueries = [
  narrowViewportQuery,
  handsetViewportQuery,
  compactViewportQuery,
  standaloneViewportQuery,
  coarsePointerQuery,
];
const shellViewLoaders = {
  game: () => Promise.all([
    import("./src/main.js"),
    import("./src/gameplay/training-ui.js"),
  ]),
  play: () => import("./src/pages/play/play-page.js"),
  profile: () => import("./src/pages/profile/profile-page.js"),
  collection: () => import("./src/pages/collection/collection-page.js"),
  loadouts: () => import("./src/pages/loadouts/loadouts-page.js"),
  dev: () => import("./src/pages/dev/dev-page.js"),
};
const loadedShellViews = new Set();
const pendingShellViews = new Map();
let lastGameOrientationLock = null;
let shellNetworkSnapshot = initNetworkService();
let shellLifecycleSnapshot = initMobileLifecycleService();
let lifecycleBannerTimer = null;
let lastResumeCount = shellLifecycleSnapshot.resumeCount;
let awaitingServiceWorkerReload = false;

function ensureNetworkBanner() {
  if (!workspaceRoot) {
    return null;
  }

  let banner = document.getElementById("shell-network-banner");
  if (banner) {
    return banner;
  }

  banner = document.createElement("div");
  banner.id = "shell-network-banner";
  banner.className = "shell-network-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = `
    <strong class="shell-network-banner__title"></strong>
    <span class="shell-network-banner__copy"></span>
  `;
  workspaceRoot.appendChild(banner);
  return banner;
}

function syncShellNetworkState(snapshot = shellNetworkSnapshot) {
  shellNetworkSnapshot = snapshot;

  if (appShell) {
    appShell.dataset.networkStatus = snapshot.mode;
    appShell.dataset.offlineShellReady = snapshot.offlineShellReady ? "true" : "false";
  }

  const banner = ensureNetworkBanner();
  if (!banner) {
    return;
  }

  if (snapshot.isOnline) {
    banner.hidden = true;
    return;
  }

  const title = banner.querySelector(".shell-network-banner__title");
  const copy = banner.querySelector(".shell-network-banner__copy");
  if (title) {
    title.textContent = "Mode hors ligne";
  }
  if (copy) {
    copy.textContent = snapshot.offlineShellReady
      ? "Training, Survie et Versus IA local restent jouables. Les modes reseau sont temporairement bloques."
      : "Les modes locaux restent jouables, mais un rechargement complet depend du cache deja installe sur cet appareil.";
  }
  banner.hidden = false;
}

function ensureLifecycleBanner() {
  if (!workspaceRoot) {
    return null;
  }

  let banner = document.getElementById("shell-lifecycle-banner");
  if (banner) {
    return banner;
  }

  banner = document.createElement("div");
  banner.id = "shell-lifecycle-banner";
  banner.className = "shell-lifecycle-banner";
  banner.hidden = true;
  banner.innerHTML = `
    <strong class="shell-lifecycle-banner__title"></strong>
    <span class="shell-lifecycle-banner__copy"></span>
    <button class="shell-lifecycle-banner__action" type="button" hidden></button>
  `;
  workspaceRoot.appendChild(banner);
  return banner;
}

function hideLifecycleBanner() {
  const banner = ensureLifecycleBanner();
  if (!banner) {
    return;
  }

  if (lifecycleBannerTimer) {
    window.clearTimeout(lifecycleBannerTimer);
    lifecycleBannerTimer = null;
  }

  banner.hidden = true;
  banner.classList.remove("is-persistent");
}

function showLifecycleBanner({ title, copy, actionLabel = "", onAction = null, persistent = false }) {
  const banner = ensureLifecycleBanner();
  if (!banner) {
    return;
  }

  if (lifecycleBannerTimer) {
    window.clearTimeout(lifecycleBannerTimer);
    lifecycleBannerTimer = null;
  }

  banner.querySelector(".shell-lifecycle-banner__title").textContent = title;
  banner.querySelector(".shell-lifecycle-banner__copy").textContent = copy;

  const actionButton = banner.querySelector(".shell-lifecycle-banner__action");
  if (actionButton) {
    if (actionLabel && typeof onAction === "function") {
      actionButton.hidden = false;
      actionButton.textContent = actionLabel;
      actionButton.onclick = onAction;
    } else {
      actionButton.hidden = true;
      actionButton.textContent = "";
      actionButton.onclick = null;
    }
  }

  banner.hidden = false;
  banner.classList.toggle("is-persistent", persistent);

  if (!persistent) {
    lifecycleBannerTimer = window.setTimeout(() => {
      hideLifecycleBanner();
    }, 4200);
  }
}

function applyPendingAppUpdate() {
  if (!_pwaUpdateSW) {
    return;
  }

  awaitingServiceWorkerReload = true;
  markLifecycleUpdateApplying(true);
  _pwaUpdateSW(true);
}

function syncShellLifecycleState(snapshot = shellLifecycleSnapshot) {
  shellLifecycleSnapshot = snapshot;

  if (appShell) {
    appShell.dataset.lifecyclePhase = snapshot.phase;
    appShell.dataset.lifecycleUpdateReady = snapshot.updateReady ? "true" : "false";
  }

  if (snapshot.updateReady) {
    showLifecycleBanner({
      title: "Mise a jour prete",
      copy: "Une nouvelle build est en cache. Recharge pour reappliquer les bundles et les assets dans le meme etat.",
      actionLabel: "Recharger",
      onAction: applyPendingAppUpdate,
      persistent: true,
    });
    return;
  }

  if (snapshot.updateApplying) {
    showLifecycleBanner({
      title: "Mise a jour en cours",
      copy: "La nouvelle version prend la main. Rechargement de l'application en cours.",
      persistent: true,
    });
    return;
  }

  if (snapshot.phase === "active" && snapshot.resumeCount > lastResumeCount) {
    lastResumeCount = snapshot.resumeCount;
    showLifecycleBanner({
      title: "Session reprise",
      copy: snapshot.detail,
    });
    return;
  }

  hideLifecycleBanner();
}

function hasShellView(viewKey) {
  return typeof viewKey === "string" && shellPanels.has(viewKey);
}

// Always start on the home page.
let activeView = "landing";

window.__P0_SHELL = {
  ensureViewModule: ensureShellViewModule,
  setView: setShellView,
  getActiveView: () => activeView,
};

syncShellViewportState();
bindShellViewportState();
syncShellNetworkState(shellNetworkSnapshot);
syncShellLifecycleState(shellLifecycleSnapshot);
subscribeNetworkState(syncShellNetworkState);
subscribeMobileLifecycleState(syncShellLifecycleState);

for (const control of shellViews) {
  control.addEventListener("click", () => {
    const nextView = control.dataset.shellView;
    if (nextView) {
      void setShellView(nextView);
    }
  });
}

void setShellView(activeView);

// After auth dismissal, navigate to landing
window.addEventListener("auth-complete", () => {
  void setShellView("landing");
});

function ensureShellViewModule(viewKey) {
  const loader = shellViewLoaders[viewKey];
  if (!loader || loadedShellViews.has(viewKey)) {
    return Promise.resolve();
  }

  if (pendingShellViews.has(viewKey)) {
    return pendingShellViews.get(viewKey);
  }

  appShell?.classList.add("is-loading-view");

  const pendingLoad = Promise.resolve(loader())
    .then(() => {
      loadedShellViews.add(viewKey);
    })
    .finally(() => {
      pendingShellViews.delete(viewKey);
      if (pendingShellViews.size === 0) {
        appShell?.classList.remove("is-loading-view");
      }
    });

  pendingShellViews.set(viewKey, pendingLoad);
  return pendingLoad;
}

function getShellViewportLayout() {
  if (narrowViewportQuery.matches) {
    return "narrow";
  }

  if (handsetViewportQuery.matches) {
    return "handset";
  }

  if (compactViewportQuery.matches) {
    return "compact";
  }

  return "desktop";
}

function syncShellViewportState() {
  if (!appShell) {
    return;
  }

  appShell.dataset.shellLayout = getShellViewportLayout();
  appShell.dataset.shellStandalone = standaloneViewportQuery.matches ? "true" : "false";
  syncGameplayOrientationState();
}

function getViewportOrientation() {
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

function shouldLockGameplayToLandscape() {
  const layout = getShellViewportLayout();
  const isMobileLayout = layout === "compact" || layout === "handset" || layout === "narrow";
  return activeView === "game" && isMobileLayout && coarsePointerQuery.matches && getViewportOrientation() === "portrait";
}

function syncGameplayOrientationState() {
  if (!appShell) {
    return;
  }

  const orientation = getViewportOrientation();
  const locked = shouldLockGameplayToLandscape();
  appShell.dataset.gameOrientation = orientation;
  appShell.dataset.gameOrientationLock = locked ? "true" : "false";

  if (lastGameOrientationLock === locked) {
    return;
  }

  lastGameOrientationLock = locked;
  window.dispatchEvent(new CustomEvent("p0-game-orientation-lock-changed", {
    detail: {
      locked,
      orientation,
      activeView,
      layout: appShell.dataset.shellLayout ?? getShellViewportLayout(),
    },
  }));
}

function bindShellViewportState() {
  for (const query of shellViewportQueries) {
    query.addEventListener("change", syncShellViewportState);
  }

  window.addEventListener("resize", syncShellViewportState, { passive: true });
  window.addEventListener("orientationchange", syncShellViewportState, { passive: true });
}

async function setShellView(nextView) {
  if (!hasShellView(nextView)) {
    return;
  }

  const prevView = activeView;

  // Stop the game session when navigating away from the game view
  if (prevView === "game" && nextView !== "game") {
    window.__P0_GAME?.stopGameSession?.();
  }

  // Deactivate the play page when leaving it
  if (prevView === "play" && nextView !== "play") {
    try {
      const mod = await import("./src/pages/play/play-page.js");
      mod.deactivatePage?.();
    } catch { /* ignore */ }
  }

  try {
    await ensureShellViewModule(nextView);

    // Initialization logic for specific modules
    if (nextView === "loadouts") {
      const mod = await import("./src/pages/loadouts/loadouts-page.js");
      if (mod.init) mod.init();
    } else if (nextView === "play") {
      const mod = await import("./src/pages/play/play-page.js");
      mod.activatePage?.();
    } else if (nextView === "game") {
      // Only reset match state and open prematch when *entering* game from another view.
      // Re-calling setView("game") while already in game (e.g. from a loadout-equip
      // side-effect) must not stomp whatever prematch step is already active.
      if (prevView !== "game") {
        const { renderPrematch, openPrematch } = await import("./src/build/ui.js");
        const { matchState } = await import("./src/state.js");
        matchState.round = 1;
        matchState.playerWins = 0;
        matchState.botWins = 0;
        matchState.isOver = false;
        openPrematch("map");
        renderPrematch();
      }
      window.__P0_GAME?.restartGameLoop?.();
    }
  } catch (err) {
    console.error(`[Shell] Failed to initialize view "${nextView}":`, err);
  }

  activeView = nextView;
  if (appShell) {
    appShell.dataset.activeView = nextView;
  }
  if (mobileViewLabel) {
    mobileViewLabel.textContent = shellViewTitles[nextView] ?? nextView;
  }
  syncGameplayOrientationState();

  shellPanels.forEach((panel, viewKey) => {
    panel.classList.toggle("is-active", viewKey === nextView);
  });

  shellViews.forEach((control) => {
    const isActive = control.dataset.shellView === nextView;
    if (control.classList.contains("shell-nav__button")) {
      control.classList.toggle("shell-nav__button--active", isActive);
    }
    if (isActive) {
      control.setAttribute("aria-current", "page");
    } else {
      control.removeAttribute("aria-current");
    }
  });

  if (shellPanels.get(nextView)?.dataset.shellResize === "true") {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.dispatchEvent(new Event("resize"));
  }
}

/* ════════════════════════════════════════════════════════════════
   PORTRAIT — Render the player's chosen avatar in the home header
   ════════════════════════════════════════════════════════════════ */
function initHomePortrait() {
  const frame = document.getElementById("home-portrait-avatar");
  const nameEl = document.getElementById("home-portrait-name");
  if (!frame) return;

  const avatarMap = {
    vanguard: { label: "VG", accent: "#d4a843" },
    stalker: { label: "SK", accent: "#ff6f61" },
    oracle: { label: "OR", accent: "#69c8ff" },
  };

  const renderPortrait = (snapshot) => {
    const profile = snapshot.profile ?? null;
    const avatar = avatarMap[profile?.avatar_key] ?? avatarMap.vanguard;
    frame.innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 30% 30%, ${avatar.accent}55, rgba(7,12,20,0.95));color:#f7f2df;font:700 0.82rem/1 'Share Tech Mono', monospace;letter-spacing:0.14em;">${avatar.label}</div>`;
    if (nameEl) {
      nameEl.textContent = profile?.display_name ?? "Compte requis";
    }
  };

  subscribeAccountState(renderPortrait);
  void initAccountService();
}

initHomePortrait();

/* ════════════════════════════════════════════════════════════════
   PARTICLE SYSTEM — Gold / cyan floating particles
   ════════════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById("home-particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let w, h;
  let particles = [];
  const PARTICLE_COUNT = Math.min(32, Math.max(18, Math.round(window.innerWidth / 90)));

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createParticle() {
    const isGold = Math.random() > 0.4;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.15 - Math.random() * 0.35,
      r: 1 + Math.random() * 2.5,
      alpha: 0.15 + Math.random() * 0.4,
      color: isGold
        ? `rgba(200, 155, 60, VAR)`
        : `rgba(11, 196, 227, VAR)`,
      life: 0,
      maxLife: 300 + Math.random() * 400,
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Fade in/out
      const prog = p.life / p.maxLife;
      let fade = p.alpha;
      if (prog < 0.1) fade *= prog / 0.1;
      else if (prog > 0.8) fade *= (1 - prog) / 0.2;

      if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > w + 10) {
        particles[i] = createParticle();
        particles[i].y = h + 10;
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace("VAR", fade.toFixed(3));
      ctx.fill();

      // Glow
      if (p.r > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace("VAR", (fade * 0.12).toFixed(3));
        ctx.fill();
      }
    }

    particleRAF = requestAnimationFrame(draw);
  }

  let particleRAF;
  init();
  draw();

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && particleRAF) {
      cancelAnimationFrame(particleRAF);
      particleRAF = null;
      return;
    }

    const landingPanel = document.getElementById("shell-view-landing");
    if (!document.hidden && landingPanel?.classList.contains("is-active") && !particleRAF) {
      draw();
    }
  });

  // Pause when not on landing
  const observer = new MutationObserver(() => {
    const landing = document.getElementById("shell-view-landing");
    if (landing?.classList.contains("is-active")) {
      if (!particleRAF) draw();
    } else {
      if (particleRAF) {
        cancelAnimationFrame(particleRAF);
        particleRAF = null;
      }
    }
  });

  const landing = document.getElementById("shell-view-landing");
  if (landing) {
    observer.observe(landing, { attributes: true, attributeFilter: ["class"] });
  }
}

initParticles();

/* ════════════════════════════════════════════════════════════════
  PWA — Service Worker registration and auto-update flow
   ════════════════════════════════════════════════════════════════
   vite-plugin-pwa provides the virtual module at build time.
   In dev mode (devOptions.enabled: true) it is served by Vite.
  Updates are applied automatically and reload once the new SW controls
  the page so installed PWAs do not get stuck on stale bundles. */
import { registerSW } from "virtual:pwa-register";

let _pwaUpdateSW = null;

window.addEventListener("controllerchange", () => {
  if (!awaitingServiceWorkerReload) {
    return;
  }

  window.location.reload();
});

_pwaUpdateSW = registerSW({
  immediate: false,
  onNeedRefresh() {
    applyPendingAppUpdate();
  },
  onOfflineReady() {
    /* Game is cached for offline play in supported modes. */
    markOfflineShellReady(true);
    console.info("[PWA] Application ready for offline use.");
  },
  onRegisterError(error) {
    console.warn("[PWA] Service worker registration failed:", error);
  },
});
