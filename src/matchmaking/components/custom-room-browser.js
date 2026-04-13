import { PrematchStepBase } from "./step-base.js";
import {
  listRooms,
  createRoom,
  joinRoom,
  subscribeToRoomsList,
} from "../../lib/rooms/service.js";
import { playUiCue } from "../../audio.js";
import { loadout as activeLoadout } from "../../state/app-state.js";

/**
 * RoomBrowserStep — Step shown when user selects "Custom Game" from mode selection.
 * Lists available rooms, lets user create or join one.
 * On join/create success, emits "enter-custom-lobby" with the room object.
 */
export class RoomBrowserStep extends PrematchStepBase {
  constructor(deps) {
    super({ ...deps, stepKey: "room-browser", phaseKey: "room-browser" });

    this._unsubscribe = null;
    this._filter      = "all";
    this._rooms       = [];
    this._loading     = true;
    this._modalOpen   = false;
    this._creating    = false;

    // Bound handlers to allow removeEventListener
    this._onFilterChange   = this._onFilterChange.bind(this);
    this._onCreateClick    = this._onCreateClick.bind(this);
    this._onModalCancel    = this._onModalCancel.bind(this);
    this._onModalConfirm   = this._onModalConfirm.bind(this);
    this._onScreenClick    = this._onScreenClick.bind(this);
    this._onModalKeydown   = this._onModalKeydown.bind(this);
    this._onScreenSubmit   = this._onScreenSubmit.bind(this);
  }

  /* ── Lifecycle ───────────────────────── */

  mount() {
    super.mount();
    const screen = this.getScreen();
    if (!screen) return;
    screen.addEventListener("click",  this._onScreenClick);
    screen.addEventListener("change", this._onFilterChange);
    screen.addEventListener("keydown", this._onModalKeydown);
    screen.addEventListener("submit", this._onScreenSubmit);

    this._load();
    this._unsubscribe = subscribeToRoomsList(() => this._load());
  }

  unmount() {
    super.unmount();
    this._unsubscribe?.();
    this._unsubscribe = null;

    const screen = this.getScreen();
    if (!screen) return;
    screen.removeEventListener("click",   this._onScreenClick);
    screen.removeEventListener("change",  this._onFilterChange);
    screen.removeEventListener("keydown", this._onModalKeydown);
    screen.removeEventListener("submit", this._onScreenSubmit);
  }

  /* ── Data ────────────────────────────── */

  async _load() {
    this._loading = true;
    this._renderTable();

    const format = this._filter === "all" ? null : this._filter;
    const { data, error } = await listRooms({ format });
    this._loading = false;

    if (error) {
      this._rooms = [];
    } else {
      this._rooms = data ?? [];
    }
    this._renderTable();
  }

  /* ── Render ──────────────────────────── */

  _renderTable() {
    const screen = this.getScreen();
    if (!screen) return;
    const tbody = screen.querySelector(".room-table__body");
    if (!tbody) return;

    if (this._loading) {
      tbody.innerHTML = [1, 2, 3].map(() => `
        <tr class="room-table-skeleton">
          <td><div class="skeleton-line" style="width:60%"></div></td>
          <td><div class="skeleton-line" style="width:40%"></div></td>
          <td><div class="skeleton-line" style="width:50%"></div></td>
          <td><div class="skeleton-line" style="width:55%"></div></td>
          <td><div class="skeleton-line" style="width:40%"></div></td>
        </tr>
      `).join("");
      return;
    }

    if (!this._rooms.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="room-table-empty">
              <div class="room-table-empty__icon">⚔</div>
              <div>Aucune room en attente.<br>Crée la tienne pour commencer.</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = this._rooms.map(room => {
      const filled     = (room.bot_count ?? 0);
      const maxPlayers = room.max_players ?? 2;
      const isWaiting  = room.status === "waiting";
      const canJoin    = isWaiting;

      const pips = Array.from({ length: maxPlayers }).map((_, i) =>
        `<span class="room-players__pip${i < filled ? " is-filled" : ""}"></span>`
      ).join("");

      return `
        <tr>
          <td class="col-name">${escapeHtml(room.name)}</td>
          <td><span class="format-badge format-badge--${room.format}">${room.format}</span></td>
          <td>
            <div class="room-players">
              <div class="room-players__pips">${pips}</div>
              <span>${filled}/${maxPlayers}</span>
            </div>
          </td>
          <td>
            <span class="status-badge status-badge--${isWaiting ? "waiting" : "in-progress"}">
              ${isWaiting ? "En attente" : "En cours"}
            </span>
          </td>
          <td>
            <button
              class="room-join-btn"
              data-room-id="${room.id}"
              ${canJoin ? "" : "disabled"}
              type="button"
            >Rejoindre</button>
          </td>
        </tr>`;
    }).join("");
  }

  /* ── Modal ───────────────────────────── */

  _openModal() {
    this._modalOpen = true;
    this._creating  = false;
    const modal = this.getScreen()?.querySelector(".cr-modal-overlay");
    if (!modal) return;
    modal.classList.remove("is-hidden");
    const nameInput = modal.querySelector("#new-room-name");
    if (nameInput) {
      nameInput.value = "";
      requestAnimationFrame(() => {
        try {
          nameInput.focus({ preventScroll: true });
        } catch {
          nameInput.focus();
        }
      });
    }
    const errorEl = modal.querySelector(".cr-modal__error");
    if (errorEl) errorEl.textContent = "";
    const confirmBtn = modal.querySelector(".cr-modal__confirm");
    if (confirmBtn) confirmBtn.disabled = false;
  }

  _closeModal() {
    this._modalOpen = false;
    const modal = this.getScreen()?.querySelector(".cr-modal-overlay");
    modal?.classList.add("is-hidden");
  }

  async _submitCreate() {
    if (this._creating) return;
    const screen = this.getScreen();
    const nameInput   = screen?.querySelector("#new-room-name");
    const formatInput = screen?.querySelector("input[name='new-room-format']:checked");
    const errorEl     = screen?.querySelector(".cr-modal__error");
    const confirmBtn  = screen?.querySelector(".cr-modal__confirm");

    const name   = nameInput?.value?.trim() ?? "";
    const format = formatInput?.value ?? "1v1";

    if (!name) {
      if (errorEl) errorEl.textContent = "Le nom de la room est requis.";
      nameInput?.focus();
      return;
    }

    this._creating = true;
    if (confirmBtn) confirmBtn.disabled = true;
    if (errorEl)    errorEl.textContent = "";

    const { data, error } = await createRoom({ name, format, loadoutSnapshot: { ...activeLoadout } });
    this._creating = false;
    if (confirmBtn) confirmBtn.disabled = false;

    if (error || !data) {
      if (errorEl) errorEl.textContent = error?.message ?? "Erreur lors de la création.";
      return;
    }

    playUiCue("confirm");
    this._closeModal();
    this._emitEnterLobby(data);
  }

  /* ── Event handlers ──────────────────── */

  _onFilterChange(e) {
    if (e.target.matches(".room-filter-select")) {
      this._filter = e.target.value;
      this._load();
    }
  }

  _onCreateClick() {
    playUiCue("click");
    this._openModal();
  }

  _onModalCancel() {
    playUiCue("click");
    this._closeModal();
  }

  _onModalConfirm() {
    this._submitCreate();
  }

  _onScreenSubmit(e) {
    if (!this._modalOpen) return;
    if (!e.target.closest(".cr-modal")) return;
    e.preventDefault();
    this._submitCreate();
  }

  _onModalKeydown(e) {
    if (!this._modalOpen) return;
    if (e.key === "Escape") {
      this._closeModal();
    } else if (e.key === "Enter") {
      const active = document.activeElement;
      if (!active?.matches(".cr-modal__cancel")) {
        this._submitCreate();
      }
    }
  }

  async _onScreenClick(e) {
    const createBtn = e.target.closest(".room-create-btn");
    if (createBtn) {
      this._onCreateClick();
      return;
    }

    const cancelBtn = e.target.closest(".cr-modal__cancel");
    if (cancelBtn) {
      this._onModalCancel();
      return;
    }

    const confirmBtn = e.target.closest(".cr-modal__confirm");
    if (confirmBtn) {
      this._onModalConfirm();
      return;
    }

    const modalOverlay = e.target.closest(".cr-modal-overlay");
    if (this._modalOpen && modalOverlay && e.target === modalOverlay) {
      this._closeModal();
      return;
    }

    const joinBtn = e.target.closest(".room-join-btn");
    if (joinBtn && !joinBtn.disabled) {
      const roomId = joinBtn.dataset.roomId;
      if (!roomId) return;
      playUiCue("click");
      joinBtn.disabled = true;
      joinBtn.textContent = "...";

      const { error } = await joinRoom(roomId, { ...activeLoadout });
      if (error) {
        joinBtn.disabled = false;
        joinBtn.textContent = "Rejoindre";
        return;
      }

      const room = this._rooms.find(r => r.id === roomId);
      if (room) {
        playUiCue("confirm");
        this._emitEnterLobby(room);
      }
    }
  }

  /* ── Navigation ──────────────────────── */

  _emitEnterLobby(room) {
    window.dispatchEvent(new CustomEvent("p0-enter-custom-lobby", { detail: { room } }));
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
