// Survival mode flow and adaptive wave enemies
import { arena, config, sandboxModes } from "../config.js";
import { weapons } from "../content.js";
import { player, enemy, sandbox, matchState, survivalEnemies, survivalState, createBot, enemyBullets } from "../state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { getMapLayout, resetMapState, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { clearCombatArtifacts, spawnBullet, applyPlayerDamage, updateStatusEffects, tickEntityMarks, getStatusState, getFieldInfluence, getZoneEffectsForEntity } from "./combat.js";
import { getBuildStats } from "../build/loadout.js";
import { addImpact, addShake } from "./effects.js";
import { loadout } from "../state/app-state.js";
import { addXp } from "../progression.js";
import { syncServerProgressionAfterSurvival } from "../lib/account/progression-sync.js";

let _resetPlayer = null;
let _openPrematch = null;
let _resetBotsForMode = null;

export function bindSurvivalDeps({ resetPlayer, openPrematch, resetBotsForMode }) {
  _resetPlayer = resetPlayer;
  _openPrematch = openPrematch;
  _resetBotsForMode = resetBotsForMode;
}

function setBanner(label, title, visible = true, style = "intro") {
  matchState.bannerLabel = label;
  matchState.bannerTitle = title;
  matchState.bannerVisible = visible;
  matchState.bannerStyle = style;
}

const survivalEnemyCatalog = {
  scavenger: {
    key: "scavenger",
    name: "Scavenger",
    tier: "Small",
    cost: 1,
    unlockWave: 1,
    radius: 14,
    hp: 62,
    speed: 308,
    ai: "melee",
    attackRange: 30,
    attackCooldown: 0.88,
    damage: 12,
    color: "#8edfff",
    accent: "#d5f6ff",
    scale: 0.72,
  },
  raider: {
    key: "raider",
    name: "Raider",
    tier: "Medium",
    cost: 1.8,
    unlockWave: 2,
    radius: 16,
    hp: 94,
    speed: 252,
    ai: "ranged",
    preferredRange: 290,
    attackCooldown: 1.08,
    projectileSpeed: 920,
    damage: 9,
    color: "#ffb689",
    accent: "#ffe0c2",
    scale: 0.80,
  },
  bruiser: {
    key: "bruiser",
    name: "Bruiser",
    tier: "Big",
    cost: 3.4,
    unlockWave: 3,
    radius: 22,
    hp: 178,
    speed: 194,
    ai: "melee",
    attackRange: 34,
    attackCooldown: 1.18,
    damage: 20,
    color: "#ff9577",
    accent: "#ffd4bd",
    scale: 1,
  },
  stormcaller: {
    key: "stormcaller",
    name: "Stormcaller",
    tier: "Epic",
    cost: 4.8,
    unlockWave: 5,
    radius: 18,
    hp: 152,
    speed: 224,
    ai: "caster",
    preferredRange: 360,
    attackCooldown: 1.34,
    projectileSpeed: 880,
    damage: 11,
    color: "#caadff",
    accent: "#eadcff",
    scale: 0.88,
  },
  behemoth: {
    key: "behemoth",
    name: "Behemoth",
    tier: "Legendary",
    cost: 7.6,
    unlockWave: 7,
    radius: 26,
    hp: 304,
    speed: 180,
    ai: "melee",
    attackRange: 42,
    attackCooldown: 1.32,
    damage: 28,
    color: "#ff7d69",
    accent: "#ffe3d4",
    scale: 1.14,
  },
};

function getSurvivalWaveProfile(wave = survivalState.wave) {
  const budget = 4.4 + wave * 1.8 + Math.floor(wave / 3) * 0.8;
  return {
    budget,
    hpScale: 1 + Math.min(0.9, (wave - 1) * 0.08),
    speedScale: 1 + Math.min(0.22, (wave - 1) * 0.018),
    damageScale: 1 + Math.min(0.44, (wave - 1) * 0.045),
    maxConcurrent: Math.min(8, 3 + Math.floor((wave - 1) / 2)),
    spawnDelay: clamp(0.92 - wave * 0.03, 0.38, 0.92),
  };
}

function chooseWeighted(entries, weightFn) {
  const weighted = entries.map((entry) => ({ entry, weight: Math.max(0.01, weightFn(entry)) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.entry;
    }
  }
  return weighted[weighted.length - 1]?.entry ?? entries[0];
}

function buildSurvivalWavePlan(wave = survivalState.wave) {
  const profile = getSurvivalWaveProfile(wave);
  const available = Object.values(survivalEnemyCatalog).filter((entry) => wave >= entry.unlockWave);
  const queue = [];
  let budget = profile.budget;

  while (budget >= 0.95) {
    const options = available.filter((entry) => entry.cost <= budget + 0.6);
    const pool = options.length > 0 ? options : [available[0]];
    const pick = chooseWeighted(pool, (entry) => {
      let weight = 1;
      if (entry.tier === "Small") weight += 0.4;
      if (entry.tier === "Medium" && wave >= 2) weight += 0.45;
      if (entry.tier === "Big" && wave >= 3) weight += 0.5;
      if (entry.tier === "Epic" && wave >= 5) weight += 0.5 + wave * 0.04;
      if (entry.tier === "Legendary" && wave >= 7) weight += 0.38 + wave * 0.03;
      return weight;
    });
    queue.push(pick.key);
    budget -= pick.cost;
    if (queue.length >= 18) {
      break;
    }
  }

  if (wave >= 5 && !queue.includes("stormcaller")) {
    queue.push("stormcaller");
  }
  if (wave >= 8 && !queue.includes("behemoth")) {
    queue.push("behemoth");
  }

  const tiers = new Set(queue.map((key) => survivalEnemyCatalog[key]?.tier).filter(Boolean));
  const label =
    tiers.has("Legendary") ? "Legendary Breakpoint"
      : tiers.has("Epic") ? "Epic Pressure"
        : tiers.has("Big") ? "Bruiser Push"
          : tiers.has("Medium") ? "Mixed Pack"
            : "Scavenger Rush";

  return {
    ...profile,
    queue,
    totalCount: queue.length,
    label,
  };
}

function chooseSurvivalSpawnPoint() {
  const layout = getMapLayout(sandboxModes.survival.key, sandbox.mapKey);
  const spawns = layout.survivalSpawns?.length ? layout.survivalSpawns : [layout.enemySpawn];
  const sorted = [...spawns].sort(
    (left, right) => length(right.x - player.x, right.y - player.y) - length(left.x - player.x, left.y - player.y),
  );
  const candidatePool = sorted.slice(0, Math.min(3, sorted.length));
  return candidatePool[Math.floor(Math.random() * candidatePool.length)] ?? layout.enemySpawn;
}

function createSurvivalEnemy(classKey) {
  const archetype = survivalEnemyCatalog[classKey] ?? survivalEnemyCatalog.scavenger;
  const waveProfile = getSurvivalWaveProfile(survivalState.wave);
  const spawn = chooseSurvivalSpawnPoint();
  const bot = createBot({
    kind: `survival-${classKey}-${survivalState.wave}-${survivalState.totalKills}-${Math.floor(Math.random() * 9999)}`,
    role: "survival",
    x: spawn.x,
    y: spawn.y,
    hp: Math.round(archetype.hp * waveProfile.hpScale),
    radius: archetype.radius,
    color: archetype.color,
    accent: archetype.accent,
    modes: [sandboxModes.survival.key],
  });
  bot.team = "enemy";
  bot.spawnX = spawn.x;
  bot.spawnY = spawn.y;
  bot.survivalClass = classKey;
  bot.survivalProfile = archetype;
  bot.survivalTier = archetype.tier;
  bot.survivalScale = archetype.scale;
  bot.survivalDamageScale = waveProfile.damageScale;
  bot.survivalSpeedScale = waveProfile.speedScale;
  bot.weapon =
    archetype.ai === "caster" ? weapons.staff.key
      : archetype.ai === "ranged" ? weapons.pulse.key
        : weapons.axe.key;
  bot.loadout = { weapon: bot.weapon, modules: [] };
  bot.shootCooldown = 0.35 + Math.random() * 0.4;
  bot.cadence = archetype.attackCooldown;
  return bot;
}

function getAliveSurvivalEnemyCount() {
  return survivalEnemies.filter((bot) => bot.alive).length;
}

function spawnSurvivalEnemyFromQueue() {
  if (survivalState.spawnQueue.length === 0) {
    return false;
  }
  const nextKey = survivalState.spawnQueue.shift();
  const bot = createSurvivalEnemy(nextKey);
  survivalEnemies.push(bot);
  statusLine.textContent = `Wave ${survivalState.wave}: ${bot.survivalProfile.name} entering the arena.`;
  return true;
}

function prepPlayerForSurvival(newRun = false) {
  const buildStats = getBuildStats();
  const desiredHp = newRun ? buildStats.maxHp : clamp(player.hp + buildStats.maxHp * 0.22, 0, buildStats.maxHp);
  _resetPlayer?.({ silent: true });
  clearCombatArtifacts();
  survivalEnemies.length = 0;
  player.hp = desiredHp;
  player.shield = newRun ? 0 : Math.max(player.shield, 16);
  player.shieldTime = newRun ? 0 : 1.4;
}

function seedSurvivalWave(resetProgress = false) {
  const plan = buildSurvivalWavePlan(survivalState.wave);
  survivalState.waveKills = 0;
  survivalState.waveTargetKills = plan.totalCount;
  survivalState.spawnQueue = [...plan.queue];
  survivalState.spawnCooldown = plan.spawnDelay * 0.5;
  survivalState.maxConcurrent = plan.maxConcurrent;
  survivalState.planLabel = plan.label;
  if (resetProgress) {
    survivalState.totalKills = 0;
  }
}

function handleSurvivalEnemyDefeated(defeatedBot) {
  const index = survivalEnemies.indexOf(defeatedBot);
  if (index >= 0) {
    survivalEnemies.splice(index, 1);
  }
  survivalState.totalKills += 1;
  survivalState.waveKills += 1;
  if (
    survivalState.phase === "active" &&
    survivalState.waveKills >= survivalState.waveTargetKills &&
    survivalState.spawnQueue.length === 0 &&
    getAliveSurvivalEnemyCount() === 0
  ) {
    survivalState.phase = "wave_clear";
    survivalState.timer = config.survivalWaveIntermission;
    setBanner(`WAVE ${survivalState.wave}`, "CLEARED", true, "fight");
    statusLine.textContent = `Wave ${survivalState.wave} cleared. Brace for the next push.`;
  }
}

export function startSurvivalRun({ resetProgress = true } = {}) {
  if (resetProgress) {
    survivalState.wave = 1;
  }
  seedSurvivalWave(resetProgress);
  survivalState.phase = "wave_intro";
  survivalState.timer = 1.2;
  survivalState.completed = false;
  prepPlayerForSurvival(resetProgress);
  resetMapState(sandboxModes.survival.key, sandbox.mapKey);
  enemy.alive = false;
  setBanner(`WAVE ${survivalState.wave}`, "PREPARE", true, "countdown");
  statusLine.textContent = `Wave ${survivalState.wave} queued. ${survivalState.waveTargetKills} targets incoming - ${survivalState.planLabel}.`;
}

export function finishSurvivalRun() {
  if (sandbox.mode !== sandboxModes.survival.key || survivalState.phase === "run_end") {
    return;
  }

  const reachedWave = Math.max(1, Math.floor(Number(survivalState.wave) || 1));
  const xpAward = Math.min(5, Math.max(1, Math.floor(reachedWave / 2)));
  const progression = addXp(xpAward, "survival-run");
  void syncServerProgressionAfterSurvival({
    xp: progression.snapshot.xp,
    level: progression.snapshot.level,
    bestSurvivalWave: reachedWave,
  });

  survivalState.phase = "run_end";
  survivalState.timer = 2.4;
  setBanner("SURVIVAL", `DOWN AT WAVE ${survivalState.wave}`, true, "fight");
  statusLine.textContent = progression.leveledUp
    ? `Run over. Wave ${reachedWave} reached, ${survivalState.totalKills} hunters eliminated. +${xpAward} XP earned. Level ${progression.snapshot.level} reached.`
    : `Run over. Wave ${reachedWave} reached, ${survivalState.totalKills} hunters eliminated. +${xpAward} XP earned. XP ${progression.snapshot.xp}.`;
}

export function updateSurvivalMode(dt) {
  if (sandbox.mode !== sandboxModes.survival.key) {
    return;
  }

  if (survivalState.phase === "active") {
    dom.gameShell.classList.add("is-combat-active");
    if (!player.alive) {
      finishSurvivalRun();
      return;
    }

    setBanner("", "", false, "intro");
    survivalState.spawnCooldown = Math.max(0, survivalState.spawnCooldown - dt);
    while (
      survivalState.spawnQueue.length > 0 &&
      survivalState.spawnCooldown <= 0 &&
      getAliveSurvivalEnemyCount() < survivalState.maxConcurrent
    ) {
      spawnSurvivalEnemyFromQueue();
      survivalState.spawnCooldown += getSurvivalWaveProfile(survivalState.wave).spawnDelay;
    }

    if (survivalState.spawnQueue.length === 0 && getAliveSurvivalEnemyCount() === 0) {
      survivalState.phase = "wave_clear";
      survivalState.timer = config.survivalWaveIntermission;
      setBanner(`WAVE ${survivalState.wave}`, "CLEARED", true, "fight");
      statusLine.textContent = `Wave ${survivalState.wave} cleared. Prep for the next escalation.`;
    }
    return;
  }

  survivalState.timer = Math.max(0, survivalState.timer - dt);

  if (survivalState.phase === "wave_intro" && survivalState.timer <= 0) {
    survivalState.phase = "active";
    survivalState.spawnCooldown = 0.1;
    setBanner("", "", false, "intro");
    return;
  }

  if (survivalState.phase === "wave_clear" && survivalState.timer <= 0) {
    survivalState.wave += 1;
    seedSurvivalWave(false);
    survivalState.phase = "wave_intro";
    survivalState.timer = 1.2;
    prepPlayerForSurvival(false);
    resetMapState(sandboxModes.survival.key, sandbox.mapKey);
    setBanner(`WAVE ${survivalState.wave}`, "PREPARE", true, "countdown");
    statusLine.textContent = `Wave ${survivalState.wave} ready. ${survivalState.waveTargetKills} targets incoming - ${survivalState.planLabel}.`;
    return;
  }

  if (survivalState.phase === "run_end" && survivalState.timer <= 0) {
    dom.gameShell.classList.remove("is-combat-active");
    _openPrematch?.("mode");
    _resetPlayer?.({ silent: true });
    _resetBotsForMode?.(sandboxModes.training.key);
    setBanner("", "", false, "intro");
    statusLine.textContent = "Survival run complete. Tune the next build and dive back in.";
  }
}

export function updateSurvivalEnemies(dt) {
  if (sandbox.mode !== sandboxModes.survival.key) {
    return;
  }

  for (let index = survivalEnemies.length - 1; index >= 0; index -= 1) {
    const bot = survivalEnemies[index];
    bot.flash = Math.max(0, bot.flash - dt);
    updateStatusEffects(bot, dt);
    tickEntityMarks(bot, dt);

    if (!bot.alive) {
      handleSurvivalEnemyDefeated(bot);
      continue;
    }

    const profile = bot.survivalProfile ?? survivalEnemyCatalog.scavenger;
    const botStatus = getStatusState(bot);
    const field = getFieldInfluence(bot);
    const zones = getZoneEffectsForEntity(bot, dt);
    bot.shootCooldown = Math.max(0, (bot.shootCooldown ?? 0) - dt);
    bot.shieldTime = Math.max(0, (bot.shieldTime ?? 0) - dt);
    if (bot.shieldTime <= 0) {
      bot.shield = 0;
    }

    const dx = player.x - bot.x;
    const dy = player.y - bot.y;
    const distance = length(dx, dy);
    const forward = normalize(dx, dy);
    const side = { x: -forward.y, y: forward.x };
    let moveX = 0;
    let moveY = 0;

    if (!botStatus.stunned && survivalState.phase === "active") {
      if (profile.ai === "melee") {
        if (distance > (profile.attackRange ?? 32) + player.radius + 6) {
          moveX += forward.x * 1.08;
          moveY += forward.y * 1.08;
        }
        moveX += side.x * Math.sin(performance.now() * 0.002 + index) * 0.34;
        moveY += side.y * Math.sin(performance.now() * 0.002 + index) * 0.34;
      } else {
        const preferredRange = profile.preferredRange ?? 300;
        if (distance > preferredRange + 40) {
          moveX += forward.x * 0.86;
          moveY += forward.y * 0.86;
        } else if (distance < preferredRange - 64) {
          moveX -= forward.x * 0.92;
          moveY -= forward.y * 0.92;
        }
        const orbit = Math.sin(performance.now() * 0.0016 + index * 0.8) >= 0 ? 0.72 : -0.72;
        moveX += side.x * orbit;
        moveY += side.y * orbit;
      }
    }

    const desired = normalize(moveX, moveY);
    const speed = (profile.speed ?? config.enemySpeed) * (bot.survivalSpeedScale ?? 1) * botStatus.speedMultiplier * field.slowMultiplier * zones.slowMultiplier;
    if (!botStatus.stunned) {
      bot.x = clamp(bot.x + desired.x * speed * dt, bot.radius, arena.width - bot.radius);
      bot.y = clamp(bot.y + desired.y * speed * dt, bot.radius, arena.height - bot.radius);
    }

    resolveMapCollision(bot);
    maybeTeleportEntity(bot);
    bot.facing = Math.atan2(player.y - bot.y, player.x - bot.x);

    if (survivalState.phase !== "active" || botStatus.stunned || bot.shootCooldown > 0 || !player.alive) {
      continue;
    }

    if (profile.ai === "melee") {
      if (distance <= (profile.attackRange ?? 30) + player.radius) {
        applyPlayerDamage((profile.damage ?? 12) * (bot.survivalDamageScale ?? 1), `survival-${profile.key}`);
        addImpact(player.x, player.y, profile.accent, profile.tier === "Big" || profile.tier === "Legendary" ? 22 : 16);
        addShake(profile.tier === "Big" || profile.tier === "Legendary" ? 6.2 : 4.4);
        bot.shootCooldown = profile.attackCooldown;
      }
      continue;
    }

    const targetX = player.x + player.velocityX * 0.18;
    const targetY = player.y + player.velocityY * 0.18;
    spawnBullet(
      bot,
      targetX,
      targetY,
      enemyBullets,
      profile.color,
      profile.projectileSpeed ?? 900,
      (profile.damage ?? 10) * (bot.survivalDamageScale ?? 1),
      {
        radius: profile.ai === "caster" ? 5 : 4,
        life: profile.ai === "caster" ? 1.1 : 1,
        trailColor: profile.accent,
        source: `survival-${profile.key}`,
      },
    );
    addImpact(bot.x + Math.cos(bot.facing) * (bot.radius + 4), bot.y + Math.sin(bot.facing) * (bot.radius + 4), profile.accent, 12);
    bot.shootCooldown = profile.attackCooldown;
  }
}
