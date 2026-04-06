const shellViews = Array.from(document.querySelectorAll("[data-shell-view]"));
const shellPanels = {
  landing: document.getElementById("shell-view-landing"),
  game: document.getElementById("shell-view-game"),
  dev: document.getElementById("shell-view-dev"),
};

let activeView = "landing";

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

  Object.entries(shellPanels).forEach(([viewKey, panel]) => {
    panel.classList.toggle("is-active", viewKey === nextView);
  });

  document.querySelectorAll(".shell-nav__button").forEach((button) => {
    button.classList.toggle("shell-nav__button--active", button.dataset.shellView === nextView);
  });

  if (nextView === "game") {
    window.dispatchEvent(new Event("resize"));
  }
}