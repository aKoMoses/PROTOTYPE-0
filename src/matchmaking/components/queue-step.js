import { PrematchStepBase } from "./step-base.js";
import { setMatchmakingCardState } from "../ui.js";

function countdown(seconds) {
  return `${Math.max(0, Math.ceil(seconds))}s`;
}

export class QueueStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "queue", phaseKey: "queue" });
  }

  mount() {
    super.mount();
    setMatchmakingCardState(this.dom.queueCard, "is-searching");
    if (this.dom.queueTimer) {
      this.dom.queueTimer.textContent = countdown(this.dom.uiState.matchmaking.queueRemaining);
    }
  }

  update(matchmaking, dt) {
    matchmaking.queueRemaining = Math.max(0, matchmaking.queueRemaining - dt);
    matchmaking.queueSafetyRemaining = Math.max(0, matchmaking.queueSafetyRemaining - dt);
    if (this.dom.queueTimer) {
      this.dom.queueTimer.textContent = countdown(matchmaking.queueRemaining);
      this._updateTimerDanger(this.dom.queueTimer, matchmaking.queueRemaining, 3);
    }

    if (matchmaking.queueSafetyRemaining <= 0) {
      return "queue-timeout";
    }
    if (matchmaking.queueRemaining <= 0) {
      return "queue-found";
    }
    return null;
  }
}
