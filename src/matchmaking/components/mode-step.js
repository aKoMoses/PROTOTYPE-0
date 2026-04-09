import { PrematchStepBase } from "./step-base.js";

export class ModeStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "mode", phaseKey: "mode" });
  }

  mount() {
    super.mount();
    this._staggerChildren(".mode-card", 100);
  }
}
