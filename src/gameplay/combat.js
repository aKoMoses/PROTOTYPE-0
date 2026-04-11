// Core combat: damage, projectiles, status effects, map interactions
import { arena, config, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { statusLine } from "../dom.js";
import { player, playerClone, enemy, trainingBots, bots, moduleState, sandbox, matchState, input,
  bullets, enemyBullets, impacts, tracers, combatTexts, afterimages, slashEffects,
  boltLinkJavelins, enemyBoltLinkJavelins, explosions, orbitalDistorterFields, absorbBursts,
  moduleProjectiles, deployableTraps, deployableTurrets, supportZones, beamEffects,
  mapEffects, mapState, globals, survivalEnemies, survivalState, allyBot, teamEnemies, createTeamDuelEntities } from "../state.js";
import { loadout, botBuildState, trainingToolState } from "../state/app-state.js";
import { clamp, length, normalize, circleIntersectsRect, circleIntersectsCircle, pointToSegmentDistance, approach } from "../utils.js";
import { addImpact, addDamageText, addHealingText, addShake, addAfterimage, addExplosion, addBeamEffect, applyHitReaction, addAbsorbBurst, addSlashEffect } from "./effects.js";
import { getMapLayout, resolveMapCollision, canSeeTarget, maybeTeleportEntity, isEntityInBush, resetMapState, getPylonFallRect } from "../maps.js";
import { getBuildStats, hasImplant, getRuneValue, getPerkDamageMultiplier, getModuleBySlot, getPulseMagazineSize, getActiveDashCooldown, getBotConfiguredLoadout, ensureBotLoadoutFilled, getStatusDuration, hasRuneShard } from "../build/loadout.js";
import { finishDuelRound, finishTeamDuelRound } from "./match.js";
import { resetPlayer } from "./player.js";
import { playDamageCue, playStatusCue, playMapCue, playReloadCue, playModuleCue } from "../audio.js";
import { applyPhantomDamage, resetPhantomClone } from "./phantom.js";
export { getActiveMoveSpeed } from "../build/loadout.js";
export { resize } from "./renderer.js";

const playerWeaponAttackTrackers = new Map();
const swarmMissileRackTrackers = new Map();
let nextSwarmMissileRackId = 1;

export function getAllBots() {
  if (sandbox.mode === sandboxModes.survival.key) {
    return survivalEnemies;
  }
  if (sandbox.mode === sandboxModes.teamDuel.key) {
    return [allyBot, ...teamEnemies].filter(Boolean);
  }
  return bots.filter((bot) => bot.modes.includes(sandbox.mode));
}

export function getPrimaryBot() {
  if (sandbox.mode === sandboxModes.duel.key) return enemy.alive ? enemy : null;
  if (sandbox.mode === sandboxModes.teamDuel.key) return teamEnemies.find((bot) => bot?.alive) ?? teamEnemies[0] ?? null;
  if (sandbox.mode === sandboxModes.survival.key) return survivalEnemies.find((bot) => bot.alive) ?? null;
  return trainingBots.find((bot) => bot.alive) ?? null;
}

export function isCombatLive() {
  if (sandbox.mode === sandboxModes.duel.key) {
    return player.alive && enemy.alive && matchState.phase === "active";
  }
  if (sandbox.mode === sandboxModes.teamDuel.key) {
    const playerTeamAlive = player.alive || Boolean(allyBot?.alive) || (playerClone.active && playerClone.alive);
    const enemyTeamAlive = teamEnemies.some((bot) => bot?.alive);
    return playerTeamAlive && enemyTeamAlive && matchState.phase === "active";
  }
  if (sandbox.mode === sandboxModes.survival.key) {
    return player.alive && survivalState.phase === "active";
  }
  return player.alive;
}

export function getStatusState(entity) {
  let slow = 0;
  let stunned = false;
  let stunTime = 0;

  for (const effect of entity.statusEffects ?? []) {
    if (effect.type === "slow") {
      slow = Math.max(slow, effect.magnitude);
    } else if (effect.type === "stun") {
      stunned = true;
      stunTime = Math.max(stunTime, effect.time);
    }
  }

  return {
    slow,
    speedMultiplier: 1 - slow,
    stunned,
    stunTime,
  };
}

export function getMoveVector() {
  let x = 0;
  let y = 0;

  if (input.keys.has("KeyW")) y -= 1;
  if (input.keys.has("KeyS")) y += 1;
  if (input.keys.has("KeyA")) x -= 1;
  if (input.keys.has("KeyD")) x += 1;

  x += input.moveTouchX;
  y += input.moveTouchY;

  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }

  return normalize(x, y);
}

function getFriendlyTargetKey(target) {
  return target === player ? "player" : target.kind ?? "playerClone";
}

function getFriendlyCombatTargets() {
  const targets = [];
  if (playerClone.active && playerClone.alive) {
    targets.push(playerClone);
  }
  if (allyBot?.alive) {
    targets.push(allyBot);
  }
  if (player.alive) {
    targets.push(player);
  }
  return targets;
}

function getSwarmMissileRackTrackerKey(team, burstId) {
  return `${team}:${burstId}`;
}

function getSwarmMissileRackTracker(projectile) {
  const burstId = projectile.effect?.burstId;
  if (burstId == null) {
    return null;
  }
  return swarmMissileRackTrackers.get(getSwarmMissileRackTrackerKey(projectile.ownerTeam ?? "player", burstId)) ?? null;
}

function releaseSwarmMissileRackProjectile(projectile) {
  if (projectile.effect?.kind !== "swarmMissileRack" || projectile.effect.resolved) {
    return;
  }

  projectile.effect.resolved = true;
  const tracker = getSwarmMissileRackTracker(projectile);
  if (!tracker) {
    return;
  }

  tracker.resolved += 1;
  if (tracker.resolved >= tracker.missileCount) {
    swarmMissileRackTrackers.delete(getSwarmMissileRackTrackerKey(projectile.ownerTeam ?? "player", projectile.effect.burstId));
  }
}

function getProjectileTargetsForTeam(team) {
  if (team === "player") {
    return getAllBots().filter((bot) => bot.alive && (bot.team ?? "enemy") === "enemy");
  }
  return getFriendlyCombatTargets().filter((target) => target.alive && !(target === player && moduleState.ghostDriftModule.time > 0));
}

function applySwarmMissileRackGuidance(projectile, team, dt) {
  if (projectile.effect?.kind !== "swarmMissileRack") {
    return;
  }

  if ((projectile.effect.guideDelay ?? 0) > 0) {
    projectile.effect.guideDelay -= dt;
    return;
  }

  const currentSpeed = length(projectile.vx, projectile.vy);
  if (currentSpeed <= 0) {
    return;
  }

  const currentDirection = normalize(projectile.vx, projectile.vy);
  let bestTarget = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const target of getProjectileTargetsForTeam(team)) {
    if (!canSeeTarget(projectile, target)) {
      continue;
    }
    const toTarget = normalize(target.x - projectile.x, target.y - projectile.y);
    const alignment = currentDirection.x * toTarget.x + currentDirection.y * toTarget.y;
    if (alignment < (projectile.effect.guideDot ?? config.swarmMissileRackGuideDot)) {
      continue;
    }

    const distance = length(target.x - projectile.x, target.y - projectile.y);
    const score = distance - alignment * 90;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = toTarget;
    }
  }

  if (!bestTarget) {
    return;
  }

  const steerRatio = clamp((projectile.effect.guideTurnRate ?? config.swarmMissileRackGuideTurnRate) * dt, 0, 0.28);
  const steered = normalize(
    currentDirection.x * (1 - steerRatio) + bestTarget.x * steerRatio,
    currentDirection.y * (1 - steerRatio) + bestTarget.y * steerRatio,
  );
  projectile.vx = steered.x * currentSpeed;
  projectile.vy = steered.y * currentSpeed;
}

function getProjectileFieldModifier(projectile, team) {
  let speedMultiplier = 1;
  let visualIntensity = 0;

  for (const field of orbitalDistorterFields) {
    if (field.team === team) {
      continue;
    }

    const distance = length(projectile.x - field.x, projectile.y - field.y);
    if (distance > field.radius + projectile.radius) {
      continue;
    }

    const centerWeight = 1 - clamp(distance / Math.max(1, field.radius), 0, 1);
    const edgeSlow = field.projectileSlowEdge ?? 0;
    const coreSlow = field.projectileSlowCore ?? edgeSlow;
    const slowAmount = edgeSlow + (coreSlow - edgeSlow) * centerWeight;
    speedMultiplier = Math.min(speedMultiplier, 1 - slowAmount);
    visualIntensity = Math.max(visualIntensity, slowAmount);
  }

  return { speedMultiplier, visualIntensity };
}

export function applyFieldDragToProjectile(projectile, team, dt) {
  const modifier = getProjectileFieldModifier(projectile, team);
  const currentSpeed = length(projectile.vx, projectile.vy);
  const baseSpeed = projectile.baseSpeed ?? currentSpeed;

  if (baseSpeed > 0 && currentSpeed > 0) {
    const direction = normalize(projectile.vx, projectile.vy);
    const targetSpeed = baseSpeed * modifier.speedMultiplier;
    const adjustedSpeed = approach(currentSpeed, targetSpeed, baseSpeed * 8 * dt);
    projectile.vx = direction.x * adjustedSpeed;
    projectile.vy = direction.y * adjustedSpeed;
  }

  projectile.fieldSlowRatio = approach(projectile.fieldSlowRatio ?? 0, modifier.visualIntensity, 8 * dt);
  return modifier;
}

function doesShieldGuardBlockStatus(type) {
  return type === "slow" || type === "stun" || type === "snare" || type === "shock";
}

function isShieldGuardActive(entity) {
  return (entity.shieldGuardTime ?? 0) > 0 && (entity.shield ?? 0) > 0 && (entity.shieldTime ?? 0) > 0;
}

function isReflexAegisWindowActive() {
  return moduleState.reflexAegis.startupTime <= 0 && moduleState.reflexAegis.activeTime > 0;
}

function isReflexAegisResolving() {
  return moduleState.reflexAegis.resolveLockTime > 0;
}

function getReflexAegisAttackerFacing(attacker) {
  if (typeof attacker?.facing === "number" && Number.isFinite(attacker.facing)) {
    return attacker.facing;
  }
  return Math.atan2(player.y - (attacker?.y ?? player.y), player.x - (attacker?.x ?? player.x));
}

function placePlayerForReflexAegis(attacker) {
  const previousX = player.x;
  const previousY = player.y;
  const facing = getReflexAegisAttackerFacing(attacker);
  const distance = attacker.radius + player.radius + config.reflexAegisTeleportOffset;
  const sideDistance = Math.max(distance - 8, attacker.radius + player.radius + 10);
  const sideX = -Math.sin(facing);
  const sideY = Math.cos(facing);
  const candidates = [
    {
      x: attacker.x - Math.cos(facing) * distance,
      y: attacker.y - Math.sin(facing) * distance,
    },
    {
      x: attacker.x + sideX * sideDistance,
      y: attacker.y + sideY * sideDistance,
    },
    {
      x: attacker.x - sideX * sideDistance,
      y: attacker.y - sideY * sideDistance,
    },
  ];

  let best = null;
  for (const candidate of candidates) {
    player.x = candidate.x;
    player.y = candidate.y;
    resolveMapCollision(player);
    maybeTeleportEntity(player);
    const separation = length(player.x - attacker.x, player.y - attacker.y);
    const minSeparation = player.radius + attacker.radius + 4;
    const displacementPenalty = length(player.x - candidate.x, player.y - candidate.y);
    const score = (separation >= minSeparation ? 0 : 1000) + displacementPenalty;
    if (!best || score < best.score) {
      best = { x: player.x, y: player.y, score };
    }
  }

  player.x = best?.x ?? previousX;
  player.y = best?.y ?? previousY;
  player.facing = Math.atan2(attacker.y - player.y, attacker.x - player.x);
}

export function consumePlayerEmpowerBonus() {
  if (player.reflexAegisHitBonusTime <= 0 || player.reflexAegisHitBonusDamage <= 0) {
    return 0;
  }

  const bonus = player.reflexAegisHitBonusDamage;
  player.reflexAegisHitBonusTime = 0;
  player.reflexAegisHitBonusDamage = 0;
  addImpact(player.x + Math.cos(player.facing) * 20, player.y + Math.sin(player.facing) * 20, "#fff1ac", 18);
  return bonus;
}

export function tryTriggerReflexAegis(attacker, source = "hit") {
  if (!isReflexAegisWindowActive() || isReflexAegisResolving()) {
    return false;
  }
  if (!attacker || (attacker.team ?? "enemy") !== "enemy") {
    return false;
  }

  const previousX = player.x;
  const previousY = player.y;
  moduleState.reflexAegis.startupTime = 0;
  moduleState.reflexAegis.activeTime = 0;
  moduleState.reflexAegis.recoveryTime = 0;
  moduleState.reflexAegis.cooldown = config.reflexAegisCooldown;
  moduleState.reflexAegis.resolveLockTime = 0.1;
  moduleState.reflexAegis.successFlash = 0.24;
  placePlayerForReflexAegis(attacker);
  player.shield = Math.max(player.shield, config.reflexAegisShield);
  player.shieldTime = Math.max(player.shieldTime, config.reflexAegisShieldDuration);
  player.reflexAegisSpeedTime = Math.max(player.reflexAegisSpeedTime, config.reflexAegisMoveDuration);
  player.reflexAegisHitBonusTime = Math.max(player.reflexAegisHitBonusTime, config.reflexAegisHitBonusDuration);
  player.reflexAegisHitBonusDamage = config.reflexAegisHitBonusDamage;
  player.ghostTime = Math.max(player.ghostTime, 0.16);
  player.flash = Math.max(player.flash, 0.14);
  player.velocityX = 0;
  player.velocityY = 0;
  addAfterimage(previousX, previousY, player.facing, player.radius + 6, "#a8f3ff");
  addAfterimage(player.x, player.y, player.facing, player.radius + 5, "#fff0ba");
  addBeamEffect(previousX, previousY, player.x, player.y, "#b8f8ff", 4.5, 0.12);
  addImpact(previousX, previousY, "#9fefff", 20);
  addImpact(player.x, player.y, "#fff0b8", 28);
  addExplosion(player.x, player.y, 34, "#d7f6ff");
  addShake(7.4);
  playModuleCue("reflexAegisSuccess");
  statusLine.textContent = source === "grapple"
    ? "Reflex Aegis denied the catch and opened a counter window."
    : "Reflex Aegis caught the hit. Counter from behind.";
  return true;
}

function finalizePlayerWeaponAttack(attackId) {
  if (attackId == null) {
    return;
  }

  const tracker = playerWeaponAttackTrackers.get(attackId);
  if (!tracker) {
    return;
  }

  if (tracker.hit) {
    player.precisionMomentumStacks = clamp(
      player.precisionMomentumStacks + 1,
      0,
      config.precisionMomentumMaxStacks,
    );
    player.precisionMomentumFlash = 0.45;
  } else {
    player.precisionMomentumStacks = 0;
    player.precisionMomentumFlash = 0;
  }

  playerWeaponAttackTrackers.delete(attackId);
}

export function beginPlayerWeaponAttack(projectileCount = 1) {
  if (!hasImplant("precisionMomentum")) {
    return null;
  }

  const attackId = nextPlayerWeaponAttackId;
  nextPlayerWeaponAttackId += 1;
  playerWeaponAttackTrackers.set(attackId, {
    remaining: Math.max(1, projectileCount),
    hit: false,
  });
  return attackId;
}

export function beginSwarmMissileRackCast(team = "player", missileCount = config.swarmMissileRackMissiles) {
  const burstId = nextSwarmMissileRackId;
  nextSwarmMissileRackId += 1;
  swarmMissileRackTrackers.set(getSwarmMissileRackTrackerKey(team, burstId), {
    missileCount: Math.max(1, missileCount),
    resolved: 0,
    hitsByTarget: new Map(),
    fullHitTargetKey: null,
  });
  return burstId;
}

export function registerPlayerWeaponHit(attackId) {
  if (attackId == null) {
    return;
  }

  const tracker = playerWeaponAttackTrackers.get(attackId);
  if (!tracker) {
    return;
  }
  tracker.hit = true;
}

export function settlePlayerWeaponAttack(attackId, didHit = false) {
  if (attackId == null) {
    return;
  }

  const tracker = playerWeaponAttackTrackers.get(attackId);
  if (!tracker) {
    return;
  }

  if (didHit) {
    tracker.hit = true;
  }
  tracker.remaining = Math.max(0, tracker.remaining - 1);
  if (tracker.remaining <= 0) {
    finalizePlayerWeaponAttack(attackId);
  }
}

export function completePlayerWeaponAttack(attackId, didHit = false) {
  if (attackId == null) {
    return;
  }

  const tracker = playerWeaponAttackTrackers.get(attackId);
  if (!tracker) {
    return;
  }

  tracker.hit = tracker.hit || didHit;
  tracker.remaining = 0;
  finalizePlayerWeaponAttack(attackId);
}

export function resetPlayerWeaponMomentum() {
  playerWeaponAttackTrackers.clear();
  player.precisionMomentumStacks = 0;
  player.precisionMomentumFlash = 0;
}

function triggerSupportRuneControl(type) {
  if (type !== "slow" && type !== "stun") {
    return;
  }

  const supportCore = getRuneValue("support", "primary");
  const supportShard = hasRuneShard("support");
  if (supportCore <= 0 && !supportShard) {
    return;
  }

  const shieldAmount = supportCore * 4 + (supportShard && player.mainRuneCooldown <= 0 ? 8 : 0);
  const hasteWindow = 0.4 + supportCore * 0.08 + (supportShard && player.mainRuneCooldown <= 0 ? 0.55 : 0);

  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, hasteWindow);
  player.hasteTime = Math.max(player.hasteTime, 0.35 + supportCore * 0.1 + (supportShard && player.mainRuneCooldown <= 0 ? 0.75 : 0));
  if (shieldAmount > 0) {
    player.shield = Math.max(player.shield, shieldAmount);
    player.shieldTime = Math.max(player.shieldTime, 1);
  }
  if (supportShard && player.mainRuneCooldown <= 0) {
    player.mainRuneCooldown = 3.4;
    addImpact(player.x, player.y, "#b9ffe0", 22);
  }
}

function getEntityFieldModifier(entity) {
  let damageReduction = getZoneEffectsForEntity(entity).damageReduction;

  for (const field of orbitalDistorterFields) {
    if (field.anchor !== "player" || field.team !== "player") {
      continue;
    }

    if (length(entity.x - field.x, entity.y - field.y) <= field.radius) {
      damageReduction = Math.max(damageReduction, field.damageReduction);
    }
  }

  return { damageReduction };
}

export function spawnBullet(owner, targetX, targetY, collection, color, speed, damage, options = {}) {
  const direction = normalize(targetX - owner.x, targetY - owner.y);
  const startX = owner.x + direction.x * (owner.radius + 8);
  const startY = owner.y + direction.y * (owner.radius + 8);
  collection.push({
    x: startX,
    y: startY,
    vx: direction.x * speed,
    vy: direction.y * speed,
    baseSpeed: speed,
    radius: options.radius ?? 4,
    damage,
    life: options.life ?? config.bulletLife,
    color,
    trailColor: options.trailColor ?? color,
    piercing: options.piercing ?? false,
    hitTargets: new Set(),
    effect: options.effect ?? null,
    source: options.source ?? "weapon",
    ownerTeam: owner.team ?? "player",
    ownerKind: owner.kind ?? (owner === player ? "player" : "enemy"),
    ownerRef: owner ?? null,
    originX: startX,
    originY: startY,
    chargeRatio: options.chargeRatio ?? 0,
    minDamage: options.minDamage ?? damage,
    maxDamage: options.maxDamage ?? damage,
    travelBonusRange: options.travelBonusRange ?? 1,
    attackId: options.attackId ?? null,
    detonateX: options.detonateX ?? null,
    detonateY: options.detonateY ?? null,
    explodeOnDestination: options.explodeOnDestination ?? false,
    fieldSlowRatio: 0,
  });

  tracers.push({
    x0: startX - direction.x * 18,
    y0: startY - direction.y * 18,
    x1: startX + direction.x * 34,
    y1: startY + direction.y * 34,
    color: options.trailColor ?? color,
    life: 0.05,
    maxLife: 0.05,
  });
}


export function addEnergy(amount) {
  return amount;
}

export function getPlayerSpawn(mode = sandbox.mode) {
  const layout = getMapLayout(mode, sandbox.mapKey);
  return mode === sandboxModes.training.key
    ? { x: layout.trainingSpawn?.x ?? layout.playerSpawn.x, y: layout.trainingSpawn?.y ?? layout.playerSpawn.y }
    : { x: layout.playerSpawn.x, y: layout.playerSpawn.y };
}

export function collapsePylon(pylon, sourceX, sourceY, team = "player") {
  if (!pylon.alive) {
    return;
  }
  pylon.alive = false;
  pylon.falling = false;
  const fallDirection = normalize(pylon.x - sourceX, pylon.y - sourceY);
  pylon.fallAngle = Math.atan2(fallDirection.y, fallDirection.x);
  pylon.fallen = true;
  pylon.fallenRect = getPylonFallRect(pylon);
  addExplosion(pylon.x, pylon.y, 96, pylon.color);
  addImpact(pylon.x, pylon.y, "#fff0d2", 32);
  addShake(10.4);
  playMapCue("pylon-collapse");

  const endX = pylon.x + Math.cos(pylon.fallAngle) * pylon.fallLength;
  const endY = pylon.y + Math.sin(pylon.fallAngle) * pylon.fallLength;
  const fallVector = normalize(Math.cos(pylon.fallAngle), Math.sin(pylon.fallAngle));
  const targets = team === "player" ? getAllBots() : getFriendlyCombatTargets();
  for (const target of targets) {
    if (!target.alive) {
      continue;
    }
    const distanceToPath = pointToSegmentDistance(target.x, target.y, pylon.x, pylon.y, endX, endY);
    if (distanceToPath > target.radius + 22) {
      continue;
    }
    if (target.team === "enemy") {
      damageBot(target, 34, pylon.color, target.x, target.y, 0);
      applyStatusEffect(target, "stun", getStatusDuration(0.8), 1);
    } else if (target === playerClone) {
      applyPhantomDamage(22, "pylon");
      applyStatusEffect(target, "stun", getStatusDuration(0.4), 1);
    } else {
      const defeatedByPylon = applyPlayerDamage(22, "pylon");
      applyStatusEffect(target, "stun", getStatusDuration(0.55), 1);
      if (defeatedByPylon && !player.alive) {
        break;
      }
    }
    target.x += fallVector.x * 42;
    target.y += fallVector.y * 42;
    resolveMapCollision(target);
    addImpact(target.x, target.y, "#fff0d2", 28);
  }
}

export function damagePylon(pylon, amount, sourceX, sourceY, team = "player") {
  if (!pylon.alive) {
    return false;
  }
  pylon.hp = Math.max(0, pylon.hp - amount);
  pylon.damageFlash = 0.24;
  pylon.wobbleTime = 0.42;
  addImpact(pylon.x, pylon.y, pylon.color, 18);
  playMapCue("pylon-hit");
  if (pylon.hp <= 0) {
    collapsePylon(pylon, sourceX, sourceY, team);
  }
  return true;
}

export function hitMapWithProjectile(projectile, team = "player") {
  for (const obstacle of mapState.obstacles) {
    if (circleIntersectsRect(projectile.x, projectile.y, projectile.radius, obstacle)) {
      addImpact(projectile.x, projectile.y, team === "player" ? "#9ce8ff" : "#ffb294", 16);
      return true;
    }
  }

  for (const pylon of mapState.pylons) {
    if (pylon.alive && circleIntersectsCircle(projectile.x, projectile.y, projectile.radius, pylon.x, pylon.y, pylon.radius)) {
      if (team === "player") {
        registerPlayerWeaponHit(projectile.attackId);
      }
      damagePylon(pylon, projectile.damage * 0.6, projectile.x, projectile.y, team);
      return true;
    }
    if (pylon.fallenRect && circleIntersectsRect(projectile.x, projectile.y, projectile.radius, pylon.fallenRect)) {
      addImpact(projectile.x, projectile.y, pylon.color, 14);
      return true;
    }
  }

  return false;
}

export function damagePylonsAlongLine(startX, startY, endX, endY, damage, team = "player") {
  let hitAny = false;
  for (const pylon of mapState.pylons) {
    if (!pylon.alive) {
      continue;
    }
    const distanceToPath = pointToSegmentDistance(pylon.x, pylon.y, startX, startY, endX, endY);
    if (distanceToPath <= pylon.radius + 12) {
      damagePylon(pylon, damage, startX, startY, team);
      hitAny = true;
    }
  }
  return hitAny;
}

export function applyStatusEffect(entity, type, duration, magnitude = 0) {
  if (!entity.statusEffects) {
    entity.statusEffects = [];
  }

  if (entity.team === "enemy" && duration > 0) {
    const tenacity = entity.tenacity || 0;
    if (tenacity > 0) {
      duration = duration * Math.max(0, 1 - tenacity / 100);
    }
  }

  if (entity === player && (moduleState.ghostDriftModule.time > 0 || isReflexAegisResolving())) {
    return null;
  }

  if (doesShieldGuardBlockStatus(type) && isShieldGuardActive(entity)) {
    if (entity.x !== undefined && entity.y !== undefined) {
      addAbsorbBurst(entity.x, entity.y, 16, entity === player ? "#a8ddff" : "#ffd0c2");
      addImpact(entity.x, entity.y, entity === player ? "#b6e5ff" : "#ffd4c6", 16);
    }
    return null;
  }

  const existing = entity.statusEffects.find((effect) => effect.type === type);

  if (existing) {
    existing.time = Math.max(existing.time, duration);
    existing.magnitude = Math.max(existing.magnitude, magnitude);
    if (type === "burn") {
      existing.tickTimer = Math.min(existing.tickTimer ?? config.burnTickInterval, config.burnTickInterval);
    }
    if (entity.x !== undefined && entity.y !== undefined) {
      addImpact(entity.x, entity.y, type === "stun" ? "#ffd37c" : "#8fd6ff", type === "stun" ? 20 : 16);
    }
    playStatusCue(type, entity === player ? "player" : "enemy");
    if ((entity.team ?? "enemy") === "enemy") {
      triggerSupportRuneControl(type);
    }
    return existing;
  }

  const effect = {
    type,
    time: duration,
    magnitude,
    tickTimer: type === "burn" ? config.burnTickInterval : 0,
  };
  entity.statusEffects.push(effect);
  if (entity.x !== undefined && entity.y !== undefined) {
    addImpact(entity.x, entity.y, type === "stun" ? "#ffd37c" : "#8fd6ff", type === "stun" ? 24 : 18);
  }
  playStatusCue(type, entity === player ? "player" : "enemy");
  if ((entity.team ?? "enemy") === "enemy") {
    triggerSupportRuneControl(type);
  }
  return effect;
}

function getProjectileTravelRatio(projectile, impactX = projectile.x, impactY = projectile.y) {
  if (projectile.originX === undefined || projectile.originY === undefined) {
    return 0;
  }

  return clamp(
    length(impactX - projectile.originX, impactY - projectile.originY) / Math.max(1, projectile.travelBonusRange ?? 1),
    0,
    1,
  );
}

function getProjectileImpactStrength(projectile, impactX = projectile.x, impactY = projectile.y) {
  if (projectile.source !== "rail-sniper") {
    return 0;
  }

  const chargeRatio = clamp(projectile.chargeRatio ?? 0, 0, 1);
  const travelRatio = getProjectileTravelRatio(projectile, impactX, impactY);
  return clamp(chargeRatio * 0.45 + travelRatio * 0.55, 0, 1);
}

function getProjectileImpactDamage(projectile, impactX = projectile.x, impactY = projectile.y) {
  if (projectile.source !== "rail-sniper") {
    return projectile.damage;
  }

  const strength = getProjectileImpactStrength(projectile, impactX, impactY);
  return projectile.minDamage + (projectile.maxDamage - projectile.minDamage) * strength;
}

export function updateStatusEffects(entity, dt) {
  if (!entity.statusEffects) {
    entity.statusEffects = [];
    return;
  }

  for (let index = entity.statusEffects.length - 1; index >= 0; index -= 1) {
    const effect = entity.statusEffects[index];
    effect.time -= dt;

    if (effect.type === "burn" && effect.time > 0) {
      effect.tickTimer = (effect.tickTimer ?? config.burnTickInterval) - dt;
      while (effect.tickTimer <= 0 && effect.time > 0) {
        effect.tickTimer += config.burnTickInterval;
        const burnDamage = config.burnTickDamage * Math.max(0.7, effect.magnitude || 1);
        if (entity === playerClone) {
          applyPhantomDamage(burnDamage, "burn");
        } else if ((entity.team ?? "enemy") === "enemy") {
          damageBot(entity, burnDamage, "#ffb06e", entity.x, entity.y, 0);
        } else {
          applyPlayerDamage(burnDamage, "burn");
        }
        if (entity.x !== undefined && entity.y !== undefined) {
          addImpact(entity.x, entity.y, "#ffb06e", 12);
        }
      }
    }

    if (effect.time <= 0) {
      entity.statusEffects.splice(index, 1);
    }
  }
}

export function clearStatusEffects(entity) {
  entity.statusEffects = [];
}

export function clearCombatArtifacts() {
  resetPlayerWeaponMomentum();
  swarmMissileRackTrackers.clear();
  bullets.length = 0;
  enemyBullets.length = 0;
  impacts.length = 0;
  tracers.length = 0;
  combatTexts.length = 0;
  afterimages.length = 0;
  slashEffects.length = 0;
  boltLinkJavelins.length = 0;
  enemyBoltLinkJavelins.length = 0;
  explosions.length = 0;
  orbitalDistorterFields.length = 0;
  absorbBursts.length = 0;
  moduleProjectiles.length = 0;
  deployableTraps.length = 0;
  deployableTurrets.length = 0;
  supportZones.length = 0;
  beamEffects.length = 0;
  mapEffects.length = 0;
  resetPhantomClone({ silent: true });
}

export function getPlayerFieldModifier() {
  return getEntityFieldModifier(player);
}

export function getFieldInfluence(target) {
  let slowMultiplier = 1;
  let disrupted = false;
  const targetTeam = target.team ?? "enemy";

  for (const field of orbitalDistorterFields) {
    if (!target.alive) {
      break;
    }

    if (field.team === targetTeam) {
      continue;
    }

    if (length(target.x - field.x, target.y - field.y) <= field.radius + target.radius) {
      slowMultiplier = Math.min(slowMultiplier, 1 - field.slow);

      if (field.disruption > 0 && !field.touchedTargets.has(target.kind)) {
        field.touchedTargets.add(target.kind);
        disrupted = true;
      }
    }
  }

  return { slowMultiplier, disrupted };
}

export function updateSupportZones(dt) {
  for (let index = supportZones.length - 1; index >= 0; index -= 1) {
    const zone = supportZones[index];
    zone.life -= dt;
    if (zone.life <= 0) {
      supportZones.splice(index, 1);
      continue;
    }

    if (zone.type !== "gravity") {
      continue;
    }

    const hostileTargets = [
      ...getAllBots(),
      ...(player.alive ? [player] : []),
      ...(playerClone.active && playerClone.alive ? [playerClone] : []),
    ];

    for (const entity of hostileTargets) {
      if (!entity?.alive) {
        continue;
      }

      const entityTeam = entity.team ?? "player";
      if (entityTeam === zone.team) {
        continue;
      }
      if (entity === player && moduleState.phaseShift.time > 0) {
        continue;
      }

      const offsetX = zone.x - entity.x;
      const offsetY = zone.y - entity.y;
      const distance = length(offsetX, offsetY);
      if (distance <= 0 || distance > zone.radius + entity.radius) {
        continue;
      }

      const direction = normalize(offsetX, offsetY);
      const intensity = 0.35 + (1 - clamp(distance / Math.max(1, zone.radius), 0, 1)) * 0.65;
      const pullStrength = zone.pullStrength ?? config.voidCoreSingularityPullStrength;
      const pullStep = pullStrength * intensity * dt;
      entity.x += direction.x * pullStep;
      entity.y += direction.y * pullStep;

      if ("velocityX" in entity) {
        entity.velocityX = approach(entity.velocityX ?? 0, direction.x * pullStrength * 0.5, 960 * dt);
        entity.velocityY = approach(entity.velocityY ?? 0, direction.y * pullStrength * 0.5, 960 * dt);
      }

      resolveMapCollision(entity);
      maybeTeleportEntity(entity);
    }
  }
}

export function getZoneEffectsForEntity(entity, dt = 0) {
  let slowMultiplier = 1;
  let damageReduction = 0;

  for (const zone of supportZones) {
    const inside = length(entity.x - zone.x, entity.y - zone.y) <= zone.radius + entity.radius;
    if (zone.type === "lockdown" && !inside) {
      slowMultiplier = Math.min(slowMultiplier, 0.76);
    }
    if (
      zone.type === "gravity" &&
      inside &&
      zone.team !== (entity.team ?? "player") &&
      !(entity === player && moduleState.phaseShift.time > 0)
    ) {
      slowMultiplier = Math.min(slowMultiplier, 1 - (zone.slow ?? 0.34));
    }
    if (zone.type === "mitigation" && inside && zone.team === (entity.team ?? "player")) {
      damageReduction = Math.max(damageReduction, zone.damageReduction ?? 0);
    }
    if (zone.type === "regen" && inside && zone.team === (entity.team ?? "player")) {
      healEntity(entity, (zone.healPerSecond ?? 0) * dt);
    }
  }

  return { slowMultiplier, damageReduction };
}

export function spawnEnemyOrbitalDistorterField() {
  orbitalDistorterFields.push({
    x: enemy.x,
    y: enemy.y,
    radius: Math.max(96, config.fieldTapRadius * 0.9),
    duration: config.fieldTapDuration,
    life: config.fieldTapDuration,
    slow: config.fieldTapSlow * 0.9,
    damageReduction: 0,
    anchor: "enemy",
    color: "#ffb0a2",
    glow: "#ffd1c8",
    disruption: 0,
    projectileSlowEdge: config.fieldTapProjectileSlowEdge * 0.95,
    projectileSlowCore: config.fieldTapProjectileSlowCore * 0.95,
    team: "enemy",
    touchedTargets: new Set(),
  });
  enemy.orbitalDistorterCooldown = 5.2;
  addImpact(enemy.x, enemy.y, "#ffd1c8", 24);
}


export function respawnBot(bot) {
  if (bot.role === "hunter") {
    applyBotLoadout(bot, getActiveBotLoadout());
  }
  bot.x = bot.spawnX;
  bot.y = bot.spawnY;
  bot.hp = bot.maxHp;
  bot.alive = bot.modes.includes(sandbox.mode);
  bot.flash = 0;
  bot.shootCooldown = bot.role === "hunter" ? 0.6 : 999;
  bot.dodgeCooldown = 0.8;
  bot.dodgeTime = 0;
  bot.dodgeVectorX = 0;
  bot.dodgeVectorY = 0;
  bot.burstShots = 0;
  bot.shotSpread = 0;
  bot.reloadTime = 0;
  bot.ammo = getPulseMagazineSize();
  bot.shield = 0;
  bot.shieldTime = 0;
  bot.shieldGuardTime = 0;
  bot.shieldBreakRefundReady = false;
  bot.hasteTime = 0;
  bot.comboStep = 0;
  bot.comboTimer = 0;
  bot.meleeWindupTime = 0;
  bot.pendingMeleeStrike = null;
  bot.attackCommitTime = 0;
  bot.attackCommitX = 0;
  bot.attackCommitY = 0;
  bot.attackCommitSpeed = 0;
  bot.activeMeleeStrike = null;
  bot.injectorMarks = 0;
  bot.injectorMarkTime = 0;
  bot.moduleCooldowns.grapple = 0;
  bot.moduleCooldowns.shield = 0;
  bot.moduleCooldowns.booster = 0;
  bot.moduleCooldowns.emp = 0;
  bot.moduleCooldowns.backstep = 0;
  bot.moduleCooldowns.chainLightning = 0;
  bot.moduleCooldowns.blink = 0;
  bot.moduleCooldowns.phaseDash = 0;
  bot.moduleCooldowns.swarmMissileRack = 0;
  bot.moduleCooldowns.railShot = 0;
  bot.moduleCooldowns.voidCoreSingularity = 0;
  bot.moduleCooldowns.phaseShift = 0;
  bot.moduleCooldowns.hologramDecoy = 0;
  bot.moduleCooldowns.overdriveServos = 0;
  clearStatusEffects(bot);
}


export function damageBot(bot, damage, color, impactX, impactY, energyGain) {
  if (!bot.alive) {
    return false;
  }

  const hadShieldGuard = (bot.shieldGuardTime ?? 0) > 0 && bot.shield > 0;
  if (bot.shield > 0) {
    const absorbed = Math.min(bot.shield, damage);
    bot.shield -= absorbed;
    damage -= absorbed;
    addImpact(bot.x, bot.y, "#a6d9ff", 18);
    playDamageCue("enemy", absorbed, "shield", true);
    if (hadShieldGuard && bot.shield <= 0) {
      bot.shieldGuardTime = 0;
      if (bot.shieldBreakRefundReady) {
        bot.shieldBreakRefundReady = false;
        bot.moduleCooldowns.shield = Math.max(0, bot.moduleCooldowns.shield * (1 - config.shieldBreakRefund));
        addImpact(bot.x, bot.y, "#d9efff", 16);
      }
    }
  }

  if (damage <= 0) {
    return false;
  }

  const armor = bot.armor || 0;
  if (armor > 0) {
    const damageMultiplier = 100 / (100 + armor);
    damage = damage * damageMultiplier;
  }

  bot.hp = Math.max(0, bot.hp - damage);
  bot.flash = 0.18;
  const heavyHit = damage >= 60;
  applyHitReaction(bot, impactX ?? bot.x, impactY ?? bot.y, heavyHit ? 1.2 : 0.7);
  addImpact(impactX, impactY, color, heavyHit ? 30 : 24);
  addImpact(bot.x, bot.y, heavyHit ? "#fff4d3" : "#e9fbff", heavyHit ? 22 : 12);
  addShake(heavyHit ? 5.8 : 2.8);
  playDamageCue("enemy", damage, "hit", false);
  addDamageText(bot.x, bot.y - bot.radius - 8, damage, { heavy: heavyHit, color: heavyHit ? "#ff9b73" : "#ff7269" });

  if (energyGain > 0) {
    addEnergy(energyGain);
  }

  const buildStats = getBuildStats();
  if (buildStats.omnivamp > 0) {
    const healAmount = damage * buildStats.omnivamp;
    player.hp = clamp(player.hp + healAmount, 0, buildStats.maxHp);
    if (healAmount > 0.5) {
      addHealingText(player.x, player.y - player.radius - 10, healAmount);
    }
  }

  if (hasRuneShard("attack") && bot.hp > 0 && bot.hp / bot.maxHp <= 0.35 && player.mainRuneCooldown <= 0) {
    player.mainRuneCooldown = 3.6;
    player.hasteTime = Math.max(player.hasteTime, 1.2);
    player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.9);
    addImpact(player.x, player.y, "#ffd78b", 24);
  }

  if (bot.hp <= 0) {
    bot.alive = false;
    addImpact(bot.x, bot.y, "#b6fff4", 42);
    statusLine.textContent =
      bot.role === "training"
        ? "Training bot destroyed. Press R to reset bots."
        : bot.role === "survival"
          ? "Survival target destroyed. Keep clearing the wave."
          : "Enemy bot destroyed. Press R to reset bots.";

    if (sandbox.mode === sandboxModes.duel.key && bot.role === "hunter") {
      finishDuelRound("player");
    } else if (sandbox.mode === sandboxModes.teamDuel.key && (bot.team ?? "enemy") === "enemy" && teamEnemies.every((candidate) => !candidate?.alive)) {
      finishTeamDuelRound("player");
    }
  }

  return true;
}


export function startPulseReload(actor = player, silent = false) {
  if (actor.reloadTime > 0 || actor.weapon !== weapons.pulse.key) {
    return false;
  }

  actor.reloadTime = config.pulseReloadTime;
  actor.fireCooldown = Math.max(actor.fireCooldown, config.pulseReloadTime);
  playReloadCue(actor === player ? "player" : "enemy");
  if (!silent && actor === player) {
    statusLine.textContent = "Pulse Rifle reloading. Reposition before the next lane.";
  }
  return true;
}

export function finalizePulseReload(actor = player) {
  actor.reloadTime = 0;
  actor.ammo = getPulseMagazineSize();
}


export function applyInjectorMark(target, duration, maxStacks = 3) {
  target.injectorMarkTime = Math.max(target.injectorMarkTime ?? 0, duration);
  target.injectorMarks = clamp((target.injectorMarks ?? 0) + 1, 1, maxStacks);
}

export function tickEntityMarks(entity, dt) {
  entity.injectorMarkTime = Math.max(0, (entity.injectorMarkTime ?? 0) - dt);
  if ((entity.injectorMarkTime ?? 0) <= 0) {
    entity.injectorMarks = 0;
  }
  entity.combatTimer = Math.max(0, (entity.combatTimer ?? 0) - dt);
}

export function healEntity(entity, amount) {
  if (amount <= 0) {
    return;
  }
  if (entity === player) {
    player.hp = clamp(player.hp + amount, 0, getBuildStats().maxHp);
    addHealingText(player.x, player.y - player.radius - 10, amount);
    return;
  }
  entity.hp = clamp(entity.hp + amount, 0, entity.maxHp);
  addHealingText(entity.x, entity.y - entity.radius - 10, amount);
}

function resolveSwarmMissileRackImpact(projectile, target, team) {
  if (projectile.effect?.kind !== "swarmMissileRack") {
    return {
      damage: projectile.damage,
      fullHit: false,
    };
  }

  const tracker = getSwarmMissileRackTracker(projectile);
  if (!tracker) {
    return {
      damage: projectile.damage,
      fullHit: false,
    };
  }

  const targetKey =
    team === "player"
      ? target.kind
      : target === playerClone
        ? "playerClone"
        : "player";
  const hitIndex = (tracker.hitsByTarget.get(targetKey) ?? 0) + 1;
  tracker.hitsByTarget.set(targetKey, hitIndex);

  const damage = projectile.damage * Math.pow(config.swarmMissileRackDamageGrowth, hitIndex - 1);
  const fullHit = hitIndex >= tracker.missileCount && tracker.fullHitTargetKey !== targetKey;
  if (fullHit) {
    tracker.fullHitTargetKey = targetKey;
  }

  return { damage, fullHit };
}

export function applyProjectileEffectToBot(bot, projectile) {
  const effect = projectile.effect;
  if (!effect) {
    return;
  }

  if (effect.kind === "staff") {
    healEntity(player, effect.heal ?? 0);
    addImpact(player.x, player.y, "#b8ffd8", 16);
  } else if (effect.kind === "injector") {
    applyInjectorMark(bot, effect.markDuration ?? 4, effect.markMax ?? 3);
    if ((bot.injectorMarks ?? 0) >= 3) {
      bot.injectorMarks = 0;
      bot.injectorMarkTime = 0;
      healEntity(player, effect.healOnConsume ?? 10);
      addEnergy(10);
      addImpact(bot.x, bot.y, "#f0b8ff", 24);
    }
  } else if (effect.kind === "rail") {
    const strength = getProjectileImpactStrength(projectile, bot.x, bot.y);
    const slow = (effect.bonusSlow ?? 0.12) + ((effect.maxSlow ?? effect.bonusSlow ?? 0.12) - (effect.bonusSlow ?? 0.12)) * strength;
    const duration = (effect.bonusSlowDuration ?? 0.4) + ((effect.maxSlowDuration ?? effect.bonusSlowDuration ?? 0.4) - (effect.bonusSlowDuration ?? 0.4)) * strength;
    applyStatusEffect(bot, "slow", getStatusDuration(duration), slow);
    if (strength >= 0.72) {
      applyStatusEffect(bot, "slow", getStatusDuration(effect.snareDuration ?? 0.35), effect.snareMagnitude ?? 0.82);
    }
  } else if (effect.kind === "swarmMissileRack") {
    if (effect.fullHit) {
      applyStatusEffect(bot, "burn", getStatusDuration(config.swarmMissileRackBurnDuration), 1);
      addImpact(bot.x, bot.y, "#ffba72", 20);
      addExplosion(bot.x, bot.y, 36, "#ffbf83");
    }
  }
}

export function applyProjectileEffectToPlayer(projectile, target = player) {
  const effect = projectile.effect;
  if (!effect) {
    return;
  }

  const projectileOwner = projectile.ownerRef ?? enemy;

  if (effect.kind === "staff") {
    if (projectileOwner?.alive) {
      healEntity(projectileOwner, effect.heal ?? 0);
      addImpact(projectileOwner.x, projectileOwner.y, "#b8ffd8", 16);
    }
  } else if (effect.kind === "injector") {
    applyInjectorMark(target, effect.markDuration ?? 4, effect.markMax ?? 3);
    if ((target.injectorMarks ?? 0) >= 3) {
      target.injectorMarks = 0;
      target.injectorMarkTime = 0;
      if (projectileOwner?.alive) {
        healEntity(projectileOwner, effect.healOnConsume ?? 10);
      }
      addImpact(target.x, target.y, "#f0b8ff", 20);
    }
  } else if (effect.kind === "rail") {
    const strength = getProjectileImpactStrength(projectile, target.x, target.y);
    const slow = (effect.bonusSlow ?? 0.12) + ((effect.maxSlow ?? effect.bonusSlow ?? 0.12) - (effect.bonusSlow ?? 0.12)) * strength;
    const duration = (effect.bonusSlowDuration ?? 0.4) + ((effect.maxSlowDuration ?? effect.bonusSlowDuration ?? 0.4) - (effect.bonusSlowDuration ?? 0.4)) * strength;
    applyStatusEffect(target, "slow", getStatusDuration(duration), slow);
    if (strength >= 0.72) {
      applyStatusEffect(target, "slow", getStatusDuration(effect.snareDuration ?? 0.35), effect.snareMagnitude ?? 0.82);
    }
  } else if (effect.kind === "swarmMissileRack") {
    if (effect.fullHit) {
      applyStatusEffect(target, "burn", getStatusDuration(config.swarmMissileRackBurnDuration), 1);
      addImpact(target.x, target.y, "#ffba72", 18);
      addExplosion(target.x, target.y, 30, "#ffbf83");
    }
  }
}

function triggerCannonExplosion(projectile, impactX, impactY, team = "player", directTarget = null) {
  const effect = projectile.effect;
  if (effect?.kind !== "cannon") {
    return;
  }

  const explosionColor = team === "player"
    ? projectile.source?.includes("charged")
      ? "#d9f6ff"
      : "#ffd7b8"
    : projectile.source?.includes("charged")
      ? "#d8f1ff"
      : "#ffc2a2";
  addExplosion(impactX, impactY, effect.splashRadius ?? 72, explosionColor);
  addImpact(impactX, impactY, effect.impactColor ?? (projectile.source?.includes("charged") ? "#effcff" : "#fff0d8"), 26);
  addShake(projectile.source?.includes("charged") ? 6.2 : 7);
  if ((effect.pushMax ?? 0) > 0) {
    addExplosion(impactX, impactY, Math.max(42, (effect.splashRadius ?? 72) * 0.66), "#fff6d8");
  }

  if (team === "player") {
    for (const bot of getAllBots()) {
      if (!bot.alive) {
        continue;
      }
      const isDirectTarget = bot === directTarget;
      const distance = length(bot.x - impactX, bot.y - impactY);
      if (!isDirectTarget && distance > (effect.splashRadius ?? 72) + bot.radius) {
        continue;
      }

      registerPlayerWeaponHit(projectile.attackId);
      const bonusDamage = consumePlayerEmpowerBonus();
      damageBot(
        bot,
        (effect.splashDamage ?? 0) * (isDirectTarget ? effect.directDamageScale ?? 1 : 1) + bonusDamage,
        explosionColor,
        bot.x,
        bot.y,
        0,
      );
      if (effect.statusType === "burnslow") {
        applyStatusEffect(bot, "burn", getStatusDuration(effect.statusDuration ?? 1.2), 1);
        applyStatusEffect(bot, "slow", getStatusDuration(effect.statusDuration ?? 1.2), effect.statusMagnitude ?? 0.2);
      } else if (effect.statusType === "burn") {
        applyStatusEffect(bot, "burn", getStatusDuration(effect.statusDuration ?? 1.2), 1);
        if ((effect.statusMagnitude ?? 0) > 0) {
          applyStatusEffect(bot, "slow", getStatusDuration(effect.statusDuration ?? 1.2), effect.statusMagnitude ?? 0.2);
        }
      } else {
        applyStatusEffect(
          bot,
          effect.statusType ?? "slow",
          getStatusDuration(effect.statusDuration ?? 0.6),
          effect.statusType === "stun" ? 1 : effect.statusMagnitude ?? 0.2,
        );
      }
      if ((effect.pushMax ?? 0) > 0) {
        const intensity = 1 - clamp(distance / Math.max(1, effect.splashRadius ?? 72), 0, 1);
        const pushDistance = (effect.pushMin ?? 0) + ((effect.pushMax ?? 0) - (effect.pushMin ?? 0)) * intensity;
        const pushDirection = distance > 0 ? normalize(bot.x - impactX, bot.y - impactY) : normalize(bot.x - player.x, bot.y - player.y);
        bot.x += pushDirection.x * pushDistance;
        bot.y += pushDirection.y * pushDistance;
        bot.velocityX = (bot.velocityX ?? 0) + pushDirection.x * pushDistance * 5.2;
        bot.velocityY = (bot.velocityY ?? 0) + pushDirection.y * pushDistance * 5.2;
        resolveMapCollision(bot);
        maybeTeleportEntity(bot);
      }
      addImpact(bot.x, bot.y, projectile.source?.includes("charged") ? "#e8fbff" : "#fff0cf", isDirectTarget ? 20 : 16);
    }
    return;
  }

  for (const target of getFriendlyCombatTargets()) {
    const isDirectTarget = target === directTarget;
    const distance = length(target.x - impactX, target.y - impactY);
    if (!isDirectTarget && distance > (effect.splashRadius ?? 72) + target.radius) {
      continue;
    }

    if (target === playerClone) {
      applyPhantomDamage((effect.splashDamage ?? 0) * (isDirectTarget ? effect.directDamageScale ?? 1 : 1), "cannon");
      if (effect.statusType === "burnslow") {
        applyStatusEffect(target, "burn", getStatusDuration(effect.statusDuration ?? 1.2), 1);
        applyStatusEffect(target, "slow", getStatusDuration(effect.statusDuration ?? 1.2), effect.statusMagnitude ?? 0.2);
      } else if (effect.statusType === "burn") {
        applyStatusEffect(target, "burn", getStatusDuration(effect.statusDuration ?? 1.2), 1);
        if ((effect.statusMagnitude ?? 0) > 0) {
          applyStatusEffect(target, "slow", getStatusDuration(effect.statusDuration ?? 1.2), effect.statusMagnitude ?? 0.2);
        }
      } else {
        applyStatusEffect(
          target,
          effect.statusType ?? "slow",
          getStatusDuration(effect.statusDuration ?? 0.6),
          effect.statusType === "stun" ? 1 : effect.statusMagnitude ?? 0.2,
        );
      }
      continue;
    }

    if (moduleState.dash.invulnermoduleTime > 0 && !isDirectTarget) {
      continue;
    }

    const fieldModifier = getEntityFieldModifier(target);
    const parriedExplosion = applyPlayerDamage(
      (effect.splashDamage ?? 0) * (isDirectTarget ? effect.directDamageScale ?? 1 : 1) * (1 - fieldModifier.damageReduction),
      "cannon",
      projectile.ownerRef ?? enemy,
    );
    if (target === player && isReflexAegisResolving()) {
      continue;
    }
    if (effect.statusType === "burnslow") {
      applyStatusEffect(target, "burn", getStatusDuration((effect.statusDuration ?? 1.2) * (1 - getBuildStats().ccReduction)), 1);
      applyStatusEffect(target, "slow", getStatusDuration((effect.statusDuration ?? 1.2) * (1 - getBuildStats().ccReduction)), effect.statusMagnitude ?? 0.2);
    } else if (effect.statusType === "burn") {
      applyStatusEffect(target, "burn", getStatusDuration((effect.statusDuration ?? 1.2) * (1 - getBuildStats().ccReduction)), 1);
      if ((effect.statusMagnitude ?? 0) > 0) {
        applyStatusEffect(target, "slow", getStatusDuration((effect.statusDuration ?? 1.2) * (1 - getBuildStats().ccReduction)), effect.statusMagnitude ?? 0.2);
      }
    } else {
      applyStatusEffect(
        target,
        effect.statusType ?? "slow",
        getStatusDuration((effect.statusDuration ?? 0.6) * (1 - getBuildStats().ccReduction)),
        effect.statusType === "stun" ? 1 : effect.statusMagnitude ?? 0.2,
      );
    }
    if ((effect.pushMax ?? 0) > 0 && target === player && moduleState.ghostDriftModule.time <= 0) {
      const intensity = 1 - clamp(distance / Math.max(1, effect.splashRadius ?? 72), 0, 1);
      const pushDistance = (effect.pushMin ?? 0) + ((effect.pushMax ?? 0) - (effect.pushMin ?? 0)) * intensity;
      const pushDirection = distance > 0 ? normalize(target.x - impactX, target.y - impactY) : normalize(target.x - enemy.x, target.y - enemy.y);
      target.x += pushDirection.x * pushDistance;
      target.y += pushDirection.y * pushDistance;
      target.velocityX = (target.velocityX ?? 0) + pushDirection.x * pushDistance * 5.2;
      target.velocityY = (target.velocityY ?? 0) + pushDirection.y * pushDistance * 5.2;
      resolveMapCollision(target);
      maybeTeleportEntity(target);
    }
    if (parriedExplosion && !player.alive) {
      break;
    }
  }
}

export function absorbEnemyProjectiles() {
  return;
}

export function absorbPlayerProjectiles() {
  return;
}

export function updateBullets(collection, dt) {
  for (let i = collection.length - 1; i >= 0; i -= 1) {
    const bullet = collection[i];
    const team = collection === bullets ? "player" : "enemy";
    applySwarmMissileRackGuidance(bullet, team, dt);
    applyFieldDragToProjectile(bullet, team, dt);
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.explodeOnDestination &&
      bullet.detonateX !== null &&
      bullet.detonateY !== null &&
      length(bullet.x - bullet.detonateX, bullet.y - bullet.detonateY) <= Math.max(10, length(bullet.vx, bullet.vy) * dt + bullet.radius)
    ) {
      triggerCannonExplosion(bullet, bullet.detonateX, bullet.detonateY, team);
      releaseSwarmMissileRackProjectile(bullet);
      if (team === "player") {
        settlePlayerWeaponAttack(bullet.attackId);
      }
      collection.splice(i, 1);
      continue;
    }

    if (hitMapWithProjectile(bullet, team)) {
      triggerCannonExplosion(bullet, bullet.x, bullet.y, team);
      releaseSwarmMissileRackProjectile(bullet);
      if (team === "player") {
        settlePlayerWeaponAttack(bullet.attackId);
      }
      collection.splice(i, 1);
      continue;
    }

    const out =
      bullet.x < -20 ||
      bullet.y < -20 ||
      bullet.x > arena.width + 20 ||
      bullet.y > arena.height + 20;

    if (bullet.life <= 0 || out) {
      triggerCannonExplosion(bullet, bullet.x, bullet.y, team);
      releaseSwarmMissileRackProjectile(bullet);
      if (team === "player") {
        settlePlayerWeaponAttack(bullet.attackId);
      }
      collection.splice(i, 1);
    }
  }
}

export function defeatPlayer(source = "hit") {
  player.alive = false;
  if (sandbox.mode === sandboxModes.duel.key && matchState.phase === "active") {
    finishDuelRound("enemy");
  } else if (sandbox.mode === sandboxModes.survival.key) {
    statusLine.textContent = "Run collapsing. Survival sequence ending.";
  } else if (sandbox.mode === sandboxModes.training.key) {
    statusLine.textContent = "Training knockout. Resetting your build test position.";
    resetPlayer({ silent: true });
  } else {
    statusLine.textContent = source === "decay" ? "Your overload state burned out." : "You were eliminated.";
  }
}

export function applyPlayerDamage(amount, source = "hit", attacker = null) {
  if (!player.alive) {
    return true;
  }

  if (tryTriggerReflexAegis(attacker, source)) {
    addImpact(player.x, player.y, "#d7fbff", 18);
    playDamageCue("player", 0, source, true);
    return false;
  }

  if (isReflexAegisResolving()) {
    playDamageCue("player", 0, source, true);
    return false;
  }

  if (moduleState.ghostDriftModule.time > 0 || moduleState.phaseDash.time > 0) {
    addImpact(player.x, player.y, "#d3f6ff", 18);
    playDamageCue("player", 0, source, true);
    return false;
  }

  const buildStats = getBuildStats();
  let finalDamage = amount * (1 - buildStats.damageReduction);

  const hadShieldGuard = player.shieldGuardTime > 0 && player.shield > 0;
  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, finalDamage);
    player.shield -= absorbed;
    finalDamage -= absorbed;
    addImpact(player.x, player.y, "#a3dcff", 18);
    playDamageCue("player", absorbed, source, true);
    if (hadShieldGuard && player.shield <= 0) {
      player.shieldGuardTime = 0;
      if (player.shieldBreakRefundReady) {
        player.shieldBreakRefundReady = false;
        moduleState.hexPlateProjector.cooldown = Math.max(0, moduleState.hexPlateProjector.cooldown * (1 - config.shieldBreakRefund));
        addAbsorbBurst(player.x, player.y, 20, "#c1e8ff");
        addImpact(player.x, player.y, "#d7f0ff", 18);
        statusLine.textContent = "Energy Shield broke, but the timing shaved cooldown off the next cast.";
      }
    }
  }

  if (finalDamage <= 0) {
    return false;
  }

  const previousHp = player.hp;
  player.hp = Math.max(0, player.hp - finalDamage);
  player.flash = 0.12;
  const heavyHit = finalDamage >= 18;
  applyHitReaction(player, player.x - Math.cos(player.facing) * 18, player.y - Math.sin(player.facing) * 18, heavyHit ? 1.05 : 0.65);
  addImpact(player.x, player.y, source === "boltLinkJavelin" ? "#ffd4a6" : source === "axe-finisher" ? "#ffe6ac" : "#ff9c86", heavyHit ? 24 : 16);
  playDamageCue("player", finalDamage, source, false);
  addDamageText(player.x, player.y - player.radius - 8, finalDamage, { heavy: heavyHit, color: source === "axe-finisher" ? "#ffb066" : "#ff7469" });

  const defenseCore = getRuneValue("defense", "primary");
  if (defenseCore > 0 && previousHp - player.hp >= 18 && player.defenseRuneShieldCooldown <= 0) {
    player.defenseRuneShieldCooldown = 2.4;
    player.shield = Math.max(player.shield, defenseCore * 4);
    player.shieldTime = Math.max(player.shieldTime, 1.25);
    addImpact(player.x, player.y, "#b5ddff", 18);
  }

  if (hasImplant("arcFeedback") && previousHp - player.hp >= 18) {
    player.shield = Math.max(player.shield, getBuildStats().shieldOnBurst);
    player.shieldTime = Math.max(player.shieldTime, 1.8);
  }

  if (player.hp <= 0) {
    if (hasImplant("lastStandBuffer") && player.failsafeReady) {
      player.failsafeReady = false;
      player.hp = getBuildStats().maxHp;
      player.lastStandTime = config.lastStandDuration;
      player.lastStandDecayPerSecond = getBuildStats().maxHp / Math.max(0.001, config.lastStandDuration);
      player.flash = Math.max(player.flash, 0.18);
      player.ghostTime = Math.max(player.ghostTime, 0.16);
      addImpact(player.x, player.y, "#ffd998", 32);
      addExplosion(player.x, player.y, 64, "#ffb26a");
      statusLine.textContent = "Last Stand Protocol triggered. Three seconds to settle the trial.";
      return false;
    }

    if (hasRuneShard("defense") && player.defenseFailsafeReady) {
      player.defenseFailsafeReady = false;
      player.hp = Math.max(1, getBuildStats().maxHp * 0.2);
      player.shield = Math.max(player.shield, 22);
      player.shieldTime = 2;
      statusLine.textContent = "Defense keystone kept you barely alive.";
      return false;
    }

    if (hasImplant("cloneFailover") && player.decoyTime <= 0) {
      player.hp = Math.max(1, getBuildStats().maxHp * 0.18);
      player.decoyTime = 2.4;
      player.ghostTime = 0.55;
      player.shield = Math.max(player.shield, 22);
      player.shieldTime = 2;
      addAfterimage(player.x - 38, player.y + 12, player.facing, player.radius + 6, "#d8b2ff");
      addImpact(player.x, player.y, "#d8b2ff", 28);
      statusLine.textContent = "Clone Failover dumped a decoy and saved the round.";
      return false;
    }

    if (player.revivalPrimed > 0) {
      player.revivalPrimed = 0;
      player.hp = Math.max(1, getBuildStats().maxHp * 0.34);
      player.shield = Math.max(player.shield, 24);
      player.shieldTime = 2.4;
      statusLine.textContent = "Revival Protocol rescued you from lethal damage.";
      return false;
    }
  }

  if (source !== "silent") {
    addShake(finalDamage >= 18 ? 8.2 : 6.2);
  }

  if (player.hp <= 0) {
    defeatPlayer(source);
    return true;
  }

  return false;
}

export function resolveCombat() {
  if (!isCombatLive()) {
    return;
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    let consumed = false;
    for (const bot of getAllBots()) {
      if (!bot.alive || bullet.hitTargets.has(bot.kind)) {
        continue;
      }

      if (bullet.explodeOnDestination && bullet.detonateX !== null && bullet.detonateY !== null) {
        const distanceToDetonation = length(bullet.x - bullet.detonateX, bullet.y - bullet.detonateY);
        if (distanceToDetonation > bullet.radius + bot.radius + 10) {
          continue;
        }
      }

      if (length(bullet.x - bot.x, bullet.y - bot.y) <= bullet.radius + bot.radius) {
        bullet.hitTargets.add(bot.kind);
        if (bullet.effect?.kind === "swarmMissileRack") {
          const outcome = resolveSwarmMissileRackImpact(bullet, bot, "player");
          bullet.damage = outcome.damage;
          bullet.effect.fullHit = outcome.fullHit;
        }
        const impactDamage = getProjectileImpactDamage(bullet, bot.x, bot.y) + consumePlayerEmpowerBonus();
        registerPlayerWeaponHit(bullet.attackId);
        damageBot(bot, impactDamage, bullet.color ?? "#77d8ff", bullet.x, bullet.y, 0);
        applyProjectileEffectToBot(bot, bullet);
        triggerCannonExplosion(bullet, bullet.x, bullet.y, "player", bot);
        if (!bullet.piercing) {
          releaseSwarmMissileRackProjectile(bullet);
          settlePlayerWeaponAttack(bullet.attackId, true);
          bullets.splice(i, 1);
          consumed = true;
          break;
        }
      }
    }
    if (consumed) {
      continue;
    }
  }

  if (!isCombatLive()) {
    return;
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    let consumed = false;
    for (const target of getFriendlyCombatTargets()) {
      const targetKey = getFriendlyTargetKey(target);
      if (bullet.hitTargets.has(targetKey)) {
        continue;
      }

      if (bullet.explodeOnDestination && bullet.detonateX !== null && bullet.detonateY !== null) {
        const distanceToDetonation = length(bullet.x - bullet.detonateX, bullet.y - bullet.detonateY);
        if (distanceToDetonation > bullet.radius + target.radius + 10) {
          continue;
        }
      }

      if (length(bullet.x - target.x, bullet.y - target.y) > bullet.radius + target.radius) {
        continue;
      }

      bullet.hitTargets.add(targetKey);
      addImpact(bullet.x, bullet.y, target === playerClone ? "#e8c8ff" : "#ff8a77", target === playerClone ? 16 : 18);

      if (target === playerClone) {
        if (bullet.effect?.kind === "swarmMissileRack") {
          const outcome = resolveSwarmMissileRackImpact(bullet, target, "enemy");
          bullet.damage = outcome.damage;
          bullet.effect.fullHit = outcome.fullHit;
        }
        applyPhantomDamage(bullet.damage, "bullet");
        applyProjectileEffectToPlayer(bullet, target);
        triggerCannonExplosion(bullet, bullet.x, bullet.y, "enemy", target);
        statusLine.textContent = "Phantom copy intercepted enemy fire.";
      } else if (moduleState.dash.invulnermoduleTime <= 0) {
        if (tryTriggerReflexAegis(bullet.ownerRef ?? enemy, bullet.source ?? "bullet")) {
          if (!bullet.piercing) {
            releaseSwarmMissileRackProjectile(bullet);
            enemyBullets.splice(i, 1);
          }
          consumed = true;
          break;
        }
        const playerFieldModifier = getEntityFieldModifier(target);
        if (bullet.effect?.kind === "swarmMissileRack") {
          const outcome = resolveSwarmMissileRackImpact(bullet, target, "enemy");
          bullet.damage = outcome.damage;
          bullet.effect.fullHit = outcome.fullHit;
        }
        const impactDamage = getProjectileImpactDamage(bullet, target.x, target.y);
        const defeatedByBullet = applyPlayerDamage(
          impactDamage * (1 - playerFieldModifier.damageReduction),
          "bullet",
          bullet.ownerRef ?? enemy,
        );
        if (target === player && isReflexAegisResolving()) {
          if (!bullet.piercing) {
            enemyBullets.splice(i, 1);
          }
          consumed = true;
          break;
        }
        applyProjectileEffectToPlayer(bullet, target);
        triggerCannonExplosion(bullet, bullet.x, bullet.y, "enemy", target);
        statusLine.textContent = playerFieldModifier.damageReduction > 0
          ? "Magnetic Field softened the incoming shot."
          : "You were hit. Use dash to break pressure.";
        if (defeatedByBullet) {
          if (!bullet.piercing) {
            releaseSwarmMissileRackProjectile(bullet);
            enemyBullets.splice(i, 1);
          }
          consumed = true;
          break;
        }
      } else {
        addImpact(player.x, player.y, "#b8f9c9", 22);
        statusLine.textContent = "Clean dash through enemy fire.";
      }

      if (!bullet.piercing) {
        releaseSwarmMissileRackProjectile(bullet);
        enemyBullets.splice(i, 1);
        consumed = true;
        break;
      }
    }

    if (consumed || !enemyBullets[i]) {
      continue;
    }
  }
}

export function updateImpacts(dt) {
  for (let i = impacts.length - 1; i >= 0; i -= 1) {
    impacts[i].life -= dt;
    if (impacts[i].life <= 0) {
      impacts.splice(i, 1);
    }
  }

  for (let i = tracers.length - 1; i >= 0; i -= 1) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) {
      tracers.splice(i, 1);
    }
  }

  for (let i = beamEffects.length - 1; i >= 0; i -= 1) {
    beamEffects[i].life -= dt;
    if (beamEffects[i].life <= 0) {
      beamEffects.splice(i, 1);
    }
  }

  for (let i = combatTexts.length - 1; i >= 0; i -= 1) {
    combatTexts[i].life -= dt;
    if (combatTexts[i].life <= 0) {
      combatTexts.splice(i, 1);
    }
  }

  for (let i = afterimages.length - 1; i >= 0; i -= 1) {
    afterimages[i].life -= dt;
    if (afterimages[i].life <= 0) {
      afterimages.splice(i, 1);
    }
  }

  for (let i = slashEffects.length - 1; i >= 0; i -= 1) {
    slashEffects[i].life -= dt;
    if (slashEffects[i].life <= 0) {
      slashEffects.splice(i, 1);
    }
  }

    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      explosions[i].life -= dt;
      if (explosions[i].life <= 0) {
        explosions.splice(i, 1);
      }
    }

    for (let i = absorbBursts.length - 1; i >= 0; i -= 1) {
      absorbBursts[i].life -= dt;
      if (absorbBursts[i].life <= 0) {
        absorbBursts.splice(i, 1);
      }
    }

  globals.screenShake = Math.max(0, globals.screenShake - dt * 22);
}

export function getActiveBotLoadout() {
  botBuildState.current = getBotConfiguredLoadout();
  return botBuildState.current;
}

export function applyBotLoadout(bot, loadoutConfig) {
  const normalized = ensureBotLoadoutFilled(loadoutConfig);
  bot.loadout = normalized;
  bot.weapon = normalized.weapon;
  bot.ammo = getPulseMagazineSize();
  bot.reloadTime = 0;
  bot.shield = 0;
  bot.shieldTime = 0;
  bot.shieldGuardTime = 0;
  bot.shieldBreakRefundReady = false;
  bot.hasteTime = 0;
  bot.comboStep = 0;
  bot.comboTimer = 0;
  bot.meleeWindupTime = 0;
  bot.pendingMeleeStrike = null;
  bot.attackCommitTime = 0;
  bot.attackCommitX = 0;
  bot.attackCommitY = 0;
  bot.attackCommitSpeed = 0;
  bot.activeMeleeStrike = null;
  bot.moduleCooldowns.vGripHarpoon = 0;
  bot.moduleCooldowns.hexPlateProjector = 0;
  bot.moduleCooldowns.overdriveServos = 0;
  bot.moduleCooldowns.emPulseEmitter = 0;
  bot.moduleCooldowns.jetBackThruster = 0;
  bot.moduleCooldowns.chainLightning = 0;
  bot.moduleCooldowns.blink = 0;
  bot.moduleCooldowns.phaseDash = 0;
  bot.moduleCooldowns.swarmMissileRack = 0;
  bot.moduleCooldowns.railShot = 0;
  bot.moduleCooldowns.voidCoreSingularity = 0;
  bot.moduleCooldowns.ghostDriftModule = 0;
  bot.moduleCooldowns.spectreProjector = 0;
  bot.boltLinkJavelinCooldown = 0.8;
  bot.orbitalDistorterCooldown = 1.8;
}

export function refreshHunterLoadout() {
  applyBotLoadout(enemy, getActiveBotLoadout());
}

export function resetBotsForMode(mode = sandbox.mode) {
  resetMapState(mode, sandbox.mapKey);
  survivalEnemies.length = 0;

  if (mode === sandboxModes.duel.key) {
    refreshHunterLoadout();
  } else if (mode === sandboxModes.teamDuel.key) {
    const layout = getMapLayout(mode, sandbox.mapKey);
    createTeamDuelEntities(layout);
    enemy.spawnX = layout.enemySpawn.x;
    enemy.spawnY = layout.enemySpawn.y;

    const participants = [allyBot, ...teamEnemies].filter(Boolean);
    for (const [index, bot] of participants.entries()) {
      bot.maxHp = config.enemyMaxHp;
      bot.armor = 0;
      bot.tenacity = 0;
      bot.weapon = weapons.pulse.key;
      bot.loadout = {
        weapon: weapons.pulse.key,
        abilities: ["boltLinkJavelin", "orbitalDistorter", "hexPlateProjector"],
      };
      bot.spawnX = bot.x;
      bot.spawnY = bot.y;
      bot.x = bot.spawnX;
      bot.y = bot.spawnY;
      bot.hp = bot.maxHp;
      bot.alive = true;
      bot.flash = 0;
      bot.facing = bot.team === "player" ? 0 : Math.PI;
      bot.velocityX = 0;
      bot.velocityY = 0;
      bot.shootCooldown = bot.team === "player" ? 0.28 : 0.5 + index * 0.08;
      bot.cadence = bot.team === "player" ? 0.22 : 0.3;
      bot.strafeTimer = index * 0.7;
      bot.dodgeCooldown = 0.6;
      bot.dodgeTime = 0;
      bot.dodgeVectorX = 0;
      bot.dodgeVectorY = 0;
      bot.burstShots = 0;
      bot.shotSpread = 0;
      bot.reloadTime = 0;
      bot.ammo = getPulseMagazineSize();
      bot.shield = 0;
      bot.shieldTime = 0;
      bot.shieldGuardTime = 0;
      bot.shieldBreakRefundReady = false;
      bot.hasteTime = 0;
      bot.comboStep = 0;
      bot.comboTimer = 0;
      bot.meleeWindupTime = 0;
      bot.pendingMeleeStrike = null;
      bot.attackCommitTime = 0;
      bot.attackCommitX = 0;
      bot.attackCommitY = 0;
      bot.attackCommitSpeed = 0;
      bot.activeMeleeStrike = null;
      bot.injectorMarks = 0;
      bot.injectorMarkTime = 0;
      bot.castTime = 0;
      bot.totalCastTime = 0;
      bot.castingmodule = null;
      bot.castParams = null;
      bot.visualCastTime = 0;
      bot.totalVisualCastTime = 0;
      bot.visualCastingmodule = null;
      bot.weaponChargeTime = 0;
      bot.totalWeaponChargeTime = 0;
      bot.weaponCasting = null;
      clearStatusEffects(bot);
    }
    return;
  }

  const layout = getMapLayout(mode, sandbox.mapKey);
  enemy.spawnX = layout.enemySpawn.x;
  enemy.spawnY = layout.enemySpawn.y;

  layout.trainingBots.forEach((spawn, index) => {
    if (trainingBots[index]) {
      trainingBots[index].spawnX = spawn.x;
      trainingBots[index].spawnY = spawn.y;
    }
  });

  for (const bot of bots) {
    const override = bot.role === "training" ? trainingToolState.botOverrides?.[bot.kind] : null;
    bot.maxHp = override?.maxHp ?? (bot.role === "hunter" ? config.enemyMaxHp : 140);
    bot.armor = override?.armor ?? 0;
    bot.tenacity = override?.tenacity ?? 0;

    bot.x = bot.spawnX;
    bot.y = bot.spawnY;
    bot.hp = bot.maxHp;
    bot.alive = bot.modes.includes(mode);
    bot.flash = 0;
    bot.facing = 0;
    let isFiring = trainingToolState.botsFire;
    if (override && override.canFire && override.canFire !== "default") {
      isFiring = override.canFire === "on";
    }

    bot.shootCooldown =
      bot.role === "hunter"
        ? 0.7
        : isFiring
          ? 0.35 + trainingBots.indexOf(bot) * 0.08
          : 999;
    bot.cadence = bot.role === "hunter" ? 0.72 : 1.15 + trainingBots.indexOf(bot) * 0.02;
    bot.strafeTimer = 0;
    bot.dodgeCooldown = 0.6;
    bot.dodgeTime = 0;
    bot.dodgeVectorX = 0;
    bot.dodgeVectorY = 0;
    bot.burstShots = 0;
    bot.shotSpread = 0;
    bot.reloadTime = 0;
    bot.ammo = getPulseMagazineSize();
    bot.shield = 0;
    bot.shieldTime = 0;
    bot.shieldGuardTime = 0;
    bot.shieldBreakRefundReady = false;
    bot.hasteTime = 0;
    bot.comboStep = 0;
    bot.comboTimer = 0;
    bot.meleeWindupTime = 0;
    bot.pendingMeleeStrike = null;
    bot.attackCommitTime = 0;
    bot.attackCommitX = 0;
    bot.attackCommitY = 0;
    bot.attackCommitSpeed = 0;
    bot.activeMeleeStrike = null;
    bot.injectorMarks = 0;
    bot.injectorMarkTime = 0;
    if (bot.role === "hunter") {
      bot.moduleCooldowns.vGripHarpoon = 0;
      bot.moduleCooldowns.hexPlateProjector = 0;
      bot.moduleCooldowns.overdriveServos = 0;
      bot.moduleCooldowns.emPulseEmitter = 0;
      bot.moduleCooldowns.jetBackThruster = 0;
      bot.moduleCooldowns.chainLightning = 0;
      bot.moduleCooldowns.blink = 0;
      bot.moduleCooldowns.phaseDash = 0;
      bot.moduleCooldowns.swarmMissileRack = 0;
      bot.moduleCooldowns.railShot = 0;
      bot.moduleCooldowns.voidCoreSingularity = 0;
      bot.moduleCooldowns.ghostDriftModule = 0;
      bot.moduleCooldowns.spectreProjector = 0;
      bot.boltLinkJavelinCooldown = 0.8;
      bot.orbitalDistorterCooldown = 1.8;
    }
    clearStatusEffects(bot);
  }
}

export function updateMapInteractables(dt) {
  const allActors = [player, ...getAllBots()];
  
  if (mapState.healPacks) {
    for (const pack of mapState.healPacks) {
      if (pack.cooldown > 0) {
        pack.cooldown -= dt;
        continue;
      }
      
      for (const actor of allActors) {
        if (!actor.alive) continue;
        const dx = actor.x - pack.x;
        const dy = actor.y - pack.y;
        if (dx * dx + dy * dy < (actor.radius + 24) * (actor.radius + 24)) {
          const maxHpBase = actor === player ? getBuildStats().maxHp : (actor.maxHp ?? 100);
          healEntity(actor, maxHpBase * 0.15);
          pack.cooldown = 20.0;
          addImpact(pack.x, pack.y, "#8bfdb0", 30);
          break;
        }
      }
    }
  }
}

