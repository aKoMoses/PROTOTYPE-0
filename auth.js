const AUTH_KEY = "prototype0.auth";
const MOCK_IDENTITY = "SAA_BOT";

const screen = document.getElementById("auth-screen");
const btn = document.getElementById("auth-connect-btn");
const form = document.getElementById("auth-form");

function readAuth() {
  try {
    return sessionStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

function writeAuth(identity) {
  try {
    sessionStorage.setItem(AUTH_KEY, identity);
  } catch {
    // sessionStorage unavailable — continue anyway
  }
}

function requestFullscreen() {
  const el = document.documentElement;
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (rfs) {
    rfs.call(el).catch(() => { /* user may deny — that's fine */ });
  }
}

function dismissAuthScreen() {
  requestFullscreen();
  // Clear stale shell view so user lands on the home page
  try { sessionStorage.removeItem("prototype0.shell-view"); } catch { /* ignore */ }
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

// Block real form submission (fields not wired yet)
form.addEventListener("submit", (e) => e.preventDefault());

// Already authenticated this session — skip the gate immediately
if (readAuth() === MOCK_IDENTITY) {
  screen.classList.add("is-hidden");
} else {
  btn.addEventListener("click", () => {
    writeAuth(MOCK_IDENTITY);
    dismissAuthScreen();
  });
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
    const MAX_DIST = 130;

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
          ctx.strokeStyle = `rgba(79, 195, 247, ${(1 - d / MAX_DIST) * 0.12})`;
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
      ctx.fillStyle = "rgba(79, 195, 247, 0.45)";
      ctx.fill();
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    time += 0.016;
    drawHexGrid();
    drawNodeNetwork();
    animFrame = requestAnimationFrame(loop);
  }

  resize();
  createNodes(55);
  loop();

  window.addEventListener("resize", () => {
    resize();
    createNodes(55);
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

