import "./matchmaking.css";

import { content, weapons } from "../content.js";

function getAbilityName(key) {
  return content.abilities[key]?.name ?? key;
}

function getPerkName(key) {
  return content.perks[key]?.name ?? key;
}

function getUltimateName(key) {
  return content.ultimates[key]?.name ?? key;
}

function getWeaponName(key) {
  return weapons[key]?.name ?? key;
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
    const avatarClass = `content-icon--avatar-${entry.loadout.avatar ?? "drifter"}`;
    const abilityNames = (entry.loadout.abilities ?? []).slice(0, 3).map(getAbilityName).join(", ");
    const perkKey = entry.loadout.perks?.[0] ?? null;
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
      <ul class="lobby-card__loadout">
        <li>WPN: ${getWeaponName(entry.loadout.weapon)}</li>
        <li>ABIL: ${abilityNames || "None"}</li>
        <li>PERK: ${perkKey ? getPerkName(perkKey) : "None"}</li>
        <li>ULT: ${getUltimateName(entry.loadout.ultimate)}</li>
      </ul>
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
