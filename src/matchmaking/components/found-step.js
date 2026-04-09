import { PrematchStepBase } from "./step-base.js";
import { setMatchmakingCardState } from "../ui.js";

function countdown(seconds) {
  return `${Math.max(0, Math.ceil(seconds))}s`;
}

export class FoundStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "game-found", phaseKey: "found" });
  }

  mount() {
    super.mount();
    setMatchmakingCardState(this.dom.gameFoundCard, "is-found");
    if (this.dom.foundTimer) {
      this.dom.foundTimer.textContent = countdown(this.dom.uiState.matchmaking.foundRemaining);
    }
  }

  update(matchmaking, dt) {
    matchmaking.foundRemaining = Math.max(0, matchmaking.foundRemaining - dt);
    if (this.dom.foundTimer) {
      this.dom.foundTimer.textContent = countdown(matchmaking.foundRemaining);
      this._updateTimerDanger(this.dom.foundTimer, matchmaking.foundRemaining, 4);
    }

    if (matchmaking.foundRemaining <= 0) {
      return "found-auto-accept";
    }
    return null;
  }
}
