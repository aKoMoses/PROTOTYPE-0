// ================================================================
// PROTOTYPE-0 · LOADOUT BUILDER — Mech Assembly Experience
// Step-by-step build ritual with mech silhouette animation
// ================================================================

import { content } from "./src/content.js";

const BUILDER_STEPS = [
  { key: "weapon",  label: "WEAPON",   slotIndex: null, zone: "arms",  prompt: "Arm Your Killing Machine",  sub: "The instrument of absolute destruction" },
  { key: "ability0", label: "Q ABILITY", slotIndex: 0,    zone: "shoulderL", prompt: "Mount Primary System",    sub: "First strike — the opening move of annihilation" },
  { key: "ability1", label: "E ABILITY", slotIndex: 1,    zone: "shoulderR", prompt: "Install Secondary Core",  sub: "Adapt. Control. Dominate." },
  { key: "ability2", label: "F ABILITY", slotIndex: 2,    zone: "core",  prompt: "Embed Tactical Override",    sub: "The edge between survival and supremacy" },
  { key: "perk",     label: "PERK",     slotIndex: null, zone: "spine", prompt: "Integrate Neural Module", sub: "A passive upgrade fused into your combat DNA" },
  { key: "ultimate", label: "ULTIMATE", slotIndex: null, zone: "head",  prompt: "Unleash The Singularity",   sub: "When activated — nothing survives" },
];

// ── MECH SVG TEMPLATE ─────────────────────────────────────────────
function createMechSVG() {
  return `
  <svg viewBox="0 0 340 480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow-soft">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-strong">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-reactor">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="reactor-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(198, 40, 40, 0.3)"/>
        <stop offset="50%" stop-color="rgba(198, 40, 40, 0.1)"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>

    <!-- Base frame lines -->
    <line x1="170" y1="100" x2="170" y2="400" stroke="rgba(255,255,255,0.03)" stroke-width="1" stroke-dasharray="2 6"/>
    <line x1="100" y1="180" x2="240" y2="180" stroke="rgba(255,255,255,0.03)" stroke-width="1" stroke-dasharray="2 6"/>

    <!-- Reactor core (center chest) -->
    <circle cx="170" cy="170" r="18" fill="url(#reactor-gradient)" filter="url(#glow-reactor)" class="mech-reactor">
      <animate attributeName="r" values="16;20;16" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="170" cy="170" r="8" fill="none" stroke="rgba(198, 40, 40, 0.25)" stroke-width="0.5" stroke-dasharray="2 3">
      <animateTransform attributeName="transform" type="rotate" values="0 170 170;360 170 170" dur="6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="170" cy="170" r="3" fill="rgba(198, 40, 40, 0.5)">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
    </circle>

    <!-- HEAD — Ultimate -->
    <path class="mech-zone" data-zone="head" d="
      M 150 68
      L 152 52
      C 155 42, 165 35, 170 33
      C 175 35, 185 42, 188 52
      L 190 68
      L 186 78
      C 184 82, 176 86, 170 87
      C 164 86, 156 82, 154 78
      Z
    "/>
    <!-- Eye slit -->
    <line x1="160" y1="62" x2="180" y2="62" stroke="rgba(198, 40, 40, 0.25)" stroke-width="1.5" stroke-linecap="round" class="mech-eye">
      <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite"/>
    </line>
    <text class="mech-zone-label" data-zone-label="head" x="170" y="106">ULT</text>

    <!-- SHOULDER L — Q Ability -->
    <path class="mech-zone" data-zone="shoulderL" d="
      M 98 130
      L 80 126
      C 72 128, 66 136, 65 144
      L 68 164
      C 70 172, 78 176, 86 174
      L 112 166
      C 118 162, 120 152, 118 144
      Z
    "/>
    <text class="mech-zone-label" data-zone-label="shoulderL" x="92" y="192">Q</text>

    <!-- SHOULDER R — E Ability -->
    <path class="mech-zone" data-zone="shoulderR" d="
      M 242 130
      L 260 126
      C 268 128, 274 136, 275 144
      L 272 164
      C 270 172, 262 176, 254 174
      L 228 166
      C 222 162, 220 152, 222 144
      Z
    "/>
    <text class="mech-zone-label" data-zone-label="shoulderR" x="248" y="192">E</text>

    <!-- CORE — F Ability -->
    <path class="mech-zone" data-zone="core" d="
      M 132 170
      L 130 142
      C 132 120, 140 110, 150 105
      L 170 100
      L 190 105
      C 200 110, 208 120, 210 142
      L 208 170
      L 204 210
      C 200 228, 190 236, 170 240
      C 150 236, 140 228, 136 210
      Z
    "/>
    <!-- Core circuit lines -->
    <path d="M 152 140 L 160 155 L 170 150 L 180 155 L 188 140" fill="none" stroke="rgba(198, 40, 40, 0.08)" stroke-width="0.5"/>
    <path d="M 145 190 L 155 200 L 170 195 L 185 200 L 195 190" fill="none" stroke="rgba(198, 40, 40, 0.06)" stroke-width="0.5"/>
    <text class="mech-zone-label" data-zone-label="core" x="170" y="258">F</text>

    <!-- SPINE — Perk -->
    <path class="mech-zone" data-zone="spine" d="
      M 160 240
      L 158 260
      C 157 275, 158 300, 160 316
      L 170 320
      L 180 316
      C 182 300, 183 275, 182 260
      L 180 240
      C 178 238, 172 236, 170 236
      C 168 236, 162 238, 160 240
      Z
    "/>
    <!-- Spine data nodes -->
    <circle cx="170" cy="260" r="2" fill="rgba(77, 216, 255, 0.15)"/>
    <circle cx="170" cy="280" r="2" fill="rgba(77, 216, 255, 0.1)"/>
    <circle cx="170" cy="300" r="2" fill="rgba(77, 216, 255, 0.08)"/>
    <text class="mech-zone-label" data-zone-label="spine" x="170" y="338">PERK</text>

    <!-- ARMS — Weapon -->
    <path class="mech-zone" data-zone="arms" d="
      M 58 178
      L 50 190
      C 44 200, 40 220, 38 240
      L 36 280
      C 36 296, 40 306, 48 310
      L 56 312
      C 62 310, 66 302, 66 290
      L 68 250
      C 70 230, 74 210, 78 198
      L 82 186
      Z
    "/>
    <path class="mech-zone" data-zone="arms" d="
      M 282 178
      L 290 190
      C 296 200, 300 220, 302 240
      L 304 280
      C 304 296, 300 306, 292 310
      L 284 312
      C 278 310, 274 302, 274 290
      L 272 250
      C 270 230, 266 210, 262 198
      L 258 186
      Z
    "/>
    <text class="mech-zone-label" data-zone-label="arms" x="170" y="370">WEAPON</text>

    <!-- LEGS (decorative, not a slot) -->
    <path class="mech-zone-deco" d="
      M 148 320 L 142 380 C 140 400, 138 420, 134 440 L 130 460 L 150 462 L 156 440 C 158 420, 160 400, 162 380 L 164 340
      Z
    " fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
    <path class="mech-zone-deco" d="
      M 192 320 L 198 380 C 200 400, 202 420, 206 440 L 210 460 L 190 462 L 184 440 C 182 420, 180 400, 178 380 L 176 340
      Z
    " fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>

    <!-- Energy conduits (decorative lines) -->
    <line class="mech-conduit" x1="170" y1="87" x2="170" y2="100" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
    <line class="mech-conduit" x1="132" y1="150" x2="112" y2="158" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
    <line class="mech-conduit" x1="208" y1="150" x2="228" y2="158" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
    <line class="mech-conduit" x1="82" y1="180" x2="68" y2="200" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
    <line class="mech-conduit" x1="258" y1="180" x2="272" y2="200" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
  </svg>`;
}

// ── BUILDER STATE ─────────────────────────────────────────────────
let builderState = null;

function createBuilderState() {
  return {
    currentStep: 0,
    name: "",
    selections: {
      weapon: null,
      ability0: null,
      ability1: null,
      ability2: null,
      perk: null,
      ultimate: null,
    },
    isComplete: false,
  };
}

// ── DOM CREATION ──────────────────────────────────────────────────
function createBuilderDOM() {
  const overlay = document.createElement("div");
  overlay.className = "builder-overlay";
  overlay.id = "loadout-builder";
  overlay.innerHTML = `
    <div class="builder-main">
      <!-- Ambient energy lines -->
      <div class="builder-energy-line"></div>
      <div class="builder-energy-line"></div>
      <div class="builder-energy-line"></div>
      <div class="builder-energy-line"></div>

      <!-- Scan beam -->
      <div class="builder-scan-beam"></div>

      <!-- Corner frames -->
      <div class="builder-corner-frame builder-corner-frame--tl"></div>
      <div class="builder-corner-frame builder-corner-frame--tr"></div>
      <div class="builder-corner-frame builder-corner-frame--bl"></div>
      <div class="builder-corner-frame builder-corner-frame--br"></div>

      <!-- Top bar -->
      <div class="builder-topbar">
        <button class="builder-back" id="builder-back">← ABORT</button>
        <div class="builder-step-label" id="builder-step-label">
          STEP <span id="builder-step-num">1</span> / ${BUILDER_STEPS.length}
        </div>
      </div>

      <!-- Name input -->
      <div class="builder-name-input is-visible" id="builder-name-wrap">
        <input class="builder-name-field" id="builder-name" type="text"
               placeholder="DESIGNATE YOUR WEAPON" maxlength="40" spellcheck="false"/>
      </div>

      <!-- Progress pips -->
      <div class="builder-progress" id="builder-progress">
        ${BUILDER_STEPS.map((_, i) => `<div class="builder-pip" data-pip="${i}"></div>`).join("")}
      </div>

      <!-- Mech display -->
      <div class="builder-mech-wrap" id="builder-mech-wrap">
        <div class="builder-mech-aura"></div>
        <div class="builder-reactor-ring"></div>
        <div class="builder-reactor-ring-inner"></div>
        <div class="builder-mech" id="builder-mech">
          ${createMechSVG()}
        </div>
      </div>

      <!-- Slot prompt -->
      <div class="builder-slot-prompt" id="builder-prompt">
        <h2 class="builder-slot-prompt__title" id="builder-prompt-title"></h2>
        <p class="builder-slot-prompt__sub" id="builder-prompt-sub"></p>
      </div>

      <!-- Boot text -->
      <div class="builder-boot-text" id="builder-boot-text">INITIALIZING COMBAT FRAME...</div>

      <!-- Particle canvas -->
      <div class="builder-particle-canvas" id="builder-particles"></div>

      <!-- Cinematic overlay -->
      <div class="builder-cinematic" id="builder-cinematic">
        <div class="builder-flash" id="builder-flash"></div>
        <div class="builder-shockwave" id="builder-shockwave"></div>
        <div class="builder-shockwave-2" id="builder-shockwave-2"></div>
      </div>

      <!-- Forge button -->
      <div class="builder-forge-wrap" id="builder-forge-wrap">
        <div class="builder-forge-orbital"></div>
        <button class="builder-forge-btn" id="builder-forge">⚡ FORGE LOADOUT</button>
      </div>
    </div>

    <!-- Side panel for piece selection -->
    <div class="builder-panel" id="builder-panel">
      <div class="builder-panel__header">
        <h3 class="builder-panel__title" id="builder-panel-title"></h3>
        <p class="builder-panel__subtitle" id="builder-panel-subtitle"></p>
      </div>
      <div class="builder-panel__list" id="builder-panel-list"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

// ── CONTENT ACCESS ────────────────────────────────────────────────
function getContentForStep(step) {
  const weapons = content.weapons || {};
  const abilities = content.abilities || {};
  const perks = content.perks || {};
  const ultimates = content.ultimates || {};

  switch (step.key) {
    case "weapon":
      return Object.values(weapons).filter(w => w.state === "playable");
    case "ability0":
    case "ability1":
    case "ability2":
      return Object.values(abilities).filter(a => a.state === "playable");
    case "perk":
      return Object.values(perks).filter(p => p.state === "playable");
    case "ultimate":
      return Object.values(ultimates).filter(u => u.state === "playable");
    default:
      return [];
  }
}

// ── RENDER PANEL ──────────────────────────────────────────────────
function renderPanel(step) {
  const panel = document.getElementById("builder-panel");
  const title = document.getElementById("builder-panel-title");
  const subtitle = document.getElementById("builder-panel-subtitle");
  const list = document.getElementById("builder-panel-list");

  title.textContent = `Select ${step.label}`;
  subtitle.textContent = step.sub;

  const items = getContentForStep(step);

  if (items.length === 0) {
    list.innerHTML = `
      <div class="builder-panel__empty">
        No playable options available for ${escapeHtml(step.label)}.
      </div>
    `;
    requestAnimationFrame(() => panel.classList.add("is-open"));
    return;
  }

  // Filter already-selected abilities to prevent duplicates
  const selectedAbilities = [
    builderState.selections.ability0,
    builderState.selections.ability1,
    builderState.selections.ability2,
  ].filter(Boolean);

  list.innerHTML = items.map(item => {
    const isAbilityStep = step.key.startsWith("ability");
    const alreadyPicked = isAbilityStep && selectedAbilities.includes(item.key);

    return `
      <div class="builder-piece${alreadyPicked ? " is-locked" : ""}"
           data-piece-key="${item.key}"
           style="--piece-accent: ${item.accent || "#c62828"}">
        <div class="builder-piece__name">${escapeHtml(item.name)}</div>
        <div class="builder-piece__role">${escapeHtml(item.role || item.slotLabel || item.category || "")}</div>
        <div class="builder-piece__desc">${escapeHtml(item.description)}</div>
        ${item.rhythm || item.rangeProfile ? `
          <div class="builder-piece__stats">
            ${item.rhythm ? `<span class="builder-piece__stat"><span class="builder-piece__stat-dot"></span>${item.rhythm}</span>` : ""}
            ${item.rangeProfile ? `<span class="builder-piece__stat"><span class="builder-piece__stat-dot"></span>${item.rangeProfile}</span>` : ""}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  // Open panel
  requestAnimationFrame(() => panel.classList.add("is-open"));
}

// ── UPDATE MECH ZONES ─────────────────────────────────────────────
function updateMechZones() {
  const step = BUILDER_STEPS[builderState.currentStep];
  const svg = document.getElementById("builder-mech");
  if (!svg) return;

  // Reset all zones
  svg.querySelectorAll(".mech-zone").forEach(z => {
    z.classList.remove("is-active");
  });

  // Mark filled zones
  BUILDER_STEPS.forEach((s, i) => {
    if (builderState.selections[s.key]) {
      const zones = svg.querySelectorAll(`[data-zone="${s.zone}"]`);
      const item = findContentItem(s.key, builderState.selections[s.key]);
      const accent = item?.accent || "#c62828";
      zones.forEach(z => {
        z.classList.add("is-filled");
        z.style.fill = hexToRgba(accent, 0.12);
        z.style.stroke = hexToRgba(accent, 0.6);
        z.style.filter = `drop-shadow(0 0 10px ${hexToRgba(accent, 0.3)})`;
      });
      // Update label
      const label = svg.querySelector(`[data-zone-label="${s.zone}"]`);
      if (label) {
        label.style.fill = hexToRgba(accent, 0.7);
      }
    }
  });

  // Activate current zone
  if (!builderState.isComplete) {
    const activeZones = svg.querySelectorAll(`[data-zone="${step.zone}"]`);
    activeZones.forEach(z => z.classList.add("is-active"));
  }

  // Update mech wrap class
  const mechWrap = document.getElementById("builder-mech-wrap");
  const filledCount = Object.values(builderState.selections).filter(Boolean).length;
  mechWrap.classList.toggle("has-pieces", filledCount > 0);
}

function findContentItem(stepKey, pieceKey) {
  const step = BUILDER_STEPS.find(s => s.key === stepKey);
  if (!step) return null;
  const items = getContentForStep(step);
  return items.find(item => item.key === pieceKey) || null;
}

// ── UPDATE UI STATE ───────────────────────────────────────────────
function updateBuilderUI() {
  const step = BUILDER_STEPS[builderState.currentStep];

  // Step label
  document.getElementById("builder-step-num").textContent = builderState.currentStep + 1;

  // Progress pips
  BUILDER_STEPS.forEach((_, i) => {
    const pip = document.querySelector(`[data-pip="${i}"]`);
    pip.className = "builder-pip";
    if (builderState.selections[BUILDER_STEPS[i].key]) {
      pip.classList.add("is-filled");
    } else if (i === builderState.currentStep) {
      pip.classList.add("is-current");
    }
  });

  // Prompt
  const prompt = document.getElementById("builder-prompt");
  const promptTitle = document.getElementById("builder-prompt-title");
  const promptSub = document.getElementById("builder-prompt-sub");

  if (!builderState.isComplete) {
    promptTitle.textContent = step.prompt;
    promptSub.textContent = step.sub;
    prompt.classList.add("is-visible");
  } else {
    promptTitle.textContent = "WEAPON FORGED";
    promptSub.textContent = "All systems armed — unleash this machine";
    prompt.classList.add("is-visible");
  }

  // Mech zones
  updateMechZones();

  // Render panel for current step
  if (!builderState.isComplete) {
    renderPanel(step);
  }
}

// ── PARTICLE FX ───────────────────────────────────────────────────
function spawnConnectParticles(zoneElement, accent) {
  const canvas = document.getElementById("builder-particles");
  const rect = zoneElement.getBoundingClientRect();
  const overlay = document.getElementById("loadout-builder").getBoundingClientRect();

  const cx = rect.left + rect.width / 2 - overlay.left;
  const cy = rect.top + rect.height / 2 - overlay.top;

  const count = 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "builder-particle";
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 60 + Math.random() * 100;
    const startX = cx + Math.cos(angle) * dist;
    const startY = cy + Math.sin(angle) * dist;

    p.style.cssText = `
      left: ${startX}px;
      top: ${startY}px;
      --particle-color: ${accent};
      background: ${accent};
      box-shadow: 0 0 8px ${accent};
      width: ${3 + Math.random() * 4}px;
      height: ${3 + Math.random() * 4}px;
    `;

    canvas.appendChild(p);

    // Animate toward center
    const duration = 400 + Math.random() * 300;
    const anim = p.animate([
      { left: `${startX}px`, top: `${startY}px`, opacity: 1, transform: "scale(1.5)" },
      { left: `${cx}px`, top: `${cy}px`, opacity: 0, transform: "scale(0.2)" }
    ], { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });

    anim.onfinish = () => p.remove();
  }
}

function spawnSecondaryBurst(zoneElement, accent) {
  const canvas = document.getElementById("builder-particles");
  const rect = zoneElement.getBoundingClientRect();
  const overlay = document.getElementById("loadout-builder").getBoundingClientRect();

  const cx = rect.left + rect.width / 2 - overlay.left;
  const cy = rect.top + rect.height / 2 - overlay.top;

  // Outward burst after connection
  setTimeout(() => {
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.className = "builder-particle";
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;

      p.style.cssText = `
        left: ${cx}px;
        top: ${cy}px;
        --particle-color: ${accent};
        background: ${accent};
        box-shadow: 0 0 6px ${accent};
        width: ${2 + Math.random() * 3}px;
        height: ${2 + Math.random() * 3}px;
      `;

      canvas.appendChild(p);

      const endX = cx + Math.cos(angle) * dist;
      const endY = cy + Math.sin(angle) * dist;

      const anim = p.animate([
        { left: `${cx}px`, top: `${cy}px`, opacity: 0.9, transform: "scale(1)" },
        { left: `${endX}px`, top: `${endY}px`, opacity: 0, transform: "scale(0.1)" }
      ], { duration: 500 + Math.random() * 300, easing: "ease-out", fill: "forwards" });

      anim.onfinish = () => p.remove();
    }
  }, 350);
}

// ── PIECE SELECTION HANDLER ───────────────────────────────────────
function handlePieceSelect(pieceKey) {
  const step = BUILDER_STEPS[builderState.currentStep];
  const item = getContentForStep(step).find(i => i.key === pieceKey);
  if (!item) return;

  const accent = item.accent || "#c62828";

  // Store selection
  builderState.selections[step.key] = pieceKey;

  // Get zone element for FX
  const svg = document.getElementById("builder-mech");
  const zoneEls = svg.querySelectorAll(`[data-zone="${step.zone}"]`);
  const primaryZone = zoneEls[0];

  if (primaryZone) {
    // Connection pulse animation
    primaryZone.classList.add("is-connecting");
    primaryZone.style.setProperty("--zone-glow", accent);
    setTimeout(() => primaryZone.classList.remove("is-connecting"), 600);

    // Particles converge then burst
    spawnConnectParticles(primaryZone, accent);
    spawnSecondaryBurst(primaryZone, accent);

    // Impact ring
    spawnImpactRing(primaryZone, accent);
  }

  // Close panel
  const panel = document.getElementById("builder-panel");
  panel.classList.remove("is-open");

  // Advance step after animation
  setTimeout(() => {
    const nextStep = builderState.currentStep + 1;
    if (nextStep >= BUILDER_STEPS.length) {
      builderState.isComplete = true;
      triggerCompletionSequence();
    } else {
      builderState.currentStep = nextStep;
    }
    updateBuilderUI();
  }, 650);
}

// ── IMPACT RING FX ────────────────────────────────────────────────
function spawnImpactRing(zoneElement, accent) {
  const canvas = document.getElementById("builder-particles");
  const rect = zoneElement.getBoundingClientRect();
  const overlay = document.getElementById("loadout-builder").getBoundingClientRect();

  const cx = rect.left + rect.width / 2 - overlay.left;
  const cy = rect.top + rect.height / 2 - overlay.top;

  for (let i = 0; i < 2; i++) {
    const ring = document.createElement("div");
    ring.className = "builder-impact-ring";
    ring.style.cssText = `
      left: ${cx}px;
      top: ${cy}px;
      transform: translate(-50%, -50%);
      --impact-color: ${accent};
      border-color: ${accent};
      animation: impact-expand ${0.5 + i * 0.2}s ease-out forwards;
      animation-delay: ${i * 0.12}s;
    `;
    canvas.appendChild(ring);
    setTimeout(() => ring.remove(), 900);
  }
}

// ── COMPLETION CINEMATIC ──────────────────────────────────────────
function triggerCompletionSequence() {
  const mechWrap = document.getElementById("builder-mech-wrap");
  const overlay = document.getElementById("loadout-builder");
  const cinematic = document.getElementById("builder-cinematic");
  const flash = document.getElementById("builder-flash");
  const shockwave = document.getElementById("builder-shockwave");
  const shockwave2 = document.getElementById("builder-shockwave-2");
  const forgeWrap = document.getElementById("builder-forge-wrap");
  const panel = document.getElementById("builder-panel");

  panel.classList.remove("is-open");
  stopAmbientParticles();

  // Phase 1: Power-up with reactor overdrive
  mechWrap.classList.add("is-powering-up");

  // Phase 2: Glitch + shake + flash + dual shockwave
  setTimeout(() => {
    overlay.classList.add("is-glitching");
    setTimeout(() => overlay.classList.remove("is-glitching"), 600);
  }, 400);

  setTimeout(() => {
    overlay.classList.add("is-shaking");
    cinematic.classList.add("is-playing");

    flash.style.animation = "cinematic-flash 1s ease-out forwards";
    shockwave.style.animation = "cinematic-shockwave 1.2s ease-out forwards";

    // Hex fragment burst
    spawnHexFragments();
  }, 700);

  // Second shockwave (gold)
  setTimeout(() => {
    shockwave2.style.animation = "cinematic-shockwave-2 1s ease-out forwards";
  }, 950);

  // Phase 3: Reveal forge button
  setTimeout(() => {
    overlay.classList.remove("is-shaking");
    forgeWrap.classList.add("is-ready");
  }, 1600);

  // All zones final glow — intensified
  setTimeout(() => {
    const svg = document.getElementById("builder-mech");
    svg.querySelectorAll(".mech-zone.is-filled").forEach(z => {
      z.style.filter = z.style.filter.replace(/drop-shadow\([^)]+\)/g, "") +
        " drop-shadow(0 0 18px rgba(198, 40, 40, 0.6)) drop-shadow(0 0 40px rgba(200, 155, 60, 0.15))";
    });
  }, 900);
}

// ── HEX FRAGMENT BURST ────────────────────────────────────────────
function spawnHexFragments() {
  const cinematic = document.getElementById("builder-cinematic");
  const count = 24;
  for (let i = 0; i < count; i++) {
    const frag = document.createElement("div");
    frag.className = "builder-hex-fragment";
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 150 + Math.random() * 300;
    const hx = Math.cos(angle) * dist;
    const hy = Math.sin(angle) * dist;
    const size = 6 + Math.random() * 12;

    const isGold = Math.random() > 0.7;
    frag.style.cssText = `
      left: 50%;
      top: 50%;
      width: ${size}px;
      height: ${size}px;
      background: ${isGold ? "rgba(200, 155, 60, 0.7)" : "rgba(198, 40, 40, 0.6)"};
      --hx: ${hx}px;
      --hy: ${hy}px;
      animation: hex-burst ${0.6 + Math.random() * 0.5}s ease-out forwards;
      animation-delay: ${Math.random() * 0.15}s;
    `;
    cinematic.appendChild(frag);
    setTimeout(() => frag.remove(), 1200);
  }
}

// ── FORGE (SAVE) HANDLER ──────────────────────────────────────────
function handleForge() {
  if (!builderState.isComplete) return;

  const name = document.getElementById("builder-name").value.trim() || "New Loadout";

  const build = {
    weapon: builderState.selections.weapon,
    abilities: [
      builderState.selections.ability0,
      builderState.selections.ability1,
      builderState.selections.ability2,
    ],
    perks: builderState.selections.perk ? [builderState.selections.perk] : [],
    ultimate: builderState.selections.ultimate,
  };

  // Dispatch event with the completed loadout data
  window.dispatchEvent(new CustomEvent("builder-forge", {
    detail: { name, build }
  }));

  closeBuilder();
}

// ── OPEN / CLOSE ──────────────────────────────────────────────────
let ambientInterval = null;

function openBuilder() {
  let overlay = document.getElementById("loadout-builder");
  if (!overlay) {
    overlay = createBuilderDOM();
    attachBuilderEvents(overlay);
  }

  builderState = createBuilderState();
  resetBuilderDOM();

  // Boot sequence
  overlay.classList.add("is-booting");
  const bootText = document.getElementById("builder-boot-text");
  const bootMessages = [
    "INITIALIZING COMBAT FRAME...",
    "LOADING WEAPON SYSTEMS...",
    "CALIBRATING NEURAL LINK...",
    "SCANNING AVAILABLE MODULES...",
    "SYSTEMS ONLINE — AWAITING INPUT",
  ];
  let bootIdx = 0;
  const bootTimer = setInterval(() => {
    bootIdx++;
    if (bootIdx >= bootMessages.length) {
      clearInterval(bootTimer);
      overlay.classList.remove("is-booting");
      updateBuilderUI();
      startAmbientParticles();
      return;
    }
    bootText.textContent = bootMessages[bootIdx];
  }, 250);

  requestAnimationFrame(() => {
    overlay.classList.add("is-active");
    document.getElementById("builder-name").focus();
  });
}

function closeBuilder() {
  const overlay = document.getElementById("loadout-builder");
  if (!overlay) return;
  overlay.classList.remove("is-active", "is-booting");
  stopAmbientParticles();
  builderState = null;
}

// ── AMBIENT IDLE PARTICLES ────────────────────────────────────────
function startAmbientParticles() {
  stopAmbientParticles();
  const canvas = document.getElementById("builder-particles");
  if (!canvas) return;

  ambientInterval = setInterval(() => {
    if (!builderState || builderState.isComplete) return;
    const p = document.createElement("div");
    p.className = "builder-ambient-particle";
    const x = 20 + Math.random() * 60; // center-ish area
    const startY = 30 + Math.random() * 40;
    const floatDist = -(40 + Math.random() * 80);
    const size = 1 + Math.random() * 2.5;
    const isGold = Math.random() > 0.8;

    p.style.cssText = `
      left: ${x}%;
      top: ${startY}%;
      width: ${size}px;
      height: ${size}px;
      --float-dist: ${floatDist}px;
      background: ${isGold ? "rgba(200, 155, 60, 0.5)" : "rgba(198, 40, 40, 0.4)"};
      box-shadow: 0 0 ${size * 2}px ${isGold ? "rgba(200, 155, 60, 0.3)" : "rgba(198, 40, 40, 0.3)"};
      animation: ambient-float ${2 + Math.random() * 3}s ease-out forwards;
    `;
    canvas.appendChild(p);
    setTimeout(() => p.remove(), 5000);
  }, 300);
}

function stopAmbientParticles() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
}

function resetBuilderDOM() {
  const overlay = document.getElementById("loadout-builder");
  if (!overlay) return;

  document.getElementById("builder-name").value = "";
  document.getElementById("builder-forge-wrap").classList.remove("is-ready");
  document.getElementById("builder-cinematic").classList.remove("is-playing");
  document.getElementById("builder-mech-wrap").classList.remove("is-powering-up", "has-pieces");
  overlay.classList.remove("is-shaking", "is-glitching");
  document.getElementById("builder-panel").classList.remove("is-open");
  document.getElementById("builder-flash").style.animation = "";
  document.getElementById("builder-shockwave").style.animation = "";
  document.getElementById("builder-shockwave-2").style.animation = "";
  document.getElementById("builder-particles").innerHTML = "";
  document.getElementById("builder-boot-text").textContent = "INITIALIZING COMBAT FRAME...";

  // Clean hex fragments from cinematic
  document.querySelectorAll(".builder-hex-fragment").forEach(f => f.remove());

  // Reset SVG zones
  const svg = document.getElementById("builder-mech");
  svg.querySelectorAll(".mech-zone").forEach(z => {
    z.classList.remove("is-filled", "is-active", "is-connecting");
    z.style.fill = "";
    z.style.stroke = "";
    z.style.filter = "";
  });
  svg.querySelectorAll(".mech-zone-label").forEach(l => {
    l.style.fill = "";
  });
}

// ── EVENT WIRING ──────────────────────────────────────────────────
function attachBuilderEvents(overlay) {
  // Back button
  document.getElementById("builder-back").addEventListener("click", closeBuilder);

  // Escape key
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBuilder();
  });

  // Piece selection (delegated)
  document.getElementById("builder-panel-list").addEventListener("click", (e) => {
    const piece = e.target.closest(".builder-piece");
    if (!piece || piece.classList.contains("is-locked")) return;
    handlePieceSelect(piece.dataset.pieceKey);
  });

  // Forge button
  document.getElementById("builder-forge").addEventListener("click", handleForge);
}

// ── UTILITIES ─────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

function hexToRgba(hex, alpha) {
  if (!hex || hex.charAt(0) !== "#") return `rgba(198, 40, 40, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── PUBLIC API ────────────────────────────────────────────────────
export { openBuilder, closeBuilder };
