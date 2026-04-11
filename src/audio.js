import { sandbox, matchState, player, enemy, bullets, enemyBullets, boltLinkJavelins, enemyBoltLinkJavelins, supportZones, orbitalDistorterFields } from "./state.js";
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
  sfxBuffers: new Map(),
  noiseBuffer: null,
  music: {
    current: null,
    target: null,
    tracks: new Map(), // name -> HTMLAudioElement
    fadePhase: "none", // "none", "out", "in"
    fadeStartTime: 0,
  },
  ambience: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ── Premium SFX ─────────────────────────────────────────────────────────────

const SFX_MANIFEST = [
  ['laser-s-0', '/sfx/laser-s-0.ogg'],
  ['laser-s-1', '/sfx/laser-s-1.ogg'],
  ['laser-s-2', '/sfx/laser-s-2.ogg'],
  ['laser-s-3', '/sfx/laser-s-3.ogg'],
  ['laser-l-0', '/sfx/laser-l-0.ogg'],
  ['laser-l-1', '/sfx/laser-l-1.ogg'],
  ['laser-l-2', '/sfx/laser-l-2.ogg'],
  ['laser-r-0', '/sfx/laser-r-0.ogg'],
  ['laser-r-1', '/sfx/laser-r-1.ogg'],
  ['laser-r-2', '/sfx/laser-r-2.ogg'],
  ['explosion-0', '/sfx/explosion-0.ogg'],
  ['explosion-1', '/sfx/explosion-1.ogg'],
  ['explosion-2', '/sfx/explosion-2.ogg'],
  ['explosion-heavy-0', '/sfx/explosion-heavy-0.ogg'],
  ['explosion-heavy-1', '/sfx/explosion-heavy-1.ogg'],
  ['impact-0', '/sfx/impact-0.ogg'],
  ['impact-1', '/sfx/impact-1.ogg'],
  ['impact-2', '/sfx/impact-2.ogg'],
  ['impact-3', '/sfx/impact-3.ogg'],
  ['impact-4', '/sfx/impact-4.ogg'],
  ['shield-0', '/sfx/shield-0.ogg'],
  ['shield-1', '/sfx/shield-1.ogg'],
  ['shield-2', '/sfx/shield-2.ogg'],
  ['shield-3', '/sfx/shield-3.ogg'],
  ['dash-0', '/sfx/dash-0.ogg'],
  ['dash-1', '/sfx/dash-1.ogg'],
  ['dash-2', '/sfx/dash-2.ogg'],
  ['ui-click', '/sfx/ui-click.ogg'],
  ['ui-hover', '/sfx/ui-hover.ogg'],
  ['ui-confirm', '/sfx/ui-confirm.ogg'],
  ['ui-cancel', '/sfx/ui-cancel.ogg'],
];

function pickSfx(...keys) {
  return keys[Math.floor(Math.random() * keys.length)];
}

function jitter(base, pct = 0.07) {
  return base * (1 + (Math.random() * 2 - 1) * pct);
}

function playSfxBuffer(key, { pan = 0, gain = 0.7, rate = 1.0 } = {}) {
  const buffer = audioState.sfxBuffers.get(key);
  if (!buffer || !audioState.ctx || !audioState.sfxGain || !audioState.unlocked) return false;
  const source = audioState.ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const amp = audioState.ctx.createGain();
  amp.gain.value = clamp(gain, 0, 1);
  const panner = createPanner();
  source.connect(amp);
  if (panner) {
    panner.pan.value = clamp(pan, -1, 1);
    amp.connect(panner);
    panner.connect(audioState.sfxGain);
  } else {
    amp.connect(audioState.sfxGain);
  }
  source.start();
  return true;
}

function loadSfxBuffers() {
  if (!audioState.ctx) return;
  for (const [key, url] of SFX_MANIFEST) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((ab) => audioState.ctx.decodeAudioData(ab))
      .then((buf) => audioState.sfxBuffers.set(key, buf))
      .catch(() => { });
  }
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

function loadMusicTracks() {
  const sources = {
    menu: "/music/menu.mp3",
    training: "/music/training.mp3",
    "map-electro": "/music/map-electro.mp3",
    "map-scrap": "/music/map-scrap.mp3",
  };

  for (const [key, url] of Object.entries(sources)) {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;

    // We'll use the AudioContext to pipe this through our gain nodes
    const sourceNode = audioState.ctx.createMediaElementSource(audio);
    const trackGain = audioState.ctx.createGain();
    trackGain.gain.value = 0; // Controlled by crossfade logic

    sourceNode.connect(trackGain);
    trackGain.connect(audioState.musicGain);

    audioState.music.tracks.set(key, {
      audio,
      gain: trackGain,
      url
    });
  }
}

function updateMusicPlaylist() {
  if (!audioState.unlocked || !audioState.music.tracks.size) {
    return;
  }

  // 1. Identify what SHOULD be playing
  let targetKey = "menu";
  if (!uiState.prematchOpen) {
    if (sandbox.mode === "training" || sandbox.mapKey === "trainingExpanse") {
      targetKey = "training";
    } else {
      targetKey = sandbox.mapKey === "bricABroc" ? "map-scrap" : "map-electro";
    }
  }

  const m = audioState.music;
  const now = audioState.ctx.currentTime;
  const fadeDuration = 1.0; // 1 second out, 1 second in

  // 2. Trigger a new transition if target has changed
  if (m.target !== targetKey) {
    m.target = targetKey;
    m.fadePhase = m.current ? "out" : "in";
    m.fadeStartTime = now;

    // If we're starting from silence (none), jump to 'in'
    if (m.fadePhase === "in") {
      const trackData = m.tracks.get(targetKey);
      if (trackData && trackData.audio.paused) {
        trackData.audio.play().catch(() => { });
      }
    }
  }

  // 3. Process the Sequential Fade
  if (m.fadePhase === "out") {
    const progress = Math.min(1, (now - m.fadeStartTime) / fadeDuration);
    const currentTrack = m.tracks.get(m.current);

    if (currentTrack) {
      setParamTarget(currentTrack.gain.gain, 1 - progress, 0.05);
    }

    // Switch to 'in' once faded out
    if (progress >= 1) {
      if (currentTrack && !currentTrack.audio.paused) currentTrack.audio.pause();
      m.current = null; // Grounded to silence
      m.fadePhase = "in";
      m.fadeStartTime = now;

      const nextTrack = m.tracks.get(m.target);
      if (nextTrack && nextTrack.audio.paused) {
        nextTrack.audio.play().catch(() => { });
      }
    }
  } else if (m.fadePhase === "in") {
    const progress = Math.min(1, (now - m.fadeStartTime) / fadeDuration);
    const nextTrack = m.tracks.get(m.target);

    if (nextTrack) {
      setParamTarget(nextTrack.gain.gain, progress, 0.05);
      nextTrack.audio.volume = 1.0;
    }

    if (progress >= 1) {
      m.current = m.target;
      m.fadePhase = "none";
    }
  } else if (m.fadePhase === "none") {
    // Steady state: ensure only current is playing at full volume
    for (const [key, track] of m.tracks.entries()) {
      if (key === m.current) {
        setParamTarget(track.gain.gain, 1.0, 0.1);
      } else {
        setParamTarget(track.gain.gain, 0.0001, 0.1);
        if (!track.audio.paused) track.audio.pause();
      }
    }
  }
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
  loadMusicTracks();
  loadSfxBuffers();
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
  const projectilePressure = clamp((bullets.length + enemyBullets.length + boltLinkJavelins.length + enemyBoltLinkJavelins.length) / 18, 0, 1);
  const zonePressure = clamp((supportZones.length + orbitalDistorterFields.length) / 8, 0, 1);
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
  updateMusicPlaylist();

  // Note: intensity can still modulate the underlying gain or filters if we want
  // But for now we just handle track switching.
}
function updateAmbienceLayers() {
  if (!audioState.ambience) {
    return;
  }

  const mapKey = sandbox.mapKey;
  const electro = mapKey === "electroGallery" ? 1 : 0;
  const scrap = mapKey === "bricABroc" ? 1 : 0;
  const training = mapKey === "trainingExpanse" ? 1 : 0;

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
  if (owner === "player") player.combatTimer = 3.0;
  if (owner === "enemy") enemy.combatTimer = 3.0;

  const enemyPan = owner === "enemy" ? 0.32 : -0.18;
  const pan = owner === "enemy" ? enemyPan : 0;
  addCombatImpulse(owner === "enemy" ? 0.014 : 0.02);

  if (weaponKey === "pulse") {
    if (playSfxBuffer(pickSfx('laser-s-0', 'laser-s-1', 'laser-s-2', 'laser-s-3'), { pan, gain: 0.62, rate: jitter(1.0) })) return;
    playTone({ type: "sawtooth", frequency: owner === "enemy" ? 320 : 360, sweepTo: 220, duration: 0.08, gain: 0.045, filterType: "lowpass", filterFrequency: 1800, pan });
    return;
  }
  if (weaponKey === "shotgun") {
    if (playSfxBuffer(pickSfx('laser-r-0', 'laser-r-1', 'laser-r-2'), { pan, gain: 0.74, rate: jitter(0.9, 0.1) })) return;
    playNoise({ duration: 0.1, gain: 0.075, filterType: "bandpass", filterFrequency: 720, q: 0.7, pan });
    playTone({ type: "triangle", frequency: 108, sweepTo: 74, duration: 0.12, gain: 0.06, pan });
    return;
  }
  if (weaponKey === "sniper") {
    if (playSfxBuffer(pickSfx('laser-l-0', 'laser-l-1', 'laser-l-2'), { pan, gain: 0.76, rate: jitter(1.0, 0.05) })) return;
    playTone({ type: "square", frequency: 620, sweepTo: 180, duration: 0.18, gain: 0.06, filterType: "bandpass", filterFrequency: 1300, q: 1.3, pan });
    return;
  }
  if (weaponKey === "staff") {
    if (playSfxBuffer(pickSfx('laser-r-0', 'laser-r-1'), { pan, gain: 0.55, rate: jitter(1.1) })) return;
    playTone({ type: "triangle", frequency: 280, sweepTo: 220, duration: 0.18, gain: 0.048, filterType: "lowpass", filterFrequency: 1200, pan });
    return;
  }
  if (weaponKey === "injector") {
    if (playSfxBuffer(pickSfx('laser-s-0', 'laser-s-1', 'laser-s-2'), { pan, gain: 0.55, rate: jitter(1.2) })) return;
    playTone({ type: "sine", frequency: 460, sweepTo: 170, duration: 0.12, gain: 0.05, filterType: "bandpass", filterFrequency: 980, pan });
    return;
  }
  if (weaponKey === "lance") {
    if (playSfxBuffer(pickSfx('laser-s-2', 'laser-s-3'), { pan, gain: 0.66, rate: jitter(0.85) })) return;
    playTone({ type: "triangle", frequency: owner === "enemy" ? 220 : 260, sweepTo: 132, duration: 0.14, gain: 0.055, filterType: "bandpass", filterFrequency: 980, q: 0.8, pan });
    playNoise({ duration: 0.05, gain: 0.028, filterType: "highpass", filterFrequency: 1600, pan });
    return;
  }
  if (weaponKey === "cannon") {
    if (playSfxBuffer(pickSfx('explosion-0', 'explosion-1', 'explosion-2'), { pan, gain: 0.78, rate: jitter(0.85) })) return;
    playNoise({ duration: 0.12, gain: 0.09, filterType: "lowpass", filterFrequency: 620, q: 0.7, pan });
    playTone({ type: "sawtooth", frequency: owner === "enemy" ? 96 : 110, sweepTo: 54, duration: 0.2, gain: 0.065, pan });
    return;
  }
  if (weaponKey === "axe") {
    if (playSfxBuffer(pickSfx('impact-0', 'impact-1', 'impact-2'), { pan, gain: 0.68, rate: jitter(1.0, 0.1) })) return;
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

export function playModuleCue(moduleKey, owner = "player") {
  if (owner === "player") player.combatTimer = 3.0;
  if (owner === "enemy") enemy.combatTimer = 3.0;

  const pan = owner === "enemy" ? 0.26 : 0;
  addCombatImpulse(owner === "enemy" ? 0.016 : 0.028);

  switch (moduleKey) {
    case "dash":
    case "phaseDash":
    case "blink":
    case "jetBackThruster":
      if (playSfxBuffer(pickSfx('dash-0', 'dash-1', 'dash-2'), { pan, gain: 0.58, rate: jitter(1.0) })) break;
      playNoise({ duration: 0.08, gain: 0.04, filterType: "highpass", filterFrequency: 1700, pan });
      playTone({ type: "triangle", frequency: 220, sweepTo: 520, duration: 0.1, gain: 0.042, pan });
      break;
    case "boltLinkJavelin":
      if (playSfxBuffer(pickSfx('laser-l-0', 'laser-l-1'), { pan, gain: 0.62, rate: jitter(1.1) })) break;
      playTone({ type: "sawtooth", frequency: 260, sweepTo: 680, duration: 0.14, gain: 0.05, filterType: "bandpass", filterFrequency: 1240, pan });
      break;
    case "reflexAegis":
      if (playSfxBuffer(pickSfx('shield-0', 'shield-1'), { pan, gain: 0.52, rate: jitter(0.95) })) break;
      playNoise({ duration: 0.08, gain: 0.036, filterType: "highpass", filterFrequency: 1800, pan });
      playTone({ type: "triangle", frequency: 320, sweepTo: 510, duration: 0.12, gain: 0.046, filterType: "bandpass", filterFrequency: 1500, pan });
      break;
    case "reflexAegisSuccess":
      if (playSfxBuffer(pickSfx('shield-2', 'shield-3'), { pan, gain: 0.72, rate: jitter(1.05) })) break;
      playNoise({ duration: 0.06, gain: 0.044, filterType: "bandpass", filterFrequency: 2100, q: 1.3, pan });
      playTone({ type: "square", frequency: 620, sweepTo: 290, duration: 0.12, gain: 0.058, filterType: "bandpass", filterFrequency: 1850, pan });
      break;
    case "reflexAegisFail":
      if (playSfxBuffer(pickSfx('impact-3', 'impact-4'), { pan, gain: 0.4, rate: jitter(0.7) })) break;
      playNoise({ duration: 0.08, gain: 0.024, filterType: "lowpass", filterFrequency: 760, pan });
      playTone({ type: "sine", frequency: 260, sweepTo: 180, duration: 0.1, gain: 0.026, filterType: "lowpass", filterFrequency: 980, pan });
      break;
    case "orbitalDistorter":
    case "voidCoreSingularity":
      if (playSfxBuffer(pickSfx('shield-0', 'shield-1'), { pan, gain: 0.5, rate: jitter(0.6) })) break;
      playTone({ type: "sine", frequency: 130, sweepTo: 86, duration: 0.28, gain: 0.06, filterType: "lowpass", filterFrequency: 620, pan });
      playNoise({ duration: 0.14, gain: 0.035, filterType: "bandpass", filterFrequency: 980, pan });
      break;
    case "vGripHarpoon":
    case "chainLightning":
      if (playSfxBuffer(pickSfx('laser-l-1', 'laser-l-2'), { pan, gain: 0.64, rate: jitter(1.15) })) break;
      playTone({ type: "square", frequency: 240, sweepTo: 480, duration: 0.14, gain: 0.052, filterType: "bandpass", filterFrequency: 1800, pan });
      break;
    case "hexPlateProjector":
    case "phaseShift":
      if (playSfxBuffer(pickSfx('shield-1', 'shield-2'), { pan, gain: 0.52, rate: jitter(0.8) })) break;
      playTone({ type: "sine", frequency: 340, sweepTo: 260, duration: 0.24, gain: 0.05, filterType: "lowpass", filterFrequency: 1400, pan });
      break;
    case "emPulseEmitter":
    case "empCataclysm":
      if (playSfxBuffer(pickSfx('explosion-heavy-0', 'explosion-heavy-1'), { pan, gain: 0.7, rate: jitter(0.9) })) break;
      playNoise({ duration: 0.18, gain: 0.058, filterType: "bandpass", filterFrequency: 740, q: 0.5, pan });
      playTone({ type: "square", frequency: 170, sweepTo: 80, duration: 0.18, gain: 0.06, pan });
      break;
    case "swarmMissileRack":
      if (playSfxBuffer(pickSfx('laser-s-0', 'laser-s-1'), { pan, gain: 0.62, rate: jitter(1.3) })) break;
      playTone({ type: "sawtooth", frequency: 400, sweepTo: 260, duration: 0.1, gain: 0.046, pan });
      break;
    case "railShot":
      if (playSfxBuffer(pickSfx('laser-l-0', 'laser-l-2'), { pan, gain: 0.82, rate: jitter(1.0) })) break;
      playTone({ type: "square", frequency: 640, sweepTo: 220, duration: 0.2, gain: 0.07, filterType: "bandpass", filterFrequency: 1600, q: 1.1, pan });
      break;
    case "overdriveServos":
    case "berserkCore":
      if (playSfxBuffer(pickSfx('dash-0', 'dash-1'), { pan, gain: 0.5, rate: jitter(0.75) })) break;
      playTone({ type: "triangle", frequency: 160, sweepTo: 290, duration: 0.2, gain: 0.05, pan });
      break;
    case "phantomSplit":
    case "hologramDecoy":
      if (playSfxBuffer(pickSfx('shield-0', 'shield-3'), { pan, gain: 0.47, rate: jitter(1.1) })) break;
      playTone({ type: "sine", frequency: 240, sweepTo: 430, duration: 0.22, gain: 0.048, filterType: "bandpass", filterFrequency: 1100, pan });
      break;
    case "revivalProtocol":
      if (playSfxBuffer(pickSfx('shield-2', 'shield-3'), { pan, gain: 0.55, rate: jitter(0.85) })) break;
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
    if (playSfxBuffer(pickSfx('shield-0', 'shield-1'), { pan, gain: 0.45, rate: jitter(1.2) })) return;
    playTone({ type: "sine", frequency: 430, sweepTo: 250, duration: 0.08, gain: 0.036, pan, filterType: "lowpass", filterFrequency: 900 });
    return;
  }

  const heavy = amount >= 18 || source === "axe-finisher" || source === "javelin";
  if (heavy) {
    if (playSfxBuffer(pickSfx('impact-0', 'impact-1', 'impact-2'), { pan, gain: 0.68, rate: jitter(0.85) })) { addCombatImpulse(0.04); return; }
  } else {
    if (playSfxBuffer(pickSfx('impact-2', 'impact-3', 'impact-4'), { pan, gain: 0.55, rate: jitter(1.0) })) { addCombatImpulse(0.022); return; }
  }
  playNoise({ duration: heavy ? 0.09 : 0.06, gain: heavy ? 0.054 : 0.032, filterType: "bandpass", filterFrequency: heavy ? 760 : 980, pan });
  playTone({ type: "triangle", frequency: heavy ? 132 : 172, sweepTo: heavy ? 72 : 118, duration: heavy ? 0.14 : 0.1, gain: heavy ? 0.05 : 0.03, pan });
  addCombatImpulse(heavy ? 0.04 : 0.022);
}

export function playMapCue(kind) {
  if (kind === "teleport") {
    if (!canTrigger("teleport", 120)) {
      return;
    }
    if (!playSfxBuffer(pickSfx('dash-0', 'dash-2'), { gain: 0.5, rate: jitter(1.3) })) {
      playTone({ type: "sine", frequency: 320, sweepTo: 620, duration: 0.12, gain: 0.042, filterType: "bandpass", filterFrequency: 1400 });
      playNoise({ duration: 0.06, gain: 0.026, filterType: "highpass", filterFrequency: 1800 });
    }
    addCombatImpulse(0.02);
    return;
  }
  if (kind === "pylon-hit") {
    if (!playSfxBuffer(pickSfx('impact-3', 'impact-4'), { gain: 0.48, rate: jitter(0.75) })) {
      playTone({ type: "triangle", frequency: 120, sweepTo: 82, duration: 0.1, gain: 0.04, filterType: "lowpass", filterFrequency: 760 });
    }
    return;
  }
  if (kind === "pylon-collapse") {
    if (!playSfxBuffer(pickSfx('explosion-0', 'explosion-1'), { gain: 0.72, rate: jitter(0.85) })) {
      playNoise({ duration: 0.18, gain: 0.062, filterType: "bandpass", filterFrequency: 520, q: 0.4 });
      playTone({ type: "triangle", frequency: 86, sweepTo: 42, duration: 0.22, gain: 0.055 });
    }
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
    if (playSfxBuffer('ui-confirm', { gain: 0.42 })) return;
    playTone({ type: "triangle", frequency: 320, sweepTo: 430, duration: 0.11, gain: 0.038, filterType: "lowpass", filterFrequency: 1500 });
    playTone({ type: "triangle", frequency: 430, sweepTo: 520, duration: 0.14, gain: 0.024, filterType: "lowpass", filterFrequency: 1700 });
    return;
  }

  if (kind === "cancel") {
    if (playSfxBuffer('ui-cancel', { gain: 0.32 })) return;
    playTone({ type: "sine", frequency: 260, sweepTo: 190, duration: 0.08, gain: 0.03, filterType: "lowpass", filterFrequency: 1200 });
    return;
  }

  if (kind === "hover") {
    playSfxBuffer('ui-hover', { gain: 0.22, rate: jitter(1.0, 0.04) });
    return;
  }

  if (playSfxBuffer('ui-click', { gain: 0.3, rate: jitter(1.0, 0.05) })) return;
  playTone({ type: "triangle", frequency: 240, sweepTo: 300, duration: 0.07, gain: 0.022, filterType: "lowpass", filterFrequency: 1400 });
}
