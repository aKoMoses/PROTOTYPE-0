import "./styles/flow.css";
import "./styles/steps-nonbuild.css";

import { PrematchStateMachine } from "./state.js";
import { ModeStep } from "./components/mode-step.js";
import { QueueStep } from "./components/queue-step.js";
import { FoundStep } from "./components/found-step.js";
import { MapStep } from "./components/map-step.js";
import { BuildStep } from "./components/build-step.js";
import { RunesStep } from "./components/runes-step.js";
import { LobbyStep } from "./components/lobby-step.js";
import { LoadingStep } from "./components/loading-step.js";

export class PrematchOrchestrator {
  constructor({ uiState, dom, setPrematchStep }) {
    this.uiState = uiState;
    this.dom = { ...dom, uiState };
    this.stateMachine = new PrematchStateMachine(uiState);
    this.currentStepKey = null;
    this.previousPhaseKey = null;

    const deps = {
      dom: this.dom,
      setPrematchStep,
    };

    this.steps = {
      mode: new ModeStep(deps),
      queue: new QueueStep(deps),
      "game-found": new FoundStep(deps),
      map: new MapStep(deps),
      build: new BuildStep(deps),
      runes: new RunesStep(deps),
      lobby: new LobbyStep(deps),
      loading: new LoadingStep(deps),
    };
  }

  resetState() {
    this.stateMachine.reset();
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

  enterQueue() {
    this.activateStep("queue");
  }

  enterFound() {
    this.activateStep("game-found");
  }

  enterBuild() {
    this.activateStep("build");
  }

  enterRunes() {
    this.activateStep("runes");
  }

  enterLobby() {
    this.activateStep("lobby");
  }

  enterLoading() {
    this.activateStep("loading");
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
    if (!this.uiState.prematchOpen || !this.uiState.matchmaking.active) {
      return null;
    }

    const phase = this.uiState.matchmaking.phase;
    if (phase === "queue") {
      this.activateStep("queue");
      return this.steps.queue.update(this.uiState.matchmaking, dt);
    }

    if (phase === "found") {
      this.activateStep("game-found");
      return this.steps["game-found"].update(this.uiState.matchmaking, dt);
    }

    if (phase === "build") {
      const buildStepKey = this.uiState.prematchStep === "runes" ? "runes" : "build";
      this.activateStep(buildStepKey);
      return this.steps[buildStepKey].update(this.uiState.matchmaking, dt);
    }

    if (phase === "lobby") {
      this.activateStep("lobby");
      return this.steps.lobby.update(this.uiState.matchmaking, dt);
    }

    if (phase === "loading") {
      this.activateStep("loading");
      return this.steps.loading.update(this.uiState.matchmaking, dt);
    }

    return null;
  }
}
