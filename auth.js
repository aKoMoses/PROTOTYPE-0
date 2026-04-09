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
