import { readSessionSnapshot, SHELL_VIEW_STORAGE_KEY } from "./src/session.js";

const shellViews = Array.from(document.querySelectorAll("[data-shell-view]"));
const shellPanels = new Map(
  Array.from(document.querySelectorAll("[data-shell-panel]"))
    .map((panel) => [panel.dataset.shellPanel, panel])
    .filter(([viewKey, panel]) => Boolean(viewKey && panel)),
);
const defaultShellView = document.querySelector("[data-shell-default-view]")?.dataset.shellDefaultView
  ?? shellPanels.keys().next().value
  ?? "game";

const appShell = document.querySelector(".app-shell");
const shellViewLoaders = {
  game: () => Promise.all([
    import("./src/main.js"),
    import("./src/gameplay/training-ui.js"),
  ]),
  profile: () => import("./profile.js"),
  collection: () => import("./collection.js"),
  loadouts: () => import("./loadout-page.js"),
  dev: () => import("./dev-status.js"),
};
const loadedShellViews = new Set();
const pendingShellViews = new Map();

function hasShellView(viewKey) {
  return typeof viewKey === "string" && shellPanels.has(viewKey);
}

function readStoredShellView() {
  const activeSession = readSessionSnapshot();
  if (activeSession?.resumeGameplay && hasShellView("game")) {
    return "game";
  }

  try {
    const stored = window.sessionStorage.getItem(SHELL_VIEW_STORAGE_KEY);
    return hasShellView(stored) ? stored : defaultShellView;
  } catch {
    return defaultShellView;
  }
}

function persistShellView(nextView) {
  try {
    window.sessionStorage.setItem(SHELL_VIEW_STORAGE_KEY, nextView);
  } catch {
    // Ignore storage failures and keep the shell usable.
  }
}

// Always start on the home page unless a game session needs resuming
const activeSession = readSessionSnapshot();
let activeView = (activeSession?.resumeGameplay && hasShellView("game")) ? "game" : "landing";

window.__P0_SHELL = {
  ensureViewModule: ensureShellViewModule,
  setView: setShellView,
  getActiveView: () => activeView,
};

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

async function setShellView(nextView) {
  if (!hasShellView(nextView)) {
    return;
  }

  // Stop the game session when navigating away from the game view
  if (activeView === "game" && nextView !== "game") {
    window.__P0_GAME?.stopGameSession?.();
  }

  try {
    await ensureShellViewModule(nextView);
    
    // Initialization logic for specific modules
    if (nextView === "loadouts") {
      const mod = await import("./loadout-page.js");
      if (mod.init) mod.init();
    } else if (nextView === "play" || nextView === "game") {
      const { renderPrematch } = await import("./src/build/ui.js");
      renderPrematch();
    }
  } catch (err) {
    console.error(`[Shell] Failed to initialize view "${nextView}":`, err);
  }

  activeView = nextView;
  persistShellView(nextView);
  if (appShell) {
    appShell.dataset.activeView = nextView;
  }

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

  // Grab avatar index from profile data if available
  let avatarIdx = 0;
  try {
    const stored = localStorage.getItem("prototype0.profile.avatar");
    if (stored !== null) avatarIdx = parseInt(stored, 10) || 0;
  } catch { /* ignore */ }

  // Mini inline avatars (Space Marine = 0 default)
  const miniAvatars = [
    /* 0 - Space Marine */
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="hp-bg" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="#1a0e22"/><stop offset="100%" stop-color="#08060e"/></radialGradient></defs>
      <circle cx="32" cy="32" r="31" fill="url(#hp-bg)"/>
      <path d="M20 10 Q20 4 32 3 Q44 4 44 10 L45 26 Q45 30 32 31 Q19 30 19 26Z" fill="#3a1010" stroke="#d4a843" stroke-width="0.5"/>
      <rect x="21" y="17" width="22" height="5" rx="2" fill="#c62828" opacity="0.9"/>
      <path d="M12 36 Q14 32 22 30 L32 28 L42 30 Q50 32 52 36 L54 58 H10Z" fill="#3a1212" stroke="#d4a843" stroke-width="0.4"/>
      <path d="M28 40 L30 36 L32 38 L34 36 L36 40 L34 38 L32 42 L30 38Z" fill="#d4a843" opacity="0.7"/>
    </svg>`,
    /* 1 - Assassin */
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="hp-bg2" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#120e20"/><stop offset="100%" stop-color="#060410"/></radialGradient></defs>
      <circle cx="32" cy="32" r="31" fill="url(#hp-bg2)"/>
      <path d="M16 32 Q22 10 32 7 Q42 10 48 32 Q42 24 32 22 Q22 24 16 32Z" fill="#1c1430" stroke="#d4a843" stroke-width="0.5"/>
      <ellipse cx="32" cy="24" rx="9" ry="7" fill="#080614"/>
      <line x1="25" y1="22" x2="30" y2="22.5" stroke="#ff5252" stroke-width="2" stroke-linecap="round"/>
      <line x1="34" y1="22.5" x2="39" y2="22" stroke="#ff5252" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 32 L24 28 L32 26 L40 28 L50 32 L54 58 H10Z" fill="#22163a" stroke="#d4a843" stroke-width="0.3"/>
    </svg>`,
    /* 2 - Psyker */
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="hp-bg3" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="#14082a"/><stop offset="100%" stop-color="#060410"/></radialGradient></defs>
      <circle cx="32" cy="32" r="31" fill="url(#hp-bg3)"/>
      <circle cx="32" cy="26" r="22" fill="#e53935" opacity="0.06"/>
      <path d="M16 34 L24 28 L32 24 L40 28 L48 34 L52 58 H12Z" fill="#160a28" stroke="#d4a843" stroke-width="0.4"/>
      <path d="M20 32 Q28 12 32 8 Q36 12 44 32 Q36 24 32 22 Q28 24 20 32Z" fill="#1e1038" stroke="#d4a843" stroke-width="0.5"/>
      <circle cx="32" cy="22" r="8" fill="#0e0a1a"/>
      <circle cx="29" cy="21" r="2.5" fill="#e53935" opacity="0.9"/>
      <circle cx="35" cy="21" r="2.5" fill="#e53935" opacity="0.9"/>
    </svg>`,
  ];

  const idx = Math.min(avatarIdx, miniAvatars.length - 1);
  frame.innerHTML = miniAvatars[idx] || miniAvatars[0];

  // Listen to profile name too
  try {
    const storedName = localStorage.getItem("prototype0.profile.name");
    if (storedName && nameEl) nameEl.textContent = storedName;
  } catch { /* ignore */ }
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
