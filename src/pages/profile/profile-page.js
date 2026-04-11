/* ================================================================
   PROTOTYPE-0  ·  PAGE PROFIL — V2
   Texte FR · SVG détaillés · design senior
   ================================================================ */

(function initProfile() {
  /* ── DONNÉES JOUEUR ──────────────────────────────────────────── */
  const player = {
    name: "SaA_BOT",
    title: "Champion de la Casse",
    rank: "VÉTÉRAN D'ARÈNE",
    joined: "2026-03-01",
    avatar: 0,
  };

  const stats = {
    wins: 47,
    losses: 31,
    matches: 78,
    winstreak: 5,
  };

  const badges = [
    { id: "duel-master",     name: "Maître Duelliste",   desc: "10 victoires en duel",             icon: "swords",  unlocked: true  },
    { id: "iron-will",       name: "Volonté de Fer",     desc: "Survécu à 5 vagues de survie",     icon: "shield",  unlocked: true  },
    { id: "build-architect", name: "Architecte",         desc: "Créé 3 loadouts uniques",          icon: "wrench",  unlocked: true  },
    { id: "untouchable",     name: "Intouchable",        desc: "Match parfait, 0 dégât reçu",      icon: "eye",     unlocked: false },
    { id: "warforged",       name: "Forgé par la Guerre", desc: "100 matchs disputés",             icon: "anvil",   unlocked: false },
  ];

  const matchHistory = [
    { result: "win",  mode: "Duel",    map: "Fosse de Forge",     build: "Fusil Pulsé / Javelot",       score: "2 - 0",    date: "2026-04-08" },
    { result: "win",  mode: "Duel",    map: "Fonderie de Ferraille", build: "Fusil à Pompe / Bouclier", score: "2 - 1",    date: "2026-04-08" },
    { result: "loss", mode: "Duel",    map: "Sanctuaire de Fer",  build: "Railgun / Champ",             score: "0 - 2",    date: "2026-04-07" },
    { result: "win",  mode: "Survie",  map: "Défi des Vagues",    build: "Fusil Pulsé / Javelot",       score: "Vague 7",  date: "2026-04-07" },
    { result: "loss", mode: "Duel",    map: "Fosse de Forge",     build: "Fusil à Pompe / Javelot",     score: "1 - 2",    date: "2026-04-06" },
    { result: "win",  mode: "Duel",    map: "Fonderie de Ferraille", build: "Railgun / Bouclier",       score: "2 - 0",    date: "2026-04-06" },
    { result: "win",  mode: "Survie",  map: "Défi des Vagues",    build: "Fusil Pulsé / Champ",         score: "Vague 9",  date: "2026-04-05" },
    { result: "loss", mode: "Duel",    map: "Sanctuaire de Fer",  build: "Fusil à Pompe / Javelot",     score: "1 - 2",    date: "2026-04-04" },
    { result: "win",  mode: "Duel",    map: "Fosse de Forge",     build: "Fusil Pulsé / Javelot",       score: "2 - 1",    date: "2026-04-04" },
    { result: "loss", mode: "Duel",    map: "Fonderie de Ferraille", build: "Railgun / Champ",          score: "0 - 2",    date: "2026-04-03" },
  ];

  /* ── SVG AVATARS — détaillés, lumineux, vivants ──────────────── */
  const avatars = [
    // 0 — Space Marine
    `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sm-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5c1e1e"/>
          <stop offset="50%" stop-color="#3a1212"/>
          <stop offset="100%" stop-color="#1e0808"/>
        </linearGradient>
        <linearGradient id="sm-visor" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#c62828"/>
          <stop offset="50%" stop-color="#ff5252"/>
          <stop offset="100%" stop-color="#c62828"/>
        </linearGradient>
        <radialGradient id="sm-bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#1a0e22"/>
          <stop offset="100%" stop-color="#08060e"/>
        </radialGradient>
        <filter id="sm-glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="sm-glow-lg"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="78" cy="78" r="76" fill="url(#sm-bg)"/>
      <!-- Ambient glow -->
      <circle cx="78" cy="50" r="40" fill="#c62828" opacity="0.04" filter="url(#sm-glow-lg)"/>
      <!-- Torso / Chest plate -->
      <path d="M28 86 Q30 78 48 74 L78 70 L108 74 Q126 78 128 86 L132 140 H24 Z" fill="url(#sm-plate)" stroke="#d4a843" stroke-width="0.8"/>
      <!-- Collar gorget -->
      <path d="M48 74 Q78 66 108 74 Q108 80 78 76 Q48 80 48 74Z" fill="#4a1a1a" stroke="#d4a843" stroke-width="0.6"/>
      <!-- Pauldrons — massive, layered -->
      <path d="M14 78 Q16 64 32 60 L44 64 L44 108 Q32 106 18 98 Z" fill="#5a1e1e" stroke="#e53935" stroke-width="1.2"/>
      <path d="M18 80 Q20 70 32 66 L40 68 L40 102 Q30 100 22 94 Z" fill="#4a1616" stroke="#d4a843" stroke-width="0.6" opacity="0.7"/>
      <path d="M112 78 Q140 64 124 60 L112 64 L112 108 Q124 106 138 98 Z" fill="#5a1e1e" stroke="#e53935" stroke-width="1.2"/>
      <path d="M116 80 Q136 70 124 66 L116 68 L116 102 Q126 100 134 94 Z" fill="#4a1616" stroke="#d4a843" stroke-width="0.6" opacity="0.7"/>
      <!-- Aquila emblem on chest -->
      <path d="M66 92 L72 84 L78 88 L84 84 L90 92 L84 88 L78 96 L72 88Z" fill="#d4a843" opacity="0.8"/>
      <circle cx="78" cy="88" r="2" fill="#ffd54f" opacity="0.6"/>
      <!-- Helmet -->
      <path d="M50 22 Q50 10 78 8 Q106 10 106 22 L108 62 Q108 72 78 74 Q48 72 48 62 Z" fill="#3a1010" stroke="#d4a843" stroke-width="0.8"/>
      <!-- Helmet plate lines -->
      <line x1="60" y1="14" x2="60" y2="60" stroke="#d4a843" stroke-width="0.3" opacity="0.3"/>
      <line x1="96" y1="14" x2="96" y2="60" stroke="#d4a843" stroke-width="0.3" opacity="0.3"/>
      <!-- Visor — glowing slit -->
      <rect x="52" y="40" width="52" height="12" rx="4" fill="url(#sm-visor)" filter="url(#sm-glow)" opacity="0.95"/>
      <line x1="56" y1="46" x2="100" y2="46" stroke="#ff8a80" stroke-width="1.5" opacity="0.5"/>
      <!-- Helmet crest -->
      <path d="M68 8 Q78 0 88 8 L86 4 Q78 -1 70 4 Z" fill="#5a1e1e" stroke="#d4a843" stroke-width="0.5"/>
      <rect x="72" y="2" width="12" height="12" rx="2" fill="#4a1616" stroke="#d4a843" stroke-width="0.5"/>
      <!-- Breathing grille -->
      <rect x="64" y="56" width="28" height="10" rx="2" fill="#1a0808" stroke="#d4a843" stroke-width="0.4"/>
      <line x1="68" y1="58" x2="68" y2="64" stroke="#d4a843" stroke-width="0.4" opacity="0.4"/>
      <line x1="72" y1="58" x2="72" y2="64" stroke="#d4a843" stroke-width="0.4" opacity="0.4"/>
      <line x1="76" y1="58" x2="76" y2="64" stroke="#d4a843" stroke-width="0.4" opacity="0.4"/>
      <line x1="80" y1="58" x2="80" y2="64" stroke="#d4a843" stroke-width="0.4" opacity="0.4"/>
      <line x1="84" y1="58" x2="84" y2="64" stroke="#d4a843" stroke-width="0.4" opacity="0.4"/>
      <line x1="88" y1="58" x2="88" y2="64" stroke="#d4a843" stroke-width="0.4" opacity="0.4"/>
      <!-- Gold rivets -->
      <circle cx="52" cy="32" r="2" fill="#d4a843" opacity="0.6"/>
      <circle cx="104" cy="32" r="2" fill="#d4a843" opacity="0.6"/>
      <circle cx="24" cy="84" r="1.5" fill="#d4a843" opacity="0.45"/>
      <circle cx="132" cy="84" r="1.5" fill="#d4a843" opacity="0.45"/>
      <circle cx="48" cy="74" r="1.5" fill="#d4a843" opacity="0.35"/>
      <circle cx="108" cy="74" r="1.5" fill="#d4a843" opacity="0.35"/>
      <!-- Pauldron skull icon (left) -->
      <circle cx="30" cy="82" r="5" fill="none" stroke="#d4a843" stroke-width="0.6" opacity="0.4"/>
      <circle cx="28" cy="80" r="1" fill="#d4a843" opacity="0.3"/>
      <circle cx="32" cy="80" r="1" fill="#d4a843" opacity="0.3"/>
    </svg>`,

    // 1 — Assassin
    `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="as-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22163a"/>
          <stop offset="100%" stop-color="#0c0818"/>
        </linearGradient>
        <linearGradient id="as-blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd54f"/>
          <stop offset="100%" stop-color="#d4a843"/>
        </linearGradient>
        <radialGradient id="as-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#120e20"/>
          <stop offset="100%" stop-color="#060410"/>
        </radialGradient>
        <filter id="as-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="as-glow-sm"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="78" cy="78" r="76" fill="url(#as-bg)"/>
      <!-- Subtle crimson ambient -->
      <circle cx="78" cy="52" r="30" fill="#e53935" opacity="0.04" filter="url(#as-glow)"/>
      <!-- Cloak body -->
      <path d="M36 76 L54 66 L78 60 L102 66 L120 76 L128 148 L28 148Z" fill="url(#as-body)" stroke="#d4a843" stroke-width="0.5" opacity="0.9"/>
      <!-- Cloak texture lines -->
      <line x1="60" y1="72" x2="48" y2="145" stroke="#d4a843" stroke-width="0.3" opacity="0.15"/>
      <line x1="96" y1="72" x2="108" y2="145" stroke="#d4a843" stroke-width="0.3" opacity="0.15"/>
      <line x1="78" y1="64" x2="78" y2="148" stroke="#d4a843" stroke-width="0.2" opacity="0.1"/>
      <!-- Inner cloak fold highlight -->
      <path d="M56 72 L70 64 L78 62 L86 64 L100 72 L106 145 L50 145Z" fill="#1a1230" opacity="0.5"/>
      <!-- Hood — dramatic, peaked -->
      <path d="M40 74 Q54 22 78 16 Q102 22 116 74 Q102 60 78 56 Q54 60 40 74Z" fill="#1c1430" stroke="#d4a843" stroke-width="0.7"/>
      <!-- Hood inner shadow -->
      <path d="M48 70 Q60 30 78 24 Q96 30 108 70 Q96 58 78 54 Q60 58 48 70Z" fill="#0e0a1a" opacity="0.8"/>
      <!-- Face void -->
      <ellipse cx="78" cy="56" rx="20" ry="16" fill="#080614"/>
      <!-- Eyes — narrow crimson slits, bright -->
      <line x1="62" y1="52" x2="73" y2="53" stroke="#ff5252" stroke-width="2.8" stroke-linecap="round" filter="url(#as-glow)"/>
      <line x1="83" y1="53" x2="94" y2="52" stroke="#ff5252" stroke-width="2.8" stroke-linecap="round" filter="url(#as-glow)"/>
      <!-- Eye highlight -->
      <line x1="65" y1="52" x2="70" y2="52.5" stroke="#ff8a80" stroke-width="1" opacity="0.5"/>
      <line x1="86" y1="52.5" x2="91" y2="52" stroke="#ff8a80" stroke-width="1" opacity="0.5"/>
      <!-- Blade — right hand, detailed -->
      <line x1="112" y1="82" x2="140" y2="36" stroke="url(#as-blade)" stroke-width="2" opacity="0.7"/>
      <line x1="140" y1="36" x2="142" y2="32" stroke="#ffd54f" stroke-width="1.2" opacity="0.9"/>
      <!-- Blade glow -->
      <line x1="118" y1="72" x2="140" y2="36" stroke="#d4a843" stroke-width="4" opacity="0.08" filter="url(#as-glow)"/>
      <!-- Blade guard -->
      <rect x="108" y="80" width="10" height="4" rx="1" fill="#d4a843" opacity="0.5" transform="rotate(-25, 113, 82)"/>
      <!-- Belt with buckle -->
      <rect x="58" y="78" width="40" height="5" rx="1" fill="#1a1430" stroke="#d4a843" stroke-width="0.5" opacity="0.6"/>
      <rect x="72" y="77" width="12" height="7" rx="1" fill="#d4a843" opacity="0.45"/>
      <!-- Rune marks on cloak -->
      <text x="60" y="108" font-size="6" fill="#e53935" opacity="0.12" font-family="serif" letter-spacing="4">⟁ ⟁ ⟁ ⟁</text>
      <text x="64" y="118" font-size="5" fill="#d4a843" opacity="0.08" font-family="serif" letter-spacing="3">⸸ ⸸ ⸸</text>
      <!-- Throwing knives at hip -->
      <line x1="46" y1="84" x2="38" y2="96" stroke="#d4a843" stroke-width="0.8" opacity="0.35"/>
      <line x1="44" y1="86" x2="36" y2="98" stroke="#d4a843" stroke-width="0.8" opacity="0.3"/>
    </svg>`,

    // 2 — Psyker
    `<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ps-aura" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stop-color="#e53935" stop-opacity="0.2"/>
          <stop offset="40%" stop-color="#e53935" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <radialGradient id="ps-aura2" cx="50%" cy="35%" r="40%">
          <stop offset="0%" stop-color="#d4a843" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <radialGradient id="ps-bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#14082a"/>
          <stop offset="100%" stop-color="#060410"/>
        </radialGradient>
        <filter id="ps-glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="ps-glow-sm"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="ps-glow-xs"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="78" cy="78" r="76" fill="url(#ps-bg)"/>
      <!-- Warp energy aura — layered -->
      <circle cx="78" cy="60" r="60" fill="url(#ps-aura)"/>
      <circle cx="78" cy="55" r="45" fill="url(#ps-aura2)"/>
      <!-- Robe — flowing, layered -->
      <path d="M38 80 L56 66 L78 60 L100 66 L118 80 L126 148 L30 148Z" fill="#160a28" stroke="#d4a843" stroke-width="0.5" opacity="0.9"/>
      <!-- Inner robe glow -->
      <path d="M50 82 L64 72 L78 66 L92 72 L106 82 L112 146 L44 146Z" fill="#1e1038" opacity="0.45"/>
      <!-- Robe details -->
      <line x1="78" y1="66" x2="78" y2="148" stroke="#d4a843" stroke-width="0.3" opacity="0.12"/>
      <path d="M62 78 Q78 74 94 78" fill="none" stroke="#d4a843" stroke-width="0.4" opacity="0.2"/>
      <!-- Head — ethereal, partially translucent -->
      <ellipse cx="78" cy="46" rx="22" ry="24" fill="#1e1030" stroke="#d4a843" stroke-width="0.5"/>
      <!-- Face features — subtle -->
      <ellipse cx="78" cy="48" rx="16" ry="18" fill="#140c24" opacity="0.6"/>
      <!-- Primary psychic eye — large, central, vivid -->
      <circle cx="78" cy="42" r="10" fill="none" stroke="#e53935" stroke-width="1.5" filter="url(#ps-glow)" opacity="0.7"/>
      <circle cx="78" cy="42" r="6" fill="none" stroke="#ff5252" stroke-width="1" filter="url(#ps-glow-sm)" opacity="0.6"/>
      <circle cx="78" cy="42" r="3.5" fill="#ff5252" filter="url(#ps-glow)"/>
      <circle cx="78" cy="42" r="1.5" fill="#fff" opacity="0.7"/>
      <!-- Third eye — forehead -->
      <circle cx="78" cy="28" r="4" fill="none" stroke="#d4a843" stroke-width="0.8" opacity="0.5"/>
      <circle cx="78" cy="28" r="2" fill="#ffd54f" opacity="0.6" filter="url(#ps-glow-sm)"/>
      <!-- Floating warp particles — more, brighter -->
      <circle cx="38" cy="32" r="2" fill="#e53935" opacity="0.55" filter="url(#ps-glow-sm)">
        <animate attributeName="cy" values="32;26;32" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="118" cy="38" r="1.8" fill="#ffd54f" opacity="0.5" filter="url(#ps-glow-sm)">
        <animate attributeName="cy" values="38;30;38" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="48" cy="58" r="1.2" fill="#ff5252" opacity="0.35" filter="url(#ps-glow-xs)">
        <animate attributeName="cy" values="58;52;58" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="108" cy="54" r="1.5" fill="#ffd54f" opacity="0.35" filter="url(#ps-glow-xs)">
        <animate attributeName="cy" values="54;46;54" dur="3.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="56" cy="22" r="1" fill="#e53935" opacity="0.3" filter="url(#ps-glow-xs)">
        <animate attributeName="cy" values="22;18;22" dur="2.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="100" cy="24" r="1.2" fill="#d4a843" opacity="0.25" filter="url(#ps-glow-xs)">
        <animate attributeName="cy" values="24;18;24" dur="3.2s" repeatCount="indefinite"/>
      </circle>
      <!-- Warp lightning strands -->
      <polyline points="58,30 50,20 54,14 46,6" fill="none" stroke="#e53935" stroke-width="1" opacity="0.35" filter="url(#ps-glow-sm)"/>
      <polyline points="98,30 106,20 102,14 110,6" fill="none" stroke="#e53935" stroke-width="1" opacity="0.35" filter="url(#ps-glow-sm)"/>
      <polyline points="42,46 34,40 38,34" fill="none" stroke="#d4a843" stroke-width="0.6" opacity="0.2" filter="url(#ps-glow-xs)"/>
      <polyline points="114,46 122,40 118,34" fill="none" stroke="#d4a843" stroke-width="0.6" opacity="0.2" filter="url(#ps-glow-xs)"/>
      <!-- Staff — left hand -->
      <line x1="28" y1="60" x2="20" y2="148" stroke="#d4a843" stroke-width="2" opacity="0.55"/>
      <line x1="28" y1="60" x2="20" y2="148" stroke="#d4a843" stroke-width="0.5" opacity="0.8"/>
      <!-- Staff head — orb in a frame -->
      <circle cx="28" cy="56" r="7" fill="none" stroke="#d4a843" stroke-width="1" opacity="0.5"/>
      <circle cx="28" cy="56" r="4" fill="#e53935" opacity="0.4" filter="url(#ps-glow)"/>
      <circle cx="28" cy="56" r="2" fill="#ff5252" opacity="0.6" filter="url(#ps-glow-sm)"/>
      <!-- Psychic hands glow -->
      <circle cx="56" cy="88" r="6" fill="#e53935" opacity="0.06" filter="url(#ps-glow)"/>
      <circle cx="100" cy="88" r="6" fill="#e53935" opacity="0.06" filter="url(#ps-glow)"/>
    </svg>`,
  ];

  /* ── ICÔNES BADGES (mini SVGs améliorés) ─────────────────────── */
  const badgeIcons = {
    swords: `<svg viewBox="0 0 28 28" fill="none" stroke="#d4a843" stroke-width="1.5" stroke-linecap="round">
      <path d="M5 23L13 15M23 5L15 13M16.5 7.5L20.5 11.5M7.5 16.5L11.5 20.5"/>
      <path d="M23 5L19 5L19 9" stroke-opacity="0.6"/>
      <path d="M5 23L9 23L9 19" stroke-opacity="0.6"/>
      <circle cx="14" cy="14" r="1.5" fill="#d4a843" opacity="0.4"/>
    </svg>`,
    shield: `<svg viewBox="0 0 28 28" fill="none" stroke="#d4a843" stroke-width="1.5" stroke-linecap="round">
      <path d="M14 3L5 8V15C5 20 8.8 24.5 14 25.5C19.2 24.5 23 20 23 15V8L14 3Z"/>
      <path d="M14 8L14 18" stroke-opacity="0.4"/>
      <path d="M9 13L19 13" stroke-opacity="0.4"/>
      <path d="M14 3L14 6" stroke="#ffd54f" stroke-opacity="0.5"/>
    </svg>`,
    wrench: `<svg viewBox="0 0 28 28" fill="none" stroke="#d4a843" stroke-width="1.5" stroke-linecap="round">
      <path d="M16.7 7.3A9 9 0 0 0 5 5L8 8V11.5H11.5L12.1 10.9"/>
      <path d="M17 6L21.5 10.5L11.2 20.8A3 3 0 0 1 6.8 16.4L17 6Z"/>
      <circle cx="9" cy="19" r="1" fill="#d4a843" opacity="0.3"/>
    </svg>`,
    eye: `<svg viewBox="0 0 28 28" fill="none" stroke="#d4a843" stroke-width="1.5" stroke-linecap="round">
      <path d="M2 14S6 5 14 5 26 14 26 14 22 23 14 23 2 14 2 14Z"/>
      <circle cx="14" cy="14" r="4"/>
      <circle cx="14" cy="14" r="1.5" fill="#d4a843" opacity="0.5"/>
    </svg>`,
    anvil: `<svg viewBox="0 0 28 28" fill="none" stroke="#d4a843" stroke-width="1.5" stroke-linecap="round">
      <path d="M5 19H23V21.5H5Z"/>
      <path d="M7 14.5H21L23 19H5Z"/>
      <path d="M9 10H19L21 14.5H7Z"/>
      <path d="M11.5 10V6.5H16.5V10"/>
      <line x1="14" y1="6.5" x2="14" y2="4" stroke="#ffd54f" stroke-opacity="0.4"/>
    </svg>`,
  };

  /* ── ICÔNE AQUILA (séparateur) ───────────────────────────────── */
  const aquilaIcon = `<svg viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 3L7 14L1 11L10 21H18L20 16L22 21H30L39 11L33 14L20 3Z" fill="currentColor" opacity="0.55"/>
    <path d="M20 3L14 10L20 8L26 10Z" fill="currentColor" opacity="0.3"/>
    <circle cx="20" cy="10" r="2.5" fill="currentColor" opacity="0.75"/>
    <line x1="20" y1="13" x2="20" y2="20" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
  </svg>`;

  /* ── RENDU ───────────────────────────────────────────────────── */
  const container = document.getElementById("profile-content");
  if (!container) return;

  const winRate = Math.round((stats.wins / stats.matches) * 100);

  container.innerHTML = `
    <!-- ═══ BANNIÈRE ═══ -->
    <div class="profile-banner">
      <div class="corner-br"></div>
      <div class="corner-tl"></div>
      <div>
        <div class="profile-avatar-frame">
          <div class="profile-avatar-ring"></div>
          <div class="profile-avatar-slot" id="profile-avatar-display">
            ${avatars[player.avatar]}
          </div>
        </div>
        <div class="profile-avatar-picker" id="profile-avatar-picker">
          ${avatars.map((svg, i) => `
            <button class="avatar-pick ${i === player.avatar ? 'is-active' : ''}" type="button" data-avatar="${i}" title="Avatar ${i + 1}">
              ${svg}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="profile-identity">
        <h1 class="profile-name">${player.name}</h1>
        <p class="profile-title">${player.title}</p>
        <div class="profile-rank-line">
          <span class="profile-rank-badge">${player.rank}</span>
          <span class="profile-joined">Depuis le ${formatDate(player.joined)}</span>
        </div>
      </div>

      <div class="profile-stats-block">
        <div class="profile-stat">
          <span class="profile-stat__value profile-stat__value--win">${stats.wins}</span>
          <span class="profile-stat__label">Victoires</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__value profile-stat__value--loss">${stats.losses}</span>
          <span class="profile-stat__label">Défaites</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__value">${stats.matches}</span>
          <span class="profile-stat__label">Matchs</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__value">${stats.winstreak}</span>
          <span class="profile-stat__label">Série en cours</span>
        </div>
      </div>
    </div>

    <!-- ═══ SÉPARATEUR ═══ -->
    <div class="profile-divider">
      <span class="profile-divider__line"></span>
      <span class="profile-divider__icon">${aquilaIcon}</span>
      <span class="profile-divider__line"></span>
    </div>

    <!-- ═══ HONNEURS ═══ -->
    <div class="profile-section">
      <div class="profile-section-header">
        <h2 class="profile-section-title">Honneurs de Guerre</h2>
      </div>
      <div class="badge-grid">
        ${badges.map(b => `
          <div class="badge-card ${b.unlocked ? 'is-unlocked' : 'is-locked'}">
            <div class="badge-icon">${badgeIcons[b.icon]}</div>
            <span class="badge-name">${b.name}</span>
            <span class="badge-desc">${b.desc}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ═══ SÉPARATEUR ═══ -->
    <div class="profile-divider">
      <span class="profile-divider__line"></span>
      <span class="profile-divider__icon">${aquilaIcon}</span>
      <span class="profile-divider__line"></span>
    </div>

    <!-- ═══ HISTORIQUE ═══ -->
    <div class="profile-section">
      <div class="profile-section-header">
        <h2 class="profile-section-title">Journal de Combat</h2>
      </div>
      <div class="winrate-label">
        <span>Taux de Victoire : ${winRate}%</span>
        <span>${stats.wins}V — ${stats.losses}D</span>
      </div>
      <div class="winrate-bar">
        <div class="winrate-bar__fill--win" style="width: ${winRate}%"></div>
        <div class="winrate-bar__fill--loss" style="width: ${100 - winRate}%"></div>
      </div>
      <div class="history-panel">
        <div class="history-list">
          ${matchHistory.map(m => `
            <div class="history-row">
              <span class="history-result history-result--${m.result}">${m.result === 'win' ? 'Victoire' : 'Défaite'}</span>
              <div class="history-mode">${m.mode}<span>${m.map}</span></div>
              <span class="history-build">${m.build}</span>
              <span class="history-score">${m.score}</span>
              <span class="history-date">${formatDate(m.date)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  /* ── SÉLECTION D'AVATAR ──────────────────────────────────────── */
  const picker = document.getElementById("profile-avatar-picker");
  const display = document.getElementById("profile-avatar-display");

  if (picker && display) {
    picker.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-avatar]");
      if (!btn) return;
      const idx = parseInt(btn.dataset.avatar, 10);
      if (isNaN(idx) || idx < 0 || idx >= avatars.length) return;

      player.avatar = idx;
      display.innerHTML = avatars[idx];

      picker.querySelectorAll(".avatar-pick").forEach((el, i) => {
        el.classList.toggle("is-active", i === idx);
      });
    });
  }

  /* ── UTILITAIRES ─────────────────────────────────────────────── */
  function formatDate(iso) {
    const d = new Date(iso);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['JAN','FÉV','MAR','AVR','MAI','JUN','JUL','AOÛ','SEP','OCT','NOV','DÉC'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
})();
