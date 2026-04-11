import collectionGroups from "../../data/content-groups.json";
import { content } from "../../content.js";
import {
  PROGRESSION_CHANGED_EVENT,
  decrementLevelForTest,
  getCollectionEntries,
  getMaxDefinedLevel,
  getNextUnlockEntry,
  getProgressionSnapshot,
  getXpForLevel,
  incrementLevelForTest,
  setXp,
} from "../../progression.js";
import { sanitizeIconClass } from "../../utils.js";

function buildIconDiv(item, iconClass, categoryClass) {
  if (item.iconImg) {
    return `<div class="content-icon has-img-icon${categoryClass}" style="background-image:url('${item.iconImg}')"></div>`;
  }
  return `<div class="content-icon content-icon--${iconClass}${categoryClass}"></div>`;
}

const CATEGORY_META = Object.fromEntries(collectionGroups.map((group) => [group.key, group]));

const CATEGORY_ORDER = collectionGroups.map((group) => group.key);

const root = document.getElementById("collection-root");
let activeCard = null; // { group, key }

if (root) {
  root.addEventListener("click", handleCollectionClick);
  window.addEventListener(PROGRESSION_CHANGED_EVENT, handleProgressionChanged);
  renderCollection();
}

function handleCollectionClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  if (action === "level-down") {
    decrementLevelForTest();
  } else if (action === "level-up") {
    incrementLevelForTest();
  } else if (action === "open-card") {
    openCard(button.dataset.group, button.dataset.key);
  } else if (action === "close-card") {
    closeCard();
  } else if (action === "unlock-to") {
    const level = parseInt(button.dataset.level, 10);
    if (level > 0) setXp(getXpForLevel(level));
  }
}

function handleProgressionChanged() {
  renderCollection();
}

function renderCollection() {
  if (!root) return;

  const snapshot = getProgressionSnapshot();
  const maxLevel = getMaxDefinedLevel();

  const bpEntries = CATEGORY_ORDER.flatMap((group) =>
    getCollectionEntries(group)
      .filter((e) => e.unlockLevel > 1)
      .map((e) => ({ ...e, group })),
  ).sort((a, b) => a.unlockLevel - b.unlockLevel);

  const featuredEntry = getFeaturedEntry(bpEntries, snapshot.level);
  if (!activeCard && featuredEntry) {
    activeCard = { group: featuredEntry.group, key: featuredEntry.key };
  }

  const fillPct = maxLevel > 1 ? Math.round(((snapshot.level - 1) / (maxLevel - 1)) * 100) : 100;

  root.innerHTML = `
    <div class="bp-header">
      <div class="bp-header__identity">
        <span class="bp-eyebrow">Progression</span>
        <h1 class="bp-title">Collection</h1>
      </div>
      <div class="bp-header__controls">
        <div class="bp-stat">
          <span class="bp-stat__label">Niveau</span>
          <strong class="bp-stat__value">${snapshot.level}<span class="bp-stat__max"> / ${maxLevel}</span></strong>
        </div>
        <div class="bp-stat">
          <span class="bp-stat__label">XP</span>
          <strong class="bp-stat__value">${snapshot.xp}</strong>
        </div>
        <div class="bp-test-actions">
          <button class="bp-action bp-action--down" type="button" data-action="level-down" ${snapshot.level <= 1 ? "disabled" : ""}>−</button>
          <button class="bp-action bp-action--up" type="button" data-action="level-up" ${snapshot.level >= maxLevel ? "disabled" : ""}>+</button>
        </div>
      </div>
    </div>

    <div class="bp-track-wrap">
      <div class="bp-main-grid">
        <section class="bp-rail-panel" aria-label="Progression par niveau">
          <div class="bp-track-wrap">
            <div class="bp-track">
              <div class="bp-track__rail">
                <div class="bp-track__fill" style="width: ${fillPct}%;"></div>
              </div>
              <div class="bp-track__nodes">
                ${renderStartNode(snapshot.level)}
                ${bpEntries.map((entry) => renderBpNode(entry, snapshot.level)).join("")}
              </div>
            </div>
        <div class="bp-track__nodes">
        </section>

        <aside class="bp-side-panel">
          ${renderCurrentLevelCard(snapshot.level, maxLevel, featuredEntry)}
          <div class="bp-detail" id="bp-detail" aria-hidden="true"></div>
        </aside>
      </div>

    `;

    if (activeCard) {
      openCard(activeCard.group, activeCard.key);
    }
  }

  function getFeaturedEntry(entries, currentLevel) {
    const exact = entries.find((entry) => entry.unlockLevel === currentLevel);
    if (exact) return exact;

    const previous = entries.filter((entry) => entry.unlockLevel <= currentLevel).at(-1);
    if (previous) return previous;

    return entries[0] ?? null;
  }

  function renderCurrentLevelCard(currentLevel, maxLevel, featuredEntry) {
    const nextUnlock = getNextUnlockEntry();

    if (!featuredEntry) {
      return `
        <section class="bp-current-card" aria-label="Niveau actuel">
          <span class="bp-current-card__eyebrow">Niveau actuel</span>
          <strong class="bp-current-card__title">Niveau ${currentLevel}</strong>
          <p class="bp-current-card__copy">Aucune recompense definie pour ce palier.</p>
        </section>
      `;
    }

    const meta = CATEGORY_META[featuredEntry.group];
    const iconType = meta.iconType ?? "weapon";
    const iconClass = sanitizeIconClass(featuredEntry.item.icon ?? `${iconType}-${featuredEntry.key}`);
    const categoryClass = featuredEntry.item.category ? ` content-icon--${featuredEntry.item.category}` : "";
    const stateLabel = featuredEntry.unlocked ? "Debloque" : `Niveau ${featuredEntry.unlockLevel}`;
    const nextLabel = nextUnlock
      ? `Prochain objectif: niveau ${nextUnlock.unlockLevel}`
      : `Palier maximum atteint (${maxLevel})`;

    return `
      <section class="bp-current-card" aria-label="Niveau actuel" style="--collection-accent: ${escapeAttr(meta.accent)};">
        <span class="bp-current-card__eyebrow">Niveau actuel</span>
        <strong class="bp-current-card__title">Niveau ${currentLevel}</strong>
        <div class="bp-current-card__item">
          <div class="bp-current-card__icon-wrap">
            ${buildIconDiv(featuredEntry.item, iconClass, categoryClass)}
      </div>
          <div class="bp-current-card__item-copy">
            <span class="bp-current-card__item-state">${escapeHtml(stateLabel)}</span>
            <strong class="bp-current-card__item-name">${escapeHtml(featuredEntry.item.name)}</strong>
            <span class="bp-current-card__item-meta">${escapeHtml(meta.label)} · ${escapeHtml(getMetaLabel(featuredEntry.group, featuredEntry.item))}</span>
          </div>
        </div>
        <p class="bp-current-card__copy">${escapeHtml(nextLabel)}</p>
        <button
          class="bp-current-card__open"
          type="button"
          data-action="open-card"
          data-group="${escapeAttr(featuredEntry.group)}"
          data-key="${escapeAttr(featuredEntry.key)}"
        >
          Voir la carte
        </button>
      </section>
    `;
  }

function renderStartNode(currentLevel) {
  const isCurrent = currentLevel === 1;
  return `
    <div class="bp-node bp-node--origin ${isCurrent ? "is-current" : "is-unlocked"}" data-level="1">
      <span class="bp-node__level">1</span>
      <div class="bp-node__pip"></div>
      <span class="bp-node__name">Départ</span>
    </div>
  `;
}

function renderBpNode(entry, currentLevel) {
  const isCurrent = entry.unlocked && entry.unlockLevel === currentLevel;
  const isNext = !entry.unlocked && entry.unlockLevel === currentLevel + 1;
  const stateClass = isCurrent
    ? "is-current"
    : entry.unlocked
      ? "is-unlocked"
      : isNext
        ? "is-next"
        : "is-locked";
  const isSelected = activeCard?.group === entry.group && activeCard?.key === entry.key;

  const meta = CATEGORY_META[entry.group];
  const iconType = meta.iconType ?? "weapon";
  const iconClass = sanitizeIconClass(entry.item.icon ?? `${iconType}-${entry.key}`);
  const categoryClass = entry.item.category ? ` content-icon--${entry.item.category}` : "";

  return `
    <div
      class="bp-node ${stateClass}${isSelected ? " is-selected" : ""}"
      data-level="${entry.unlockLevel}"
      style="--bp-accent: ${escapeAttr(meta.accent)};"
    >
      <span class="bp-node__level">${entry.unlockLevel}</span>
      <button
        class="bp-node__icon"
        type="button"
        data-action="open-card"
        data-group="${escapeAttr(entry.group)}"
        data-key="${escapeAttr(entry.key)}"
        aria-label="${escapeAttr(entry.item.name)}"
      >
        ${buildIconDiv(entry.item, iconClass, categoryClass)}
      </button>
      <span class="bp-node__name">${escapeHtml(entry.item.name)}</span>
    </div>
  `;
}

function openCard(group, key) {
  activeCard = { group, key };

  const entries = getCollectionEntries(group);
  const entry = entries.find((e) => e.key === key);
  const detail = document.getElementById("bp-detail");
  if (!entry || !detail) return;

  const meta = CATEGORY_META[group];
  const accent = entry.item.accent ?? meta.accent;
  const iconType = meta.iconType ?? "weapon";
  const iconClass = sanitizeIconClass(entry.item.icon ?? `${iconType}-${key}`);
  const categoryClass = entry.item.category ? ` content-icon--${entry.item.category}` : "";
  const chips = getDetailChips(group, entry.item);

  detail.innerHTML = `
    <div class="bp-card" style="--collection-accent: ${escapeAttr(accent)};">
      <div class="bp-card__visual">
        <div class="bp-card__icon-wrap">
          ${buildIconDiv(entry.item, iconClass, categoryClass)}
        </div>
        <span class="bp-card__state-badge ${entry.unlocked ? "is-unlocked" : "is-locked"}">
          ${entry.unlocked ? "Débloqué" : `Niv. ${entry.unlockLevel}`}
        </span>
      </div>
      <div class="bp-card__body">
        <span class="bp-card__eyebrow">${escapeHtml(meta.label)} · ${escapeHtml(getMetaLabel(group, entry.item))}</span>
        <strong class="bp-card__name">${escapeHtml(entry.item.name)}</strong>
        <p class="bp-card__copy">${escapeHtml(entry.item.description)}</p>
        <div class="bp-card__chips">
          ${chips.map((c) => `<span class="bp-card__chip">${escapeHtml(c)}</span>`).join("")}
        </div>
        ${
          !entry.unlocked
            ? `<button class="bp-card__unlock" type="button" data-action="unlock-to" data-level="${entry.unlockLevel}">
                Atteindre le niveau ${entry.unlockLevel}
               </button>`
            : ""
        }
      </div>
      <button class="bp-card__close" type="button" data-action="close-card" aria-label="Fermer">✕</button>
    </div>
  `;

  detail.removeAttribute("aria-hidden");

  root?.querySelectorAll(".bp-node").forEach((n) => n.classList.remove("is-selected"));
  const btn = root?.querySelector(`button[data-action="open-card"][data-group="${group}"][data-key="${key}"]`);
  btn?.closest(".bp-node")?.classList.add("is-selected");
}

function closeCard() {
  activeCard = null;
  const detail = document.getElementById("bp-detail");
  if (detail) {
    detail.innerHTML = "";
    detail.setAttribute("aria-hidden", "true");
  }
  root?.querySelectorAll(".bp-node").forEach((n) => n.classList.remove("is-selected"));
}

function getDetailChips(group, item) {
  if (group === "weapons") {
    return [item.rhythm, item.rangeProfile, item.commitment].filter(Boolean).slice(0, 3);
  }

  if (group === "modules") {
    return [item.role, item.input, item.category].filter(Boolean).slice(0, 3);
  }

  return [item.category, item.role, item.slotLabel].filter(Boolean).slice(0, 3);
}

function getMetaLabel(group, item) {
  const meta = CATEGORY_META[group];
  const matchedField = (meta?.metaFields ?? []).map((field) => item?.[field]).find(Boolean);
  return matchedField ?? meta?.metaFallback ?? group;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function escapeAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}