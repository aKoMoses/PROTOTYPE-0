import "./styles/flow.css";
import "./styles/steps-nonbuild.css";
import "./styles/custom-rooms.css";

import { ModeStep } from "./components/mode-step.js";
import { MapStep } from "./components/map-step.js";
import { BuildStep } from "./components/build-step.js";
import { RoomBrowserStep } from "./components/custom-room-browser.js";
import { CustomRoomLobbyStep } from "./components/custom-room-lobby.js";

export class PrematchOrchestrator {
  constructor({ uiState, dom, setPrematchStep }) {
    this.uiState = uiState;
    this.dom = { ...dom, uiState };
    this.currentStepKey = null;
    this.previousPhaseKey = null;

    const deps = {
      dom: this.dom,
      setPrematchStep,
    };

    this.steps = {
      mode: new ModeStep(deps),
      map: new MapStep(deps),
      build: new BuildStep(deps),
      "room-browser": new RoomBrowserStep(deps),
      "custom-lobby": new CustomRoomLobbyStep(deps),
    };
  }

  resetState() {
    this.previousPhaseKey = null;
  }

  activateStep(stepKey) {
    if (this.currentStepKey === stepKey) {
      return;
    }
    const prev = this.steps[this.currentStepKey];
    if (prev) {
      this.previousPhaseKey = prev.phaseKey;
      prev.unmount();
    }
    this.currentStepKey = stepKey;
    this.steps[stepKey]?.mount();
  }

  enterMode() {
    this.activateStep("mode");
  }

  enterMap() {
    this.activateStep("map");
  }

  enterBuild() {
    this.activateStep("build");
  }

  enterRoomBrowser() {
    this.activateStep("room-browser");
  }

  enterCustomLobby() {
    this.activateStep("custom-lobby");
  }

  syncFromUiStep() {
    const uiStep = this.uiState.prematchStep;
    if (!uiStep || !this.steps[uiStep]) {
      return;
    }
    if (this.currentStepKey !== uiStep) {
      this.activateStep(uiStep);
    }
  }

  update(dt) {
    void dt;
    return null;
  }
}
