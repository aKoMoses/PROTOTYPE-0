import { joinDuelRoom, joinTeamDuelRoom, leaveCurrentRoom, reconnectToRoom } from "../../lib/colyseus/client.js";
import { getAccountSnapshot, refreshAccountState } from "../../lib/account/service.js";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase/client.js";

// ─── Arena constants (must match server config) ───────────────────────────────
const ARENA_W = 1600;
const ARENA_H = 900;
const PLAYER_RADIUS = 18;
const MAX_HP = 280;
const RECONNECT_RETRY_MS = 1500;
const RECONNECT_MAX_ATTEMPTS = 5;
const NET_DEGRADED_AFTER_MS = 700;
const NET_LOST_AFTER_MS = 2500;
const RENDER_LERP_ALPHA = 0.25;

// ─────────────────────────────────────────────────────────────────────────────

export class MultiplayerMatch {
  /**
   * @param {{
   *   root: HTMLElement,
   *   onExit: () => void,
   *   supabaseRoom: object|null
   * }} opts
   */
  constructor({ root, onExit, supabaseRoom }) {
    this.root = root;
    this.onExit = onExit;
    this.supabaseRoom = supabaseRoom;
    this.roomType = this.supabaseRoom?.format === "2v2" ? "team_duel" : "duel";

    /** @type {import("@colyseus/sdk").Room|null} */
    this.room = null;
    this.sessionId = null;
    this.state = null;
    this.bullets = [];
    this.reconnectionToken = null;
    this.renderPlayers = new Map();

    this.rafId = null;
    this.inputInterval = null;
    this.seqId = 0;
    this.reconnectPromise = null;
    this.disposed = false;
    this.matchPersistence = { status: "idle", message: "" };
    this.netMetrics = {
      droppedConnections: 0,
      recoveredConnections: 0,
      failedReconnections: 0,
      connectedPlayers: 0,
      totalPlayers: 0,
    };
    this.netHealth = {
      quality: "init",
      lastStateAt: 0,
      staleMs: 0,
    };

    this.keys = new Set();
    this.mouseX = ARENA_W / 2;
    this.mouseY = ARENA_H / 2;

    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundClick = this._onCanvasClick.bind(this);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  mount() {
    this.disposed = false;
    this.root.innerHTML = this._renderHtml();

    this.canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("mp-canvas"));
    this.ctx = this.canvas?.getContext("2d");
    this.statusEl = document.getElementById("mp-status");

    this.root.querySelector("[data-action='leave-match']")
      ?.addEventListener("click", () => this.dispose());

    this._bindInputListeners();
    this._startRenderLoop();
    void this._connect();
  }

  dispose() {
    this.disposed = true;
    this._stopInputLoop();
    this._unbindInputListeners();
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    leaveCurrentRoom();
    this.room = null;
    this.state = null;
    this.reconnectionToken = null;
    this.onExit?.();
  }

  // ─── HTML ──────────────────────────────────────────────────────────────────

  _renderHtml() {
    return `
      <div class="play-page play-page--match">
        <div class="mp-hud">
          <button class="play-btn play-btn--outline" data-action="leave-match" type="button">← Quitter</button>
          <span class="mp-status" id="mp-status">Connexion au serveur…</span>
          <span class="mp-hint">WASD · Souris pour viser · Clic pour tirer</span>
        </div>
        <div class="mp-canvas-wrap">
          <canvas id="mp-canvas" width="${ARENA_W}" height="${ARENA_H}"
            class="mp-canvas" tabindex="0" style="outline:none;cursor:crosshair;"></canvas>
        </div>
      </div>
    `;
  }

  // ─── Colyseus connection ───────────────────────────────────────────────────

  async _connect() {
    const snapshot = getAccountSnapshot();
    let token = null;

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        const { data } = await sb.auth.getSession();
        token = data?.session?.access_token ?? null;
      } catch { /* ignore — server will allow in dev mode */ }
    }

    const opts = {
      token,
      displayName: snapshot?.profile?.display_name ?? "Pilot",
      lobbyRoomId: this.supabaseRoom?.id ?? null,
    };

    try {
      this.room = this.roomType === "team_duel"
        ? await joinTeamDuelRoom(opts)
        : await joinDuelRoom(opts);
      this.sessionId = this.room.sessionId;
      this.reconnectionToken = this.room.reconnectionToken ?? null;
      this.netHealth.lastStateAt = Date.now();
      this._setStatus("En attente d'un adversaire…");
      this._bindRoomEvents(this.room);
      this._startInputLoop();
    } catch (err) {
      this._setStatus(`Erreur : ${err?.message ?? "impossible de rejoindre le serveur"}`);
    }
  }

  _bindRoomEvents(room) {
    room.onStateChange((state) => {
      if (this.disposed || room !== this.room) return;
      this.state = state;
      this.netHealth.lastStateAt = Date.now();
      this._updateHudStatus(state);
    });

    room.onMessage("bullets", (data) => {
      if (this.disposed || room !== this.room) return;
      this.bullets = Array.isArray(data) ? data : [];
      this.netHealth.lastStateAt = Date.now();
    });

    room.onMessage("room-metrics", (payload) => {
      if (this.disposed || room !== this.room || !payload || typeof payload !== "object") return;
      this.netMetrics = {
        droppedConnections: Number(payload.droppedConnections ?? this.netMetrics.droppedConnections),
        recoveredConnections: Number(payload.recoveredConnections ?? this.netMetrics.recoveredConnections),
        failedReconnections: Number(payload.failedReconnections ?? this.netMetrics.failedReconnections),
        connectedPlayers: Number(payload.connectedPlayers ?? this.netMetrics.connectedPlayers),
        totalPlayers: Number(payload.totalPlayers ?? this.netMetrics.totalPlayers),
      };
    });

    room.onMessage("match-persisted", (payload) => {
      if (this.disposed || room !== this.room) return;
      this.matchPersistence = payload?.status === "ok"
        ? { status: "ok", message: "Résultat synchronisé avec Supabase." }
        : { status: "error", message: payload?.message ?? "Résultat non synchronisé." };
      if (payload?.status === "ok") {
        void refreshAccountState();
      }
      this._updateHudStatus(this.state);
    });

    room.onDrop(() => {
      if (this.disposed || room !== this.room) return;
      this._stopInputLoop();
      this.netMetrics.droppedConnections += 1;
      this._setStatus("Connexion perdue… tentative de reconnexion");
      void this._attemptReconnect();
    });

    room.onReconnect(() => {
      if (this.disposed || room !== this.room) return;
      this.netMetrics.recoveredConnections += 1;
      this._setStatus("Connexion rétablie");
      this._startInputLoop();
    });

    room.onLeave((code) => {
      if (this.disposed || room !== this.room) return;
      this._stopInputLoop();
      this.bullets = [];
      this._setStatus(`Déconnecté du serveur (code ${code})`);
    });

    room.onError((_code, message) => {
      if (this.disposed || room !== this.room) return;
      this._setStatus(`Erreur réseau : ${message ?? "room error"}`);
    });
  }

  async _attemptReconnect() {
    if (this.disposed || this.reconnectPromise || !this.reconnectionToken) {
      return;
    }

    this.reconnectPromise = (async () => {
      let lastError = null;
      for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
        if (this.disposed) return;
        try {
          this._setStatus(`Connexion perdue… reconnexion ${attempt}/${RECONNECT_MAX_ATTEMPTS}`);
          const room = await reconnectToRoom(this.reconnectionToken);
          if (this.disposed) {
            room.leave();
            return;
          }

          this.room = room;
          this.sessionId = room.sessionId;
          this.reconnectionToken = room.reconnectionToken ?? this.reconnectionToken;
          this.bullets = [];
          this._bindRoomEvents(room);
          this._setStatus("Connexion rétablie");
          this._startInputLoop();
          return;
        } catch (error) {
          lastError = error;
          if (attempt < RECONNECT_MAX_ATTEMPTS) {
            await this._wait(RECONNECT_RETRY_MS);
          }
        }
      }

      this._setStatus(`Reconnexion impossible : ${lastError?.message ?? "timeout"}`);
      this.netMetrics.failedReconnections += 1;
    })().finally(() => {
      this.reconnectPromise = null;
    });

    await this.reconnectPromise;
  }

  _wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  // ─── Status helpers ────────────────────────────────────────────────────────

  _setStatus(msg) {
    if (this.statusEl) this.statusEl.textContent = msg;
  }

  _updateHudStatus(state) {
    const netSuffix = this._getNetworkStatusSuffix();
    const phase = state.phase;
    if (phase === "waiting") {
      const base = this.roomType === "team_duel" ? "En attente des autres joueurs…" : "En attente d'un adversaire…";
      this._setStatus(`${base}${netSuffix}`);
    } else if (phase === "countdown") {
      const sec = Math.ceil(state.phaseTimer / 1000);
      this._setStatus(`Match dans ${sec || "GO"}…${netSuffix}`);
    } else if (phase === "active") {
      const base = this.roomType === "team_duel" ? `Manche ${state.round} — 2v2 en cours` : `Round ${state.round} — en cours`;
      this._setStatus(`${base}${netSuffix}`);
    } else if (phase === "round_end") {
      this._setStatus(`Round terminé${netSuffix}`);
    } else if (phase === "match_end") {
      const me = state.players?.get(this.sessionId);
      const winner = state.players?.get(state.winnerId);
      const name = winner?.displayName ?? "?";
      const baseLabel = typeof state.winnerTeam === "number" && state.winnerTeam >= 0 && me
        ? (state.winnerTeam === me.team ? "Victoire !" : "Défaite !")
        : state.winnerId === this.sessionId
          ? "Victoire !"
          : `${name} gagne le match`;
      if (this.matchPersistence.status === "ok") {
        this._setStatus(`${baseLabel} · Supabase OK${netSuffix}`);
      } else if (this.matchPersistence.status === "error") {
        this._setStatus(`${baseLabel} · Sync Supabase échouée${netSuffix}`);
      } else {
        this._setStatus(`${baseLabel} · Enregistrement du résultat…${netSuffix}`);
      }
    }
  }

  _getNetworkStatusSuffix() {
    const labels = [];
    if (this.netHealth.quality === "degraded") {
      labels.push("NET: dégradé");
    } else if (this.netHealth.quality === "lost") {
      labels.push("NET: instable");
    }

    if (this.netMetrics.totalPlayers > 0) {
      labels.push(`Connexions ${this.netMetrics.connectedPlayers}/${this.netMetrics.totalPlayers}`);
    }

    if (this.netMetrics.failedReconnections > 0) {
      labels.push(`Reco KO ${this.netMetrics.failedReconnections}`);
    }

    return labels.length ? ` · ${labels.join(" · ")}` : "";
  }

  _updateNetworkHealth() {
    const now = Date.now();
    const staleMs = this.netHealth.lastStateAt ? now - this.netHealth.lastStateAt : Number.POSITIVE_INFINITY;
    this.netHealth.staleMs = staleMs;

    if (!Number.isFinite(staleMs)) {
      this.netHealth.quality = "init";
      return;
    }

    if (staleMs >= NET_LOST_AFTER_MS) {
      this.netHealth.quality = "lost";
      return;
    }

    if (staleMs >= NET_DEGRADED_AFTER_MS) {
      this.netHealth.quality = "degraded";
      return;
    }

    this.netHealth.quality = "good";
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  _bindInputListeners() {
    document.addEventListener("keydown", this._boundKeyDown);
    document.addEventListener("keyup", this._boundKeyUp);
    this.canvas?.addEventListener("mousemove", this._boundMouseMove);
    this.canvas?.addEventListener("click", this._boundClick);
  }

  _unbindInputListeners() {
    document.removeEventListener("keydown", this._boundKeyDown);
    document.removeEventListener("keyup", this._boundKeyUp);
    this.canvas?.removeEventListener("mousemove", this._boundMouseMove);
    this.canvas?.removeEventListener("click", this._boundClick);
  }

  _onKeyDown(e) { this.keys.add(e.code); }
  _onKeyUp(e) { this.keys.delete(e.code); }

  _onMouseMove(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * (ARENA_W / rect.width);
    this.mouseY = (e.clientY - rect.top) * (ARENA_H / rect.height);
  }

  _onCanvasClick() {
    if (!this.room || this.state?.phase !== "active") return;
    const me = this.state.players?.get(this.sessionId);
    if (!me?.alive) return;
    const angle = Math.atan2(this.mouseY - me.y, this.mouseX - me.x);
    this.room.send("fire", { angle });
  }

  _startInputLoop() {
    this._stopInputLoop();
    this.inputInterval = setInterval(() => {
      if (!this.room || this.state?.phase !== "active") return;
      const dx =
        (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
        (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
      const dy =
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
      const me = this.state?.players?.get(this.sessionId);
      const facing = me ? Math.atan2(this.mouseY - me.y, this.mouseX - me.x) : 0;
      this.room.send("input", { dx, dy, facing, firing: false, seqId: this.seqId++ });
    }, 50); // 20 Hz
  }

  _stopInputLoop() {
    if (this.inputInterval) { clearInterval(this.inputInterval); this.inputInterval = null; }
  }

  // ─── Render loop ───────────────────────────────────────────────────────────

  _startRenderLoop() {
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      this._draw();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  _draw() {
    const ctx = this.ctx;
    if (!ctx) return;

    this._updateNetworkHealth();

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Grid
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    for (let x = 0; x <= ARENA_W; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); ctx.stroke();
    }
    for (let y = 0; y <= ARENA_H; y += 100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); ctx.stroke();
    }

    // Arena border
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, ARENA_W - 2, ARENA_H - 2);

    if (!this.state) return;

    // Bullets (server-relayed positions)
    ctx.fillStyle = "#ffe87a";
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players (smoothed rendering from authoritative state)
    const players = this._getRenderablePlayers();
    for (const { sid, p } of players) {
      const isLocal = sid === this.sessionId;
      const localTeam = this.state.players?.get(this.sessionId)?.team;
      const isTeammate = !isLocal && localTeam != null && p.team === localTeam;
      const baseColor = isLocal ? "#4af" : isTeammate ? "#57d6a5" : "#f66";
      const connected = p.connected !== false;

      ctx.globalAlpha = p.alive ? (connected ? 1 : 0.5) : 0.25;

      // Drop shadow
      ctx.beginPath();
      ctx.arc(p.x, p.y + 5, PLAYER_RADIUS * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.fill();
      ctx.strokeStyle = isLocal ? "#fff" : isTeammate ? "#bfffe8" : "#fbb";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Facing line
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(
        p.x + Math.cos(p.facing) * (PLAYER_RADIUS + 14),
        p.y + Math.sin(p.facing) * (PLAYER_RADIUS + 14),
      );
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // HP bar
      const hpFrac = Math.max(0, p.hp / MAX_HP);
      const barW = 48, barH = 5;
      const bx = p.x - barW / 2;
      const by = p.y - PLAYER_RADIUS - 16;
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = hpFrac > 0.5 ? "#4f4" : hpFrac > 0.25 ? "#fa0" : "#f44";
      ctx.fillRect(bx, by, barW * hpFrac, barH);

      // Name + HP label
      ctx.globalAlpha = 1;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = baseColor;
      ctx.fillText(p.displayName, p.x, by - 5);
      ctx.fillStyle = "#888";
      ctx.font = "10px monospace";
      ctx.fillText(
        connected ? `${Math.round(p.hp)} HP` : `RECO ${Math.round(p.hp)} HP`,
        p.x,
        by - 5 + 11,
      );
    }

    ctx.globalAlpha = 1;

    // Score bar
    const scorePlayers = [];
    this.state.players?.forEach((p, sid) => scorePlayers.push({ ...p, sid }));
    if (scorePlayers.length > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(ARENA_W / 2 - 90, 8, 180, 30);
      ctx.fillStyle = "#eee";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      const scoreStr = this.roomType === "team_duel"
        ? `Blue ${Math.max(...scorePlayers.filter((p) => p.team === 0).map((p) => p.roundScore), 0)}  ·  Red ${Math.max(...scorePlayers.filter((p) => p.team === 1).map((p) => p.roundScore), 0)}`
        : scorePlayers.map((p) => `${p.displayName} ${p.roundScore}`).join("  ·  ");
      ctx.fillText(scoreStr, ARENA_W / 2, 28);
    }

    // Countdown overlay
    if (this.state.phase === "countdown") {
      const sec = Math.ceil(this.state.phaseTimer / 1000);
      const label = sec > 0 ? String(sec) : "GO !";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(ARENA_W / 2 - 70, ARENA_H / 2 - 55, 140, 80);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 56px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, ARENA_W / 2, ARENA_H / 2 + 16);
    }

    // Match end overlay
    if (this.state.phase === "match_end") {
      const winner = this.state.players?.get(this.state.winnerId);
      const me = this.state.players?.get(this.sessionId);
      const isWinner = typeof this.state.winnerTeam === "number" && this.state.winnerTeam >= 0 && me
        ? this.state.winnerTeam === me.team
        : this.state.winnerId === this.sessionId;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(ARENA_W / 2 - 220, ARENA_H / 2 - 55, 440, 90);
      ctx.fillStyle = isWinner ? "#ffe87a" : "#f66";
      ctx.font = "bold 30px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        isWinner ? "Victoire !" : this.roomType === "team_duel" ? "Défaite !" : `${winner?.displayName ?? "?"} gagne !`,
        ARENA_W / 2, ARENA_H / 2 + 12,
      );
    }

    // Round end overlay
    if (this.state.phase === "round_end") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(ARENA_W / 2 - 120, ARENA_H / 2 - 30, 240, 50);
      ctx.fillStyle = "#ccc";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Round terminé", ARENA_W / 2, ARENA_H / 2 + 8);
    }

    if (this.netHealth.quality !== "good" && this.netHealth.quality !== "init") {
      const badge = this.netHealth.quality === "lost" ? "Réseau instable" : "Réseau dégradé";
      ctx.fillStyle = this.netHealth.quality === "lost" ? "rgba(168,40,40,0.88)" : "rgba(140,100,20,0.88)";
      ctx.fillRect(ARENA_W - 220, 12, 208, 28);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${badge} · ${Math.round(this.netHealth.staleMs)}ms`, ARENA_W - 116, 30);
    }
  }

  _getRenderablePlayers() {
    const output = [];
    const seen = new Set();

    this.state.players?.forEach((player, sid) => {
      seen.add(sid);
      const prev = this.renderPlayers.get(sid);
      const isLocal = sid === this.sessionId;
      const alpha = isLocal ? 1 : RENDER_LERP_ALPHA;

      const next = prev
        ? {
          ...prev,
          x: prev.x + (player.x - prev.x) * alpha,
          y: prev.y + (player.y - prev.y) * alpha,
          facing: prev.facing + (player.facing - prev.facing) * alpha,
          hp: player.hp,
          alive: player.alive,
          connected: player.connected,
          team: player.team,
          roundScore: player.roundScore,
          displayName: player.displayName,
        }
        : { ...player };

      this.renderPlayers.set(sid, next);
      output.push({ sid, p: next });
    });

    for (const sid of this.renderPlayers.keys()) {
      if (!seen.has(sid)) {
        this.renderPlayers.delete(sid);
      }
    }

    return output;
  }
}
