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

function dismissAuthScreen() {
  screen.classList.add("is-fading");
  screen.addEventListener(
    "transitionend",
    () => screen.classList.add("is-hidden"),
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
