import "./matchmaking.css";

import { content, weapons } from "../content.js";
import { sanitizeIconClass } from "../utils.js";

function getAbilityName(key) {
  return content.modules[key]?.name ?? key;
}

function getPerkName(key) {
  return content.implants[key]?.name ?? key;
}

function getUltimateName(key) {
  return content.cores[key]?.name ?? key;
}

function getWeaponName(key) {
  return weapons[key]?.name ?? key;
}

function normalizeRosterLoadout(source = {}) {
  return {
    weapon: source.weapon ?? null,
    modules: Array.isArray(source.modules) ? source.modules : (Array.isArray(source.abilities) ? source.abilities : []),
    implants: Array.isArray(source.implants) ? source.implants : (Array.isArray(source.perks) ? source.perks : []),
    core: source.core ?? source.ultimate ?? null,
    avatar: source.avatar ?? "drifter",
  };
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

  classes.push(`content-icon--${sanitizeIconClass(item.icon ?? `${type}-${item.key}`)}`);
  return `<span class="${classes.filter(Boolean).join(" ")}" aria-hidden="true"></span>`;
}

function renderLoadoutSlot(slotKey, type, itemKey) {
  const itemName = itemKey
    ? (type === "weapon"
      ? getWeaponName(itemKey)
      : type === "ability"
        ? getAbilityName(itemKey)
        : type === "perk"
          ? getPerkName(itemKey)
          : getUltimateName(itemKey))
    : "Empty";

  return `
    <div class="lobby-card__slot" title="${itemName}">
      <span class="lobby-card__slot-key">${slotKey}</span>
      ${renderContentIcon(type, itemKey, "lobby-card__slot-icon")}
      <span class="lobby-card__slot-name">${itemName}</span>
    </div>`;
}

export function renderMatchmakingRoster(container, roster) {
  if (!container) {
    return;
  }

  container.textContent = "";
  roster.forEach((entry, i) => {
    const card = document.createElement("article");
    card.className = "lobby-card";
    card.style.animationDelay = `${i * 100}ms`;
    const normalizedLoadout = normalizeRosterLoadout(entry.loadout);
    const avatarClass = `content-icon--avatar-${normalizedLoadout.avatar}`;
    const readyClass = entry.ready ? "is-ready" : "is-waiting";
    const readyLabel = entry.ready ? "READY" : "NOT READY";

    card.innerHTML = `
      <div class="lobby-card__head">
        <div class="portrait-frame${entry.ready ? " ready" : ""}">
          <div class="portrait-circle content-icon ${avatarClass}"></div>
        </div>
        <div>
          <strong>${entry.name}</strong>
          <span class="lobby-card__badge badge-gothic${entry.ready ? " status-ready" : ""}">${entry.badge}</span>
        </div>
      </div>
      <span class="lobby-card__ready ${readyClass}" aria-label="${entry.name} is ${readyLabel.toLowerCase()}">${readyLabel}</span>
      <div class="lobby-card__loadout">
        ${renderLoadoutSlot("W", "weapon", normalizedLoadout.weapon)}
        ${renderLoadoutSlot("Q", "ability", normalizedLoadout.modules[0] ?? null)}
        ${renderLoadoutSlot("E", "ability", normalizedLoadout.modules[1] ?? null)}
        ${renderLoadoutSlot("F", "ability", normalizedLoadout.modules[2] ?? null)}
        ${renderLoadoutSlot("P", "perk", normalizedLoadout.implants[0] ?? null)}
        ${renderLoadoutSlot("R", "ultimate", normalizedLoadout.core)}
      </div>
    `;
    container.appendChild(card);
  });
}

export function setMatchmakingCardState(card, state) {
  if (!card) {
    return;
  }

  card.classList.remove("is-searching", "is-found", "is-lobby", "is-loading");
  if (state) {
    card.classList.add(state);
  }
}
