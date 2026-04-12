import {
  getAccountSnapshot,
  initAccountService,
  subscribeAccountState,
  updatePlayerProfile,
} from "../../lib/account/service.js";

const root = document.getElementById("profile-content");
let latestSnapshot = getAccountSnapshot();

const avatars = {
  vanguard: {
    key: "vanguard",
    label: "Vanguard",
    svg: `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="profile-vanguard-bg" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="#1a0e22"/><stop offset="100%" stop-color="#08060e"/></radialGradient></defs><circle cx="78" cy="78" r="76" fill="url(#profile-vanguard-bg)"/><path d="M50 22 Q50 10 78 8 Q106 10 106 22 L108 62 Q108 72 78 74 Q48 72 48 62 Z" fill="#3a1010" stroke="#d4a843" stroke-width="0.8"/><rect x="52" y="40" width="52" height="12" rx="4" fill="#ff5252" opacity="0.95"/><path d="M28 86 Q30 78 48 74 L78 70 L108 74 Q126 78 128 86 L132 140 H24 Z" fill="#3a1212" stroke="#d4a843" stroke-width="0.8"/></svg>`,
  },
  stalker: {
    key: "stalker",
    label: "Stalker",
    svg: `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="profile-stalker-bg" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#120e20"/><stop offset="100%" stop-color="#060410"/></radialGradient></defs><circle cx="78" cy="78" r="76" fill="url(#profile-stalker-bg)"/><path d="M40 74 Q54 22 78 16 Q102 22 116 74 Q102 60 78 56 Q54 60 40 74Z" fill="#1c1430" stroke="#d4a843" stroke-width="0.7"/><ellipse cx="78" cy="56" rx="20" ry="16" fill="#080614"/><line x1="62" y1="52" x2="73" y2="53" stroke="#ff5252" stroke-width="2.8" stroke-linecap="round"/><line x1="83" y1="53" x2="94" y2="52" stroke="#ff5252" stroke-width="2.8" stroke-linecap="round"/><path d="M36 76 L54 66 L78 60 L102 66 L120 76 L128 148 L28 148Z" fill="#22163a" stroke="#d4a843" stroke-width="0.5" opacity="0.9"/></svg>`,
  },
  oracle: {
    key: "oracle",
    label: "Oracle",
    svg: `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="profile-oracle-bg" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="#14082a"/><stop offset="100%" stop-color="#060410"/></radialGradient></defs><circle cx="78" cy="78" r="76" fill="url(#profile-oracle-bg)"/><circle cx="78" cy="55" r="45" fill="#e53935" opacity="0.08"/><path d="M38 80 L56 66 L78 60 L100 66 L118 80 L126 148 L30 148Z" fill="#160a28" stroke="#d4a843" stroke-width="0.5" opacity="0.9"/><ellipse cx="78" cy="46" rx="22" ry="24" fill="#1e1030" stroke="#d4a843" stroke-width="0.5"/><circle cx="78" cy="42" r="10" fill="none" stroke="#ff5252" stroke-width="1.5" opacity="0.7"/><circle cx="78" cy="42" r="3.5" fill="#ff5252" opacity="0.85"/></svg>`,
  },
};

if (root) {
  root.addEventListener("click", handleProfileClick);
  subscribeAccountState((snapshot) => {
    latestSnapshot = snapshot;
    renderProfile(snapshot);
  });
  renderProfile(latestSnapshot);
  void initAccountService();
}

function handleProfileClick(event) {
  const avatarButton = event.target.closest("[data-avatar-key]");
  if (!avatarButton) {
    return;
  }

  const avatarKey = avatarButton.dataset.avatarKey;
  if (!avatars[avatarKey]) {
    return;
  }

  void updatePlayerProfile({ avatar_key: avatarKey });
}

function renderProfile(snapshot) {
  if (!root) {
    return;
  }

  if (!snapshot.isAuthenticated) {
    root.innerHTML = `
      <section class="profile-banner">
        <div class="profile-identity">
          <h1 class="profile-name">Connexion requise</h1>
          <p class="profile-title">Connecte un compte persistant pour retrouver ton profil, ta progression et ton historique de match.</p>
        </div>
      </section>
    `;
    return;
  }

  const profile = snapshot.profile ?? {};
  const history = Array.isArray(snapshot.matchHistory) ? snapshot.matchHistory : [];
  const progression = snapshot.progression ?? {
    xp: 0,
    level: 1,
    wins: 0,
    losses: 0,
    winstreak: 0,
    best_survival_wave: 0,
  };
  const avatar = avatars[profile.avatar_key] ?? avatars.vanguard;
  const matches = progression.wins + progression.losses;
  const winRate = matches > 0 ? Math.round((progression.wins / matches) * 100) : 0;
  const recentHistory = history.slice(0, 8);

  root.innerHTML = `
    <div class="profile-banner">
      <div class="corner-br"></div>
      <div class="corner-tl"></div>
      <div>
        <div class="profile-avatar-frame">
          <div class="profile-avatar-ring"></div>
          <div class="profile-avatar-slot" id="profile-avatar-display">${avatar.svg}</div>
        </div>
        <div class="profile-avatar-picker" id="profile-avatar-picker">
          ${Object.values(avatars).map((entry) => `
            <button class="avatar-pick ${entry.key === avatar.key ? "is-active" : ""}" type="button" data-avatar-key="${entry.key}" title="${entry.label}">
              ${entry.svg}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="profile-identity">
        <h1 class="profile-name">${escapeHtml(profile.display_name ?? "Joueur")}</h1>
        <p class="profile-title">Pilote enregistré côté serveur</p>
        <div class="profile-rank-line">
          <span class="profile-rank-badge">NIVEAU ${progression.level}</span>
          <span class="profile-joined">Depuis le ${formatDate(profile.created_at)}</span>
        </div>
      </div>

      <div class="profile-stats-block">
        <div class="profile-stat">
          <span class="profile-stat__value profile-stat__value--win">${progression.wins}</span>
          <span class="profile-stat__label">Victoires</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__value profile-stat__value--loss">${progression.losses}</span>
          <span class="profile-stat__label">Défaites</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__value">${progression.xp}</span>
          <span class="profile-stat__label">XP serveur</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__value">${progression.best_survival_wave}</span>
          <span class="profile-stat__label">Meilleure vague</span>
        </div>
      </div>
    </div>

    <div class="profile-divider">
      <span class="profile-divider__line"></span>
      <span class="profile-divider__icon">SERVER</span>
      <span class="profile-divider__line"></span>
    </div>

    <div class="profile-section">
      <div class="profile-section-header">
        <h2 class="profile-section-title">État du Compte</h2>
      </div>
      <div class="history-panel">
        <div class="history-list">
          <div class="history-row">
            <span class="history-result history-result--win">Actif</span>
            <div class="history-mode">Profil<span>public.profiles</span></div>
            <span class="history-build">${escapeHtml(profile.id ?? "-")}</span>
            <span class="history-score">${escapeHtml(profile.account_kind ?? "registered")}</span>
            <span class="history-date">${formatDate(profile.updated_at ?? profile.created_at)}</span>
          </div>
          <div class="history-row">
            <span class="history-result ${snapshot.error ? "history-result--loss" : "history-result--win"}">${snapshot.error ? "Erreur" : "OK"}</span>
            <div class="history-mode">Progression<span>public.player_progression</span></div>
            <span class="history-build">Série ${progression.winstreak}</span>
            <span class="history-score">${winRate}% WR</span>
            <span class="history-date">${formatDate(progression.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-divider">
      <span class="profile-divider__line"></span>
      <span class="profile-divider__icon">ARENA</span>
      <span class="profile-divider__line"></span>
    </div>

    <div class="profile-section">
      <div class="profile-section-header">
        <h2 class="profile-section-title">Journal de Combat</h2>
      </div>
      <div class="winrate-label">
        <span>Taux de victoire : ${winRate}%</span>
        <span>${progression.wins}V — ${progression.losses}D · Série ${progression.winstreak}</span>
      </div>
      <div class="winrate-bar">
        <div class="winrate-bar__fill--win" style="width: ${winRate}%;"></div>
        <div class="winrate-bar__fill--loss" style="width: ${100 - winRate}%;"></div>
      </div>
      <div class="history-panel">
        <div class="history-list">
          ${recentHistory.length > 0 ? recentHistory.map((entry) => `
            <div class="history-row">
              <span class="history-result ${getHistoryResultClass(entry.result)}">${escapeHtml(getHistoryResultLabel(entry.result))}</span>
              <div class="history-mode">${escapeHtml(getHistoryModeLabel(entry.mode))}<span>${escapeHtml(entry.mapName)}</span></div>
              <span class="history-build">${escapeHtml(formatHistoryBuild(entry.build))}</span>
              <span class="history-score">${escapeHtml(entry.score)}</span>
              <span class="history-date">${formatDate(entry.date)}</span>
            </div>
          `).join("") : `
            <div class="history-row">
              <span class="history-result history-result--loss">Vide</span>
              <div class="history-mode">Aucun combat<span>Historique serveur</span></div>
              <span class="history-build">Aucun résultat persistant disponible pour ce compte.</span>
              <span class="history-score">--</span>
              <span class="history-date">--</span>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function getHistoryModeLabel(mode) {
  if (mode === "teamDuel") {
    return "Team Duel";
  }
  if (mode === "survival") {
    return "Survival";
  }
  return "Duel";
}

function getHistoryResultLabel(result) {
  if (result === "win") {
    return "Victoire";
  }
  if (result === "survival") {
    return "Survie";
  }
  return "Défaite";
}

function getHistoryResultClass(result) {
  return result === "loss" ? "history-result--loss" : "history-result--win";
}

function formatHistoryBuild(build = {}) {
  const parts = [];
  if (build.weapon) {
    parts.push(formatBuildToken(build.weapon));
  }

  const moduleList = Array.isArray(build.modules) ? build.modules.filter(Boolean) : [];
  if (moduleList.length > 0) {
    parts.push(moduleList.map((entry) => formatBuildToken(entry)).join(" / "));
  }

  if (build.core) {
    parts.push(formatBuildToken(build.core));
  }

  return parts.join(" • ") || "Build indisponible";
}

function formatBuildToken(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const months = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOU", "SEP", "OCT", "NOV", "DEC"];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
