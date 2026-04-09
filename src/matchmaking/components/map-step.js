import { PrematchStepBase } from "./step-base.js";

export class MapStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "map", phaseKey: "map" });
  }

  mount() {
    super.mount();
    this._staggerChildren(".mode-card", 100);
  }
}
