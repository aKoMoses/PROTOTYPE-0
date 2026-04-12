import {
  getAccountSnapshot,
  initAccountService,
  signInWithEmail,
  signUpWithEmail,
  subscribeAccountState,
} from "./src/lib/account/service.js";

const screen = document.getElementById("auth-screen");
const form = document.getElementById("auth-form");
const submitButton = document.getElementById("auth-submit-btn");
const status = document.getElementById("auth-status");
const copy = document.getElementById("auth-copy");
const identifierInput = document.getElementById("auth-identifier");
const passwordInput = document.getElementById("auth-password");
const displayNameInput = document.getElementById("auth-display-name");
const displayNameField = document.getElementById("auth-display-name-field");
const modeButtons = Array.from(document.querySelectorAll("[data-auth-mode]"));

let authScreenDismissed = false;
let authMode = "signin";

function requestFullscreen() {
  const el = document.documentElement;
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (rfs) {
    rfs.call(el).catch(() => { /* user may deny — that's fine */ });
  }
}

function dismissAuthScreen() {
  if (authScreenDismissed || !screen) {
    return;
  }
  authScreenDismissed = true;
  requestFullscreen();
  screen.classList.add("is-fading");
  screen.addEventListener(
    "transitionend",
    () => {
      screen.classList.add("is-hidden");
      // Re-trigger shell to go to landing after auth
      window.dispatchEvent(new CustomEvent("auth-complete"));
    },
    { once: true }
  );
}

function setStatus(message, tone = "neutral") {
  if (!status) {
    return;
  }

  status.textContent = message ?? "";
  status.classList.toggle("is-error", tone === "error");
  status.classList.toggle("is-success", tone === "success");
}

function updateModeUi() {
  const signUp = authMode === "signup";
  displayNameField?.classList.toggle("is-hidden", !signUp);

  modeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === authMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (copy) {
    copy.textContent = signUp
      ? "Crée un compte durable. Le profil joueur serveur est créé avant même ton premier match."
      : "Connecte un compte existant. Aucun accès au jeu sans compte permanent validé côté serveur.";
  }

  if (submitButton) {
    submitButton.textContent = signUp ? "CRÉER LE COMPTE" : "SE CONNECTER";
  }

  if (passwordInput) {
    passwordInput.setAttribute("autocomplete", signUp ? "new-password" : "current-password");
  }
}

function setFormDisabled(disabled) {
  [...modeButtons, identifierInput, passwordInput, displayNameInput, submitButton]
    .filter(Boolean)
    .forEach((element) => {
      element.disabled = disabled;
    });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    authMode = button.dataset.authMode === "signup" ? "signup" : "signin";
    setStatus("");
    updateModeUi();
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = identifierInput?.value?.trim() ?? "";
  const password = passwordInput?.value ?? "";
  const displayName = displayNameInput?.value?.trim() ?? "";

  if (!email || !password) {
    setStatus("Renseigne une adresse e-mail et un mot de passe valides.", "error");
    return;
  }

  if (authMode === "signup" && !displayName) {
    setStatus("Choisis un nom de pilote pour créer le profil serveur.", "error");
    return;
  }

  try {
    setFormDisabled(true);
    setStatus(authMode === "signup" ? "Création du compte et du profil serveur..." : "Connexion du compte...", "neutral");

    if (authMode === "signup") {
      const result = await signUpWithEmail({ email, password, displayName });
      if (result.requiresEmailConfirmation) {
        setStatus("Compte créé. Confirme l'e-mail reçu puis reconnecte-toi pour entrer dans le jeu.", "success");
      } else {
        setStatus("Compte créé. Profil serveur prêt.", "success");
      }
    } else {
      await signInWithEmail({ email, password });
      setStatus("Connexion réussie. Profil serveur chargé.", "success");
    }
  } catch (error) {
    setStatus(error?.message ?? "Authentification impossible.", "error");
  } finally {
    setFormDisabled(false);
  }
});

subscribeAccountState((snapshot) => {
  if (snapshot.loading) {
    setFormDisabled(true);
    if (!snapshot.isAuthenticated) {
      setStatus("Synchronisation du compte...", "neutral");
    }
    return;
  }

  setFormDisabled(!snapshot.configReady);

  if (snapshot.error) {
    setStatus(snapshot.error, "error");
  } else if (!snapshot.isAuthenticated && !status?.textContent) {
    setStatus("Compte requis pour accéder au jeu.", "neutral");
  }

  if (snapshot.isAuthenticated) {
    dismissAuthScreen();
  }
});

updateModeUi();
const initialSnapshot = getAccountSnapshot();
if (initialSnapshot.isAuthenticated) {
  screen?.classList.add("is-hidden");
  authScreenDismissed = true;
} else {
  setStatus("Compte requis pour accéder au jeu.", "neutral");
  void initAccountService();
}

// ── CANVAS PARTICLE SYSTEM ────────────────────────────────────
(function initAuthCanvas() {
  const canvas = document.getElementById("auth-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, nodes, animFrame;
  let time = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes(count) {
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.4 + 0.4,
      });
    }
  }

  function drawHexGrid() {
    const cellW = 52;
    const cellH = 60;
    const cols = Math.ceil(W / cellW) + 2;
    const rows = Math.ceil(H / cellH) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const offsetX = row % 2 === 0 ? 0 : cellW / 2;
        const x = col * cellW + offsetX;
        const y = row * cellH;
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.7 + col * 0.18 + row * 0.22);
        const alpha = pulse * 0.045;
        ctx.strokeStyle = `rgba(79, 195, 247, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const s = 18;
        for (let k = 0; k < 6; k++) {
          const angle = (Math.PI / 180) * (60 * k - 30);
          const px = x + s * Math.cos(angle);
          const py = y + s * Math.sin(angle);
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  function drawNodeNetwork() {
    const MAX_DIST = 90;

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -10) n.x = W + 10;
      if (n.x > W + 10) n.x = -10;
      if (n.y < -10) n.y = H + 10;
      if (n.y > H + 10) n.y = -10;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          ctx.strokeStyle = `rgba(79, 195, 247, ${(1 - d / MAX_DIST) * 0.06})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(79, 195, 247, 0.18)";
      ctx.fill();
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    time += 0.016;
    drawNodeNetwork();
    animFrame = requestAnimationFrame(loop);
  }

  resize();
  createNodes(22);
  loop();

  window.addEventListener("resize", () => {
    resize();
    createNodes(22);
  });

  // Stop canvas when auth is dismissed to save resources
  if (screen) {
    const observer = new MutationObserver(() => {
      if (screen.classList.contains("is-hidden")) {
        cancelAnimationFrame(animFrame);
        observer.disconnect();
      }
    });
    observer.observe(screen, { attributes: true });
  }
})();

// ── TITLE DECRYPT ANIMATION ───────────────────────────────────
(function initTitleDecrypt() {
  const titleEl = document.getElementById("auth-title");
  if (!titleEl) return;

  const FINAL = "PROTOTYPE-0";
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@!?><[]{}";
  const resolved = new Array(FINAL.length).fill(false);
  let frame = 0;

  function scramble() {
    let out = "";
    for (let i = 0; i < FINAL.length; i++) {
      if (FINAL[i] === "-" || resolved[i]) {
        resolved[i] = true;
        out += FINAL[i];
      } else {
        out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
    }
    return out;
  }

  const interval = setInterval(() => {
    frame++;
    const resolveIdx = Math.floor(frame / 5);
    if (resolveIdx < FINAL.length) resolved[resolveIdx] = true;

    const text = scramble();
    titleEl.textContent = text;
    titleEl.setAttribute("data-text", text);

    if (frame >= FINAL.length * 5 + 15) {
      clearInterval(interval);
      titleEl.textContent = FINAL;
      titleEl.setAttribute("data-text", FINAL);
    }
  }, 45);
})();

