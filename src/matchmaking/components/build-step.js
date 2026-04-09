import { PrematchStepBase } from "./step-base.js";

export class BuildStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "build", phaseKey: "build" });
  }

  update(matchmaking, dt) {
    matchmaking.buildRemaining = Math.max(0, matchmaking.buildRemaining - dt);
    const secs = Math.max(0, Math.ceil(matchmaking.buildRemaining));
    const s = String(secs).padStart(2, '0');
    const html = `<span class="phase-timer__digit">${s[0]}</span><span class="phase-timer__digit">${s[1]}</span>`;
    if (this.dom.buildPhaseTimer) {
      this.dom.buildPhaseTimer.innerHTML = html;
      this._updateTimerDanger(this.dom.buildPhaseTimer, matchmaking.buildRemaining, 10);
    }

    if (matchmaking.buildRemaining <= 0 && !matchmaking.playerReady) {
      return "build-timeout";
    }
    return null;
  }
}
