import { PrematchStepBase } from "./step-base.js";
import {
  listRoomMembers,
  leaveRoom,
  setReady,
  kickMember,
  swapMemberTeam,
  startRoom,
  subscribeToRoom,
  updateMemberLoadout,
} from "../../lib/rooms/service.js";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase/client.js";
import { playUiCue } from "../../audio.js";
import { DeckPickerPanel } from "./deck-picker-panel.js";
import { loadout as activeLoadout } from "../../state/app-state.js";

const FORCE_START_SECONDS = 10;

/**
 * CustomRoomLobbyStep — Blue Team / Red Team layout, ready button, host controls.
 * Mounted when a player creates or joins a custom room.
 */
export class CustomRoomLobbyStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "custom-lobby", phaseKey: "custom-lobby" });

    this._room           = null;   // { id, name, format, max_players }
    this._members        = [];     // array of member rows from Supabase
    this._localPlayerId  = null;
    this._isHost         = false;
    this._isReady        = false;
    this._forceStartMs   = 0;      // countdown ms, 0 = no countdown
    this._unsubscribe    = null;
    this._raf            = null;
    this._lastTs         = null;
    this._deckPicker     = null;   // DeckPickerPanel instance
    this._selectedLoadoutId = null; // currently chosen deck id

    this._onScreenClick  = this._onScreenClick.bind(this);
    this._onReady        = this._onReady.bind(this);
    this._onLeave        = this._onLeave.bind(this);
    this._onEnterLobby   = this._onEnterLobby.bind(this);
  }

  /* ── Lifecycle ───────────────────────── */

  mount() {
    super.mount();
    window.addEventListener("p0-enter-custom-lobby", this._onEnterLobby);
  }

  /** Called after "p0-enter-custom-lobby" fires with room data. */
  async _initRoom(room) {
    this._room = room;
    this._localPlayerId = await this._getLocalPlayerId();

    const screen = this.getScreen();
    if (!screen) return;

    screen.addEventListener("click", this._onScreenClick);

    this._render();
    await this._refreshMembers();

    this._unsubscribe = subscribeToRoom(room.id, () => this._refreshMembers());

    // Start per-frame update for force-start countdown
    this._lastTs = performance.now();
    const loop = (ts) => {
      if (!this.mounted) return;
      const dt = ts - this._lastTs;
      this._lastTs = ts;
      this._tickForceStart(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  unmount() {
    super.unmount();
    window.removeEventListener("p0-enter-custom-lobby", this._onEnterLobby);

    cancelAnimationFrame(this._raf);
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._deckPicker?.close();
    this._deckPicker = null;

    const screen = this.getScreen();
    screen?.removeEventListener("click", this._onScreenClick);
  }

  /* ── Data ────────────────────────────── */

  async _getLocalPlayerId() {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      return session?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  async _refreshMembers() {
    if (!this._room) return;
    const { data } = await listRoomMembers(this._room.id);
    this._members = data ?? [];
    const self = this._members.find(m => m.player_id === this._localPlayerId);
    this._isHost  = self?.is_host  ?? false;
    this._isReady = self?.is_ready ?? false;
    this._renderRoster();
    this._renderActionBar();
  }

  /* ── Render ──────────────────────────── */

  _render() {
    const screen = this.getScreen();
    if (!screen || !this._room) return;

    const format = this._room.format ?? "1v1";
    const teamSize = format === "2v2" ? 2 : 1;

    screen.innerHTML = `
      <!-- Force-start countdown banner -->
      <div class="cr-force-start-banner is-hidden" id="cr-force-start-banner">
        <span>Démarrage forcé dans</span>
        <strong class="cr-force-start-banner__timer" id="cr-force-start-timer">10</strong>
        <span>sec...</span>
        <button class="cr-force-start-banner__cancel" id="cr-cancel-force" type="button">Annuler</button>
      </div>

      <!-- Top bar -->
      <div class="cr-lobby__topbar">
        <div class="cr-lobby__room-info">
          <span class="cr-lobby__room-name">${escapeHtml(this._room.name)}</span>
          <div class="cr-lobby__room-meta">
            <span class="format-badge format-badge--${format}">${format}</span>
            <span>Custom Game</span>
          </div>
        </div>
        <button class="cr-lobby__leave-btn" id="cr-leave-btn" type="button">← Quitter</button>
      </div>

      <!-- Blue vs Red -->
      <div class="cr-lobby__versus">
        <!-- Blue Team -->
        <div class="cr-team-col cr-team-col--blue" id="cr-team-blue">
          <div class="cr-team-header cr-team-header--blue">
            <span class="cr-team-label">Équipe Bleue</span>
            <span class="cr-team-score" id="cr-blue-count">0/${teamSize}</span>
          </div>
          <div class="cr-team-slots" id="cr-slots-blue">
            ${this._renderEmptySlots(teamSize)}
          </div>
        </div>

        <!-- Divider -->
        <div class="cr-versus-divider">
          <div class="cr-versus-line"></div>
          <span class="cr-versus-text">VS</span>
          <div class="cr-versus-line"></div>
        </div>

        <!-- Red Team -->
        <div class="cr-team-col cr-team-col--red" id="cr-team-red">
          <div class="cr-team-header cr-team-header--red">
            <span class="cr-team-label">Équipe Rouge</span>
            <span class="cr-team-score" id="cr-red-count">0/${teamSize}</span>
          </div>
          <div class="cr-team-slots" id="cr-slots-red">
            ${this._renderEmptySlots(teamSize)}
          </div>
        </div>
      </div>

      <!-- Action bar (ready + host controls) -->
      <div class="cr-lobby__action-bar" id="cr-action-bar">
        ${this._buildActionBarHTML()}
      </div>
    `;
  }

  _renderEmptySlots(count) {
    return Array.from({ length: count }).map(() => `
      <div class="cr-player-slot is-empty" aria-label="Emplacement vide">
        <div class="cr-player-slot__avatar-wrap">
          <div class="cr-player-slot__avatar content-icon content-icon--avatar-drifter"></div>
        </div>
        <div class="cr-player-slot__info">
          <span class="cr-player-slot__name">— En attente —</span>
        </div>
        <div class="cr-player-slot__status"></div>
      </div>`).join("");
  }

  _renderRoster() {
    const screen = this.getScreen();
    if (!screen || !this._room) return;

    const maxPlayers = this._room.max_players ?? 2;
    const teamSize   = maxPlayers / 2;

    const blue = this._members.slice(0, teamSize);
    const red  = this._members.slice(teamSize);

    // Blue team
    const blueSlots = screen.querySelector("#cr-slots-blue");
    const redSlots  = screen.querySelector("#cr-slots-red");
    const blueCnt   = screen.querySelector("#cr-blue-count");
    const redCnt    = screen.querySelector("#cr-red-count");

    if (blueSlots) blueSlots.innerHTML = this._buildTeamSlotsHTML(blue, teamSize, "blue");
    if (redSlots)  redSlots.innerHTML  = this._buildTeamSlotsHTML(red, teamSize, "red");
    if (blueCnt)   blueCnt.textContent = `${blue.length}/${teamSize}`;
    if (redCnt)    redCnt.textContent  = `${red.length}/${teamSize}`;
  }

  _buildTeamSlotsHTML(members, teamSize, side) {
    const slots = [];

    for (let i = 0; i < teamSize; i++) {
      const m = members[i];
      if (!m) {
        slots.push(`
          <div class="cr-player-slot is-empty" aria-label="Emplacement vide">
            <div class="cr-player-slot__avatar-wrap">
              <div class="cr-player-slot__avatar content-icon content-icon--avatar-drifter"></div>
            </div>
            <div class="cr-player-slot__info">
              <span class="cr-player-slot__name">— En attente —</span>
            </div>
            <div class="cr-player-slot__status"></div>
          </div>`);
        continue;
      }

      const isLocal   = m.player_id === this._localPlayerId;
      const readyClass = m.is_ready ? "is-ready" : "";
      const readyLabel = m.is_ready ? "PRÊT" : "PAS PRÊT";
      const readyLabelClass = m.is_ready ? "cr-ready-label--ready" : "cr-ready-label--waiting";

      const badges = [
        m.is_host  ? `<span class="cr-badge cr-badge--host">HOST</span>` : "",
        isLocal    ? `<span class="cr-badge" style="border-color:rgba(232,225,215,0.3);color:rgba(232,225,215,0.5)">VOUS</span>` : "",
      ].filter(Boolean).join("");

      // Host controls (swap + kick) — only shown to host for non-self slots
      const hostActions = (this._isHost && !isLocal) ? `
        <div class="cr-host-actions">
          <button class="cr-host-btn cr-host-btn--swap" data-action="swap" data-player-id="${m.player_id}" type="button" title="Changer de camp">⇄</button>
          <button class="cr-host-btn cr-host-btn--kick" data-action="kick" data-player-id="${m.player_id}" type="button" title="Expulser">✕</button>
        </div>` : "";

      // Weapon icon from loadout_snapshot (if available)
      const weaponKey = m.loadout_snapshot?.weapon ?? null;
      const weaponStrip = weaponKey ? `
        <div class="cr-player-slot__loadout-strip">
          <div class="content-icon content-icon--weapon-${escapeHtml(weaponKey)} cr-player-slot__weapon-icon" aria-hidden="true"></div>
        </div>` : "";

      // Deck picker button — only on local player's own slot
      const deckBtn = isLocal ? `
        <button class="cr-deck-pick-btn" data-action="pick-deck" type="button" title="Changer de deck">
          DECK ▾
        </button>` : "";

      slots.push(`
        <div class="cr-player-slot ${readyClass}" data-player-id="${m.player_id}">
          <div class="cr-player-slot__avatar-wrap">
            <div class="cr-player-slot__avatar content-icon content-icon--avatar-${escapeHtml(m.avatar_key ?? "drifter")}"></div>
            <div class="cr-player-slot__ready-icon" aria-hidden="true"></div>
          </div>
          <div class="cr-player-slot__info">
            <span class="cr-player-slot__name">${escapeHtml(m.display_name)}</span>
            <div class="cr-player-slot__badges">${badges}</div>
            ${weaponStrip}
          </div>
          <div class="cr-player-slot__status">
            <span class="cr-ready-label ${readyLabelClass}">${readyLabel}</span>
            ${deckBtn}
            ${hostActions}
          </div>
        </div>`);
    }

    return slots.join("");
  }

  _buildActionBarHTML() {
    const readyLabel = this._isReady ? "✓ PRÊT" : "SE METTRE PRÊT";
    const readyClass = this._isReady ? "cr-ready-btn--is-ready" : "cr-ready-btn--not-ready";
    const allReady   = this._members.length > 0 && this._members.every(m => m.is_ready);

    const playerSection = `
      <div class="cr-lobby__ready-section">
        <span class="cr-lobby__ready-hint">Tous les joueurs doivent être prêts pour lancer</span>
        <button class="cr-ready-btn ${readyClass}" id="cr-ready-btn" type="button">${readyLabel}</button>
      </div>`;

    const hostSection = this._isHost ? `
      <div class="cr-lobby__host-section">
        <button class="cr-force-start-btn" id="cr-force-start-btn" type="button">
          Forcer le démarrage
        </button>
        <button class="cr-launch-btn" id="cr-launch-btn" type="button" ${allReady ? "" : "disabled"}>
          Lancer la Partie →
        </button>
      </div>` : "";

    return playerSection + hostSection;
  }

  _renderActionBar() {
    const screen = this.getScreen();
    const bar = screen?.querySelector("#cr-action-bar");
    if (!bar) return;
    bar.innerHTML = this._buildActionBarHTML();
  }

  /* ── Force Start countdown ───────────── */

  _startForceCountdown() {
    this._forceStartMs = FORCE_START_SECONDS * 1000;
    const banner = this.getScreen()?.querySelector("#cr-force-start-banner");
    banner?.classList.remove("is-hidden");
    this._updateForceStartBanner();
  }

  _cancelForceCountdown() {
    this._forceStartMs = 0;
    const banner = this.getScreen()?.querySelector("#cr-force-start-banner");
    banner?.classList.add("is-hidden");
  }

  _tickForceStart(dtMs) {
    if (this._forceStartMs <= 0) return;
    this._forceStartMs = Math.max(0, this._forceStartMs - dtMs);
    this._updateForceStartBanner();
    if (this._forceStartMs <= 0) {
      this._launch();
    }
  }

  _updateForceStartBanner() {
    const timerEl = this.getScreen()?.querySelector("#cr-force-start-timer");
    if (timerEl) timerEl.textContent = Math.ceil(this._forceStartMs / 1000);
  }

  /* ── Launch ──────────────────────────── */

  async _launch() {
    if (!this._room || !this._isHost) return;
    await startRoom(this._room.id);
    playUiCue("confirm");
    // Dispatch to the match system to actually start the session
    window.dispatchEvent(new CustomEvent("p0-custom-room-launch", {
      detail: { room: this._room, members: this._members }
    }));
  }

  /* ── Event handlers ──────────────────── */

  _onEnterLobby(e) {
    const room = e.detail?.room;
    if (!room) return;
    this._initRoom(room);
  }

  async _onScreenClick(e) {
    // Leave
    if (e.target.closest("#cr-leave-btn")) {
      playUiCue("click");
      if (this._room) {
        await leaveRoom(this._room.id);
      }
      window.dispatchEvent(new CustomEvent("p0-leave-custom-lobby"));
      return;
    }

    // Ready toggle
    if (e.target.closest("#cr-ready-btn")) {
      const newReady = !this._isReady;
      playUiCue(newReady ? "confirm" : "click");
      this._isReady = newReady;
      this._renderActionBar();
      if (this._room) await setReady(this._room.id, newReady);
      return;
    }

    // Launch (host)
    if (e.target.closest("#cr-launch-btn")) {
      await this._launch();
      return;
    }

    // Force start (host)
    if (e.target.closest("#cr-force-start-btn")) {
      playUiCue("click");
      this._startForceCountdown();
      return;
    }

    // Cancel force start
    if (e.target.closest("#cr-cancel-force")) {
      playUiCue("click");
      this._cancelForceCountdown();
      return;
    }

    // Deck picker (local player)
    if (e.target.closest("[data-action='pick-deck']")) {
      const anchorEl = e.target.closest(".cr-player-slot");
      playUiCue("click");
      if (!this._deckPicker) {
        this._deckPicker = new DeckPickerPanel({
          onSelect: async (loadoutId, snapshot) => {
            this._selectedLoadoutId = loadoutId;
            if (this._room) {
              await updateMemberLoadout(this._room.id, loadoutId, snapshot);
            }
            // Optimistically update local member snapshot
            const self = this._members.find(m2 => m2.player_id === this._localPlayerId);
            if (self) {
              self.loadout_snapshot = snapshot;
              self.selected_loadout_id = loadoutId;
            }
            this._renderRoster();
          },
        });
      }
      const self = this._members.find(m => m.player_id === this._localPlayerId);
      await this._deckPicker.open(
        anchorEl,
        self?.loadout_snapshot ?? { ...activeLoadout },
        this._selectedLoadoutId,
      );
      return;
    }

    // Kick (host)
    const kickBtn = e.target.closest("[data-action='kick']");
    if (kickBtn && this._isHost && this._room) {
      const playerId = kickBtn.dataset.playerId;
      if (playerId) {
        playUiCue("click");
        await kickMember(this._room.id, playerId);
      }
      return;
    }

    // Swap (host)
    const swapBtn = e.target.closest("[data-action='swap']");
    if (swapBtn && this._isHost && this._room) {
      const playerId = swapBtn.dataset.playerId;
      if (playerId) {
        playUiCue("click");
        // Optimistic: re-order members array, pushing player to other half
        const maxP = this._room.max_players ?? 2;
        const half = maxP / 2;
        const idx = this._members.findIndex(m => m.player_id === playerId);
        if (idx !== -1) {
          const [member] = this._members.splice(idx, 1);
          const newIdx = idx < half ? half : 0;
          this._members.splice(newIdx, 0, member);
        }
        await swapMemberTeam(this._room.id, playerId);
        this._renderRoster();
      }
      return;
    }
  }

  _onReady() {}
  _onLeave() {}
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
