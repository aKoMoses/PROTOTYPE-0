import "./play-page.css";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase/client.js";
import { getAccountSnapshot } from "../../lib/account/service.js";
import { initNetworkService, subscribeNetworkState } from "../../lib/network/service.js";
import { MultiplayerMatch } from "./multiplayer-match.js";

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const root = document.getElementById("play-content");

/** @type {'home'|'classique'|'versus-ia'|'custom-list'|'custom-create'|'custom-lobby'|'multiplayer-match'} */
let currentScreen = "home";

/** @type {MultiplayerMatch|null} */
let activeMatch = null;

/** @type {object|null} current custom_rooms row */
let currentRoom = null;

/** @type {object[]} room_members for the current lobby */
let members = [];

/** @type {object[]|null} null = loading, [] = empty */
let availableRooms = null;

/** @type {import('@supabase/supabase-js').RealtimeChannel|null} */
let realtimeChannel = null;
let roomLaunchTriggered = false;
let networkSnapshot = initNetworkService();

const createForm = {
  name: "",
  format: /** @type {'1v1'|'2v2'} */ ("1v1"),
  botCount: 0,
  botDifficulty: /** @type {'easy'|'normal'|'hard'} */ ("normal"),
};

function getRemotePlayAvailability() {
  if (!isSupabaseConfigured()) {
    return {
      available: false,
      reason: "Supabase non configure. Les modes reseau restent indisponibles tant que les variables d'environnement ne sont pas renseignees.",
    };
  }

  if (!networkSnapshot.isOnline) {
    return {
      available: false,
      reason: "Mode hors ligne actif. Training, Survie et Versus IA local restent jouables, mais les Custom Games et le matchmaking exigent une connexion.",
    };
  }

  return {
    available: true,
    reason: "",
  };
}

function renderOfflineModeNotice() {
  if (networkSnapshot.isOnline) {
    return "";
  }

  return `
    <div class="play-notice play-notice--offline" role="status">
      <strong>Mode hors ligne actif.</strong><br>
      Training, Survie et Versus IA local restent disponibles. Les modes reseau et la synchronisation distante se reconnectent automatiquement quand la connexion revient.
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (used by shell-ui.js)
// ─────────────────────────────────────────────────────────────────────────────

/** Called whenever the play panel becomes visible. Resets to home screen. */
export function activatePage() {
  if (activeMatch) {
    activeMatch.dispose();
    activeMatch = null;
  }
  if (currentScreen !== "home") {
    _unsubscribeRealtime();
    currentRoom = null;
    members = [];
    availableRooms = null;
    currentScreen = "home";
  }
  _renderScreen();
}

/** Called whenever the play panel is hidden. Cleans up Supabase channels. */
export function deactivatePage() {
  if (activeMatch) {
    activeMatch.dispose();
    activeMatch = null;
  }
  _unsubscribeRealtime();
}

// ─────────────────────────────────────────────────────────────────────────────
// Init (self-binding, runs once at module load)
// ─────────────────────────────────────────────────────────────────────────────

if (root) {
  root.addEventListener("click", _handleClick);
  root.addEventListener("change", _handleChange);
  root.addEventListener("input", _handleInput);
  root.addEventListener("submit", _handleSubmit);
  subscribeNetworkState((nextSnapshot) => {
    const wasOnline = networkSnapshot.isOnline;
    networkSnapshot = nextSnapshot;

    if (!nextSnapshot.isOnline) {
      _unsubscribeRealtime();
    } else if (!wasOnline && currentScreen === "custom-list") {
      availableRooms = null;
      void _loadRooms();
      _subscribeRoomList();
    } else if (!wasOnline && currentScreen === "custom-lobby" && currentRoom) {
      _subscribeRoomLobby();
    }

    _renderScreen();
  });
  _renderScreen();
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal router
// ─────────────────────────────────────────────────────────────────────────────

function _navigate(screen, opts = {}) {
  // Dispose any active multiplayer match before navigating away
  if (screen !== "multiplayer-match" && activeMatch) {
    activeMatch.dispose();
    // dispose() calls onExit which sets activeMatch = null
  }

  if (screen !== "custom-lobby" && screen !== "custom-list") {
    _unsubscribeRealtime();
  }

  if (screen !== "multiplayer-match") {
    roomLaunchTriggered = false;
  }

  currentScreen = screen;

  if (screen === "custom-list") {
    availableRooms = null;
    _renderScreen();
    void _loadRooms();
    _subscribeRoomList();
  } else if (screen === "custom-lobby") {
    if (opts.room) currentRoom = opts.room;
    _renderScreen();
    _subscribeRoomLobby();
  } else if (screen === "multiplayer-match") {
    // rendering is delegated to MultiplayerMatch.mount()
  } else {
    _renderScreen();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────

function _renderScreen() {
  if (!root) return;
  switch (currentScreen) {
    case "home":              root.innerHTML = _renderHome(); break;
    case "classique":         root.innerHTML = _renderClassique(); break;
    case "versus-ia":         root.innerHTML = _renderVersusIA(); break;
    case "custom-list":       root.innerHTML = _renderCustomList(); break;
    case "custom-create":     root.innerHTML = _renderCustomCreate(); break;
    case "custom-lobby":      root.innerHTML = _renderCustomLobby(); break;
    case "multiplayer-match": break; // handled by MultiplayerMatch.mount()
    default:                  root.innerHTML = _renderHome();
  }
}

function _renderHome() {
  return `
    <div class="play-page">
      <header class="play-header">
        <h1 class="play-title">Choisir un mode</h1>
      </header>
      ${renderOfflineModeNotice()}
      <div class="play-grid play-grid--home">
        <button class="play-card play-card--classique" data-action="go-classique" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">Mode principal</span>
          <h2 class="play-card__title">Classique</h2>
          <p class="play-card__desc">Affronte des bots, rejoins une room custom ou joue en matchmaking compétitif.</p>
          <span class="play-card__arrow">→</span>
        </button>
        <button class="play-card play-card--survie" data-action="go-survie" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">Mode survie</span>
          <h2 class="play-card__title">Survie</h2>
          <p class="play-card__desc">Tiens le plus longtemps possible face aux vagues ennemies sans répit.</p>
          <span class="play-card__arrow">→</span>
        </button>
        <button class="play-card play-card--training" data-action="go-training" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">Outil d'entraînement</span>
          <h2 class="play-card__title">Training</h2>
          <p class="play-card__desc">Teste tes builds librement sans pression de score ni d'adversaire.</p>
          <span class="play-card__arrow">→</span>
        </button>
      </div>
    </div>
  `;
}

function _renderClassique() {
  const remotePlay = getRemotePlayAvailability();

  return `
    <div class="play-page">
      <header class="play-header">
        <button class="play-back" data-action="go-home" type="button">← Menu</button>
        <h1 class="play-title">Classique</h1>
      </header>
      ${!remotePlay.available ? `
        <div class="play-notice play-notice--warning" role="status">
          <strong>Modes reseau indisponibles.</strong><br>
          ${_esc(remotePlay.reason)}
        </div>
      ` : ""}
      <div class="play-grid play-grid--classique">
        <button class="play-card play-card--versus-ia" data-action="go-versus-ia" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">Solo / Coop</span>
          <h2 class="play-card__title">Versus IA</h2>
          <p class="play-card__desc">Duel 1v1 ou arène 2v2 contre des bots entraînés.</p>
          <span class="play-card__status">Disponible hors ligne</span>
          <span class="play-card__arrow">→</span>
        </button>
        <button class="play-card play-card--custom${remotePlay.available ? "" : " is-disabled"}" ${remotePlay.available ? 'data-action="go-custom-list"' : "disabled aria-disabled=\"true\""} type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">Multijoueur</span>
          <h2 class="play-card__title">Custom Games</h2>
          <p class="play-card__desc">Crée ou rejoins une room ouverte avec d'autres joueurs.</p>
          <span class="play-card__status">${remotePlay.available ? "Connexion requise" : _esc(remotePlay.reason)}</span>
          <span class="play-card__arrow">${remotePlay.available ? "→" : "Indisponible"}</span>
        </button>
        <button class="play-card play-card--matchmaking is-disabled" disabled aria-disabled="true" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">Compétitif</span>
          <h2 class="play-card__title">Matchmaking</h2>
          <p class="play-card__desc">File d'attente automatique. Disponible une fois le backend de file déployé.</p>
          <span class="play-card__tag">Bientôt</span>
        </button>
      </div>
    </div>
  `;
}

function _renderVersusIA() {
  return `
    <div class="play-page">
      <header class="play-header">
        <button class="play-back" data-action="go-classique" type="button">← Classique</button>
        <h1 class="play-title">Versus IA</h1>
      </header>
      ${renderOfflineModeNotice()}
      <div class="play-grid play-grid--versus-ia">
        <button class="play-card play-card--duel" data-action="launch-duel" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">1 contre 1</span>
          <h2 class="play-card__title">1v1 Bot Duel</h2>
          <p class="play-card__desc">Affronte un bot en duel précis. Trois rounds, un vainqueur.</p>
          <span class="play-card__status">Disponible hors ligne</span>
          <span class="play-card__arrow">Lancer →</span>
        </button>
        <button class="play-card play-card--team-duel" data-action="launch-team-duel" type="button">
          <div class="play-card__accent"></div>
          <span class="play-card__eyebrow">2 contre 2</span>
          <h2 class="play-card__title">2v2 Arena</h2>
          <p class="play-card__desc">Joue en équipe aux côtés d'un allié bot contre deux ennemis bots.</p>
          <span class="play-card__status">Disponible hors ligne</span>
          <span class="play-card__arrow">Lancer →</span>
        </button>
      </div>
    </div>
  `;
}

function _renderCustomList() {
  const remotePlay = getRemotePlayAvailability();
  const loading = availableRooms === null;
  const empty = !loading && availableRooms.length === 0;
  const supabaseReady = isSupabaseConfigured();

  let listContent;
  if (!remotePlay.available) {
    listContent = `
      <div class="play-notice play-notice--warning">
        <strong>Custom Games indisponibles.</strong><br>
        ${_esc(remotePlay.reason)}
      </div>
    `;
  } else if (loading) {
    listContent = `<p class="play-empty">Chargement des rooms…</p>`;
  } else if (empty) {
    listContent = `<p class="play-empty">Aucune room ouverte pour l'instant. Crée la tienne !</p>`;
  } else {
    listContent = availableRooms.map((room) => `
      <div class="play-room-row" data-room-id="${_esc(room.id)}">
        <div class="play-room-row__info">
          <strong class="play-room-row__name">${_esc(room.name)}</strong>
          <span class="play-room-row__meta">${_esc(room.format)} · ${room.member_count ?? 0}/${room.max_players} joueurs</span>
        </div>
        <button class="play-btn play-btn--join" data-action="join-room" data-room-id="${_esc(room.id)}" type="button">Rejoindre</button>
      </div>
    `).join("");
  }

  return `
    <div class="play-page">
      <header class="play-header">
        <button class="play-back" data-action="go-classique" type="button">← Classique</button>
        <h1 class="play-title">Custom Games</h1>
        ${remotePlay.available && supabaseReady ? `<button class="play-btn play-btn--create" data-action="go-custom-create" type="button">+ Créer une room</button>` : ""}
      </header>
      <div class="play-room-list" id="play-room-list">
        ${listContent}
      </div>
    </div>
  `;
}

/** Renders 4 slot pills showing VOUS / Libre / IA for the room preview. */
function _renderSlotsPreview(format, botCount) {
  if (format === "1v1") {
    const pill1 = `<span class="play-slot-pill play-slot-pill--self">VOUS</span>`;
    const pill2 = botCount >= 1
      ? `<span class="play-slot-pill play-slot-pill--bot">IA</span>`
      : `<span class="play-slot-pill play-slot-pill--open">Libre</span>`;
    return `<div class="play-slots-preview play-slots-preview--1v1">${pill1}${pill2}</div>`;
  }

  // 2v2: 4 slots — bots fill from the right (B1 → B0 → A1)
  // Slot 0 = A0 (always VOUS), slot 1 = A1, slot 2 = B0, slot 3 = B1
  const pills = [
    `<span class="play-slot-pill play-slot-pill--self">VOUS</span>`,
    botCount >= 3
      ? `<span class="play-slot-pill play-slot-pill--bot">IA</span>`
      : `<span class="play-slot-pill play-slot-pill--open">Libre</span>`,
    botCount >= 2
      ? `<span class="play-slot-pill play-slot-pill--bot">IA</span>`
      : `<span class="play-slot-pill play-slot-pill--open">Libre</span>`,
    botCount >= 1
      ? `<span class="play-slot-pill play-slot-pill--bot">IA</span>`
      : `<span class="play-slot-pill play-slot-pill--open">Libre</span>`,
  ];
  return `
    <div class="play-slots-preview play-slots-preview--2v2">
      <div class="play-slots-preview__team play-slots-preview__team--a">
        <span class="play-slots-preview__team-label">Équipe A</span>
        ${pills[0]}${pills[1]}
      </div>
      <span class="play-slots-preview__vs">VS</span>
      <div class="play-slots-preview__team play-slots-preview__team--b">
        <span class="play-slots-preview__team-label">Équipe B</span>
        ${pills[2]}${pills[3]}
      </div>
    </div>
  `;
}

function _renderCustomCreate() {
  const remotePlay = getRemotePlayAvailability();
  if (!remotePlay.available) {
    return `
      <div class="play-page">
        <header class="play-header">
          <button class="play-back" data-action="go-custom-list" type="button">← Rooms</button>
          <h1 class="play-title">Créer une room</h1>
        </header>
        <div class="play-notice play-notice--warning">
          <strong>Creation indisponible.</strong><br>
          ${_esc(remotePlay.reason)}
        </div>
      </div>
    `;
  }

  const maxBots = createForm.format === "1v1" ? 1 : 3;
  const safeBotCount = Math.min(createForm.botCount, maxBots);

  return `
    <div class="play-page">
      <header class="play-header">
        <button class="play-back" data-action="go-custom-list" type="button">← Rooms</button>
        <h1 class="play-title">Créer une room</h1>
      </header>
      <form class="play-form" id="play-create-form" novalidate>
        <div class="play-form__field">
          <label class="play-form__label" for="room-name">Nom de la room</label>
          <input class="play-form__input" id="room-name" name="name" type="text"
            maxlength="40" placeholder="Ma room épique"
            value="${_esc(createForm.name)}"
            required autocomplete="off" spellcheck="false" />
        </div>
        <div class="play-form__field">
          <label class="play-form__label">Format</label>
          <div class="play-form__radio-group">
            <label class="play-form__radio ${createForm.format === "1v1" ? "is-selected" : ""}">
              <input type="radio" name="format" value="1v1" ${createForm.format === "1v1" ? "checked" : ""} />
              1v1
            </label>
            <label class="play-form__radio ${createForm.format === "2v2" ? "is-selected" : ""}">
              <input type="radio" name="format" value="2v2" ${createForm.format === "2v2" ? "checked" : ""} />
              2v2
            </label>
          </div>
        </div>
        <div class="play-form__field">
          <label class="play-form__label">Bots dans la partie (0–${maxBots})</label>
          <div class="play-botstepper">
            <button class="play-botstepper__btn" data-action="bot-count-dec" type="button"${safeBotCount <= 0 ? " disabled" : ""}>−</button>
            <span class="play-botstepper__count">${safeBotCount} IA</span>
            <button class="play-botstepper__btn" data-action="bot-count-inc" type="button"${safeBotCount >= maxBots ? " disabled" : ""}>+</button>
          </div>
          ${_renderSlotsPreview(createForm.format, safeBotCount)}
        </div>
        <div class="play-form__field${safeBotCount === 0 ? " play-form__field--hidden" : ""}">
          <label class="play-form__label">Difficulté des bots</label>
          <div class="play-form__radio-group">
            ${["easy", "normal", "hard"].map((d) => `
              <label class="play-form__radio ${createForm.botDifficulty === d ? "is-selected" : ""}">
                <input type="radio" name="botDifficulty" value="${d}" ${createForm.botDifficulty === d ? "checked" : ""} />
                ${d.charAt(0).toUpperCase() + d.slice(1)}
              </label>
            `).join("")}
          </div>
        </div>
        <div class="play-form__actions">
          <button class="play-btn play-btn--primary" type="submit" id="play-create-submit">Créer la room</button>
        </div>
        <p class="play-form__error" id="play-create-error" aria-live="polite"></p>
      </form>
    </div>
  `;
}

function _renderCustomLobby() {
  if (!currentRoom) return _renderCustomList();

  const snapshot = getAccountSnapshot();
  const remotePlay = getRemotePlayAvailability();
  const myId = snapshot?.user?.id ?? null;
  const maxPlayers = currentRoom.max_players ?? 2;
  const botCount = currentRoom.bot_count ?? 0;
  const myMember = members.find((m) => m.player_id === myId);
  const amHost = currentRoom.creator_id === myId;
  const amReady = myMember?.is_ready ?? false;
  const allHumanReady = members.length > 0 && members.every((m) => m.is_ready);

  const actionHtml = myMember
    ? `<button class="play-btn ${amReady ? "play-btn--unready" : "play-btn--ready"}" data-action="toggle-ready" type="button" ${remotePlay.available ? "" : 'disabled aria-disabled="true"'}>
         ${amReady ? "Annuler" : "✓ Se déclarer prêt"}
       </button>`
    : `<button class="play-btn play-btn--primary" data-action="join-current-room" type="button" ${remotePlay.available ? "" : 'disabled aria-disabled="true"'}>Rejoindre la room</button>`;

  const startHtml = amHost && allHumanReady && members.length >= 1
    ? `<button class="play-btn play-btn--start" data-action="start-lobby-match" type="button" ${remotePlay.available ? "" : 'disabled aria-disabled="true"'}>⚡ Lancer la partie</button>`
    : "";

  let slotsHtml;
  if (currentRoom.format === "2v2") {
    // Build 4 ordered slot objects: human slots first (0..maxPlayers-1), then bot slots
    const slotObjects = Array.from({ length: 4 }, (_, i) => {
      if (i < maxPlayers) {
        return { type: "human", member: members[i] ?? null };
      }
      return { type: "bot", difficulty: currentRoom.bot_difficulty ?? "normal" };
    });

    const renderSlot = (slot, forMyId) => {
      if (slot.type === "bot") {
        const diffLabel = { easy: "Facile", normal: "Normal", hard: "Difficile" }[slot.difficulty] ?? slot.difficulty;
        return `
          <div class="play-lobby-slot play-lobby-slot--bot">
            <span class="play-lobby-slot__name">Bot IA</span>
            <span class="play-lobby-slot__tag">${_esc(diffLabel)}</span>
          </div>`;
      }
      const m = slot.member;
      if (!m) {
        return `<div class="play-lobby-slot play-lobby-slot--empty"><span class="play-lobby-slot__name">Slot libre…</span></div>`;
      }
      return `
        <div class="play-lobby-slot ${m.is_ready ? "is-ready" : ""} ${m.player_id === forMyId ? "is-self" : ""}">
          <span class="play-lobby-slot__name">${_esc(m.display_name)}</span>
          ${m.is_host ? `<span class="play-lobby-slot__host">Host</span>` : ""}
          <span class="play-lobby-slot__ready">${m.is_ready ? "✓ Prêt" : "En attente…"}</span>
        </div>`;
    };

    const teamA = slotObjects.slice(0, 2);
    const teamB = slotObjects.slice(2, 4);

    slotsHtml = `
      <div class="play-lobby__teams">
        <div class="play-lobby__team play-lobby__team--a">
          <h3 class="play-lobby__team-name">Équipe A</h3>
          ${teamA.map((s) => renderSlot(s, myId)).join("")}
        </div>
        <div class="play-lobby__team-divider">VS</div>
        <div class="play-lobby__team play-lobby__team--b">
          <h3 class="play-lobby__team-name">Équipe B</h3>
          ${teamB.map((s) => renderSlot(s, myId)).join("")}
        </div>
      </div>`;
  } else {
    // 1v1 layout — simple slot list
    slotsHtml = `<div class="play-lobby__slots">` + Array.from({ length: maxPlayers }, (_, i) => {
      const member = members[i];
      if (!member) {
        return `<div class="play-lobby-slot play-lobby-slot--empty"><span class="play-lobby-slot__name">Slot libre…</span></div>`;
      }
      return `
        <div class="play-lobby-slot ${member.is_ready ? "is-ready" : ""} ${member.player_id === myId ? "is-self" : ""}">
          <span class="play-lobby-slot__name">${_esc(member.display_name)}</span>
          ${member.is_host ? `<span class="play-lobby-slot__host">Host</span>` : ""}
          <span class="play-lobby-slot__ready">${member.is_ready ? "✓ Prêt" : "En attente…"}</span>
        </div>`;
    }).join("") + (botCount > 0 ? Array.from({ length: botCount }, () => `
        <div class="play-lobby-slot play-lobby-slot--bot">
          <span class="play-lobby-slot__name">Bot IA</span>
          <span class="play-lobby-slot__tag">${_esc(currentRoom.bot_difficulty ?? "normal")}</span>
        </div>`).join("") : "") + `</div>`;
  }

  return `
    <div class="play-page">
      <header class="play-header">
        <button class="play-back" data-action="leave-room" type="button">← Quitter</button>
        <div class="play-header__room">
          <h1 class="play-title">${_esc(currentRoom.name)}</h1>
          <span class="play-header__meta">${_esc(currentRoom.format)} · ${members.length}/${maxPlayers} joueurs</span>
        </div>
      </header>
      <div class="play-lobby">
        ${!remotePlay.available ? `
          <div class="play-notice play-notice--warning">
            <strong>Connexion requise.</strong><br>
            ${_esc(remotePlay.reason)}
          </div>
        ` : ""}
        ${slotsHtml}
        <div class="play-lobby__actions">
          ${actionHtml}
          ${startHtml}
        </div>
        <p class="play-lobby__status" id="play-lobby-status" aria-live="polite">
          ${!remotePlay.available
            ? _esc(remotePlay.reason)
            : (allHumanReady && members.length >= 1 ? "Tous les joueurs sont prêts !" : "En attente des joueurs…")}
        </p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

function _handleClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (!action) return;

  switch (action) {
    case "go-home":       _navigate("home"); break;
    case "go-classique":  _navigate("classique"); break;
    case "go-versus-ia":  _navigate("versus-ia"); break;
    case "go-survie":     _launchGame("mode-survival"); break;
    case "go-training":   _launchGame("mode-training"); break;
    case "go-custom-list":   _navigate("custom-list"); break;
    case "go-custom-create": _navigate("custom-create"); break;
    case "launch-duel":      _launchGame("mode-duel"); break;
    case "launch-team-duel": _launchGame("mode-team-duel"); break;
    case "join-room":        void _joinRoom(btn.dataset.roomId); break;
    case "join-current-room":void _joinCurrentRoom(); break;
    case "leave-room":       void _leaveRoom(); break;
    case "toggle-ready":     void _toggleReady(); break;
    case "start-lobby-match":void _startLobbyMatch(); break;
    case "bot-count-inc": {
      const maxBots = createForm.format === "1v1" ? 1 : 3;
      createForm.botCount = Math.min(createForm.botCount + 1, maxBots);
      if (currentScreen === "custom-create") _renderScreen();
      break;
    }
    case "bot-count-dec": {
      createForm.botCount = Math.max(createForm.botCount - 1, 0);
      if (currentScreen === "custom-create") _renderScreen();
      break;
    }
  }
}

function _handleChange(e) {
  const input = e.target;
  if (!input.name) return;
  if (input.name === "format" && input.type === "radio") {
    createForm.format = /** @type {'1v1'|'2v2'} */ (input.value);
    if (currentScreen === "custom-create") _renderScreen();
  } else if (input.name === "botDifficulty" && input.type === "radio") {
    createForm.botDifficulty = /** @type {'easy'|'normal'|'hard'} */ (input.value);
    if (currentScreen === "custom-create") _renderScreen();
  }
}

function _handleInput(e) {
  const input = e.target;
  if (!input.name) return;
  if (input.name === "name") {
    createForm.name = input.value;
  }
}

function _handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form && form.id === "play-create-form") {
    void _submitCreateRoom(form);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Launch
// ─────────────────────────────────────────────────────────────────────────────

async function _launchGame(modeAction) {
  if (!window.__P0_SHELL) return;
  await window.__P0_SHELL.setView("game");
  window.handlePrematchAction?.(modeAction);
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase — Room List
// ─────────────────────────────────────────────────────────────────────────────

async function _loadRooms() {
  if (!getRemotePlayAvailability().available) {
    availableRooms = [];
    _renderScreen();
    return;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("custom_rooms")
    .select(`id, name, format, status, bot_count, bot_difficulty, max_players, creator_id, created_at,
             room_members(count)`)
    .eq("status", "waiting")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[PlayPage] loadRooms:", error.message);
    availableRooms = [];
  } else {
    availableRooms = (data ?? []).map((r) => ({
      ...r,
      member_count: r.room_members?.[0]?.count ?? 0,
    }));
  }
  if (currentScreen === "custom-list") _renderScreen();
}

async function _submitCreateRoom(form) {
  const errorEl = document.getElementById("play-create-error");
  const submitBtn = document.getElementById("play-create-submit");
  const remotePlay = getRemotePlayAvailability();

  const name = createForm.name.trim();
  if (!name) {
    if (errorEl) errorEl.textContent = "Donne un nom à ta room.";
    return;
  }
  if (!remotePlay.available) {
    if (errorEl) errorEl.textContent = remotePlay.reason;
    return;
  }

  const snapshot = getAccountSnapshot();
  const userId = snapshot?.user?.id;
  if (!userId) {
    if (errorEl) errorEl.textContent = "Tu dois être connecté pour créer une room.";
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  const supabase = getSupabaseClient();
  const totalSlots = createForm.format === "1v1" ? 2 : 4;
  const maxBots = totalSlots - 1; // always leave at least 1 human slot
  const botCount = Math.min(Math.max(0, createForm.botCount), maxBots);
  const maxPlayers = totalSlots - botCount; // joinable human slots

  const { data: room, error: roomError } = await supabase
    .from("custom_rooms")
    .insert({
      creator_id: userId,
      name,
      format: createForm.format,
      status: "waiting",
      bot_count: botCount,
      bot_difficulty: createForm.botDifficulty,
      max_players: maxPlayers,
    })
    .select()
    .single();

  if (roomError) {
    console.error("[PlayPage] createRoom:", roomError.message);
    if (errorEl) errorEl.textContent = roomError.message ?? "Erreur lors de la création.";
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  // Auto-join as host
  const profile = snapshot.profile;
  const { error: joinError } = await supabase
    .from("room_members")
    .insert({
      room_id: room.id,
      player_id: userId,
      display_name: profile?.display_name ?? "Pilot",
      avatar_key: profile?.avatar_key ?? "vanguard",
      is_ready: false,
      is_host: true,
    });

  if (joinError) console.warn("[PlayPage] autoJoin as host:", joinError.message);

  currentRoom = room;
  members = [];
  createForm.name = "";
  createForm.botCount = 0;
  _navigate("custom-lobby", { room });
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase — Lobby Actions
// ─────────────────────────────────────────────────────────────────────────────

async function _joinRoom(roomId) {
  if (!roomId || !getRemotePlayAvailability().available) return;

  const supabase = getSupabaseClient();
  const { data: room, error } = await supabase
    .from("custom_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error || !room) {
    console.error("[PlayPage] joinRoom fetch:", error?.message);
    return;
  }

  currentRoom = room;
  members = [];
  _navigate("custom-lobby", { room });

  const snapshot = getAccountSnapshot();
  const userId = snapshot?.user?.id;
  if (!userId) return;

  const profile = snapshot.profile;
  const { error: joinError } = await supabase
    .from("room_members")
    .upsert(
      {
        room_id: room.id,
        player_id: userId,
        display_name: profile?.display_name ?? "Pilot",
        avatar_key: profile?.avatar_key ?? "vanguard",
        is_ready: false,
        is_host: false,
      },
      { onConflict: "room_id,player_id" },
    );

  if (joinError) console.warn("[PlayPage] joinRoom insert:", joinError.message);
}

async function _joinCurrentRoom() {
  if (currentRoom) void _joinRoom(currentRoom.id);
}

async function _leaveRoom() {
  if (!currentRoom) { _navigate("custom-list"); return; }

  if (getRemotePlayAvailability().available) {
    const snapshot = getAccountSnapshot();
    const userId = snapshot?.user?.id;
    if (userId) {
      const supabase = getSupabaseClient();
      await supabase
        .from("room_members")
        .delete()
        .eq("room_id", currentRoom.id)
        .eq("player_id", userId);

      // Close room if host
      if (currentRoom.creator_id === userId) {
        await supabase
          .from("custom_rooms")
          .delete()
          .eq("id", currentRoom.id);
      }
    }
  }

  _unsubscribeRealtime();
  currentRoom = null;
  members = [];
  _navigate("custom-list");
}

async function _toggleReady() {
  if (!currentRoom || !getRemotePlayAvailability().available) return;

  const snapshot = getAccountSnapshot();
  const userId = snapshot?.user?.id;
  if (!userId) return;

  const myMember = members.find((m) => m.player_id === userId);
  if (!myMember) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("room_members")
    .update({ is_ready: !myMember.is_ready })
    .eq("room_id", currentRoom.id)
    .eq("player_id", userId);

  if (error) console.error("[PlayPage] toggleReady:", error.message);
}

async function _startLobbyMatch() {
  if (!currentRoom || !getRemotePlayAvailability().available) return;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    await supabase
      .from("custom_rooms")
      .update({ status: "in_progress" })
      .eq("id", currentRoom.id);
  }

  const room = currentRoom;
  _unsubscribeRealtime();
  currentRoom = null;
  members = [];
  await _launchRealtimeRoom(room, { hostInitiated: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Realtime
// ─────────────────────────────────────────────────────────────────────────────

function _subscribeRoomList() {
  if (!getRemotePlayAvailability().available) return;
  _unsubscribeRealtime();

  const supabase = getSupabaseClient();
  realtimeChannel = supabase
    .channel("play_custom_rooms_list")
    .on("postgres_changes", { event: "*", schema: "public", table: "custom_rooms" }, () => {
      void _loadRooms();
    })
    .subscribe();
}

function _subscribeRoomLobby() {
  if (!getRemotePlayAvailability().available || !currentRoom) return;
  _unsubscribeRealtime();

  void _loadLobbyMembers();

  const supabase = getSupabaseClient();
  realtimeChannel = supabase
    .channel(`play_room_lobby_${currentRoom.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${currentRoom.id}` },
      (payload) => _handleMemberChange(payload),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "custom_rooms", filter: `id=eq.${currentRoom.id}` },
      (payload) => {
        currentRoom = { ...currentRoom, ...payload.new };
        if (currentRoom.status === "in_progress" && !roomLaunchTriggered) {
          roomLaunchTriggered = true;
          void _launchRealtimeRoom(currentRoom, { hostInitiated: false });
          return;
        }
        _renderScreen();
      },
    )
    .subscribe();
}

async function _loadLobbyMembers() {
  if (!getRemotePlayAvailability().available || !currentRoom) return;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", currentRoom.id)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[PlayPage] loadLobbyMembers:", error.message);
    return;
  }
  members = data ?? [];
  _renderScreen();
}

function _handleMemberChange({ eventType, new: newRow, old: oldRow }) {
  if (eventType === "INSERT") {
    members = [...members.filter((m) => m.player_id !== newRow.player_id), newRow];
  } else if (eventType === "UPDATE") {
    members = members.map((m) => m.player_id === newRow.player_id ? { ...m, ...newRow } : m);
  } else if (eventType === "DELETE") {
    members = members.filter((m) => m.player_id !== oldRow.player_id);
  }
  _renderScreen();
}

function _unsubscribeRealtime() {
  if (!realtimeChannel || !isSupabaseConfigured()) return;
  try {
    getSupabaseClient().removeChannel(realtimeChannel);
  } catch {
    // Ignore cleanup errors
  }
  realtimeChannel = null;
}

async function _launchRealtimeRoom(room, { hostInitiated = false } = {}) {
  if (!room) return;

  const isNetwork1v1 = room.format === "1v1";
  const isNetwork2v2 = room.format === "2v2";

  if (isNetwork1v1 || isNetwork2v2) {
    _unsubscribeRealtime();
    currentRoom = null;
    members = [];

    activeMatch = new MultiplayerMatch({
      root,
      supabaseRoom: room,
      onExit: () => {
        activeMatch = null;
        _navigate("classique");
      },
    });
    currentScreen = "multiplayer-match";
    activeMatch.mount();
    return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
