import { Room, Client, CloseCode } from "colyseus";
import * as jwt from "jsonwebtoken";
import { DuelState, PlayerState } from "./schema/DuelState";
import { persistAuthoritativeMatchResult } from "../lib/matchPersistence";
import { loadLobbyRoomConfig, loadLobbyRoomMembers, type LobbyRoomConfig } from "../lib/lobbyRoom";
import {
  decideTeamDuelBotAction,
  type BotDifficulty,
  type CombatantSnapshot,
} from "../../../src/lib/ai/teamDuelDecision";
import {
  getTeamDuelBotArchetypeForSlot,
  type BotCombatRole,
} from "../../../src/lib/ai/teamDuelArchetypes";
import { weapons } from "../../../src/content.js";

const ARENA_W = 1600;
const ARENA_H = 900;
const PLAYER_RADIUS = 18;
const PLAYER_MAX_HP = 280;
const PLAYER_SPEED = 420;
const BULLET_SPEED = 1320;
const BULLET_DAMAGE = 9;
const BULLET_RADIUS = 6;
const BULLET_LIFETIME = 1.0;
const FIRE_COOLDOWN_MS = 180;

const TICK_RATE = 20;
const ROUNDS_TO_WIN = 2;
const COUNTDOWN_MS = 3_000;
const ROUND_END_MS = 3_000;
const RECONNECT_WINDOW_SECONDS = 20;
const METRICS_BROADCAST_INTERVAL_MS = 2_000;
const PERSIST_MAX_ATTEMPTS = 4;
const PERSIST_BASE_RETRY_MS = 500;
const TEAM_SIZE = 2;
const REQUIRED_PLAYERS = TEAM_SIZE * 2;
const BOT_SESSION_PREFIX = "bot:";
const BOT_DASH_DURATION_MS = 220;
const BOT_DASH_SPEED_MULTIPLIER = 2.15;
const BOT_DASH_COOLDOWN_MS = 1_700;
const BOT_BURST_FIRE_COOLDOWN_MS = 95;

interface InputPayload {
  dx: number;
  dy: number;
  facing: number;
  firing: boolean;
  seqId: number;
}

interface Bullet {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface PlayerRuntimeState {
  authUserId: string;
  lastSeqId: number;
  lastFireAt: number;
  team: number;
  slotIndex: number;
  isBot: boolean;
  botRole: BotCombatRole | null;
  botDifficulty: BotDifficulty | null;
  weaponKey: string | null;
  hasGrapple: boolean;
  hasShield: boolean;
  hasEmp: boolean;
  dashEndsAt: number;
  dashCooldownUntil: number;
  dashVectorX: number;
  dashVectorY: number;
  burstShotsRemaining: number;
  focusTargetId: string | null;
  postAttackMoveMultiplier: number;
}

interface ExpectedPlayerState {
  displayName: string;
  team: number;
  slotIndex: number;
}

export class TeamDuelRoom extends Room {
  maxClients = REQUIRED_PLAYERS;
  state = new DuelState();
  private inputs = new Map<string, InputPayload>();
  private playerRuntime = new Map<string, PlayerRuntimeState>();
  private bullets: Bullet[] = [];
  private nextBulletId = 1;
  private phaseEndTime = 0;
  private lobbyRoomId = "";
  private lobbyConfig: LobbyRoomConfig | null = null;
  private expectedPlayers = new Map<string, ExpectedPlayerState>();
  private joinedUserIds = new Set<string>();
  private participantUserIds = new Map<string, string>();
  private matchStartedAt = new Date().toISOString();
  private droppedConnections = 0;
  private recoveredConnections = 0;
  private failedReconnections = 0;
  private lastMetricsBroadcastAt = 0;
  private persistenceStarted = false;

  messages = {
    input: (client: Client, payload: InputPayload) => {
      const runtime = this.playerRuntime.get(client.sessionId);
      const player = this.state.players.get(client.sessionId);
      if (!runtime || !player?.alive || !player.connected || this.state.phase !== "active") return;

      const seqId = Number.isFinite(payload?.seqId) ? Math.trunc(payload.seqId) : runtime.lastSeqId;
      if (seqId <= runtime.lastSeqId) return;

      runtime.lastSeqId = seqId;
      this.inputs.set(client.sessionId, {
        dx: this._clampUnit(payload?.dx),
        dy: this._clampUnit(payload?.dy),
        facing: this._normalizeAngle(payload?.facing),
        firing: Boolean(payload.firing),
        seqId,
      });
    },

    fire: (client: Client, payload: { angle: number }) => {
      this._tryFire(client.sessionId, payload?.angle);
    },
  };

  async onCreate(options: any) {
    this.setState(this.state);
    const lobbyRoomId = typeof options?.lobbyRoomId === "string" ? options.lobbyRoomId.trim() : "";
    if (!lobbyRoomId) {
      throw new Error("Team duel requires a lobbyRoomId.");
    }

    this.lobbyRoomId = lobbyRoomId;
    const [lobbyConfig, lobbyMembers] = await Promise.all([
      loadLobbyRoomConfig(lobbyRoomId),
      loadLobbyRoomMembers(lobbyRoomId),
    ]);
    this.lobbyConfig = lobbyConfig;

    if (lobbyConfig.format !== "2v2") {
      throw new Error("Team duel requires a 2v2 custom room.");
    }

    if (lobbyConfig.maxPlayers + lobbyConfig.botCount !== REQUIRED_PLAYERS) {
      throw new Error("Team duel room configuration is invalid.");
    }

    if (lobbyMembers.length !== lobbyConfig.maxPlayers) {
      throw new Error(`Team duel requires exactly ${lobbyConfig.maxPlayers} human lobby members.`);
    }

    lobbyMembers.forEach((member, index) => {
      this.expectedPlayers.set(member.userId, {
        displayName: member.displayName,
        team: index < TEAM_SIZE ? 0 : 1,
        slotIndex: index % TEAM_SIZE,
      });
    });

    for (let botOffset = 0; botOffset < lobbyConfig.botCount; botOffset += 1) {
      this._addBotParticipant(REQUIRED_PLAYERS - 1 - botOffset, lobbyConfig.botDifficulty);
    }

    this.matchStartedAt = new Date().toISOString();
    this.setMetadata({
      lobbyRoomId: this.lobbyRoomId,
      format: "2v2",
      botCount: lobbyConfig.botCount,
      botDifficulty: lobbyConfig.botDifficulty,
    });
    this.setSimulationInterval((dt) => this._tick(dt), 1000 / TICK_RATE);
  }

  async onAuth(client: Client, options: any) {
    const token: string | undefined = options?.token;
    if (!token) {
      throw new Error("Authentication required for team duel.");
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    let authUserId = client.sessionId;

    if (!secret) {
      const decoded = jwt.decode(token) as Record<string, any> | null;
      authUserId = decoded?.sub ?? client.sessionId;
    } else {
      const decoded = jwt.verify(token, secret) as Record<string, any>;
      authUserId = decoded.sub ?? client.sessionId;
    }

    const expectedPlayer = this.expectedPlayers.get(authUserId);
    if (!expectedPlayer) {
      throw new Error("You are not a member of this custom 2v2 room.");
    }

    return {
      id: authUserId,
      displayName: expectedPlayer.displayName || options?.displayName || "Pilot",
    };
  }

  onJoin(client: Client, _options: any, auth: { id: string; displayName: string }) {
    const expectedPlayer = this.expectedPlayers.get(auth.id);
    if (!expectedPlayer) {
      throw new Error("Team duel roster mismatch.");
    }
    if (this.joinedUserIds.has(auth.id)) {
      throw new Error("Player already connected to this team duel.");
    }

    const spawn = this._getSpawnPosition(expectedPlayer.team, expectedPlayer.slotIndex);
    const player = new PlayerState();
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = PLAYER_MAX_HP;
    player.alive = true;
    player.connected = true;
    player.isBot = false;
    player.team = expectedPlayer.team;
    player.roundScore = 0;
    player.displayName = auth.displayName ?? expectedPlayer.displayName;

    this.state.players.set(client.sessionId, player);
    this.playerRuntime.set(client.sessionId, {
      authUserId: auth.id,
      lastSeqId: -1,
      lastFireAt: 0,
      team: expectedPlayer.team,
      slotIndex: expectedPlayer.slotIndex,
      isBot: false,
      botRole: null,
      botDifficulty: null,
      weaponKey: null,
      hasGrapple: false,
      hasShield: false,
      hasEmp: false,
      dashEndsAt: 0,
      dashCooldownUntil: 0,
      dashVectorX: 0,
      dashVectorY: 0,
      burstShotsRemaining: 0,
      focusTargetId: null,
      postAttackMoveMultiplier: 1,
    });
    this.participantUserIds.set(client.sessionId, auth.id);
    this.joinedUserIds.add(auth.id);

    if (this.joinedUserIds.size === this.expectedPlayers.size && this.state.phase === "waiting") {
      this._startCountdown();
    }
  }

  async onLeave(client: Client, code: number) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const consented = code === CloseCode.CONSENTED;
    if (!consented && this.state.phase !== "match_end") {
      this.droppedConnections += 1;
      player.connected = false;
      this.inputs.delete(client.sessionId);

      try {
        await this.allowReconnection(client, RECONNECT_WINDOW_SECONDS);
        return;
      } catch {
        this.failedReconnections += 1;
        // Reconnection timed out.
      }
    }

    this._handlePermanentDeparture(client.sessionId);
  }

  onReconnect(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = true;
    this.inputs.delete(client.sessionId);
    this.recoveredConnections += 1;

    const runtime = this.playerRuntime.get(client.sessionId);
    if (runtime) {
      runtime.lastSeqId = -1;
    }
  }

  onDispose() {
    this.bullets = [];
    this.inputs.clear();
    this.playerRuntime.clear();
    this.joinedUserIds.clear();
    this.participantUserIds.clear();
  }

  private _startCountdown() {
    this.state.phase = "countdown";
    this.phaseEndTime = Date.now() + COUNTDOWN_MS;
    this.state.phaseTimer = COUNTDOWN_MS;
    this.state.winnerId = "";
    this.state.winnerTeam = -1;
    this._broadcastBullets();
  }

  private _startRound() {
    this.state.phase = "active";
    this.state.phaseTimer = 0;
    this.bullets = [];
    this.inputs.clear();

    this.state.players.forEach((player, sessionId) => {
      const runtime = this.playerRuntime.get(sessionId);
      if (!runtime) {
        player.alive = false;
        player.connected = false;
        return;
      }

      const spawn = this._getSpawnPosition(player.team, runtime.slotIndex);
      player.x = spawn.x;
      player.y = spawn.y;
      player.hp = PLAYER_MAX_HP;
      player.alive = true;
      player.connected = runtime.isBot ? true : player.connected;
      runtime.lastFireAt = 0;
      runtime.dashEndsAt = 0;
      runtime.dashCooldownUntil = 0;
      runtime.dashVectorX = 0;
      runtime.dashVectorY = 0;
      runtime.burstShotsRemaining = 0;
      runtime.focusTargetId = null;
      runtime.postAttackMoveMultiplier = 1;
    });

    this._broadcastBullets();
  }

  private _handlePermanentDeparture(sessionId: string) {
    const player = this.state.players.get(sessionId);
    const runtime = this.playerRuntime.get(sessionId);
    if (!player || !runtime) return;

    this.inputs.delete(sessionId);
    this.playerRuntime.delete(sessionId);
    this.joinedUserIds.delete(runtime.authUserId);

    if (this.state.phase === "active" && player.alive) {
      player.connected = false;
      player.alive = false;
      this._resolveRoundOutcome();
      return;
    }

    this.state.players.delete(sessionId);
    if (this.state.phase === "waiting") {
      this.state.winnerId = "";
      this.state.winnerTeam = -1;
      this.inputs.clear();
      this.bullets = [];
      this._broadcastBullets();
    }
  }

  private _tick(dt: number) {
    const dtSec = dt / 1_000;

    if (this.state.phase === "countdown") {
      const remaining = this.phaseEndTime - Date.now();
      this.state.phaseTimer = Math.max(0, remaining);
      if (remaining <= 0) this._startRound();
      return;
    }

    if (this.state.phase === "round_end") {
      const remaining = this.phaseEndTime - Date.now();
      this.state.phaseTimer = Math.max(0, remaining);
      if (remaining <= 0) {
        const team0Score = this._getTeamScore(0);
        const team1Score = this._getTeamScore(1);
        if (team0Score >= ROUNDS_TO_WIN || team1Score >= ROUNDS_TO_WIN) {
          const winnerTeam = team0Score >= ROUNDS_TO_WIN ? 0 : 1;
          this.state.winnerTeam = winnerTeam;
          this.state.winnerId = this._getRepresentativeSessionId(winnerTeam);
          this.state.phase = "match_end";
          void this._persistMatchResult();
        } else {
          this.state.round += 1;
          this._startCountdown();
        }
      }
      return;
    }

    if (this.state.phase !== "active") return;

    this._broadcastRoomMetrics();

    this._updateBots(dtSec);

    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      const runtime = this.playerRuntime.get(sessionId);
      if (runtime?.isBot) return;

      const input = this.inputs.get(sessionId);
      if (!input) return;

      player.facing = input.facing;
      this._applyMovement(player, runtime, input.dx, input.dy, dtSec);
    });

    const survivingBullets: Bullet[] = [];

    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dtSec;
      bullet.y += bullet.vy * dtSec;
      bullet.life -= dtSec;

      if (bullet.life <= 0 || bullet.x < 0 || bullet.x > ARENA_W || bullet.y < 0 || bullet.y > ARENA_H) {
        continue;
      }

      let hit = false;
      const owner = this.state.players.get(bullet.ownerId);
      this.state.players.forEach((player, sessionId) => {
        if (hit || sessionId === bullet.ownerId || !player.alive) return;
        if (owner && player.team === owner.team) return;

        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        if (dx * dx + dy * dy <= (PLAYER_RADIUS + BULLET_RADIUS) ** 2) {
          player.hp = Math.max(0, player.hp - BULLET_DAMAGE);
          if (player.hp === 0) {
            player.alive = false;
            this._resolveRoundOutcome();
          }
          hit = true;
        }
      });

      if (!hit) {
        survivingBullets.push(bullet);
      }
    }

    this.bullets = survivingBullets;
    this._broadcastBullets();
  }

  private _broadcastRoomMetrics(force = false) {
    const now = Date.now();
    if (!force && now - this.lastMetricsBroadcastAt < METRICS_BROADCAST_INTERVAL_MS) {
      return;
    }

    let connectedPlayers = 0;
    this.state.players.forEach((player: PlayerState) => {
      if (player.isBot) return;
      if (player.connected) connectedPlayers += 1;
    });

    this.lastMetricsBroadcastAt = now;
    this.broadcast("room-metrics", {
      roomId: this.roomId,
      phase: this.state.phase,
      round: this.state.round,
      connectedPlayers,
      totalPlayers: this.expectedPlayers.size,
      droppedConnections: this.droppedConnections,
      recoveredConnections: this.recoveredConnections,
      failedReconnections: this.failedReconnections,
      ts: now,
    });
  }

  private _resolveRoundOutcome() {
    const team0Alive = this._countAlivePlayers(0);
    const team1Alive = this._countAlivePlayers(1);
    if (team0Alive > 0 && team1Alive > 0) {
      return;
    }

    if (team0Alive === 0 && team1Alive === 0) {
      this.state.phase = "round_end";
      this.phaseEndTime = Date.now() + ROUND_END_MS;
      this.state.phaseTimer = ROUND_END_MS;
      this.inputs.clear();
      this.bullets = [];
      this._broadcastBullets();
      return;
    }

    const winningTeam = team0Alive > 0 ? 0 : 1;
    this.state.players.forEach((player) => {
      if (player.team === winningTeam) {
        player.roundScore += 1;
      }
    });
    this.state.phase = "round_end";
    this.phaseEndTime = Date.now() + ROUND_END_MS;
    this.state.phaseTimer = ROUND_END_MS;
    this.inputs.clear();
    this.bullets = [];
    this._broadcastBullets();
  }

  private _tryFire(sessionId: string, requestedAngle: unknown, cooldownOverrideMs = FIRE_COOLDOWN_MS) {
    if (this.state.phase !== "active") return false;

    const runtime = this.playerRuntime.get(sessionId);
    const player = this.state.players.get(sessionId);
    if (!runtime || !player?.alive || !player.connected) return false;

    const now = Date.now();
    if (now - runtime.lastFireAt < cooldownOverrideMs) return false;

    const angle = this._normalizeAngle(
      Number.isFinite(requestedAngle as number) ? Number(requestedAngle) : player.facing,
    );

    runtime.lastFireAt = now;
    player.facing = angle;
    this.bullets.push({
      id: this.nextBulletId++,
      ownerId: sessionId,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: BULLET_LIFETIME,
    });
    return true;
  }

  private _broadcastBullets() {
    this.broadcast("bullets", this.bullets.map((bullet) => ({ id: bullet.id, x: bullet.x, y: bullet.y })));
  }

  private _countAlivePlayers(team: number) {
    let count = 0;
    this.state.players.forEach((player) => {
      if (player.team === team && player.alive) {
        count += 1;
      }
    });
    return count;
  }

  private _getTeamScore(team: number) {
    let score = 0;
    this.state.players.forEach((player) => {
      if (player.team === team) {
        score = Math.max(score, player.roundScore);
      }
    });
    return score;
  }

  private _getRepresentativeSessionId(team: number) {
    const session = Array.from(this.state.players.entries()).find(([sessionId, player]) => {
      if (player.team !== team) return false;
      const runtime = this.playerRuntime.get(sessionId);
      return !runtime?.isBot;
    }) ?? Array.from(this.state.players.entries()).find(([, player]) => player.team === team);
    return session?.[0] ?? "";
  }

  private _addBotParticipant(slot: number, difficulty: BotDifficulty) {
    const sessionId = `${BOT_SESSION_PREFIX}${slot}`;
    const team = slot < TEAM_SIZE ? 0 : 1;
    const slotIndex = slot % TEAM_SIZE;
    const spawn = this._getSpawnPosition(team, slotIndex);
    const preset = getTeamDuelBotArchetypeForSlot(slot);

    const player = new PlayerState();
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = PLAYER_MAX_HP;
    player.alive = true;
    player.connected = true;
    player.isBot = true;
    player.team = team;
    player.roundScore = 0;
    player.displayName = `${preset.displayName} ${slot + 1}`;

    this.state.players.set(sessionId, player);
    this.playerRuntime.set(sessionId, {
      authUserId: sessionId,
      lastSeqId: -1,
      lastFireAt: 0,
      team,
      slotIndex,
      isBot: true,
      botRole: preset.role,
      botDifficulty: difficulty,
      weaponKey: preset.weaponKey,
      hasGrapple: preset.hasGrapple,
      hasShield: preset.hasShield,
      hasEmp: preset.hasEmp,
      dashEndsAt: 0,
      dashCooldownUntil: 0,
      dashVectorX: 0,
      dashVectorY: 0,
      burstShotsRemaining: 0,
      focusTargetId: null,
      postAttackMoveMultiplier: 1,
    });
  }

  private _updateBots(dtSec: number) {
    this.playerRuntime.forEach((runtime, sessionId) => {
      if (!runtime.isBot) return;

      const player = this.state.players.get(sessionId);
      if (!player?.alive) return;

      const allies = this._getCombatantSnapshots(sessionId, player.team, "ally");
      const opponents = this._getCombatantSnapshots(sessionId, player.team, "opponent");
      const focusTarget = this._selectBotFocusTarget(sessionId, allies, opponents, runtime.focusTargetId);
      runtime.focusTargetId = focusTarget?.id ?? null;

      const targetDistance = focusTarget
        ? Math.hypot(focusTarget.x - player.x, focusTarget.y - player.y)
        : null;
      const lowHpThreshold = PLAYER_MAX_HP * 0.34;
      const selfLow = player.hp <= lowHpThreshold;
      const shouldPunish = Boolean(
        focusTarget && ((focusTarget.isExposed ?? false) || (focusTarget.hp ?? PLAYER_MAX_HP) <= PLAYER_MAX_HP * 0.45),
      );
      const shouldPressure = Boolean(
        focusTarget &&
        (focusTarget.hasLineOfSight !== false) &&
        targetDistance !== null &&
        targetDistance <= 420 &&
        (shouldPunish || !selfLow),
      );
      const shouldKite = Boolean(
        focusTarget &&
        targetDistance !== null &&
        (selfLow || targetDistance < 230 || (focusTarget.threatLevel ?? 0) >= 0.22),
      );

      const decision = decideTeamDuelBotAction({
        self: {
          ...this._toCombatantSnapshot(sessionId, player),
          cooldowns: {
            primary: Math.max(0, Math.max(FIRE_COOLDOWN_MS, BOT_BURST_FIRE_COOLDOWN_MS) - (Date.now() - runtime.lastFireAt)),
          },
        },
        allies,
        opponents,
        difficulty: runtime.botDifficulty ?? "normal",
        strafeDirection: this._getBotStrafeDirection(sessionId, player, allies, focusTarget),
        aimJitterRoll: Math.random() - 0.5,
        weaponKey: runtime.weaponKey ?? weapons.pulse.key,
        focusTargetId: runtime.focusTargetId,
        shouldPunish,
        shouldPressure,
        shouldKite,
        hasGrapple: runtime.hasGrapple,
        hasShield: runtime.hasShield,
        hasEmp: runtime.hasEmp,
        postAttackMoveMultiplier: runtime.postAttackMoveMultiplier,
      });

      player.facing = decision.facing;
      this._maybeTriggerBotDash(runtime, player, focusTarget, decision);
      this._applyMovement(player, runtime, decision.movementX, decision.movementY, dtSec);
      runtime.postAttackMoveMultiplier = decision.fireAngle !== null ? 1.2 : 1;

      if (decision.fireAngle !== null) {
        const cooldownMs = runtime.burstShotsRemaining > 0 ? BOT_BURST_FIRE_COOLDOWN_MS : FIRE_COOLDOWN_MS;
        if (this._tryFire(sessionId, decision.fireAngle, cooldownMs)) {
          if (runtime.burstShotsRemaining > 0) {
            runtime.burstShotsRemaining = Math.max(0, runtime.burstShotsRemaining - 1);
          } else {
            runtime.burstShotsRemaining = Math.max(0, decision.burstShots - 1);
          }
        }
      } else {
        runtime.burstShotsRemaining = 0;
      }
    });
  }

  private _getCombatantSnapshots(viewerSessionId: string, team: number, relation: "ally" | "opponent") {
    const snapshots: CombatantSnapshot[] = [];

    this.state.players.forEach((candidate, sessionId) => {
      if (sessionId === viewerSessionId) {
        return;
      }

      const sameTeam = candidate.team === team;
      if ((relation === "ally" && !sameTeam) || (relation === "opponent" && sameTeam)) {
        return;
      }

      snapshots.push(this._toCombatantSnapshot(sessionId, candidate, viewerSessionId));
    });

    return snapshots;
  }

  private _toCombatantSnapshot(sessionId: string, player: PlayerState, viewerSessionId?: string): CombatantSnapshot {
    const runtime = this.playerRuntime.get(sessionId);
    const viewerRuntime = viewerSessionId ? this.playerRuntime.get(viewerSessionId) : null;
    return {
      id: sessionId,
      team: player.team,
      x: player.x,
      y: player.y,
      alive: player.alive,
      connected: player.connected,
      hp: player.hp,
      maxHp: PLAYER_MAX_HP,
      hasLineOfSight: viewerSessionId ? this._hasLineOfSight(viewerSessionId, sessionId) : true,
      isExposed: player.alive && player.connected && this._isCombatantExposed(sessionId),
      threatLevel: this._getThreatLevel(sessionId, player),
      targetPriorityBonus: viewerRuntime?.focusTargetId === sessionId ? 0.18 : runtime?.focusTargetId === sessionId ? 0.06 : 0,
    };
  }

  private _getBotStrafeDirection(
    sessionId: string,
    player: PlayerState,
    allies: CombatantSnapshot[],
    target: CombatantSnapshot | null,
  ) {
    let hash = 0;
    for (let index = 0; index < sessionId.length; index += 1) {
      hash = (hash * 31 + sessionId.charCodeAt(index)) | 0;
    }

    const baselineDirection = ((Math.floor(Date.now() / 900) + hash) & 1) === 0 ? -1 : 1;
    if (!target) {
      return baselineDirection;
    }

    const targetDx = target.x - player.x;
    const targetDy = target.y - player.y;
    const targetDistance = Math.hypot(targetDx, targetDy) || 1;
    const sideLeftX = targetDy / targetDistance;
    const sideLeftY = -targetDx / targetDistance;
    const sideRightX = -sideLeftX;
    const sideRightY = -sideLeftY;

    const leftScore = this._scoreBotStrafeSide(player, allies, sideLeftX, sideLeftY);
    const rightScore = this._scoreBotStrafeSide(player, allies, sideRightX, sideRightY);

    if (Math.abs(leftScore - rightScore) < 6) {
      return baselineDirection;
    }

    return leftScore > rightScore ? -1 : 1;
  }

  private _selectBotFocusTarget(
    sessionId: string,
    allies: CombatantSnapshot[],
    opponents: CombatantSnapshot[],
    previousTargetId: string | null,
  ) {
    const previous = previousTargetId
      ? opponents.find((candidate) => candidate.id === previousTargetId && candidate.alive)
      : null;
    if (previous && (previous.hasLineOfSight !== false || (previous.hp ?? PLAYER_MAX_HP) <= PLAYER_MAX_HP * 0.38)) {
      return previous;
    }

    const coordinatedTargetId = this._getTeamFocusTargetId(sessionId);

    return opponents
      .filter((candidate) => candidate.alive)
      .sort((left, right) => {
        const leftScore =
          (left.isExposed ? 2 : 0) +
          ((left.hp ?? PLAYER_MAX_HP) <= PLAYER_MAX_HP * 0.45 ? 1 : 0) +
          (left.hasLineOfSight !== false ? 1 : 0) +
          (left.id === coordinatedTargetId ? 1.35 : 0) +
          this._getBotPeelPriority(left, allies);
        const rightScore =
          (right.isExposed ? 2 : 0) +
          ((right.hp ?? PLAYER_MAX_HP) <= PLAYER_MAX_HP * 0.45 ? 1 : 0) +
          (right.hasLineOfSight !== false ? 1 : 0) +
          (right.id === coordinatedTargetId ? 1.35 : 0) +
          this._getBotPeelPriority(right, allies);
        return rightScore - leftScore;
      })[0] ?? null;
  }

  private _getTeamFocusTargetId(sessionId: string) {
    const runtime = this.playerRuntime.get(sessionId);
    if (!runtime) {
      return null;
    }

    const focusCounts = new Map<string, number>();
    this.playerRuntime.forEach((candidateRuntime, candidateSessionId) => {
      if (candidateSessionId === sessionId || candidateRuntime.team !== runtime.team) {
        return;
      }

      if (!candidateRuntime.focusTargetId) {
        return;
      }

      focusCounts.set(candidateRuntime.focusTargetId, (focusCounts.get(candidateRuntime.focusTargetId) ?? 0) + 1);
    });

    let bestTargetId: string | null = null;
    let bestCount = 0;
    focusCounts.forEach((count, targetId) => {
      if (count > bestCount) {
        bestTargetId = targetId;
        bestCount = count;
      }
    });

    return bestTargetId;
  }

  private _getBotPeelPriority(candidate: CombatantSnapshot, allies: CombatantSnapshot[]) {
    let bestPriority = 0;

    for (const ally of allies) {
      const allyMaxHp = Math.max(1, ally.maxHp ?? ally.hp ?? 1);
      const allyHp = Math.max(0, ally.hp ?? allyMaxHp);
      const healthRatio = allyHp / allyMaxHp;
      if (healthRatio > 0.45) {
        continue;
      }

      const distance = Math.hypot(candidate.x - ally.x, candidate.y - ally.y);
      if (distance <= 320) {
        bestPriority = Math.max(bestPriority, (1 - healthRatio) * 1.2);
      }
    }

    return bestPriority;
  }

  private _scoreBotStrafeSide(player: PlayerState, allies: CombatantSnapshot[], directionX: number, directionY: number) {
    const probeDistance = 88;
    const probeX = player.x + directionX * probeDistance;
    const probeY = player.y + directionY * probeDistance;
    const edgePadding = Math.min(probeX, ARENA_W - probeX, probeY, ARENA_H - probeY);
    let allyClearance = 0;

    for (const ally of allies) {
      const distance = Math.hypot(probeX - ally.x, probeY - ally.y);
      allyClearance += Math.min(distance, 180);
    }

    return edgePadding + allyClearance * 0.35;
  }

  private _maybeTriggerBotDash(runtime: PlayerRuntimeState, player: PlayerState, target: CombatantSnapshot | null, decision: ReturnType<typeof decideTeamDuelBotAction>) {
    if (!decision.abilityIntent.dash || Date.now() < runtime.dashCooldownUntil) {
      return;
    }

    const targetDx = target ? target.x - player.x : Math.cos(player.facing);
    const targetDy = target ? target.y - player.y : Math.sin(player.facing);
    const distance = Math.hypot(targetDx, targetDy) || 1;
    const forwardX = targetDx / distance;
    const forwardY = targetDy / distance;
    const strafeX = -forwardY;
    const strafeY = forwardX;

    switch (decision.abilityIntent.dashDirection) {
      case "forward":
        runtime.dashVectorX = forwardX;
        runtime.dashVectorY = forwardY;
        break;
      case "backward":
        runtime.dashVectorX = -forwardX;
        runtime.dashVectorY = -forwardY;
        break;
      case "strafe-left":
        runtime.dashVectorX = -strafeX;
        runtime.dashVectorY = -strafeY;
        break;
      case "strafe-right":
        runtime.dashVectorX = strafeX;
        runtime.dashVectorY = strafeY;
        break;
      default:
        return;
    }

    runtime.dashEndsAt = Date.now() + BOT_DASH_DURATION_MS;
    runtime.dashCooldownUntil = Date.now() + BOT_DASH_COOLDOWN_MS;
    runtime.postAttackMoveMultiplier = 1.28;
  }

  private _hasLineOfSight(sourceSessionId: string, targetSessionId: string) {
    const source = this.state.players.get(sourceSessionId);
    const target = this.state.players.get(targetSessionId);
    if (!source?.alive || !target?.alive) {
      return false;
    }

    let blocked = false;
    this.state.players.forEach((candidate, candidateSessionId) => {
      if (blocked || !candidate.alive) return;
      if (candidateSessionId === sourceSessionId || candidateSessionId === targetSessionId) return;

      const distance = this._distancePointToSegment(candidate.x, candidate.y, source.x, source.y, target.x, target.y);
      const nearSource = Math.hypot(candidate.x - source.x, candidate.y - source.y) <= PLAYER_RADIUS * 1.5;
      const nearTarget = Math.hypot(candidate.x - target.x, candidate.y - target.y) <= PLAYER_RADIUS * 1.5;
      if (!nearSource && !nearTarget && distance < PLAYER_RADIUS * 1.2) {
        blocked = true;
      }
    });

    return !blocked;
  }

  private _isCombatantExposed(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player?.alive) {
      return false;
    }

    let nearbyAllies = 0;
    let visibleOpponents = 0;
    this.state.players.forEach((candidate, candidateSessionId) => {
      if (!candidate.alive || candidateSessionId === sessionId) return;
      const distance = Math.hypot(candidate.x - player.x, candidate.y - player.y);
      if (candidate.team === player.team) {
        if (distance < 190) {
          nearbyAllies += 1;
        }
        return;
      }

      if (distance < 560 && this._hasLineOfSight(candidateSessionId, sessionId)) {
        visibleOpponents += 1;
      }
    });

    return visibleOpponents > 0 && nearbyAllies === 0;
  }

  private _getThreatLevel(sessionId: string, player: PlayerState) {
    let visibleOpponents = 0;
    let closestOpponentDistance = Number.POSITIVE_INFINITY;

    this.state.players.forEach((candidate, candidateSessionId) => {
      if (!candidate.alive || candidate.team === player.team) return;
      const distance = Math.hypot(candidate.x - player.x, candidate.y - player.y);
      closestOpponentDistance = Math.min(closestOpponentDistance, distance);
      if (this._hasLineOfSight(candidateSessionId, sessionId)) {
        visibleOpponents += 1;
      }
    });

    const pressure = closestOpponentDistance < 220 ? 0.26 : closestOpponentDistance < 380 ? 0.18 : 0.1;
    return Math.min(0.38, pressure + visibleOpponents * 0.04);
  }

  private _distancePointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return Math.hypot(px - x1, py - y1);
    }

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + dx * t;
    const projY = y1 + dy * t;
    return Math.hypot(px - projX, py - projY);
  }

  private _applyMovement(player: PlayerState, runtime: PlayerRuntimeState, rawDx: number, rawDy: number, dtSec: number) {
    let dx = rawDx;
    let dy = rawDy;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    let speedMultiplier = 1;
    if (Date.now() < runtime.dashEndsAt) {
      dx = runtime.dashVectorX;
      dy = runtime.dashVectorY;
      speedMultiplier = BOT_DASH_SPEED_MULTIPLIER;
    }

    player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x + dx * PLAYER_SPEED * speedMultiplier * dtSec));
    player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, player.y + dy * PLAYER_SPEED * speedMultiplier * dtSec));
  }

  private _getSpawnPosition(team: number, slotIndex: number) {
    const x = team === 0 ? ARENA_W * 0.22 : ARENA_W * 0.78;
    const y = slotIndex === 0 ? ARENA_H * 0.35 : ARENA_H * 0.65;
    return { x, y };
  }

  private _clampUnit(value: unknown) {
    const safeValue = Number.isFinite(value as number) ? Number(value) : 0;
    return Math.max(-1, Math.min(1, safeValue));
  }

  private _normalizeAngle(value: unknown) {
    const safeValue = Number.isFinite(value as number) ? Number(value) : 0;
    return Math.atan2(Math.sin(safeValue), Math.cos(safeValue));
  }

  private async _persistMatchResult() {
    if (this.persistenceStarted || this.state.winnerTeam < 0) {
      return;
    }

    this.persistenceStarted = true;
    const completedAt = new Date().toISOString();
    const team0Score = this._getTeamScore(0);
    const team1Score = this._getTeamScore(1);

    try {
      const participants = Array.from(this.state.players.entries())
        .map(([sessionId, player]) => ({
          sessionId,
          player,
          runtime: this.playerRuntime.get(sessionId),
          authUserId: this.playerRuntime.get(sessionId)?.authUserId ?? this.participantUserIds.get(sessionId),
        }))
        .filter((entry) => !entry.runtime?.isBot);

      if (participants.length === 0 || participants.some((entry) => !entry.authUserId)) {
        throw new Error("Missing team duel participants for match persistence.");
      }

      await this._persistWithRetry({
        matchId: `${this.roomName}:${this.roomId}`,
        roomId: this.roomId,
        roomKind: this.roomName,
        mode: "team_duel",
        startedAt: this.matchStartedAt,
        completedAt,
        lobbyRoomId: this.lobbyRoomId,
        players: participants.map(({ player, authUserId }) => ({
          userId: authUserId!,
          displayName: player.displayName,
          opponentUserId: participants.find((entry) => entry.player.team !== player.team)?.authUserId ?? null,
          result: player.team === this.state.winnerTeam ? "win" : "loss",
          roundsWon: player.team === 0 ? team0Score : team1Score,
          roundsLost: player.team === 0 ? team1Score : team0Score,
        })),
      });

      this.broadcast("match-persisted", {
        matchId: `${this.roomName}:${this.roomId}`,
        completedAt,
        winnerId: this.state.winnerId,
        winnerTeam: this.state.winnerTeam,
        status: "ok",
      });
      this._broadcastRoomMetrics(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown persistence error.";
      this.broadcast("match-persisted", {
        matchId: `${this.roomName}:${this.roomId}`,
        completedAt,
        winnerId: this.state.winnerId,
        winnerTeam: this.state.winnerTeam,
        status: "error",
        message,
      });
      this._broadcastRoomMetrics(true);
    }
  }

  private async _persistWithRetry(payload: Parameters<typeof persistAuthoritativeMatchResult>[0]) {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < PERSIST_MAX_ATTEMPTS) {
      attempt += 1;
      try {
        await persistAuthoritativeMatchResult(payload);
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= PERSIST_MAX_ATTEMPTS) {
          break;
        }
        const delayMs = PERSIST_BASE_RETRY_MS * attempt;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, delayMs);
        });
      }
    }

    throw lastError instanceof Error
      ? new Error(`Failed to persist team duel match after retries: ${lastError.message}`)
      : new Error("Failed to persist team duel match after retries.");
  }
}