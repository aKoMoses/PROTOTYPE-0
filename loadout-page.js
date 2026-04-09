// ================================================================
// PROTOTYPE-0 · LOADOUT PAGE
// Persistent named builds — CRUD, import to session
// ================================================================

import { content } from "./src/content.js";
import { cloneStoredLoadout, createStoredLoadout, normalizeStoredBuild, readStoredLoadouts, writeStoredLoadouts } from "./src/loadouts/storage.js";
import { PROGRESSION_CHANGED_EVENT, formatMissingUnlocks, getMissingUnlocksForBuild, getRequiredLevelForBuild } from "./src/progression.js";

const GAMEPLAY_TAGS = ["aggro", "control", "poke", "burst", "tank", "support", "hybrid", "cheese"];

let loadouts = readStoredLoadouts();
let activeTagFilter = null;
let confirmingDeleteId = null;

const root = document.getElementById("loadout-root");
const grid = document.getElementById("loadout-grid");
const createBtn = document.getElementById("loadout-create-btn");
const tagBar = document.getElementById("loadout-tag-bar");

if (root) {
  createBtn?.addEventListener("click", handleCreate);
  tagBar?.addEventListener("click", handleTagBarClick);
  grid?.addEventListener("click", handleGridClick);
  grid?.addEventListener("focusout", handleNameBlur);
  grid?.addEventListener("keydown", handleNameKey);
  window.addEventListener("builder-forge", handleBuilderForge);
  window.addEventListener("p0-loadouts-changed", syncStoredLoadouts);
  window.addEventListener(PROGRESSION_CHANGED_EVENT, render);
  render();
}

function setStatusMessage(message) {
  const statusLine = document.getElementById("status-line");
  if (statusLine) {
    statusLine.textContent = message;
  }
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
  if (window.__P0_BUILDER) {
    window.__P0_BUILDER.open();
    return;
  }

  const entry = createStoredLoadout({ name: `Loadout ${loadouts.length + 1}` });
  loadouts.unshift(entry);
  save();
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

function handleEquip(id) {
  const entry = loadouts.find((item) => item.id === id);
  if (!entry?.build) {
    return;
  }

  const missing = getMissingUnlocksForBuild(entry.build);
  if (missing.length > 0) {
    setStatusMessage(`Loadout locked. ${formatMissingUnlocks(missing)}`);
    return;
  }

  dispatchEquip(entry, `Loadout locked. ${formatMissingUnlocks(missing)}`);

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
}

function dispatchEquip(entry, message = "") {
  window.dispatchEvent(new CustomEvent("loadout-equip", {
    detail: {
      loadout: entry,
      message,
    },
  }));
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
  if (!button) {
    return;
  }

  const card = button.closest("[data-loadout-id]");
  const id = card?.dataset.loadoutId;
  if (!id) {
    return;
  }

  if (button.classList.contains("loadout-card__fav")) return handleToggleFavorite(id);
  if (button.dataset.action === "duplicate") return handleDuplicate(id);
  if (button.dataset.action === "delete") return handleDelete(id);
  if (button.dataset.action === "cancel-delete") return handleCancelDelete();
  if (button.dataset.action === "confirm-delete") return handleDelete(id);
  if (button.classList.contains("loadout-card__equip")) return handleEquip(id);
  if (button.classList.contains("loadout-tag-option")) {
    return handleToggleTag(id, button.dataset.tag);
  }
  if (button.dataset.action === "toggle-tags") {
    card?.querySelector(".loadout-tag-picker")?.classList.toggle("is-open");
  }
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
  const build = normalizeStoredBuild(entry.build);
  const age = formatAge(entry.updatedAt || entry.createdAt);
  const missing = getMissingUnlocksForBuild(build);
  const isLocked = missing.length > 0;
  const requiredLevel = getRequiredLevelForBuild(build);
  const footerMeta = isLocked
    ? `Requires level ${requiredLevel}`
    : entry.role ? `${escapeHtml(entry.role)} · ${age}` : age;
  const copy = isLocked
    ? formatMissingUnlocks(missing)
    : entry.description;

  return `
    <article class="loadout-card${isFavorite ? " is-favorite" : ""}${isLocked ? " is-locked" : ""}" data-loadout-id="${entry.id}">
      ${isConfirming ? renderDeleteConfirm() : ""}

      <div class="loadout-card__header">
        <button class="loadout-card__fav${isFavorite ? " is-active" : ""}" title="Favorite">★</button>
        <h3 class="loadout-card__name" contenteditable="true" spellcheck="false">${escapeHtml(entry.name)}</h3>
        <div class="loadout-card__actions">
          <button class="loadout-card__action" data-action="toggle-tags" title="Tags">🏷</button>
          <button class="loadout-card__action" data-action="duplicate" title="Duplicate">⧉</button>
          <button class="loadout-card__action loadout-card__action--delete" data-action="delete" title="Delete">✕</button>
        </div>
      </div>

      <div class="loadout-card__tags">
        ${entry.tags.map((tag) => `<span class="loadout-card__tag">${tag}</span>`).join("")}
      </div>

      ${copy ? `<p class="loadout-card__copy">${escapeHtml(copy)}</p>` : ""}

      <div class="loadout-tag-picker">
        ${GAMEPLAY_TAGS.map((tag) => `<button class="loadout-tag-option${entry.tags.includes(tag) ? " is-selected" : ""}" data-tag="${tag}">${tag}</button>`).join("")}
      </div>

      <div class="loadout-card__preview">
        ${renderSlot("weapon", build.weapon, "W")}
        ${renderSlot("ability", build.abilities[0], "Q")}
        ${renderSlot("ability", build.abilities[1], "E")}
        ${renderSlot("ability", build.abilities[2], "F")}
        ${renderSlot("perk", build.perks[0], "P")}
        ${renderSlot("ultimate", build.ultimate, "R")}
      </div>

      <div class="loadout-card__footer">
        <span class="loadout-card__meta">${escapeHtml(footerMeta)}</span>
        <button class="loadout-card__equip${isLocked ? " is-locked" : ""}">${isLocked ? `LOCKED LV ${requiredLevel}` : "EQUIP"}</button>
      </div>
    </article>`;
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
      ? "abilities"
      : type === "perk"
        ? "perks"
        : "ultimates";

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

function formatAge(iso) {
  if (!iso) {
    return "";
  }

  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}