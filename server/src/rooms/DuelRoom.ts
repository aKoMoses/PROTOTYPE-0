import { Room, Client, CloseCode } from "colyseus";
import * as jwt from "jsonwebtoken";
import { DuelState, PlayerState } from "./schema/DuelState";
import { persistAuthoritativeMatchResult } from "../lib/matchPersistence";
import { loadLobbyRoomConfig } from "../lib/lobbyRoom";
import { circleIntersectsRect, moveCircleWithCollisions } from "../lib/networkArena";
import { DEFAULT_NETWORK_MAP_KEY, getNetworkMapConfig } from "../../../src/lib/maps/network-map-config.js";

// ─── Arena constants (must match client config) ──────────────────────────────
const PLAYER_RADIUS = 18;
const PLAYER_MAX_HP = 280;
const PLAYER_SPEED = 420;       // px/s
const BULLET_SPEED = 1320;      // px/s
const BULLET_DAMAGE = 9;        // pulse rifle default
const BULLET_RADIUS = 6;
const BULLET_LIFETIME = 1.0;    // seconds
const FIRE_COOLDOWN_MS = 180;

// ─── Match constants ──────────────────────────────────────────────────────────
const TICK_RATE = 20;           // Hz
const ROUNDS_TO_WIN = 2;
const COUNTDOWN_MS = 3_000;
const ROUND_END_MS = 3_000;
const RECONNECT_WINDOW_SECONDS = 20;
const METRICS_BROADCAST_INTERVAL_MS = 2_000;
const PERSIST_MAX_ATTEMPTS = 4;
const PERSIST_BASE_RETRY_MS = 500;

// ─── Types ────────────────────────────────────────────────────────────────────
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
  life: number; // seconds remaining
}

interface PlayerRuntimeState {
  authUserId: string;
  lastSeqId: number;
  lastFireAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export class DuelRoom extends Room {
  maxClients = 2;
  state = new DuelState();
  private inputs = new Map<string, InputPayload>();
  private playerRuntime = new Map<string, PlayerRuntimeState>();
  private bullets: Bullet[] = [];
  private nextBulletId = 1;
  private phaseEndTime = 0;
  private lobbyRoomId: string | null = null;
  private matchStartedAt = new Date().toISOString();
  private participantUserIds = new Map<string, string>();
  private mapConfig = getNetworkMapConfig(DEFAULT_NETWORK_MAP_KEY);
  private droppedConnections = 0;
  private recoveredConnections = 0;
  private failedReconnections = 0;
  private lastMetricsBroadcastAt = 0;
  private persistenceStarted = false;
  private persistenceResolved = false;

  // ─── Message handlers ────────────────────────────────────────────────────

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

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  async onCreate(options: any) {
    this.setState(this.state);
    this.lobbyRoomId = typeof options?.lobbyRoomId === "string" && options.lobbyRoomId.trim()
      ? options.lobbyRoomId.trim()
      : null;

    if (this.lobbyRoomId) {
      const lobbyConfig = await loadLobbyRoomConfig(this.lobbyRoomId);
      if (lobbyConfig.format !== "1v1") {
        throw new Error("Duel room requires a 1v1 custom room.");
      }
      this.mapConfig = getNetworkMapConfig(lobbyConfig.mapKey);
    } else {
      const requestedMapKey = typeof options?.mapKey === "string" && options.mapKey.trim()
        ? options.mapKey.trim()
        : DEFAULT_NETWORK_MAP_KEY;
      this.mapConfig = getNetworkMapConfig(requestedMapKey);
    }

    this.matchStartedAt = new Date().toISOString();
    this.setMetadata({
      lobbyRoomId: this.lobbyRoomId,
      mapKey: this.mapConfig.key,
      mapName: this.mapConfig.name,
    });
    this.setSimulationInterval((dt) => this._tick(dt), 1000 / TICK_RATE);
  }

  async onAuth(_client: Client, options: any) {
    const token: string | undefined = options?.token;

    if (!token) {
      // No token provided — allow in dev, deny in production when secret is set.
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (secret) throw new Error("Authentication required.");
      return { id: _client.sessionId, displayName: options?.displayName ?? "Pilot" };
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      // Secret not configured — decode without verification (dev mode).
      const decoded = jwt.decode(token) as Record<string, any> | null;
      return {
        id: decoded?.sub ?? _client.sessionId,
        displayName: options?.displayName ?? "Pilot",
      };
    }

    try {
      const decoded = jwt.verify(token, secret) as Record<string, any>;
      return { id: decoded.sub, displayName: options?.displayName ?? "Pilot" };
    } catch {
      throw new Error("Invalid authentication token.");
    }
  }

  onJoin(client: Client, _options: any, auth: { id: string; displayName: string }) {
    const p = new PlayerState();
    const isFirst = this.state.players.size === 0;
    const spawn = isFirst ? this.mapConfig.duelSpawns.blue : this.mapConfig.duelSpawns.red;
    p.x = spawn.x;
    p.y = spawn.y;
    p.hp = PLAYER_MAX_HP;
    p.alive = true;
    p.connected = true;
    p.team = isFirst ? 0 : 1;
    p.roundScore = 0;
    p.displayName = auth?.displayName ?? "Pilot";
    this.state.players.set(client.sessionId, p);
    this.playerRuntime.set(client.sessionId, {
      authUserId: auth?.id ?? client.sessionId,
      lastSeqId: -1,
      lastFireAt: 0,
    });
    this.participantUserIds.set(client.sessionId, auth?.id ?? client.sessionId);

    if (this.state.players.size === 2 && this.state.phase === "waiting") {
      this._startCountdown();
    }
  }

  async onLeave(client: Client, code: number) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;

    const consented = code === CloseCode.CONSENTED;
    if (!consented && this.state.phase !== "match_end") {
      this.droppedConnections += 1;
      p.connected = false;
      this.inputs.delete(client.sessionId);

      try {
        await this.allowReconnection(client, RECONNECT_WINDOW_SECONDS);
        return;
      } catch {
        this.failedReconnections += 1;
        // Reconnection timed out; resolve as a permanent departure below.
      }
    }

    this._handlePermanentDeparture(client.sessionId);
  }

  onReconnect(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = true;
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
    this.participantUserIds.clear();
  }

  // ─── Phase management ────────────────────────────────────────────────────

  private _startCountdown() {
    this.state.phase = "countdown";
    this.phaseEndTime = Date.now() + COUNTDOWN_MS;
    this.state.phaseTimer = COUNTDOWN_MS;
    this._broadcastBullets();
  }

  private _startRound() {
    this.state.phase = "active";
    this.state.phaseTimer = 0;
    this.bullets = [];
    this.inputs.clear();

    let i = 0;
    this.state.players.forEach((p: PlayerState) => {
      const spawn = i === 0 ? this.mapConfig.duelSpawns.blue : this.mapConfig.duelSpawns.red;
      p.x = spawn.x;
      p.y = spawn.y;
      p.hp = PLAYER_MAX_HP;
      p.alive = true;
      p.connected = true;
      i++;
    });

    this._broadcastBullets();
  }

  private _awardRoundToSurvivor(deadSessionId: string) {
    this.state.players.forEach((p: PlayerState, sid: string) => {
      if (sid !== deadSessionId && p.alive) {
        p.roundScore++;
      }
    });
    this.state.phase = "round_end";
    this.phaseEndTime = Date.now() + ROUND_END_MS;
    this.state.phaseTimer = ROUND_END_MS;
    this.inputs.clear();
    this.bullets = [];
    this._broadcastBullets();
  }

  private _handlePermanentDeparture(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    this.inputs.delete(sessionId);
    this.playerRuntime.delete(sessionId);

    if (this.state.phase === "active" && player.alive) {
      player.connected = false;
      player.alive = false;
      this._awardRoundToSurvivor(sessionId);
      return;
    }

    this.state.players.delete(sessionId);

    if (this.state.phase === "countdown" || this.state.phase === "round_end") {
      this.state.phase = this.state.players.size >= 2 ? this.state.phase : "waiting";
      this.state.phaseTimer = 0;
    }

    if (this.state.phase === "waiting") {
      this.state.winnerId = "";
      this.state.winnerTeam = -1;
      this.inputs.clear();
      this.bullets = [];
      this._broadcastBullets();
    }
  }

  // ─── Game loop ───────────────────────────────────────────────────────────

  private _tick(dt: number) {
    const dtSec = dt / 1_000;

    if (this.state.phase === "countdown") {
      const rem = this.phaseEndTime - Date.now();
      this.state.phaseTimer = Math.max(0, rem);
      if (rem <= 0) this._startRound();
      return;
    }

    if (this.state.phase === "round_end") {
      const rem = this.phaseEndTime - Date.now();
      this.state.phaseTimer = Math.max(0, rem);
      if (rem <= 0) {
        if (this.playerRuntime.size < 2) {
          const remainingSessionId = Array.from(this.playerRuntime.keys())[0] ?? "";
          const remainingPlayer = remainingSessionId ? this.state.players.get(remainingSessionId) : null;
          this.state.winnerId = remainingSessionId;
          this.state.winnerTeam = remainingPlayer?.team ?? -1;
          this.state.phase = "match_end";
          void this._persistMatchResult();
          return;
        }

        let matchOver = false;
        this.state.players.forEach((p: PlayerState) => {
          if (p.roundScore >= ROUNDS_TO_WIN) matchOver = true;
        });
        if (matchOver) {
          this.state.players.forEach((p: PlayerState, sid: string) => {
            if (p.roundScore >= ROUNDS_TO_WIN) {
              this.state.winnerId = sid;
              this.state.winnerTeam = p.team;
            }
          });
          this.state.phase = "match_end";
          void this._persistMatchResult();
        } else {
          this.state.round++;
          this._startCountdown();
        }
      }
      return;
    }

    if (this.state.phase !== "active") return;

    this._broadcastRoomMetrics();

    // ── Move players ────────────────────────────────────────────────────────
    this.state.players.forEach((p: PlayerState, sid: string) => {
      if (!p.alive) return;
      const inp = this.inputs.get(sid);
      if (!inp) return;

      p.facing = inp.facing;

      let dx = inp.dx;
      let dy = inp.dy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) { dx /= len; dy /= len; }

      const moved = moveCircleWithCollisions(
        p.x,
        p.y,
        PLAYER_RADIUS,
        dx * PLAYER_SPEED * dtSec,
        dy * PLAYER_SPEED * dtSec,
        this.mapConfig.arena.width,
        this.mapConfig.arena.height,
        this.mapConfig.obstacles,
      );
      p.x = moved.x;
      p.y = moved.y;
    });

    // ── Update bullets + hit detection ──────────────────────────────────────
    const survivingBullets: Bullet[] = [];

    for (const b of this.bullets) {
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;
      b.life -= dtSec;

      if (
        b.life <= 0 ||
        b.x < 0 ||
        b.x > this.mapConfig.arena.width ||
        b.y < 0 ||
        b.y > this.mapConfig.arena.height ||
        this.mapConfig.obstacles.some((obstacle: { x: number; y: number; w: number; h: number }) => circleIntersectsRect(b.x, b.y, BULLET_RADIUS, obstacle))
      ) continue;

      let hit = false;
      this.state.players.forEach((p: PlayerState, sid: string) => {
        if (hit || sid === b.ownerId || !p.alive) return;
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        if (dx * dx + dy * dy <= (PLAYER_RADIUS + BULLET_RADIUS) ** 2) {
          p.hp = Math.max(0, p.hp - BULLET_DAMAGE);
          if (p.hp === 0) {
            p.alive = false;
            this._awardRoundToSurvivor(sid);
          }
          hit = true;
        }
      });

      if (!hit) survivingBullets.push(b);
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
      if (player.connected) connectedPlayers += 1;
    });

    this.lastMetricsBroadcastAt = now;
    this.broadcast("room-metrics", {
      roomId: this.roomId,
      phase: this.state.phase,
      round: this.state.round,
      connectedPlayers,
      totalPlayers: this.state.players.size,
      droppedConnections: this.droppedConnections,
      recoveredConnections: this.recoveredConnections,
      failedReconnections: this.failedReconnections,
      persistenceResolved: this.persistenceResolved,
      ts: now,
    });
  }

  private _tryFire(sessionId: string, requestedAngle: unknown) {
    if (this.state.phase !== "active") return;

    const runtime = this.playerRuntime.get(sessionId);
    const p = this.state.players.get(sessionId);
    if (!runtime || !p?.alive || !p.connected) return;

    const now = Date.now();
    if (now - runtime.lastFireAt < FIRE_COOLDOWN_MS) return;

    const angle = this._normalizeAngle(
      Number.isFinite(requestedAngle as number) ? Number(requestedAngle) : p.facing,
    );

    runtime.lastFireAt = now;
    p.facing = angle;
    this.bullets.push({
      id: this.nextBulletId++,
      ownerId: sessionId,
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: BULLET_LIFETIME,
    });
  }

  private _broadcastBullets() {
    this.broadcast("bullets", this.bullets.map((b) => ({ id: b.id, x: b.x, y: b.y })));
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
    if (this.persistenceStarted || !this.state.winnerId) {
      return;
    }

    this.persistenceStarted = true;
    const completedAt = new Date().toISOString();

    try {
      const winnerSessionId = this.state.winnerId;
      const loserSessionId = Array.from(this.state.players.keys()).find((sid) => sid !== winnerSessionId) ?? "";
      const winner = this.state.players.get(winnerSessionId);
      const loser = loserSessionId ? this.state.players.get(loserSessionId) : null;
      const winnerRuntime = this.playerRuntime.get(winnerSessionId);
      const loserRuntime = loserSessionId ? this.playerRuntime.get(loserSessionId) : null;
      const winnerUserId = winnerRuntime?.authUserId ?? this.participantUserIds.get(winnerSessionId);
      const loserUserId = loserRuntime?.authUserId ?? (loserSessionId ? this.participantUserIds.get(loserSessionId) : undefined);

      if (!winner || !loser || !winnerUserId || !loserUserId) {
        throw new Error("Missing duel participants for match persistence.");
      }

      await this._persistWithRetry({
        matchId: `${this.roomName}:${this.roomId}`,
        roomId: this.roomId,
        roomKind: this.roomName,
        mode: "duel",
        startedAt: this.matchStartedAt,
        completedAt,
        lobbyRoomId: this.lobbyRoomId,
        mapKey: this.mapConfig.key,
        mapName: this.mapConfig.name,
        players: [
          {
            userId: winnerUserId,
            displayName: winner.displayName,
            result: "win",
            roundsWon: winner.roundScore,
            roundsLost: loser.roundScore,
          },
          {
            userId: loserUserId,
            displayName: loser.displayName,
            result: "loss",
            roundsWon: loser.roundScore,
            roundsLost: winner.roundScore,
          },
        ],
      });

      this.persistenceResolved = true;
      this.broadcast("match-persisted", {
        matchId: `${this.roomName}:${this.roomId}`,
        completedAt,
        winnerId: winnerSessionId,
        status: "ok",
      });
      this._broadcastRoomMetrics(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown persistence error.";
      this.broadcast("match-persisted", {
        matchId: `${this.roomName}:${this.roomId}`,
        completedAt,
        winnerId: this.state.winnerId,
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
      ? new Error(`Failed to persist authoritative match after retries: ${lastError.message}`)
      : new Error("Failed to persist authoritative match after retries.");
  }
}
