// ================================================================
// PROTOTYPE-0 · LOADOUT PAGE
// Persistent named builds — CRUD, import to session
// ================================================================

import { content } from "./src/content.js";
import { openBuilder } from "./loadout-builder.js";
import { cloneStoredLoadout, createStoredLoadout, normalizeStoredBuild, readStoredLoadouts, writeStoredLoadouts } from "./src/loadouts/storage.js";
import { PROGRESSION_CHANGED_EVENT, getLoadoutAccessState } from "./src/progression.js";
import { hideClickTooltip, registerClickTooltip } from "./src/ui/tooltip-manager.js";
import { sanitizeIconClass } from "./src/utils.js";

const GAMEPLAY_TAGS = ["aggro", "control", "poke", "burst", "tank", "support", "hybrid", "cheese"];

let loadouts = readStoredLoadouts();
let activeTagFilter = null;
let confirmingDeleteId = null;

const root = document.getElementById("loadout-root");
const grid = document.getElementById("loadout-grid");
const createBtn = document.getElementById("loadout-create-btn");
const tagBar = document.getElementById("loadout-tag-bar");

let activeModalId = null;

if (root) {
  createBtn?.addEventListener("click", handleCreate);
  tagBar?.addEventListener("click", handleTagBarClick);
  grid?.addEventListener("click", handleGridClick);
  grid?.addEventListener("focusout", handleNameBlur);
  grid?.addEventListener("keydown", handleNameKey);
  window.addEventListener("builder-forge", handleBuilderForge);
  window.addEventListener("p0-loadouts-changed", syncStoredLoadouts);
  window.addEventListener(PROGRESSION_CHANGED_EVENT, render);
  document.addEventListener("click", handleModalClick);
  render();
}

function handleModalClick(event) {
  const modal = event.target.closest(".loadout-modal");
  if (!modal) return;

  const equipButton = event.target.closest(".loadout-modal__equip");
  if (equipButton) {
    event.preventDefault();
    const id = modal.dataset.modalId;
    if (id) {
      handleEquip(id);
    }
    return;
  }
  
  if (event.target === modal || event.target.classList.contains("loadout-modal__backdrop")) {
    activeModalId = null;
    render();
  }
}

function setStatusMessage(message) {
  const statusLine = document.getElementById("status-line");
  if (statusLine) {
    statusLine.textContent = message;
  }
}

function getLockedStatusMessage(access) {
  if (!access?.locked) {
    return "";
  }

  if (access.lockedByPreset && access.missing.length > 0) {
    return `Loadout locked. Preset unlocks at level ${access.presetUnlockLevel}. ${access.reason.replace(/^Preset unlocks at level \d+\.\s*/, "")}`;
  }

  if (access.lockedByPreset) {
    return `Loadout locked. Preset unlocks at level ${access.presetUnlockLevel}.`;
  }

  return `Loadout locked. ${access.reason}`;
}

function handleBuilderForge(event) {
  const { name, build } = event.detail;
  const entry = createStoredLoadout({ name, build });
  loadouts.unshift(entry);
  save();
}

function syncStoredLoadouts() {
  loadouts = readStoredLoadouts();
  render();
}

function handleCreate() {
  openBuilder();
}

function handleDuplicate(id) {
  const source = loadouts.find((entry) => entry.id === id);
  if (!source) {
    return;
  }

  const clone = cloneStoredLoadout(source, {
    name: `${source.name} (copy)`,
    tags: [...source.tags],
    build: source.build,
  });
  const index = loadouts.findIndex((entry) => entry.id === id);
  loadouts.splice(index + 1, 0, clone);
  save();
}

function handleDelete(id) {
  if (confirmingDeleteId === id) {
    loadouts = loadouts.filter((entry) => entry.id !== id);
    confirmingDeleteId = null;
    save();
    return;
  }

  confirmingDeleteId = id;
  render();
}

function handleCancelDelete() {
  confirmingDeleteId = null;
  render();
}

function handleToggleFavorite(id) {
  const entry = loadouts.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  entry.favorite = !entry.favorite;
  entry.updatedAt = new Date().toISOString();
  save();
}

function handleRename(id, newName) {
  const entry = loadouts.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const sanitized = newName.replace(/<[^>]*>/g, "").trim().slice(0, 40);
  if (sanitized) {
    entry.name = sanitized;
    entry.updatedAt = new Date().toISOString();
  }
  save();
}

function handleToggleTag(id, tag) {
  const entry = loadouts.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  const index = entry.tags.indexOf(tag);
  if (index === -1) {
    entry.tags.push(tag);
  } else {
    entry.tags.splice(index, 1);
  }
  entry.updatedAt = new Date().toISOString();
  save();
}

async function handleEquip(id) {
  const entry = loadouts.find((item) => item.id === id);
  if (!entry?.build) {
    return false;
  }

  const access = getLoadoutAccessState(entry);
  if (access.locked) {
    setStatusMessage(getLockedStatusMessage(access));
    return false;
  }

  await window.__P0_SHELL?.ensureViewModule?.("game");

  const equipContext = dispatchEquip(entry);

  // Close detail modal once the loadout is successfully equipped.
  if (activeModalId === id) {
    activeModalId = null;
    render();
  }

  const card = grid?.querySelector(`[data-loadout-id="${id}"]`);
  const button = card?.querySelector(".loadout-card__equip");
  if (!button) {
    return;
  }

  button.textContent = "EQUIPPED";
  button.classList.add("is-equipped");
  setTimeout(() => {
    button.textContent = "EQUIP";
    button.classList.remove("is-equipped");
  }, 1500);
  
  // If in matchmaking build phase, advance to lobby
  if (equipContext.matchmakingActive && equipContext.prematchStep === "build") {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("p0-prematch-action", {
        detail: { action: "start-session" },
      }));

      // Backward compatibility while migrating off globals.
      window.handlePrematchAction?.("start-session");
    }, 500);
  }

  return true;
}

function dispatchEquip(entry, message = "") {
  const detail = {
    loadout: entry,
    message,
    matchmakingActive: false,
    prematchStep: null,
  };

  window.dispatchEvent(new CustomEvent("loadout-equip", { detail }));
  return detail;
}

function handleTagBarClick(event) {
  const tagButton = event.target.closest(".loadout-tag");
  if (!tagButton) {
    return;
  }

  const tag = tagButton.dataset.tag;
  activeTagFilter = activeTagFilter === tag ? null : tag;
  render();
}

function handleGridClick(event) {
  const button = event.target.closest("button");
  const contentEditable = event.target.closest("[contenteditable]");
  
  if (contentEditable) return;
  if (!button) return;

  const card = button.closest("[data-loadout-id]");
  const modal = button.closest(".loadout-modal");
  const id = card?.dataset.loadoutId || modal?.dataset.modalId;
  
  if (!id) return;

  if (button.dataset.action === "view-details" && !modal) return handleViewDetails(id);
  if (button.classList.contains("loadout-card__content")) return handleViewDetails(id);
  if (button.classList.contains("loadout-modal__equip")) return handleEquip(id);
  if (button.dataset.action === "cancel-delete") return handleCancelDelete();
  if (button.dataset.action === "confirm-delete") return handleDelete(id);
}

function handleViewDetails(id) {
  activeModalId = id;
  render();
}

function handleNameBlur(event) {
  if (!event.target.matches(".loadout-card__name[contenteditable]")) {
    return;
  }

  const card = event.target.closest("[data-loadout-id]");
  if (card) {
    handleRename(card.dataset.loadoutId, event.target.textContent);
  }
}

function handleNameKey(event) {
  if (!event.target.matches(".loadout-card__name[contenteditable]")) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    event.target.blur();
  }
}

function save() {
  loadouts = writeStoredLoadouts(loadouts);
  render();
}

function getFilteredLoadouts() {
  let nextList = [...loadouts];
  nextList.sort((left, right) => Number(right.favorite) - Number(left.favorite));
  if (activeTagFilter) {
    nextList = nextList.filter((entry) => entry.tags.includes(activeTagFilter));
  }
  return nextList;
}

function render() {
  if (!grid) {
    return;
  }

  hideClickTooltip();

  // Remove any previously injected modal before building the next UI state.
  document.querySelectorAll(".loadout-modal").forEach((modal) => modal.remove());

  renderTagBar();

  const filtered = getFilteredLoadouts();
  if (!filtered.length) {
    grid.innerHTML = `
      <div class="loadout-empty">
        <div class="loadout-empty__icon">⬡</div>
        <span class="loadout-empty__text">${activeTagFilter ? "No loadouts with this tag" : "No loadouts yet — forge your first build"}</span>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((entry) => renderCard(entry)).join("");
  
  if (activeModalId) {
    const modalEntry = loadouts.find((e) => e.id === activeModalId);
    if (modalEntry) {
      const modal = renderModal(modalEntry);
      document.body.insertAdjacentHTML("beforeend", modal);
      bindLoadoutModalTooltips();
    }
  }
}

function bindLoadoutModalTooltips() {
  document.querySelectorAll(".loadout-modal .loadout-build-item[data-tooltip]").forEach((item) => {
    registerClickTooltip(item, item.dataset.tooltip, { stopClick: true, maxWidth: 360 });
  });
}

function renderTagBar() {
  if (!tagBar) {
    return;
  }

  tagBar.innerHTML = GAMEPLAY_TAGS
    .map((tag) => `<button class="loadout-tag${activeTagFilter === tag ? " is-active" : ""}" data-tag="${tag}">${tag}</button>`)
    .join("");
}

function renderCard(entry) {
  const isFavorite = entry.favorite;
  const isConfirming = confirmingDeleteId === entry.id;
  const access = getLoadoutAccessState(entry);
  const isLocked = access.locked;
  const lockLabel = isLocked ? `LOCKED LV ${access.requiredLevel}` : null;
  const lockReason = isLocked
    ? (access.lockedByPreset ? `Preset unlocks at level ${access.presetUnlockLevel}` : access.reason)
    : "";
  const build = normalizeStoredBuild(entry.build);
  const age = formatAge(entry.updatedAt || entry.createdAt);

  const slotKeys = [
    { key: 'W', val: build.weapon, type: 'weapon' },
    { key: 'Q', val: build.modules[0], type: 'ability' },
    { key: 'E', val: build.modules[1], type: 'ability' },
    { key: 'F', val: build.modules[2], type: 'ability' },
    { key: 'P', val: build.implants[0], type: 'perk' },
    { key: 'R', val: build.core, type: 'ultimate' },
  ];

  const previewSlots = slotKeys.map((s) => {
    const name = s.val ? getContentName(s.type, s.val) : 'Empty';
    return `
      <span class="loadout-card__slot${s.val ? ' is-filled' : ''}" title="${escapeHtml(name)}">
        <span class="loadout-card__slot-key">${s.key}</span>
        ${renderContentIcon(s.type, s.val, 'loadout-card__slot-icon')}
      </span>`;
  }).join('');

  return `
    <article class="loadout-card${isFavorite ? " is-favorite" : ""}${isLocked ? " is-locked" : ""}${access.lockedByPreset ? " is-locked-preset" : ""}" data-loadout-id="${entry.id}">
      ${isConfirming ? renderDeleteConfirm() : ""}

      <button class="loadout-card__content" data-action="view-details">
        <div class="loadout-card__header">
          <h3 class="loadout-card__name" contenteditable="true" spellcheck="false">${escapeHtml(entry.name)}</h3>
          ${lockLabel ? `<span class="loadout-card__lock-tag">${lockLabel}</span>` : ""}
        </div>
        
        ${entry.tags.length > 0 ? `<div class="loadout-card__tags">${entry.tags.slice(0, 3).map((tag) => `<span class="loadout-card__tag">${tag}</span>`).join("")}</div>` : ""}
        ${lockReason ? `<p class="loadout-card__lock-reason">${escapeHtml(lockReason)}</p>` : ""}
        <div class="loadout-card__preview">${previewSlots}</div>
        ${age ? `<span class="loadout-card__age">${age}</span>` : ""}
      </button>
    </article>`;
}

function renderModal(entry) {
  const build = normalizeStoredBuild(entry.build);
  const access = getLoadoutAccessState(entry);
  const isLocked = access.locked;
  const requiredLevel = access.requiredLevel;
  const lockDetails = access.reason;
  const copy = isLocked
    ? lockDetails
    : entry.description;

  return `
    <div class="loadout-modal" data-modal-id="${entry.id}">
      <div class="loadout-modal__backdrop"></div>
      <div class="loadout-modal__content">
        <div class="loadout-modal__header">
          <h2 class="loadout-modal__title">${escapeHtml(entry.name)}</h2>
          ${entry.tags.length > 0 ? `<div class="loadout-modal__tags">${entry.tags.map((tag) => `<span class="loadout-modal__tag">${tag}</span>`).join("")}</div>` : ""}
        </div>

        ${copy ? `<p class="loadout-modal__desc">${escapeHtml(copy)}</p>` : ""}

        <div class="loadout-modal__build">
          ${renderBuildRow("W", build.weapon, "weapon")}
          ${renderBuildRow("Q", build.modules[0], "ability")}
          ${renderBuildRow("E", build.modules[1], "ability")}
          ${renderBuildRow("F", build.modules[2], "ability")}
          ${renderBuildRow("P", build.implants[0], "perk")}
          ${renderBuildRow("R", build.core, "ultimate")}
        </div>

        <button class="loadout-modal__equip${isLocked ? " is-locked" : ""}${access.lockedByPreset ? " is-locked-preset" : ""}" data-action="view-details" ${isLocked ? "disabled" : ""}>${isLocked ? `LOCKED LV ${requiredLevel}` : "EQUIP"}</button>
      </div>
    </div>`;
}


function renderBuildRow(key, itemKey, type) {
  const name = itemKey ? getContentName(type, itemKey) : null;
  const desc = itemKey ? getContentDesc(type, itemKey) : null;
  const tooltipText = buildItemTooltip(key, type, itemKey, name, desc);
  const tooltip = tooltipText ? ` data-tooltip="${escapeHtml(tooltipText)}"` : "";
  return `
    <div class="loadout-build-item"${tooltip}>
      <div class="loadout-build-item__head">
        <span class="loadout-build-key">${key}</span>
        ${renderContentIcon(type, itemKey, 'loadout-build-item__icon')}
      </div>
      <span class="loadout-build-label">${name || "—"}</span>
    </div>`;
}

function renderContentIcon(type, key, className = "") {
  const item = key ? getContentItem(type, key) : null;
  const classes = ["content-icon", className];

  if (!item) {
    classes.push("content-icon--empty-slot");
    return `<span class="${classes.filter(Boolean).join(" ")}" aria-hidden="true"></span>`;
  }

  if (item.category) {
    classes.push(`content-icon--${item.category}`);
  }

  if (item.iconImg) {
    classes.push("has-img-icon");
    return `<span class="${classes.filter(Boolean).join(" ")}" style="background-image:url('${item.iconImg}')" aria-hidden="true"></span>`;
  }

  const iconKey = sanitizeIconClass(item.icon ?? `${type}-${item.key}`);
  classes.push(`content-icon--${iconKey}`);
  return `<span class="${classes.filter(Boolean).join(" ")}" aria-hidden="true"></span>`;
}

function buildItemTooltip(slotKey, type, itemKey, name, desc) {
  if (!name) {
    return `${slotKey}: Empty slot`;
  }

  const typeLabel = type === "weapon"
    ? "Weapon"
    : type === "ability"
      ? "Ability"
      : type === "perk"
        ? "Perk"
        : "Ultimate";

  const item = getContentItem(type, itemKey);
  const lines = [`${slotKey} · ${typeLabel}: ${name}`];

  if (type === "weapon") {
    if (item?.slotLabel) lines.push(`Profile: ${item.slotLabel}`);
    if (item?.rhythm) lines.push(`Rhythm: ${item.rhythm}`);
    if (item?.rangeProfile) lines.push(`Range: ${item.rangeProfile}`);
    if (item?.commitment) lines.push(`Commitment: ${item.commitment}`);
    if (typeof item?.cooldown === "number") lines.push(`Cadence: ${formatSeconds(item.cooldown)}s`);
  }

  if (type === "ability") {
    if (item?.input) lines.push(`Input: ${item.input}`);
    if (item?.role) lines.push(`Role: ${item.role}`);
    if (item?.category) lines.push(`Category: ${formatLabel(item.category)}`);
  }

  if (item?.state) {
    lines.push(`State: ${item.state === "playable" ? "Playable" : "Locked"}`);
  }

  if (desc) {
    lines.push("");
    lines.push(desc);
  }

  return lines.join("\n");
}

function getContentItem(type, key) {
  const group = type === "weapon"
    ? "weapons"
    : type === "ability"
      ? "modules"
      : type === "perk"
        ? "implants"
        : "cores";

  return content[group]?.[key] ?? null;
}

function formatLabel(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAge(timestamp) {
  if (!timestamp) {
    return "";
  }

  const time = new Date(timestamp);
  if (Number.isNaN(time.getTime())) {
    return "";
  }

  const diffMs = Date.now() - time.getTime();
  if (!Number.isFinite(diffMs)) {
    return "";
  }

  if (diffMs < 60 * 1000) {
    return "just now";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function formatSeconds(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function getContentDesc(type, key) {
  const group = type === "weapon"
    ? "weapons"
    : type === "ability"
      ? "modules"
      : type === "perk"
        ? "implants"
        : "cores";

  return content[group]?.[key]?.description ?? "";
}

function renderSlot(type, key, fallback) {
  const label = key ? getContentName(type, key) : fallback;
  return `
    <div class="loadout-preview-slot">
      <div class="loadout-preview-icon loadout-preview-icon--${type}">${fallback}</div>
      <span class="loadout-preview-label">${escapeHtml(label)}</span>
    </div>`;
}

function getContentName(type, key) {
  const group = type === "weapon"
    ? "weapons"
    : type === "ability"
      ? "modules"
      : type === "perk"
        ? "implants"
        : "cores";

  return content[group]?.[key]?.name ?? key;
}

function renderDeleteConfirm() {
  return `
    <div class="loadout-confirm-overlay">
      <span class="loadout-confirm-text">Delete this loadout?</span>
      <div class="loadout-confirm-actions">
        <button class="loadout-confirm-btn loadout-confirm-btn--danger" data-action="confirm-delete">Delete</button>
        <button class="loadout-confirm-btn" data-action="cancel-delete">Cancel</button>
      </div>
    </div>`;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}
