import { PrematchStepBase } from "./step-base.js";

export class RunesStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "runes", phaseKey: "runes" });
  }

  update(matchmaking, dt) {
    matchmaking.buildRemaining = Math.max(0, matchmaking.buildRemaining - dt);

    if (this.dom.runePhaseTimer) {
      this.dom.runePhaseTimer.textContent = '';
    }

    if (matchmaking.buildRemaining <= 0 && !matchmaking.playerReady) {
      return "build-timeout";
    }
    return null;
  }
}
