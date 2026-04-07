import { readSessionSnapshot, SHELL_VIEW_STORAGE_KEY } from "./src/session.js";

const shellViews = Array.from(document.querySelectorAll("[data-shell-view]"));
const shellPanels = {
  landing: document.getElementById("shell-view-landing"),
  game: document.getElementById("shell-view-game"),
  dev: document.getElementById("shell-view-dev"),
};

function readStoredShellView() {
  const activeSession = readSessionSnapshot();
  if (activeSession?.resumeGameplay) {
    return "game";
  }

  try {
    const stored = window.sessionStorage.getItem(SHELL_VIEW_STORAGE_KEY);
    return shellPanels[stored] ? stored : "game";
  } catch {
    return "game";
  }
}

function persistShellView(nextView) {
  try {
    window.sessionStorage.setItem(SHELL_VIEW_STORAGE_KEY, nextView);
  } catch {
    // Ignore storage failures and keep the shell usable.
  }
}

let activeView = readStoredShellView();

for (const control of shellViews) {
  control.addEventListener("click", () => {
    const nextView = control.dataset.shellView;
    if (nextView) {
      setShellView(nextView);
    }
  });
}

setShellView(activeView);

function setShellView(nextView) {
  if (!shellPanels[nextView]) {
    return;
  }

  activeView = nextView;
  persistShellView(nextView);

  Object.entries(shellPanels).forEach(([viewKey, panel]) => {
    panel.classList.toggle("is-active", viewKey === nextView);
  });

  document.querySelectorAll(".shell-nav__button").forEach((button) => {
    button.classList.toggle("shell-nav__button--active", button.dataset.shellView === nextView);
  });

  if (nextView === "game") {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.dispatchEvent(new Event("resize"));
  }
}
