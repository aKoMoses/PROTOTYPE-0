/**
 * DeckPickerPanel — Floating panel to select a saved loadout deck.
 * Standalone component (not a PrematchStepBase).
 * Triggered by clicking on the local player slot in CustomRoomLobbyStep.
 *
 * Usage:
 *   const picker = new DeckPickerPanel({ onSelect: (id, snapshot) => {} });
 *   picker.open(anchorEl, currentLoadout, savedLoadouts);
 *   picker.close();
 */

import { fetchRemoteLoadouts } from "../../lib/loadouts/service.js";
import { playUiCue } from "../../audio.js";

export class DeckPickerPanel {
  /**
   * @param {{ onSelect: (loadoutId: string|null, snapshot: object) => void }} options
   */
  constructor({ onSelect }) {
    this._onSelect    = onSelect;
    this._el          = null;
    this._selected    = null; // { id: string|null, snapshot: object }
    this._isOpen      = false;

    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._onKeydown      = this._onKeydown.bind(this);
  }

  /* ── Public API ──────────────────────── */

  /**
   * Open the panel next to `anchorEl`.
   * @param {HTMLElement} anchorEl   — anchor for positioning
   * @param {object} currentLoadout  — { weapon, modules, implants, core, … }
   * @param {string|null} currentId  — currently selected loadout id (null if unsaved)
   */
  async open(anchorEl, currentLoadout, currentId = null) {
    if (this._isOpen) return;
    this._isOpen = true;

    // Show loading state immediately
    this._createElement(anchorEl);

    let savedLoadouts = [];
    try {
      savedLoadouts = await fetchRemoteLoadouts();
    } catch {
      savedLoadouts = [];
    }

    this._render(currentLoadout, currentId, savedLoadouts);
    this._isOpen = true; // keep true after async
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._cleanup();
  }

  /* ── Internal ────────────────────────── */

  _createElement(anchorEl) {
    // Overlay backdrop
    const overlay = document.createElement("div");
    overlay.className = "dp-overlay";
    overlay.addEventListener("click", this._onOverlayClick);

    // Panel
    const panel = document.createElement("div");
    panel.className = "dp-panel";
    panel.innerHTML = `
      <div class="dp-panel__header">
        <span class="dp-panel__title">Choisir un Deck</span>
        <button class="dp-panel__close" type="button" aria-label="Fermer">✕</button>
      </div>
      <div class="dp-panel__list dp-panel__list--loading">
        <div class="dp-loading">Chargement des decks…</div>
      </div>
      <div class="dp-panel__footer">
        <button class="dp-btn dp-btn--cancel" type="button">Annuler</button>
        <button class="dp-btn dp-btn--confirm" type="button" disabled>Confirmer</button>
      </div>
    `;

    // Position relative to anchor
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      panel.style.setProperty("--dp-anchor-x", `${rect.left + rect.width / 2}px`);
      panel.style.setProperty("--dp-anchor-y", `${rect.top}px`);
    }

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this._el = overlay;

    // Events
    panel.querySelector(".dp-panel__close").addEventListener("click", () => this.close());
    panel.querySelector(".dp-btn--cancel").addEventListener("click", () => {
      playUiCue("click");
      this.close();
    });
    panel.querySelector(".dp-btn--confirm").addEventListener("click", () => this._confirm());
    document.addEventListener("keydown", this._onKeydown);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
  }

  _render(currentLoadout, currentId, savedLoadouts) {
    if (!this._el) return;
    const list = this._el.querySelector(".dp-panel__list");
    if (!list) return;
    list.classList.remove("dp-panel__list--loading");

    // "Deck actuel" is always first
    const currentEntry = {
      id: null,
      name: "Deck actuel",
      isCurrent: true,
      snapshot: { ...currentLoadout },
      favorite: false,
      tags: ["non sauvegardé"],
    };

    const allEntries = [currentEntry, ...savedLoadouts.map(d => ({
      id: d.id,
      name: d.name,
      isCurrent: false,
      snapshot: d.build ? { ...d.build } : {},
      favorite: d.favorite,
      tags: Array.isArray(d.tags) ? d.tags : [],
    }))];

    // Default selection = currently chosen id, or "deck actuel"
    const selectedId = currentId ?? null;
    this._selected = allEntries.find(e => e.id === selectedId) ?? currentEntry;

    list.innerHTML = allEntries.map((entry, i) => {
      const weaponKey = entry.snapshot?.weapon ?? null;
      const weaponIconClass = weaponKey
        ? `content-icon content-icon--weapon-${escapeHtml(weaponKey)}`
        : "content-icon content-icon--empty-slot";

      const modules = Array.isArray(entry.snapshot?.modules) ? entry.snapshot.modules : [];
      const moduleDots = [0, 1, 2].map(idx => {
        const key = modules[idx];
        return key
          ? `<span class="dp-module-dot dp-module-dot--filled" title="${escapeHtml(key)}"></span>`
          : `<span class="dp-module-dot"></span>`;
      }).join("");

      const tags = entry.tags.map(t => `<span class="dp-tag">${escapeHtml(t)}</span>`).join("");
      const favIcon = entry.favorite ? `<span class="dp-fav" aria-label="Favori">★</span>` : "";
      const isSelected = this._selected?.id === entry.id;
      const selectedClass = isSelected ? "is-selected" : "";
      const currentClass = entry.isCurrent ? "is-current" : "";

      return `
        <div class="dp-deck-row ${selectedClass} ${currentClass}" data-deck-index="${i}">
          <div class="dp-deck-row__icon ${weaponIconClass}" aria-hidden="true"></div>
          <div class="dp-deck-row__info">
            <div class="dp-deck-row__name">
              ${favIcon}${escapeHtml(entry.name)}
            </div>
            <div class="dp-deck-row__modules">${moduleDots}</div>
            <div class="dp-deck-row__tags">${tags}</div>
          </div>
          ${isSelected ? `<span class="dp-deck-row__check" aria-hidden="true">✓</span>` : ""}
        </div>`;
    }).join("");

    // Store entries on element for click access
    this._entries = allEntries;

    // Update confirm button state
    this._updateConfirmBtn();

    // Delegate row clicks
    list.addEventListener("click", (e) => {
      const row = e.target.closest(".dp-deck-row");
      if (!row) return;
      const idx = parseInt(row.dataset.deckIndex, 10);
      if (isNaN(idx)) return;
      playUiCue("click");
      this._selected = this._entries[idx];
      // Re-render selection state
      list.querySelectorAll(".dp-deck-row").forEach((r, i) => {
        const sel = i === idx;
        r.classList.toggle("is-selected", sel);
        const existing = r.querySelector(".dp-deck-row__check");
        if (sel && !existing) {
          r.insertAdjacentHTML("beforeend", `<span class="dp-deck-row__check" aria-hidden="true">✓</span>`);
        } else if (!sel && existing) {
          existing.remove();
        }
      });
      this._updateConfirmBtn();
    });
  }

  _updateConfirmBtn() {
    const btn = this._el?.querySelector(".dp-btn--confirm");
    if (!btn) return;
    btn.disabled = !this._selected;
  }

  _confirm() {
    if (!this._selected) return;
    playUiCue("confirm");
    this._onSelect(this._selected.id, this._selected.snapshot);
    this.close();
  }

  _cleanup() {
    if (this._el) {
      this._el.classList.remove("is-visible");
      // Remove after transition
      const el = this._el;
      setTimeout(() => el.remove(), 250);
      this._el = null;
    }
    this._entries = null;
    this._selected = null;
    document.removeEventListener("keydown", this._onKeydown);
  }

  _onOverlayClick(e) {
    if (e.target === this._el) {
      playUiCue("click");
      this.close();
    }
  }

  _onKeydown(e) {
    if (!this._isOpen) return;
    if (e.key === "Escape") {
      playUiCue("click");
      this.close();
    } else if (e.key === "Enter") {
      this._confirm();
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
