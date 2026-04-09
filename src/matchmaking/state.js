export class PrematchStateMachine {
  constructor(uiState) {
    this.uiState = uiState;
    this.allowedTransitions = {
      idle: ["queue"],
      queue: ["found", "idle"],
      found: ["build", "idle"],
      build: ["lobby", "idle"],
      lobby: ["loading", "idle"],
      loading: ["idle"],
    };
  }

  get matchmaking() {
    return this.uiState.matchmaking;
  }

  canTransition(nextPhase) {
    const current = this.matchmaking.phase ?? "idle";
    return (this.allowedTransitions[current] ?? []).includes(nextPhase);
  }

  transitionTo(nextPhase) {
    if (!this.canTransition(nextPhase)) {
      return false;
    }
    this.matchmaking.phase = nextPhase;
    return true;
  }

  reset() {
    this.matchmaking.active = false;
    this.matchmaking.phase = "idle";
    this.matchmaking.queueRemaining = 0;
    this.matchmaking.queueSafetyRemaining = 0;
    this.matchmaking.foundRemaining = 0;
    this.matchmaking.buildRemaining = 0;
    this.matchmaking.lobbyRemaining = 0;
    this.matchmaking.loadingRemaining = 0;
    this.matchmaking.accepted = false;
    this.matchmaking.playerReady = false;
    this.matchmaking.mapKey = "electroGallery";
    this.matchmaking.roster = [];
  }
}
