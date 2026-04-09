import { PrematchStepBase } from "./step-base.js";
import { renderMatchmakingRoster, setMatchmakingCardState } from "../ui.js";

function countdown(seconds) {
  return `${Math.max(0, Math.ceil(seconds))}s`;
}

export class LoadingStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "loading", phaseKey: "loading" });
  }

  mount() {
    super.mount();
    setMatchmakingCardState(this.dom.loadingCard, "is-loading");
    renderMatchmakingRoster(this.dom.loadingRoster, this.dom.uiState.matchmaking.roster);
    if (this.dom.loadingTimer) {
      this.dom.loadingTimer.textContent = countdown(this.dom.uiState.matchmaking.loadingRemaining);
    }
    this._staggerChildren(".lobby-card", 100);
  }

  update(matchmaking, dt) {
    matchmaking.loadingRemaining = Math.max(0, matchmaking.loadingRemaining - dt);
    if (this.dom.loadingTimer) {
      this.dom.loadingTimer.textContent = countdown(matchmaking.loadingRemaining);
      this._updateTimerDanger(this.dom.loadingTimer, matchmaking.loadingRemaining, 5);

      // Aggressive pulse at <2s
      this.dom.loadingTimer.classList.toggle("timer-critical", matchmaking.loadingRemaining <= 2 && matchmaking.loadingRemaining > 0);
    }
    if (matchmaking.loadingRemaining <= 0) {
      return "loading-complete";
    }
    return null;
  }
}
