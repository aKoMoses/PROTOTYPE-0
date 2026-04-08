import { sandbox, matchState, player, enemy, bullets, enemyBullets, shockJavelins, enemyShockJavelins, supportZones, magneticFields } from "./state.js";
import { uiState } from "./state/app-state.js";

const STORAGE_KEY = "prototype0-audio-settings-v1";

const audioState = {
  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  ambienceGain: null,
  unlocked: false,
  masterMuted: false,
  musicVolume: 0.68,
  sfxVolume: 0.9,
  ambienceVolume: 0.58,
  controls: null,
  lastPhase: null,
  lastMapKey: null,
  lastRoundNumber: 0,
  lastScore: "0-0",
  combatImpulse: 0,
  cooldowns: new Map(),
  noiseBuffer: null,
  music: null,
  ambience: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function canTrigger(key, cooldownMs) {
  const now = nowMs();
  const last = audioState.cooldowns.get(key) ?? -Infinity;
  if (now - last < cooldownMs) {
    return false;
  }
  audioState.cooldowns.set(key, now);
  return true;
}

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    audioState.masterMuted = Boolean(parsed.masterMuted);
    audioState.musicVolume = clamp(Number(parsed.musicVolume ?? audioState.musicVolume), 0, 1);
    audioState.sfxVolume = clamp(Number(parsed.sfxVolume ?? audioState.sfxVolume), 0, 1);
    audioState.ambienceVolume = clamp(Number(parsed.ambienceVolume ?? audioState.ambienceVolume), 0, 1);
  } catch {
    // Keep defaults when persistence is unavailable or malformed.
  }
}

function persistSettings() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        masterMuted: audioState.masterMuted,
        musicVolume: audioState.musicVolume,
        sfxVolume: audioState.sfxVolume,
        ambienceVolume: audioState.ambienceVolume,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

function setParamTarget(param, value, time = 0.12) {
  if (!param || !audioState.ctx) {
    return;
  }
  param.setTargetAtTime(value, audioState.ctx.currentTime, time);
}

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createNoiseSource(targetNode) {
  if (!audioState.ctx || !audioState.noiseBuffer) {
    return null;
  }
  const source = audioState.ctx.createBufferSource();
  source.buffer = audioState.noiseBuffer;
  source.loop = true;
  source.connect(targetNode);
  source.start();
  return source;
}

function createPanner() {
  if (!audioState.ctx || typeof audioState.ctx.createStereoPanner !== "function") {
    return null;
  }
  return audioState.ctx.createStereoPanner();
}

function playTone({
  type = "sine",
  frequency = 440,
  sweepTo = null,
  duration = 0.18,
  gain = 0.08,
  attack = 0.005,
  release = 0.12,
  detune = 0,
  pan = 0,
  filterType = null,
  filterFrequency = 1400,
  q = 1,
} = {}) {
  if (!audioState.unlocked || !audioState.ctx || !audioState.sfxGain) {
    return;
  }

  const oscillator = audioState.ctx.createOscillator();
  const amp = audioState.ctx.createGain();
  const panner = createPanner();
  let tailNode = amp;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioState.ctx.currentTime);
  oscillator.detune.setValueAtTime(detune, audioState.ctx.currentTime);

  if (sweepTo !== null) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(24, sweepTo),
      audioState.ctx.currentTime + duration,
    );
  }

  amp.gain.setValueAtTime(0.0001, audioState.ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), audioState.ctx.currentTime + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, audioState.ctx.currentTime + Math.max(attack + 0.02, duration + release));

  oscillator.connect(amp);

  if (filterType) {
    const filter = audioState.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, audioState.ctx.currentTime);
    filter.Q.setValueAtTime(q, audioState.ctx.currentTime);
    amp.connect(filter);
    tailNode = filter;
  }

  if (panner) {
    panner.pan.setValueAtTime(clamp(pan, -1, 1), audioState.ctx.currentTime);
    tailNode.connect(panner);
    tailNode = panner;
  }

  tailNode.connect(audioState.sfxGain);
  oscillator.start();
  oscillator.stop(audioState.ctx.currentTime + duration + release + 0.03);
}

function playNoise({
  duration = 0.16,
  gain = 0.08,
  attack = 0.005,
  release = 0.12,
  pan = 0,
  filterType = "bandpass",
  filterFrequency = 900,
  q = 1,
} = {}) {
  if (!audioState.unlocked || !audioState.ctx || !audioState.sfxGain || !audioState.noiseBuffer) {
    return;
  }

  const source = audioState.ctx.createBufferSource();
  const filter = audioState.ctx.createBiquadFilter();
  const amp = audioState.ctx.createGain();
  const panner = createPanner();
  let tailNode = amp;

  source.buffer = audioState.noiseBuffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFrequency, audioState.ctx.currentTime);
  filter.Q.setValueAtTime(q, audioState.ctx.currentTime);
  amp.gain.setValueAtTime(0.0001, audioState.ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), audioState.ctx.currentTime + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, audioState.ctx.currentTime + Math.max(attack + 0.02, duration + release));

  source.connect(filter);
  filter.connect(amp);

  if (panner) {
    panner.pan.setValueAtTime(clamp(pan, -1, 1), audioState.ctx.currentTime);
    amp.connect(panner);
    tailNode = panner;
  }

  tailNode.connect(audioState.sfxGain);
  source.start();
  source.stop(audioState.ctx.currentTime + duration + release + 0.03);
}

function buildMusicGraph() {
  const calmOsc = audioState.ctx.createOscillator();
  const calmFilter = audioState.ctx.createBiquadFilter();
  const calmGain = audioState.ctx.createGain();
  calmOsc.type = "triangle";
  calmOsc.frequency.value = 92;
  calmFilter.type = "lowpass";
  calmFilter.frequency.value = 520;
  calmGain.gain.value = 0.0001;
  calmOsc.connect(calmFilter);
  calmFilter.connect(calmGain);
  calmGain.connect(audioState.musicGain);
  calmOsc.start();

  const pulseOsc = audioState.ctx.createOscillator();
  const pulseFilter = audioState.ctx.createBiquadFilter();
  const pulseGain = audioState.ctx.createGain();
  pulseOsc.type = "sawtooth";
  pulseOsc.frequency.value = 144;
  pulseFilter.type = "bandpass";
  pulseFilter.frequency.value = 640;
  pulseFilter.Q.value = 0.8;
  pulseGain.gain.value = 0.0001;
  pulseOsc.connect(pulseFilter);
  pulseFilter.connect(pulseGain);
  pulseGain.connect(audioState.musicGain);
  pulseOsc.start();

  const tensionOsc = audioState.ctx.createOscillator();
  const tensionFilter = audioState.ctx.createBiquadFilter();
  const tensionGain = audioState.ctx.createGain();
  tensionOsc.type = "square";
  tensionOsc.frequency.value = 196;
  tensionFilter.type = "lowpass";
  tensionFilter.frequency.value = 1200;
  tensionGain.gain.value = 0.0001;
  tensionOsc.connect(tensionFilter);
  tensionFilter.connect(tensionGain);
  tensionGain.connect(audioState.musicGain);
  tensionOsc.start();

  return {
    calmOsc,
    calmFilter,
    calmGain,
    pulseOsc,
    pulseFilter,
    pulseGain,
    tensionOsc,
    tensionFilter,
    tensionGain,
  };
}

function buildAmbienceGraph() {
  const electroHumOsc = audioState.ctx.createOscillator();
  const electroHumGain = audioState.ctx.createGain();
  electroHumOsc.type = "sawtooth";
  electroHumOsc.frequency.value = 56;
  electroHumGain.gain.value = 0.0001;
  electroHumOsc.connect(electroHumGain);
  electroHumGain.connect(audioState.ambienceGain);
  electroHumOsc.start();

  const electroNoiseFilter = audioState.ctx.createBiquadFilter();
  const electroNoiseGain = audioState.ctx.createGain();
  electroNoiseFilter.type = "bandpass";
  electroNoiseFilter.frequency.value = 2300;
  electroNoiseFilter.Q.value = 0.6;
  electroNoiseGain.gain.value = 0.0001;
  electroNoiseFilter.connect(electroNoiseGain);
  electroNoiseGain.connect(audioState.ambienceGain);
  createNoiseSource(electroNoiseFilter);

  const scrapHumOsc = audioState.ctx.createOscillator();
  const scrapHumGain = audioState.ctx.createGain();
  scrapHumOsc.type = "triangle";
  scrapHumOsc.frequency.value = 78;
  scrapHumGain.gain.value = 0.0001;
  scrapHumOsc.connect(scrapHumGain);
  scrapHumGain.connect(audioState.ambienceGain);
  scrapHumOsc.start();

  const scrapNoiseFilter = audioState.ctx.createBiquadFilter();
  const scrapNoiseGain = audioState.ctx.createGain();
  scrapNoiseFilter.type = "lowpass";
  scrapNoiseFilter.frequency.value = 780;
  scrapNoiseGain.gain.value = 0.0001;
  scrapNoiseFilter.connect(scrapNoiseGain);
  scrapNoiseGain.connect(audioState.ambienceGain);
  createNoiseSource(scrapNoiseFilter);

  const trainingAirFilter = audioState.ctx.createBiquadFilter();
  const trainingAirGain = audioState.ctx.createGain();
  trainingAirFilter.type = "bandpass";
  trainingAirFilter.frequency.value = 420;
  trainingAirFilter.Q.value = 0.3;
  trainingAirGain.gain.value = 0.0001;
  trainingAirFilter.connect(trainingAirGain);
  trainingAirGain.connect(audioState.ambienceGain);
  createNoiseSource(trainingAirFilter);

  const trainingHumOsc = audioState.ctx.createOscillator();
  const trainingHumGain = audioState.ctx.createGain();
  trainingHumOsc.type = "sine";
  trainingHumOsc.frequency.value = 122;
  trainingHumGain.gain.value = 0.0001;
  trainingHumOsc.connect(trainingHumGain);
  trainingHumGain.connect(audioState.ambienceGain);
  trainingHumOsc.start();

  return {
    electroHumGain,
    electroNoiseGain,
    scrapHumGain,
    scrapNoiseGain,
    trainingAirGain,
    trainingHumGain,
  };
}

function ensureAudioGraph() {
  if (audioState.ctx || typeof window === "undefined") {
    return;
  }

  const ContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!ContextCtor) {
    return;
  }

  audioState.ctx = new ContextCtor();
  audioState.noiseBuffer = createNoiseBuffer(audioState.ctx);
  audioState.masterGain = audioState.ctx.createGain();
  audioState.musicGain = audioState.ctx.createGain();
  audioState.sfxGain = audioState.ctx.createGain();
  audioState.ambienceGain = audioState.ctx.createGain();
  audioState.masterGain.gain.value = 1;
  audioState.musicGain.gain.value = 0.0001;
  audioState.sfxGain.gain.value = 0.0001;
  audioState.ambienceGain.gain.value = 0.0001;
  audioState.musicGain.connect(audioState.masterGain);
  audioState.sfxGain.connect(audioState.masterGain);
  audioState.ambienceGain.connect(audioState.masterGain);
  audioState.masterGain.connect(audioState.ctx.destination);
  audioState.music = buildMusicGraph();
  audioState.ambience = buildAmbienceGraph();
  applyMixTargets(true);
}

function applyMixTargets(immediate = false) {
  if (!audioState.ctx || !audioState.masterGain) {
    return;
  }

  const t = immediate ? 0.01 : 0.08;
  setParamTarget(audioState.masterGain.gain, audioState.masterMuted ? 0.0001 : 1, t);
  setParamTarget(audioState.musicGain.gain, Math.max(0.0001, audioState.musicVolume * 0.34), t);
  setParamTarget(audioState.sfxGain.gain, Math.max(0.0001, audioState.sfxVolume * 0.5), t);
  setParamTarget(audioState.ambienceGain.gain, Math.max(0.0001, audioState.ambienceVolume * 0.28), t);
}

function refreshControls() {
  if (!audioState.controls) {
    return;
  }

  const { muteButton, musicSlider, sfxSlider, ambienceSlider } = audioState.controls;
  if (muteButton) {
    muteButton.textContent = audioState.masterMuted ? "Audio Off" : "Audio On";
    muteButton.setAttribute("aria-pressed", audioState.masterMuted ? "true" : "false");
  }
  if (musicSlider) {
    musicSlider.value = String(Math.round(audioState.musicVolume * 100));
  }
  if (sfxSlider) {
    sfxSlider.value = String(Math.round(audioState.sfxVolume * 100));
  }
  if (ambienceSlider) {
    ambienceSlider.value = String(Math.round(audioState.ambienceVolume * 100));
  }
}

function bindUnlockEvents() {
  const handleUnlock = () => {
    unlockAudio();
    if (audioState.unlocked) {
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
      window.removeEventListener("touchstart", handleUnlock);
    }
  };

  window.addEventListener("pointerdown", handleUnlock, { passive: true });
  window.addEventListener("keydown", handleUnlock, { passive: true });
  window.addEventListener("touchstart", handleUnlock, { passive: true });
}

export async function unlockAudio() {
  ensureAudioGraph();
  if (!audioState.ctx) {
    return false;
  }
  try {
    await audioState.ctx.resume();
    audioState.unlocked = true;
    applyMixTargets();
    return true;
  } catch {
    return false;
  }
}

function computeIntensity() {
  const duelActive = sandbox.mode === "duel" && matchState.phase === "active" && player.alive && enemy.alive;
  const dx = (enemy.x ?? player.x) - player.x;
  const dy = (enemy.y ?? player.y) - player.y;
  const distance = Math.hypot(dx, dy);
  const proximity = duelActive ? clamp(1 - distance / 760, 0, 1) : 0;
  const projectilePressure = clamp((bullets.length + enemyBullets.length + shockJavelins.length + enemyShockJavelins.length) / 18, 0, 1);
  const zonePressure = clamp((supportZones.length + magneticFields.length) / 8, 0, 1);
  const playerMaxHp = Math.max(1, player.maxHp ?? 280);
  const enemyMaxHp = Math.max(1, enemy.maxHp ?? 380);
  const healthPressure = duelActive
    ? clamp((1 - player.hp / playerMaxHp) * 0.7 + (1 - enemy.hp / enemyMaxHp) * 0.55, 0, 1)
    : 0;
  const statusPressure = clamp(((player.statusEffects?.length ?? 0) + (enemy.statusEffects?.length ?? 0)) / 5, 0, 1);
  const roundPressure = matchState.phase === "round_intro" ? 0.22 : matchState.phase === "match_end" ? 0.34 : 0;
  const activeBias = duelActive ? 0.28 : uiState.prematchOpen ? 0.06 : 0.12;

  return clamp(
    activeBias + proximity * 0.24 + projectilePressure * 0.18 + zonePressure * 0.08 + healthPressure * 0.15 + statusPressure * 0.08 + roundPressure + audioState.combatImpulse,
    0,
    1,
  );
}

function updateMusicLayers(intensity) {
  if (!audioState.music) {
    return;
  }

  const calmLevel = 0.028 + (1 - intensity) * 0.05;
  const pulseLevel = 0.004 + intensity * 0.048;
  const tensionLevel = Math.max(0, intensity - 0.42) * 0.07;

  setParamTarget(audioState.music.calmGain.gain, calmLevel, 0.2);
  setParamTarget(audioState.music.pulseGain.gain, pulseLevel, 0.14);
  setParamTarget(audioState.music.tensionGain.gain, tensionLevel, 0.14);
  setParamTarget(audioState.music.calmFilter.frequency, 380 + (1 - intensity) * 360, 0.22);
  setParamTarget(audioState.music.pulseFilter.frequency, 420 + intensity * 860, 0.16);
  setParamTarget(audioState.music.tensionFilter.frequency, 760 + intensity * 1300, 0.16);
  setParamTarget(audioState.music.calmOsc.frequency, 88 + intensity * 16, 0.2);
  setParamTarget(audioState.music.pulseOsc.frequency, 124 + intensity * 62, 0.14);
  setParamTarget(audioState.music.tensionOsc.frequency, 176 + intensity * 118, 0.14);
}

function updateAmbienceLayers() {
  if (!audioState.ambience) {
    return;
  }

  const mapKey = sandbox.mapKey;
  const electro = mapKey === "electroGallery" ? 1 : 0;
  const scrap = mapKey === "bricABroc" ? 1 : 0;
  const training = mapKey === "trainingGround" || mapKey === "trainingExpanse" ? 1 : 0;

  setParamTarget(audioState.ambience.electroHumGain.gain, electro ? 0.028 : 0.0001, 0.28);
  setParamTarget(audioState.ambience.electroNoiseGain.gain, electro ? 0.016 : 0.0001, 0.28);
  setParamTarget(audioState.ambience.scrapHumGain.gain, scrap ? 0.026 : 0.0001, 0.28);
  setParamTarget(audioState.ambience.scrapNoiseGain.gain, scrap ? 0.02 : 0.0001, 0.28);
  setParamTarget(audioState.ambience.trainingAirGain.gain, training ? 0.018 : 0.0001, 0.28);
  setParamTarget(audioState.ambience.trainingHumGain.gain, training ? 0.015 : 0.0001, 0.28);
}

export function initializeAudio(controls = {}) {
  loadSettings();
  audioState.controls = controls;
  ensureAudioGraph();
  applyMixTargets(true);
  refreshControls();
  bindUnlockEvents();

  const { muteButton, musicSlider, sfxSlider, ambienceSlider } = controls;

  muteButton?.addEventListener("click", () => {
    audioState.masterMuted = !audioState.masterMuted;
    persistSettings();
    applyMixTargets();
    refreshControls();
  });

  musicSlider?.addEventListener("input", (event) => {
    audioState.musicVolume = clamp(Number(event.target.value) / 100, 0, 1);
    persistSettings();
    applyMixTargets();
  });

  sfxSlider?.addEventListener("input", (event) => {
    audioState.sfxVolume = clamp(Number(event.target.value) / 100, 0, 1);
    persistSettings();
    applyMixTargets();
  });

  ambienceSlider?.addEventListener("input", (event) => {
    audioState.ambienceVolume = clamp(Number(event.target.value) / 100, 0, 1);
    persistSettings();
    applyMixTargets();
  });
}

export function updateAudio(dt) {
  if (!audioState.ctx) {
    return;
  }

  audioState.combatImpulse = Math.max(0, audioState.combatImpulse - dt * 0.36);
  const intensity = computeIntensity();
  updateMusicLayers(intensity);
  updateAmbienceLayers();

  if (audioState.lastPhase !== matchState.phase) {
    if (matchState.phase === "round_intro") {
      playRoundCue("round-intro");
    } else if (matchState.phase === "active") {
      playRoundCue("round-start");
      addCombatImpulse(0.16);
    } else if (matchState.phase === "match_end") {
      playRoundCue(matchState.playerRounds > matchState.enemyRounds ? "match-win" : "match-loss");
    }
    audioState.lastPhase = matchState.phase;
  }

  const scoreKey = `${matchState.playerRounds}-${matchState.enemyRounds}`;
  if (audioState.lastScore !== scoreKey) {
    const playerWon = matchState.playerRounds > Number(audioState.lastScore.split("-")[0] ?? 0);
    playRoundCue(playerWon ? "round-win" : "round-loss");
    audioState.lastScore = scoreKey;
  }

  if (audioState.lastRoundNumber !== matchState.roundNumber) {
    audioState.lastRoundNumber = matchState.roundNumber;
    addCombatImpulse(0.08);
  }

  if (audioState.lastMapKey !== sandbox.mapKey) {
    audioState.lastMapKey = sandbox.mapKey;
    playMapCue("map-shift");
  }
}

export function addCombatImpulse(amount) {
  audioState.combatImpulse = clamp(audioState.combatImpulse + amount, 0, 0.45);
}

export function playWeaponFire(weaponKey, owner = "player") {
  const enemyPan = owner === "enemy" ? 0.32 : -0.18;
  const pan = owner === "enemy" ? enemyPan : 0;
  addCombatImpulse(owner === "enemy" ? 0.014 : 0.02);

  if (weaponKey === "pulse") {
    playTone({ type: "sawtooth", frequency: owner === "enemy" ? 320 : 360, sweepTo: 220, duration: 0.08, gain: 0.045, filterType: "lowpass", filterFrequency: 1800, pan });
    return;
  }
  if (weaponKey === "shotgun") {
    playNoise({ duration: 0.1, gain: 0.075, filterType: "bandpass", filterFrequency: 720, q: 0.7, pan });
    playTone({ type: "triangle", frequency: 108, sweepTo: 74, duration: 0.12, gain: 0.06, pan });
    return;
  }
  if (weaponKey === "sniper") {
    playTone({ type: "square", frequency: 620, sweepTo: 180, duration: 0.18, gain: 0.06, filterType: "bandpass", filterFrequency: 1300, q: 1.3, pan });
    return;
  }
  if (weaponKey === "staff") {
    playTone({ type: "triangle", frequency: 280, sweepTo: 220, duration: 0.18, gain: 0.048, filterType: "lowpass", filterFrequency: 1200, pan });
    return;
  }
  if (weaponKey === "injector") {
    playTone({ type: "sine", frequency: 460, sweepTo: 170, duration: 0.12, gain: 0.05, filterType: "bandpass", filterFrequency: 980, pan });
    return;
  }
  if (weaponKey === "lance") {
    playTone({ type: "triangle", frequency: owner === "enemy" ? 220 : 260, sweepTo: 132, duration: 0.14, gain: 0.055, filterType: "bandpass", filterFrequency: 980, q: 0.8, pan });
    playNoise({ duration: 0.05, gain: 0.028, filterType: "highpass", filterFrequency: 1600, pan });
    return;
  }
  if (weaponKey === "cannon") {
    playNoise({ duration: 0.12, gain: 0.09, filterType: "lowpass", filterFrequency: 620, q: 0.7, pan });
    playTone({ type: "sawtooth", frequency: owner === "enemy" ? 96 : 110, sweepTo: 54, duration: 0.2, gain: 0.065, pan });
    return;
  }
  if (weaponKey === "axe") {
    playNoise({ duration: 0.09, gain: 0.042, filterType: "highpass", filterFrequency: 1200, pan });
    playTone({ type: "triangle", frequency: 182, sweepTo: 92, duration: 0.16, gain: 0.065, pan });
  }
}

export function playWeaponEquip(weaponKey) {
  const base = weaponKey === "sniper" ? 440 : weaponKey === "shotgun" ? 200 : weaponKey === "axe" ? 170 : weaponKey === "lance" ? 248 : weaponKey === "cannon" ? 150 : 320;
  playTone({ type: "triangle", frequency: base, sweepTo: base * 1.24, duration: 0.11, gain: 0.04, filterType: "lowpass", filterFrequency: 1600 });
}

export function playReloadCue(owner = "player") {
  if (!canTrigger(`reload-${owner}`, 220)) {
    return;
  }
  playTone({ type: "square", frequency: owner === "enemy" ? 150 : 170, sweepTo: 130, duration: 0.08, gain: 0.03 });
  playTone({ type: "square", frequency: owner === "enemy" ? 190 : 220, sweepTo: 170, duration: 0.1, gain: 0.022 });
}

export function playAbilityCue(abilityKey, owner = "player") {
  const pan = owner === "enemy" ? 0.26 : 0;
  addCombatImpulse(owner === "enemy" ? 0.016 : 0.028);

  switch (abilityKey) {
    case "dash":
    case "phaseDash":
    case "blinkStep":
    case "backstepBurst":
      playNoise({ duration: 0.08, gain: 0.04, filterType: "highpass", filterFrequency: 1700, pan });
      playTone({ type: "triangle", frequency: 220, sweepTo: 520, duration: 0.1, gain: 0.042, pan });
      break;
    case "shockJavelin":
      playTone({ type: "sawtooth", frequency: 260, sweepTo: 680, duration: 0.14, gain: 0.05, filterType: "bandpass", filterFrequency: 1240, pan });
      break;
    case "energyParry":
      playNoise({ duration: 0.08, gain: 0.036, filterType: "highpass", filterFrequency: 1800, pan });
      playTone({ type: "triangle", frequency: 320, sweepTo: 510, duration: 0.12, gain: 0.046, filterType: "bandpass", filterFrequency: 1500, pan });
      break;
    case "energyParrySuccess":
      playNoise({ duration: 0.06, gain: 0.044, filterType: "bandpass", filterFrequency: 2100, q: 1.3, pan });
      playTone({ type: "square", frequency: 620, sweepTo: 290, duration: 0.12, gain: 0.058, filterType: "bandpass", filterFrequency: 1850, pan });
      playTone({ type: "sine", frequency: 220, sweepTo: 520, duration: 0.09, gain: 0.034, pan });
      break;
    case "energyParryFail":
      playNoise({ duration: 0.08, gain: 0.024, filterType: "lowpass", filterFrequency: 760, pan });
      playTone({ type: "sine", frequency: 260, sweepTo: 180, duration: 0.1, gain: 0.026, filterType: "lowpass", filterFrequency: 980, pan });
      break;
    case "magneticField":
    case "gravityWell":
      playTone({ type: "sine", frequency: 130, sweepTo: 86, duration: 0.28, gain: 0.06, filterType: "lowpass", filterFrequency: 620, pan });
      playNoise({ duration: 0.14, gain: 0.035, filterType: "bandpass", filterFrequency: 980, pan });
      break;
    case "magneticGrapple":
    case "chainLightning":
      playTone({ type: "square", frequency: 240, sweepTo: 480, duration: 0.14, gain: 0.052, filterType: "bandpass", filterFrequency: 1800, pan });
      break;
    case "energyShield":
    case "phaseShift":
      playTone({ type: "sine", frequency: 340, sweepTo: 260, duration: 0.24, gain: 0.05, filterType: "lowpass", filterFrequency: 1400, pan });
      break;
    case "empBurst":
    case "empCataclysm":
      playNoise({ duration: 0.18, gain: 0.058, filterType: "bandpass", filterFrequency: 740, q: 0.5, pan });
      playTone({ type: "square", frequency: 170, sweepTo: 80, duration: 0.18, gain: 0.06, pan });
      break;
    case "pulseBurst":
      playTone({ type: "sawtooth", frequency: 400, sweepTo: 260, duration: 0.1, gain: 0.046, pan });
      break;
    case "railShot":
      playTone({ type: "square", frequency: 640, sweepTo: 220, duration: 0.2, gain: 0.07, filterType: "bandpass", filterFrequency: 1600, q: 1.1, pan });
      break;
    case "speedSurge":
    case "berserkCore":
      playTone({ type: "triangle", frequency: 160, sweepTo: 290, duration: 0.2, gain: 0.05, pan });
      break;
    case "phantomSplit":
    case "hologramDecoy":
      playTone({ type: "sine", frequency: 240, sweepTo: 430, duration: 0.22, gain: 0.048, filterType: "bandpass", filterFrequency: 1100, pan });
      break;
    case "revivalProtocol":
      playTone({ type: "triangle", frequency: 200, sweepTo: 360, duration: 0.22, gain: 0.046, pan });
      break;
    default:
      playTone({ type: "triangle", frequency: 240, sweepTo: 190, duration: 0.12, gain: 0.04, pan });
  }
}

export function playStatusCue(statusType, target = "enemy") {
  const pan = target === "player" ? -0.14 : 0.14;
  if (statusType === "stun") {
    playTone({ type: "square", frequency: 210, sweepTo: 120, duration: 0.12, gain: 0.05, pan });
    return;
  }
  if (statusType === "slow") {
    playTone({ type: "sine", frequency: 260, sweepTo: 180, duration: 0.14, gain: 0.036, pan });
    return;
  }
  playTone({ type: "triangle", frequency: 200, sweepTo: 160, duration: 0.1, gain: 0.03, pan });
}

export function playDamageCue(target = "enemy", amount = 10, source = "hit", blocked = false) {
  const pan = target === "player" ? -0.18 : 0.16;
  if (blocked) {
    playTone({ type: "sine", frequency: 430, sweepTo: 250, duration: 0.08, gain: 0.036, pan, filterType: "lowpass", filterFrequency: 900 });
    return;
  }

  const heavy = amount >= 18 || source === "axe-finisher" || source === "javelin";
  playNoise({ duration: heavy ? 0.09 : 0.06, gain: heavy ? 0.054 : 0.032, filterType: "bandpass", filterFrequency: heavy ? 760 : 980, pan });
  playTone({ type: "triangle", frequency: heavy ? 132 : 172, sweepTo: heavy ? 72 : 118, duration: heavy ? 0.14 : 0.1, gain: heavy ? 0.05 : 0.03, pan });
  addCombatImpulse(heavy ? 0.04 : 0.022);
}

export function playMapCue(kind) {
  if (kind === "teleport") {
    if (!canTrigger("teleport", 120)) {
      return;
    }
    playTone({ type: "sine", frequency: 320, sweepTo: 620, duration: 0.12, gain: 0.042, filterType: "bandpass", filterFrequency: 1400 });
    playNoise({ duration: 0.06, gain: 0.026, filterType: "highpass", filterFrequency: 1800 });
    addCombatImpulse(0.02);
    return;
  }
  if (kind === "pylon-hit") {
    playTone({ type: "triangle", frequency: 120, sweepTo: 82, duration: 0.1, gain: 0.04, filterType: "lowpass", filterFrequency: 760 });
    return;
  }
  if (kind === "pylon-collapse") {
    playNoise({ duration: 0.18, gain: 0.062, filterType: "bandpass", filterFrequency: 520, q: 0.4 });
    playTone({ type: "triangle", frequency: 86, sweepTo: 42, duration: 0.22, gain: 0.055 });
    addCombatImpulse(0.08);
    return;
  }
  if (kind === "projectile-absorb") {
    playTone({ type: "sine", frequency: 420, sweepTo: 220, duration: 0.08, gain: 0.032, filterType: "bandpass", filterFrequency: 1200 });
    return;
  }
  if (kind === "map-shift") {
    playTone({ type: "triangle", frequency: 180, sweepTo: 240, duration: 0.18, gain: 0.024, filterType: "lowpass", filterFrequency: 700 });
  }
}

export function playRoundCue(kind) {
  if (!canTrigger(`round-${kind}`, 180)) {
    return;
  }

  if (kind === "round-intro") {
    playTone({ type: "triangle", frequency: 180, sweepTo: 240, duration: 0.16, gain: 0.03 });
    return;
  }
  if (kind === "round-start") {
    playTone({ type: "square", frequency: 220, sweepTo: 360, duration: 0.14, gain: 0.038 });
    return;
  }
  if (kind === "round-win" || kind === "match-win") {
    playTone({ type: "triangle", frequency: 260, sweepTo: 390, duration: 0.18, gain: 0.042 });
    playTone({ type: "triangle", frequency: 390, sweepTo: 520, duration: 0.22, gain: 0.032 });
    return;
  }
  if (kind === "round-loss" || kind === "match-loss") {
    playTone({ type: "triangle", frequency: 180, sweepTo: 120, duration: 0.18, gain: 0.04 });
    playTone({ type: "sine", frequency: 120, sweepTo: 82, duration: 0.24, gain: 0.028 });
  }
}

export function playUiCue(kind = "click") {
  if (!audioState.ctx) {
    return;
  }

  if (kind === "confirm") {
    playTone({ type: "triangle", frequency: 320, sweepTo: 430, duration: 0.11, gain: 0.038, filterType: "lowpass", filterFrequency: 1500 });
    playTone({ type: "triangle", frequency: 430, sweepTo: 520, duration: 0.14, gain: 0.024, filterType: "lowpass", filterFrequency: 1700 });
    return;
  }

  if (kind === "cancel") {
    playTone({ type: "sine", frequency: 260, sweepTo: 190, duration: 0.08, gain: 0.03, filterType: "lowpass", filterFrequency: 1200 });
    return;
  }

  playTone({ type: "triangle", frequency: 240, sweepTo: 300, duration: 0.07, gain: 0.022, filterType: "lowpass", filterFrequency: 1400 });
}
