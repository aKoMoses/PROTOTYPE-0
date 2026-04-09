import { PrematchStepBase } from "./step-base.js";
import { renderMatchmakingRoster, setMatchmakingCardState } from "../ui.js";

function countdown(seconds) {
  return `${Math.max(0, Math.ceil(seconds))}s`;
}

export class LobbyStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "lobby", phaseKey: "lobby" });
  }

  mount() {
    super.mount();
    setMatchmakingCardState(this.dom.lobbyCard, "is-lobby");
    renderMatchmakingRoster(this.dom.lobbyRoster, this.dom.uiState.matchmaking.roster);
    if (this.dom.lobbyTimer) {
      this.dom.lobbyTimer.textContent = countdown(this.dom.uiState.matchmaking.lobbyRemaining);
    }
    this._staggerChildren(".lobby-card", 100);
  }

  update(matchmaking, dt) {
    matchmaking.lobbyRemaining = Math.max(0, matchmaking.lobbyRemaining - dt);
    if (this.dom.lobbyTimer) {
      this.dom.lobbyTimer.textContent = countdown(matchmaking.lobbyRemaining);
      this._updateTimerDanger(this.dom.lobbyTimer, matchmaking.lobbyRemaining, 3);
    }
    if (matchmaking.lobbyRemaining <= 0) {
      return "lobby-complete";
    }
    return null;
  }
}
