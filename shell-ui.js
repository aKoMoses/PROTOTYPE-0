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
  if (!hasShellView(nextView)) {
    return;
  }

  activeView = nextView;
  persistShellView(nextView);

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
