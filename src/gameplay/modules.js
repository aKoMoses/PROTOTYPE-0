// All player Module functions (dash, javelin, field, etc.)
import { arena, config, moduleConfig, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, moduleState, sandbox, matchState, boltLinkJavelins, enemyBoltLinkJavelins, orbitalDistorterFields, supportZones, input } from "../state.js";
import { loadout } from "../state/app-state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addBeamEffect, addExplosion, addSlashEffect, applyHitReaction, addAbsorbBurst } from "./effects.js";
import { getMapLayout, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasPerk, getStatusDuration, getPerkDamageMultiplier, getModuleBySlot, getActiveDashCooldown, getActiveDashCharges, getDashProfile, getModuleCooldown } from "../build/loadout.js";
import { getAllBots, getMoveVector, getPrimaryBot, isCombatLive, damageBot, spawnBullet, applyStatusEffect, getPlayerFieldModifier, getPlayerSpawn, resize, hitMapWithProjectile, clearStatusEffects, completePlayerWeaponAttack, consumePlayerEmpowerBonus, beginSwarmMissileRackCast } from "./combat.js";
import { bullets, enemyBullets } from "../state.js";
import { playModuleCue } from "../audio.js";
import { queuePhantomModule, spawnPhantomClone } from "./phantom.js";
import { startCast, startVisualCast } from "./casting.js";

export function getBoltLinkJavelinProfile() {
  return {
    speed: config.boltLinkJavelinSpeed,
    damage: config.boltLinkJavelinDamage,
    radius: config.boltLinkJavelinRadius,
    range: config.boltLinkJavelinRange,
    slow: config.boltLinkJavelinSlow,
    slowDuration: config.boltLinkJavelinSlowDuration,
    color: moduleConfig.boltLinkJavelin.color,
    glow: moduleConfig.boltLinkJavelin.glow,
    trail: moduleConfig.boltLinkJavelin.trail,
    piercing: false,
  };
}

export function getOrbitalDistorterProfile(mode = moduleState.orbitalDistorter.mode) {
  const isHold = mode === "hold";
  const tapProfile = {
    duration: config.orbitalDistorterTapDuration,
    radius: config.orbitalDistorterTapRadius,
    slow: config.orbitalDistorterTapSlow,
    damageReduction: config.orbitalDistorterTapDamageReduction,
    projectileSlowEdge: config.orbitalDistorterTapProjectileSlowEdge,
    projectileSlowCore: config.orbitalDistorterTapProjectileSlowCore,
    anchor: "player",
    color: "#89c8ff",
  };
  const holdProfile = {
    duration: config.orbitalDistorterHoldDuration,
    radius: config.orbitalDistorterHoldRadius,
    slow: config.orbitalDistorterHoldSlow,
    damageReduction: 0,
    projectileSlowEdge: config.orbitalDistorterHoldProjectileSlowEdge,
    projectileSlowCore: config.orbitalDistorterHoldProjectileSlowCore,
    anchor: "world",
    color: "#95b5ff",
  };
  const profile = isHold ? holdProfile : tapProfile;

  return {
    ...profile,
    disruption: 0,
    moveBoost: 1,
    moveBoostDuration: 0,
  };
}

function getTrackedBot(kind) {
  return getAllBots().find((bot) => bot.alive && bot.kind === kind) ?? null;
}

function resetVGripState() {
  moduleState.vGripHarpoon.phase = "idle";
  moduleState.vGripHarpoon.projectile = null;
  moduleState.vGripHarpoon.targetKind = null;
  moduleState.vGripHarpoon.pullStopRequested = false;
  moduleState.vGripHarpoon.tetherPulse = 0;
}

function finalizeBoltLinkJavelinCycle(startCooldown = true) {
  moduleState.boltLinkJavelin.recastReady = false;
  moduleState.boltLinkJavelin.targetKind = null;
  moduleState.boltLinkJavelin.activeTime = 0;
  moduleState.boltLinkJavelin.pendingCooldown = false;
  if (startCooldown) {
    moduleState.boltLinkJavelin.cooldown = Math.max(
      moduleState.boltLinkJavelin.cooldown,
      getModuleCooldown(config.boltLinkJavelinCooldown),
    );
  }
}

function isReflexAegisLocked() {
  return (
    moduleState.reflexAegis.startupTime > 0 ||
    moduleState.reflexAegis.activeTime > 0 ||
    moduleState.reflexAegis.recoveryTime > 0
  );
}

function getGrappleAnchorPoint(target) {
  const direction = normalize(target.x - player.x, target.y - player.y);
  return {
    x: player.x + direction.x * (player.radius + target.radius + 18),
    y: player.y + direction.y * (player.radius + target.radius + 18),
  };
}

export function startDashInput() {
  if (!isCombatLive()) {
    return;
  }

  if (isReflexAegisLocked() || moduleState.dash.inputHeld || moduleState.dash.charges <= 0 || moduleState.dash.activeTime > 0) {
    return;
  }

  moduleState.dash.inputHeld = true;
  moduleState.dash.holdTime = 0;
  moduleState.dash.upgraded = false;
  executeDash("tap");
}

export function executeDash(dashMode) {
  if (isReflexAegisLocked() || (dashMode === "tap" && moduleState.dash.charges <= 0)) {
    return;
  }

  const move = getMoveVector();
  const aim = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const dashDirection = move.x !== 0 || move.y !== 0 ? move : aim;
  const dashProfile = getDashProfile(dashMode);

  moduleState.dash.mode = dashMode;
  moduleState.dash.vectorX = dashDirection.x;
  moduleState.dash.vectorY = dashDirection.y;
  moduleState.dash.activeTime = Math.max(moduleState.dash.activeTime, dashProfile.duration);
  moduleState.dash.invulnerModuleTime = Math.max(
    moduleState.dash.invulnerModuleTime,
    dashProfile.invulnerModule,
  );

  if (dashMode === "tap") {
    moduleState.dash.charges -= 1;
  }

  if (
    moduleState.dash.charges < getActiveDashCharges() &&
    moduleState.dash.rechargeTimer <= 0
  ) {
    moduleState.dash.rechargeTimer = getActiveDashCooldown();
  }

  player.flash = 0.12;
  if (hasPerk("adrenalInjector")) {
    player.afterDashHasteTime = 1.2;
  }
  if (hasPerk("ghostCircuit")) {
    player.ghostTime = 0.28;
  }
  playModuleCue("dash");
  addImpact(player.x, player.y, dashMode === "hold" ? "#c8ffe4" : "#9df4b7", dashMode === "hold" ? 34 : 26);
  addShake(dashMode === "hold" ? 7.5 : 6);
}

export function upgradeDashToHold() {
  if (moduleState.dash.mode === "hold") {
    return;
  }

  const holdProfile = getDashProfile("hold");
  moduleState.dash.mode = "hold";
  moduleState.dash.activeTime = Math.max(moduleState.dash.activeTime, holdProfile.duration * 0.82);
  moduleState.dash.invulnerModuleTime = Math.max(
    moduleState.dash.invulnerModuleTime,
    holdProfile.invulnerModule,
  );
  addAfterimage(player.x, player.y, player.facing, player.radius + 3, holdProfile.trailColor);
}

export function releaseDashInput() {
  if (!moduleState.dash.inputHeld) {
    return;
  }

  moduleState.dash.inputHeld = false;
  moduleState.dash.holdTime = 0;
}

export function updateDashModule(dt) {
  const activeDashCharges = getActiveDashCharges();

  if (moduleState.dash.inputHeld) {
    moduleState.dash.holdTime = Math.min(0.4, moduleState.dash.holdTime + dt);
  }

  if (
    moduleState.dash.inputHeld &&
    moduleState.dash.activeTime > 0 &&
    !moduleState.dash.upgraded &&
    moduleState.dash.holdTime >= moduleConfig.dash.holdThreshold
  ) {
    moduleState.dash.upgraded = true;
    upgradeDashToHold();
  }

  if (moduleState.dash.charges > activeDashCharges) {
    moduleState.dash.charges = activeDashCharges;
  }

  if (moduleState.dash.charges < activeDashCharges) {
    moduleState.dash.rechargeTimer = Math.max(0, moduleState.dash.rechargeTimer - dt);

    if (moduleState.dash.rechargeTimer === 0) {
      moduleState.dash.charges += 1;

      if (moduleState.dash.charges < activeDashCharges) {
        moduleState.dash.rechargeTimer = getActiveDashCooldown();
      }
    }
  } else {
    moduleState.dash.rechargeTimer = 0;
  }

  moduleState.dash.invulnerModuleTime = Math.max(0, moduleState.dash.invulnerModuleTime - dt);

  if (moduleState.dash.activeTime > 0) {
    const dashProfile = getDashProfile(moduleState.dash.mode);
    moduleState.dash.activeTime = Math.max(0, moduleState.dash.activeTime - dt);
    player.velocityX = moduleState.dash.vectorX * dashProfile.speed;
    player.velocityY = moduleState.dash.vectorY * dashProfile.speed;
    addAfterimage(
      player.x,
      player.y,
      player.facing,
      player.radius,
      dashProfile.trailColor,
    );
  }
}

export function startBoltLinkJavelinCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (moduleState.boltLinkJavelin.recastReady) {
    recastBoltLinkJavelin();
    return;
  }

  if (moduleState.boltLinkJavelin.cooldown > 0 || moduleState.boltLinkJavelin.pendingCooldown || moduleState.boltLinkJavelin.activeTime > 0) {
    return;
  }

  startCast(player, "boltLinkJavelin", executeBoltLinkJavelinCast, null);
}

export function executeBoltLinkJavelinCast() {
  const profile = getBoltLinkJavelinProfile();
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);

  boltLinkJavelins.push({
    x: player.x + direction.x * (player.radius + 12),
    y: player.y + direction.y * (player.radius + 12),
    vx: direction.x * profile.speed,
    vy: direction.y * profile.speed,
    radius: profile.radius,
    damage: profile.damage,
    charged: false,
    life: profile.range / profile.speed + 0.1,
    color: profile.color,
    glow: profile.glow,
    trail: profile.trail,
    piercing: false,
    slow: profile.slow,
    slowDuration: profile.slowDuration,
    stun: 0,
    hitTargets: new Set(),
  });

  moduleState.boltLinkJavelin.aimX = input.mouseX;
  moduleState.boltLinkJavelin.aimY = input.mouseY;
  moduleState.boltLinkJavelin.lastDirectionX = direction.x;
  moduleState.boltLinkJavelin.lastDirectionY = direction.y;
  moduleState.boltLinkJavelin.pendingCooldown = true;
  player.recoil = Math.max(player.recoil, 0.22);
  queuePhantomModule("boltLinkJavelin", {
    facing: player.facing,
    aimX: input.mouseX,
    aimY: input.mouseY,
  });
  playModuleCue("boltLinkJavelin");
  addImpact(player.x + direction.x * 22, player.y + direction.y * 22, profile.color, 24);
  addImpact(player.x + direction.x * 30, player.y + direction.y * 30, "#e6fbff", 16);
  addShake(6.8);
  statusLine.textContent = "BOLT-LINK Javelin primed and ready for engagement.";
}

export function releaseBoltLinkJavelin() {
  return;
}

export function confirmBoltLinkJavelinImpact(target) {
  if (!target?.alive) {
    finalizeBoltLinkJavelinCycle(true);
    return;
  }

  const direction = normalize(target.x - player.x, target.y - player.y);
  moduleState.boltLinkJavelin.recastReady = true;
  moduleState.boltLinkJavelin.targetKind = target.kind;
  moduleState.boltLinkJavelin.activeTime = getStatusDuration(config.boltLinkJavelinSlowDuration);
  moduleState.boltLinkJavelin.pendingCooldown = true;
  moduleState.boltLinkJavelin.lastDirectionX = direction.x;
  moduleState.boltLinkJavelin.lastDirectionY = direction.y;
  applyStatusEffect(target, "slow", getStatusDuration(config.boltLinkJavelinSlowDuration), config.boltLinkJavelinSlow);
  applyStatusEffect(target, "shock", getStatusDuration(config.boltLinkJavelinSlowDuration), 1);
  addImpact(target.x, target.y, "#fff5bd", 22);
  addShake(7.2);
  statusLine.textContent = "BOLT-LINK Javelin anchored. Recast to snap to target position.";
}

export function expireBoltLinkJavelin(startCooldown = true) {
  finalizeBoltLinkJavelinCycle(startCooldown);
}

export function recastBoltLinkJavelin() {
  if (!moduleState.boltLinkJavelin.recastReady || moduleState.boltLinkJavelin.activeTime <= 0) {
    return false;
  }

  const target = getTrackedBot(moduleState.boltLinkJavelin.targetKind);
  if (!target) {
    finalizeBoltLinkJavelinCycle(true);
    return false;
  }

  const direction =
    moduleState.boltLinkJavelin.lastDirectionX !== 0 || moduleState.boltLinkJavelin.lastDirectionY !== 0
      ? normalize(moduleState.boltLinkJavelin.lastDirectionX, moduleState.boltLinkJavelin.lastDirectionY)
      : normalize(target.x - player.x, target.y - player.y);
  const previousX = player.x;
  const previousY = player.y;

  player.x = target.x - direction.x * (target.radius + player.radius + config.boltLinkJavelinRecastDistance);
  player.y = target.y - direction.y * (target.radius + player.radius + config.boltLinkJavelinRecastDistance);
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  player.flash = Math.max(player.flash, 0.12);
  player.ghostTime = Math.max(player.ghostTime, 0.16);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.55);
  moduleState.boltLinkJavelin.recastReady = false;
  addAfterimage(previousX, previousY, player.facing, player.radius + 4, "#9ce9ff");
  addAfterimage(player.x, player.y, player.facing, player.radius + 5, "#fff0a4");
  addBeamEffect(previousX, previousY, target.x, target.y, "#8fe8ff", 4, 0.14);
  addImpact(player.x, player.y, "#fff0a4", 24);
  addShake(5.8);
  playModuleCue("blink");
  statusLine.textContent = "BOLT-LINK Javelin recall successful.";
  return true;
}

export function spawnEnemyJavelin(charged = false, targetEntity = player) {
  startCast(enemy, "boltLinkJavelin", executeEnemyJavelinCast, { charged, targetEntity });
}

export function executeEnemyJavelinCast(params) {
  const { charged, targetEntity } = params;
  const direction = normalize((targetEntity?.x ?? player.x) - enemy.x, (targetEntity?.y ?? player.y) - enemy.y);
  const speed = charged ? config.boltLinkJavelinSpeed * 0.94 : config.boltLinkJavelinSpeed;
  const radius = charged ? config.boltLinkJavelinRadius + 1 : config.boltLinkJavelinRadius;
  const damage = charged ? config.boltLinkJavelinDamage * 1.15 : config.boltLinkJavelinDamage * 0.92;

  enemyBoltLinkJavelins.push({
    x: enemy.x + direction.x * (enemy.radius + 12),
    y: enemy.y + direction.y * (enemy.radius + 12),
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius,
    damage,
    charged,
    life: config.boltLinkJavelinRange / Math.max(1, speed) + 0.08,
    color: charged ? "#ffd07e" : "#ffb575",
    glow: charged ? "#fff0bc" : "#ffe0b5",
    trail: charged ? "#ffe1a8" : "#ffc28c",
    stun: 0,
    slow: charged ? config.boltLinkJavelinSlow * 1.05 : config.boltLinkJavelinSlow * 0.92,
    slowDuration: config.boltLinkJavelinSlowDuration,
  });

  enemy.javelinCooldown = charged ? 4.8 : 4;
  addImpact(enemy.x + direction.x * 24, enemy.y + direction.y * 24, charged ? "#ffe4ad" : "#ffb27e", charged ? 18 : 12);
}

export function updateBoltLinkJavelinModule(dt) {
  moduleState.boltLinkJavelin.cooldown = Math.max(0, moduleState.boltLinkJavelin.cooldown - dt);
  if (moduleState.boltLinkJavelin.activeTime > 0) {
    moduleState.boltLinkJavelin.activeTime = Math.max(0, moduleState.boltLinkJavelin.activeTime - dt);
    const trackedTarget = moduleState.boltLinkJavelin.targetKind ? getTrackedBot(moduleState.boltLinkJavelin.targetKind) : null;
    if (trackedTarget) {
      moduleState.boltLinkJavelin.lastDirectionX = trackedTarget.x - player.x;
      moduleState.boltLinkJavelin.lastDirectionY = trackedTarget.y - player.y;
    }
    if (moduleState.boltLinkJavelin.pendingCooldown && moduleState.boltLinkJavelin.activeTime <= 0) {
      finalizeBoltLinkJavelinCycle(true);
    }
  }
}

export function startOrbitalDistorterCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (moduleState.orbitalDistorter.cooldown > 0 || moduleState.orbitalDistorter.charging) {
    return;
  }

  moduleState.orbitalDistorter.charging = true;
  moduleState.orbitalDistorter.chargeTime = 0;
  moduleState.orbitalDistorter.mode = "tap";
  statusLine.textContent = "Booting ORBITAL Distorter array...";
}

export function releaseOrbitalDistorter() {
  if (!moduleState.orbitalDistorter.charging) {
    return;
  }

  const isHold = moduleState.orbitalDistorter.chargeTime >= config.orbitalDistorterChargeThreshold;
  moduleState.orbitalDistorter.mode = isHold ? "hold" : "tap";
  const fieldProfile = { ...getOrbitalDistorterProfile(moduleState.orbitalDistorter.mode) };
  const centerX = fieldProfile.anchor === "player" ? player.x : input.mouseX;
  const centerY = fieldProfile.anchor === "player" ? player.y : input.mouseY;

  orbitalDistorterFields.push({
    x: centerX,
    y: centerY,
    radius: fieldProfile.radius,
    duration: fieldProfile.duration,
    life: fieldProfile.duration,
    slow: fieldProfile.slow,
    damageReduction: fieldProfile.damageReduction,
    anchor: fieldProfile.anchor,
    color: fieldProfile.color,
    glow: fieldProfile.glow,
    disruption: fieldProfile.disruption,
    projectileSlowEdge: fieldProfile.projectileSlowEdge,
    projectileSlowCore: fieldProfile.projectileSlowCore,
    team: "player",
    touchedTargets: new Set(),
  });

  if (fieldProfile.moveBoost > 1) {
    moduleState.orbitalDistorter.moveBoostTime = fieldProfile.moveBoostDuration;
  }

  moduleState.orbitalDistorter.charging = false;
  moduleState.orbitalDistorter.chargeTime = 0;
  moduleState.orbitalDistorter.cooldown = getModuleCooldown(config.orbitalDistorterCooldown);
  queuePhantomModule("orbitalDistorter", {
    mode: moduleState.orbitalDistorter.mode,
    facing: player.facing,
    aimX: centerX,
    aimY: centerY,
  });
  playModuleCue("orbitalDistorter");
  addImpact(centerX, centerY, fieldProfile.color, isHold ? 28 : 22);
  addShake(isHold ? 6.5 : 4.2);
  statusLine.textContent = isHold
    ? "ORBITAL Distorter zone initialized for tactical control."
    : "ORBITAL Distorter active. Localized projectile disruption engaged.";
}

export function updateOrbitalDistorterModule(dt) {
  moduleState.orbitalDistorter.cooldown = Math.max(0, moduleState.orbitalDistorter.cooldown - dt);
  moduleState.orbitalDistorter.moveBoostTime = Math.max(0, moduleState.orbitalDistorter.moveBoostTime - dt);

  if (moduleState.orbitalDistorter.charging) {
    moduleState.orbitalDistorter.chargeTime = Math.min(1, moduleState.orbitalDistorter.chargeTime + dt);
    moduleState.orbitalDistorter.mode =
      moduleState.orbitalDistorter.chargeTime >= config.orbitalDistorterChargeThreshold ? "hold" : "tap";
  }

  for (let index = orbitalDistorterFields.length - 1; index >= 0; index -= 1) {
    const field = orbitalDistorterFields[index];
    field.life -= dt;

    if (field.anchor === "player") {
      field.x = player.x;
      field.y = player.y;
    }

    if (field.life <= 0) {
      orbitalDistorterFields.splice(index, 1);
    }
  }
}

export function castVGripHarpoon() {
  if (!isCombatLive()) {
    return;
  }

  if (moduleState.vGripHarpoon.phase === "pull") {
    moduleState.vGripHarpoon.pullStopRequested = true;
    statusLine.textContent = "V-GRIP cable released early.";
    return;
  }

  if (moduleState.vGripHarpoon.cooldown > 0 || moduleState.vGripHarpoon.phase !== "idle") {
    return;
  }

  startCast(player, "vGripHarpoon", executeVGripHarpoonCast);
}

export function executeVGripHarpoonCast() {
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const life = config.vGripHarpoonRange / Math.max(1, config.vGripHarpoonProjectileSpeed) + 0.12;
  moduleState.vGripHarpoon.cooldown = getModuleCooldown(config.vGripHarpoonCooldown);
  moduleState.vGripHarpoon.phase = "flying";
  moduleState.vGripHarpoon.projectile = {
    x: player.x + direction.x * (player.radius + 14),
    y: player.y + direction.y * (player.radius + 14),
    vx: direction.x * config.vGripHarpoonProjectileSpeed,
    vy: direction.y * config.vGripHarpoonProjectileSpeed,
    radius: config.vGripHarpoonProjectileRadius,
    life,
    color: "#9feeff",
    trail: "#dffbff",
  };
  moduleState.vGripHarpoon.pullStopRequested = false;
  moduleState.vGripHarpoon.targetKind = null;
  player.flash = 0.08;
  queuePhantomModule("vGripHarpoon", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playModuleCue("vGripHarpoon");
  addImpact(player.x, player.y, "#9feeff", 32);
  addShake(5.4);
  statusLine.textContent = "V-GRIP Harpoon launched. Awaiting target confirmation.";
}

export function castHexPlateProjector() {
  if (!isCombatLive() || moduleState.hexPlateProjector.cooldown > 0) {
    return;
  }

  startVisualCast(player, "hexPlateProjector", 0.3);
  moduleState.hexPlateProjector.cooldown = getModuleCooldown(config.shieldCooldown);
  player.shield = Math.max(player.shield, config.shieldValue);
  player.shieldTime = config.shieldDuration;
  player.shieldGuardTime = config.shieldDuration;
  player.shieldBreakRefundReady = true;
  queuePhantomModule("hexPlateProjector");
  playModuleCue("hexPlateProjector");
  addImpact(player.x, player.y, "#9cd5ff", 28);
  addShake(4);
  statusLine.textContent = "HEX-PLATE Projector online. Reinforced plating active.";
}

export function castReflexAegis() {
  if (
    !isCombatLive() ||
    moduleState.reflexAegis.cooldown > 0 ||
    isReflexAegisLocked() ||
    moduleState.ghostDriftModule.time > 0
  ) {
    return;
  }

  if (player.pendingAxeStrike?.attackId != null) {
    completePlayerWeaponAttack(player.pendingAxeStrike.attackId, false);
  }
  if (player.activeAxeStrike?.attackId != null) {
    completePlayerWeaponAttack(player.activeAxeStrike.attackId, player.activeAxeStrike.connected || player.activeAxeStrike.worldHit);
  }

  player.attackStartupTime = 0;
  player.attackCommitTime = 0;
  player.pendingAxeStrike = null;
  player.activeAxeStrike = null;
  player.weaponCharge = 0;
  player.weaponChargeActive = false;
  startVisualCast(player, "reflexAegis", 0.22);
  moduleState.reflexAegis.startupTime = config.reflexAegisStartup;
  moduleState.reflexAegis.activeTime = 0;
  moduleState.reflexAegis.recoveryTime = 0;
  moduleState.reflexAegis.resolveLockTime = 0;
  moduleState.reflexAegis.successFlash = 0;
  queuePhantomModule("reflexAegis");
  playModuleCue("reflexAegis");
  addImpact(player.x, player.y, "#bdf4ff", 22);
  statusLine.textContent = "REFLEX Aegis armed. Tactical counter window open.";
}

export function castEmPulseEmitter() {
  if (!isCombatLive() || moduleState.emPulseEmitter.cooldown > 0) {
    return;
  }

  startVisualCast(player, "emPulseEmitter", 0.35);
  moduleState.emPulseEmitter.cooldown = getModuleCooldown(config.boosterCooldown);
  queuePhantomModule("emPulseEmitter");
  playModuleCue("emPulseEmitter");
  addImpact(player.x, player.y, "#be9dff", 34);
  addExplosion(player.x, player.y, 84, "#b99cff");
  addShake(5.4);

  for (const bot of getAllBots()) {
    if (!bot.alive) {
      continue;
    }

    if (length(bot.x - player.x, bot.y - player.y) <= 120 + bot.radius) {
      applyStatusEffect(bot, "slow", getStatusDuration(1), 0.38);
      bot.shootCooldown = Math.max(bot.shootCooldown, 0.8);
      addImpact(bot.x, bot.y, "#d7c4ff", 20);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    if (length(enemyBullets[i].x - player.x, enemyBullets[i].y - player.y) <= 120) {
      addAbsorbBurst(enemyBullets[i].x, enemyBullets[i].y, 18, "#c5a9ff");
      enemyBullets.splice(i, 1);
    }
  }

  statusLine.textContent = "EM-PULSE Emitter triggered. Local tech disrupted.";
}

export function castJetBackThruster() {
  if (!isCombatLive() || moduleState.jetBackThruster.cooldown > 0) {
    return;
  }

  const look = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const retreat = { x: -look.x, y: -look.y };
  player.x += retreat.x * 158;
  player.y += retreat.y * 158;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  moduleState.jetBackThruster.cooldown = getModuleCooldown(3.6);
  player.shield = Math.max(player.shield, 10);
  player.shieldTime = Math.max(player.shieldTime, 0.7);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.85);
  queuePhantomModule("jetBackThruster", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playModuleCue("jetBackThruster");
  addAfterimage(player.x, player.y, player.facing, player.radius + 6, "#fff0a8");
  addImpact(player.x, player.y, "#fff0a8", 22);
  addShake(4.6);
  statusLine.textContent = "JET-BACK Thruster engaged for tactical retreat.";
}

export function castChainLightning() {
  if (!isCombatLive() || moduleState.chainLightning.cooldown > 0) {
    return;
  }

  const rankedTargets = [...aliveBots].sort((a, b) => {
    const aScore = length(a.x - input.mouseX, a.y - input.mouseY) + length(a.x - player.x, a.y - player.y) * 0.35;
    const bScore = length(b.x - input.mouseX, b.y - input.mouseY) + length(b.x - player.x, b.y - player.y) * 0.35;
    return aScore - bScore;
  });
  const firstTarget = rankedTargets[0];
  if (!firstTarget || length(firstTarget.x - player.x, firstTarget.y - player.y) > 520) {
    return;
  }

  startCast(player, "chainLightning", executeChainLightningCast, { target: firstTarget });
}

export function executeChainLightningCast(params) {
  const firstTarget = params.target;
  const aliveBots = getAllBots().filter((bot) => bot.alive);
  if (!firstTarget || !firstTarget.alive) return;

  moduleState.chainLightning.cooldown = getModuleCooldown(5.4);
  queuePhantomModule("chainLightning", { facing: player.facing, aimX: firstTarget.x, aimY: firstTarget.y });
  let sourceX = player.x;
  let sourceY = player.y;
  let currentTarget = firstTarget;
  let currentDamage = 28 * getPerkDamageMultiplier(firstTarget);
  const struck = new Set();

  for (let hop = 0; hop < 3 && currentTarget; hop += 1) {
    struck.add(currentTarget.kind);
    addBeamEffect(sourceX, sourceY, currentTarget.x, currentTarget.y, hop === 0 ? "#9feaff" : "#d6bbff", hop === 0 ? 5 : 3.5, 0.14);
    damageBot(
      currentTarget,
      currentDamage + consumePlayerEmpowerBonus(),
      hop === 0 ? "#9feaff" : "#d6bbff",
      currentTarget.x,
      currentTarget.y,
      0,
    );
    applyStatusEffect(currentTarget, "slow", getStatusDuration(0.55), 0.18 + hop * 0.04);
    addImpact(currentTarget.x, currentTarget.y, hop === 0 ? "#9feaff" : "#d6bbff", 22 - hop * 4);

    sourceX = currentTarget.x;
    sourceY = currentTarget.y;
    currentDamage *= 0.72;
    currentTarget = aliveBots
      .filter((bot) => bot.alive && !struck.has(bot.kind) && length(bot.x - sourceX, bot.y - sourceY) <= 220)
      .sort((a, b) => length(a.x - sourceX, a.y - sourceY) - length(b.x - sourceX, b.y - sourceY))[0] ?? null;
  }

  playModuleCue("chainLightning");
  addImpact(player.x + Math.cos(player.facing) * 18, player.y + Math.sin(player.facing) * 18, "#9feaff", 18);
  addShake(6.2);
  statusLine.textContent = "Chain Lightning punished the lane with cascading arcs.";
}

export function castBlink() {
  if (!isCombatLive() || moduleState.blink.cooldown > 0) {
    return;
  }
  startVisualCast(player, "blink", 0.3);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.x += direction.x * 148;
  player.y += direction.y * 148;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  moduleState.blink.cooldown = getModuleCooldown(3.4);
  player.flash = 0.1;
  queuePhantomModule("blink", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playModuleCue("blink");
  addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#7df0ff");
  addImpact(player.x, player.y, "#b3f6ff", 24);
  addShake(4.2);
  statusLine.textContent = "Blink Step snapped you through the lane.";
}

export function castPhaseDash() {
  if (!isCombatLive() || moduleState.phaseDash.cooldown > 0) {
    return;
  }
  startVisualCast(player, "overdriveServos", 0.28);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.attackCommitX = direction.x;
  player.attackCommitY = direction.y;
  player.attackCommitSpeed = 1580;
  player.attackCommitTime = 0.18;
  moduleState.phaseDash.cooldown = getModuleCooldown(4.6);
  moduleState.phaseDash.time = 0.42;
  player.ghostTime = Math.max(player.ghostTime, 0.42);
  queuePhantomModule("phaseDash", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playModuleCue("phaseDash");
  addImpact(player.x, player.y, "#b0e7ff", 30);
  addShake(5.8);
  statusLine.textContent = "Phase Dash cut you through danger.";
}

export function castSwarmMissileRack() {
  if (!isCombatLive() || moduleState.swarmMissileRack.cooldown > 0) {
    return;
  }

  startCast(player, "swarmMissileRack", executeSwarmMissileRackCast, null);
}

export function executeSwarmMissileRackCast() {
  moduleState.swarmMissileRack.cooldown = getModuleCooldown(config.swarmMissileRackCooldown);
  queuePhantomModule("swarmMissileRack", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  const burstId = beginSwarmMissileRackCast("player", config.swarmMissileRackMissiles);
  const totalAngle = 35 * (Math.PI / 180); // 35 degree cone

  for (let pellet = 0; pellet < config.swarmMissileRackMissiles; pellet += 1) {
    let spread = 0;
    if (config.swarmMissileRackMissiles > 1) {
      spread = -totalAngle / 2 + pellet * (totalAngle / (config.swarmMissileRackMissiles - 1));
    }
    const angle = baseAngle + spread;
    
    spawnBullet(player, player.x + Math.cos(angle) * 120, player.y + Math.sin(angle) * 120, bullets, "#7ddcff", config.swarmMissileRackProjectileSpeed, config.swarmMissileRackBaseDamage * getPerkDamageMultiplier(getPrimaryBot()), {
      radius: 4.5,
      life: config.swarmMissileRackLifetime,
      trailColor: "#c9f3ff",
      source: "swarm-missile-rack",
      effect: {
        kind: "swarmMissileRack",
        burstId,
        guideTurnRate: config.swarmMissileRackGuideTurnRate,
        guideDot: config.swarmMissileRackGuideDot,
        guideDelay: 0.12,
        resolved: false,
      },
    });
  }
  playModuleCue("swarmMissileRack");
  addImpact(player.x, player.y, "#7ddcff", 32);
  addShake(5.6);
  player.flash = 0.08;
  statusLine.textContent = "SWARM-MISSILE Rack deployed. Volley away.";
}

export function castRailShot() {
  if (!isCombatLive() || moduleState.railShot.cooldown > 0) {
    return;
  }

  startCast(player, "railShot", executeRailShotCast, null);
}

export function executeRailShotCast() {
  moduleState.railShot.cooldown = getModuleCooldown(5.1);
  queuePhantomModule("railShot", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  spawnBullet(player, input.mouseX, input.mouseY, bullets, "#ffd279", 1820, 46 * getPerkDamageMultiplier(getPrimaryBot()), {
    radius: 7,
    life: 0.72,
    piercing: true,
    trailColor: "#ffeab2",
    source: "rail-shot",
    effect: { kind: "rail", bonusSlow: 0.22, bonusSlowDuration: 0.8 },
  });
  playModuleCue("railShot");
  addImpact(player.x, player.y, "#ffd279", 38);
  addShake(7.2);
  player.flash = 0.12;
  statusLine.textContent = "RAIL-SHOT Sniper bolt discharged.";
}

export function castVoidCoreSingularity() {
  if (!isCombatLive() || moduleState.voidCoreSingularity.cooldown > 0) {
    return;
  }
  startCast(player, "voidCoreSingularity", executeVoidCoreSingularityCast, null);
}

export function executeVoidCoreSingularityCast() {
  moduleState.voidCoreSingularity.cooldown = getModuleCooldown(config.voidCoreSingularityCooldown);
  queuePhantomModule("voidCoreSingularity", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  supportZones.push({
    type: "gravity",
    team: "player",
    x: input.mouseX,
    y: input.mouseY,
    radius: config.voidCoreSingularityRadius,
    life: config.voidCoreSingularityDuration,
    maxLife: config.voidCoreSingularityDuration,
    color: "#d1a2ff",
    slow: config.voidCoreSingularitySlow,
    pullStrength: config.voidCoreSingularityPullStrength,
  });
  playModuleCue("voidCoreSingularity");
  addExplosion(input.mouseX, input.mouseY, config.voidCoreSingularityRadius, "#b999ff");
  addImpact(player.x, player.y, "#b999ff", 32);
  addShake(5.8);
  addShake(5.8);
  statusLine.textContent = "VOID-CORE Singularity collapsed the lane inward.";
}

export function castGhostDriftModule() {
  if (!isCombatLive() || moduleState.ghostDriftModule.cooldown > 0 || moduleState.ghostDriftModule.time > 0) {
    return;
  }
  startVisualCast(player, "ghostDriftModule", 0.35);
  moduleState.ghostDriftModule.cooldown = getModuleCooldown(config.phaseShiftCooldown);
  clearStatusEffects(player);
  if (player.pendingAxeStrike?.attackId != null) {
    completePlayerWeaponAttack(player.pendingAxeStrike.attackId, false);
  }
  if (player.activeAxeStrike?.attackId != null) {
    completePlayerWeaponAttack(player.activeAxeStrike.attackId, player.activeAxeStrike.connected || player.activeAxeStrike.worldHit);
  }
  player.attackStartupTime = 0;
  player.attackCommitTime = 0;
  player.pendingAxeStrike = null;
  player.activeAxeStrike = null;
  player.weaponCharge = 0;
  player.weaponChargeActive = false;
  moduleState.ghostDriftModule.time = config.phaseShiftDuration;
  player.ghostTime = Math.max(player.ghostTime, config.phaseShiftDuration);
  queuePhantomModule("ghostDriftModule");
  playModuleCue("phaseShift");
  addImpact(player.x, player.y, "#d2f1ff", 24);
  statusLine.textContent = "GHOST-DRIFT Module active. Vistual distortion engaged.";
}

export function castSpectreProjector() {
  if (!isCombatLive() || moduleState.spectreProjector.cooldown > 0) {
    return;
  }
  startVisualCast(player, "spectreProjector", 0.32);
  moduleState.spectreProjector.cooldown = getModuleCooldown(6.2);
  player.decoyTime = Math.max(player.decoyTime, 2.8);
  queuePhantomModule("spectreProjector");
  playModuleCue("hologramDecoy");
  addAfterimage(player.x - 46, player.y + 20, player.facing, player.radius + 8, "#caa9ff");
  addImpact(player.x, player.y, "#d8b8ff", 24);
  statusLine.textContent = "SPECTRE Projector deployed digital double.";
}

export function castOverdriveServos() {
  if (!isCombatLive() || moduleState.overdriveServos.cooldown > 0) {
    return;
  }
  startVisualCast(player, "overdriveServos", 0.4);
  moduleState.overdriveServos.cooldown = getModuleCooldown(4.2);
  player.hasteTime = Math.max(player.hasteTime, 2.2);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 1.2);
  queuePhantomModule("overdriveServos");
  playModuleCue("overdriveServos");
  addImpact(player.x, player.y, "#8dfcc7", 20);
  statusLine.textContent = "OVERDRIVE Servos engaged. High-pressure surge active.";
}

export function castCore() {
  if (!isCombatLive() || moduleState.core.cooldown > 0 || moduleState.ghostDriftModule.time > 0 || isReflexAegisLocked()) {
    return;
  }

  if (loadout.core === "phantomCore") {
    moduleState.core.cooldown = getModuleCooldown(config.ultimateCooldown);
    playModuleCue("phantomSplit");
    spawnPhantomClone();
    statusLine.textContent = "PHANTOM Core active. Echo systems online.";
    return;
  }

  if (loadout.core === "rebootProtocol") {
    moduleState.core.cooldown = getModuleCooldown(config.ultimateCooldown);
    player.revivalPrimed = 5;
    playModuleCue("revivalProtocol");
    addImpact(player.x, player.y, "#a3ffd1", 30);
    statusLine.textContent = "REBOOT Protocol primed. Emergency restart window open.";
    return;
  }

  if (loadout.core === "lockdownMatrix") {
    moduleState.core.cooldown = getModuleCooldown(config.ultimateCooldown);
    supportZones.push({
      type: "lockdown",
      team: "player",
      x: arena.width * 0.5,
      y: arena.height * 0.5,
      radius: 278,
      life: 4.2,
      maxLife: 4.2,
      color: "#ff8c67",
      slow: 0.18,
    });
    playModuleCue("voidCoreSingularity");
    addExplosion(arena.width * 0.5, arena.height * 0.5, 292, "#ff9b70");
    addShake(9);
    statusLine.textContent = "LOCKDOWN Matrix deployed. Space restricted.";
    return;
  }

  if (loadout.core === "empCataclysmCore") {
    moduleState.core.cooldown = getModuleCooldown(config.ultimateCooldown);
    playModuleCue("empCataclysm");
    castEmPulseEmitter();
    moduleState.emPulseEmitter.cooldown = Math.max(moduleState.emPulseEmitter.cooldown, 0.1);
    applyStatusEffect(enemy, "stun", getStatusDuration(0.45), 1);
    enemy.dashCooldown = Math.max(enemy.dashCooldown, 1.6);
    addExplosion(player.x, player.y, 148, "#d2b0ff");
    addShake(11.4);
    statusLine.textContent = "EMP-CATACLYSM Core collapsed. Wide tech blackout confirmed.";
    return;
  }

  if (loadout.core === "berserkCore") {
    moduleState.core.cooldown = getModuleCooldown(config.ultimateCooldown);
    player.hasteTime = Math.max(player.hasteTime, 4.2);
    player.shield = Math.max(player.shield, 28);
    player.shieldTime = Math.max(player.shieldTime, 4.2);
    player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 4.2);
    playModuleCue("berserkCore");
    addImpact(player.x, player.y, "#ff875d", 34);
    addImpact(player.x, player.y, "#ffd7bc", 52);
    addShake(10.2);
    statusLine.textContent = "Berserk Core online. Offensive pressure maximized.";
  }
}

export const castReactorCore = castCore;

export function updateModules(dt) {
  moduleState.vGripHarpoon.cooldown = Math.max(0, moduleState.vGripHarpoon.cooldown - dt);
  moduleState.hexPlateProjector.cooldown = Math.max(0, moduleState.hexPlateProjector.cooldown - dt);
  moduleState.reflexAegis.cooldown = Math.max(0, moduleState.reflexAegis.cooldown - dt);
  moduleState.overdriveServos.cooldown = Math.max(0, moduleState.overdriveServos.cooldown - dt);
  moduleState.emPulseEmitter.cooldown = Math.max(0, moduleState.emPulseEmitter.cooldown - dt);
  moduleState.jetBackThruster.cooldown = Math.max(0, moduleState.jetBackThruster.cooldown - dt);
  moduleState.chainLightning.cooldown = Math.max(0, moduleState.chainLightning.cooldown - dt);
  moduleState.blink.cooldown = Math.max(0, moduleState.blink.cooldown - dt);
  moduleState.phaseDash.cooldown = Math.max(0, moduleState.phaseDash.cooldown - dt);
  moduleState.phaseDash.time = Math.max(0, moduleState.phaseDash.time - dt);
  moduleState.swarmMissileRack.cooldown = Math.max(0, moduleState.swarmMissileRack.cooldown - dt);
  moduleState.railShot.cooldown = Math.max(0, moduleState.railShot.cooldown - dt);
  moduleState.voidCoreSingularity.cooldown = Math.max(0, moduleState.voidCoreSingularity.cooldown - dt);
  moduleState.ghostDriftModule.cooldown = Math.max(0, moduleState.ghostDriftModule.cooldown - dt);
  moduleState.ghostDriftModule.time = Math.max(0, moduleState.ghostDriftModule.time - dt);
  moduleState.spectreProjector.cooldown = Math.max(0, moduleState.spectreProjector.cooldown - dt);
  moduleState.overdriveServos.cooldown = Math.max(0, moduleState.overdriveServos.cooldown - dt);
  moduleState.core.cooldown = Math.max(0, moduleState.core.cooldown - dt);
  moduleState.core.phantomTime = Math.max(0, moduleState.core.phantomTime - dt);
  player.shieldTime = Math.max(0, player.shieldTime - dt);
  player.shieldGuardTime = Math.max(0, player.shieldGuardTime - dt);
  player.hasteTime = Math.max(0, player.hasteTime - dt);
  player.afterDashHasteTime = Math.max(0, player.afterDashHasteTime - dt);
  player.reflexAegisSpeedTime = Math.max(0, player.reflexAegisSpeedTime - dt);
  player.reflexAegisHitBonusTime = Math.max(0, player.reflexAegisHitBonusTime - dt);
  if (player.reflexAegisHitBonusTime <= 0) {
    player.reflexAegisHitBonusDamage = 0;
  }
  player.ghostTime = Math.max(0, player.ghostTime - dt);
  player.revivalPrimed = Math.max(0, player.revivalPrimed - dt);
  player.decoyTime = Math.max(0, player.decoyTime - dt);
  moduleState.reflexAegis.resolveLockTime = Math.max(0, moduleState.reflexAegis.resolveLockTime - dt);
  moduleState.reflexAegis.successFlash = Math.max(0, moduleState.reflexAegis.successFlash - dt);

  const hadAegisStartup = moduleState.reflexAegis.startupTime > 0;
  if (moduleState.reflexAegis.startupTime > 0) {
    moduleState.reflexAegis.startupTime = Math.max(0, moduleState.reflexAegis.startupTime - dt);
    if (hadAegisStartup && moduleState.reflexAegis.startupTime === 0) {
      moduleState.reflexAegis.activeTime = config.reflexAegisWindow;
    }
  } else if (moduleState.reflexAegis.activeTime > 0) {
    moduleState.reflexAegis.activeTime = Math.max(0, moduleState.reflexAegis.activeTime - dt);
    if (moduleState.reflexAegis.activeTime === 0) {
      moduleState.reflexAegis.energyPool = config.reflexAegisShield;
      moduleState.reflexAegis.recoveryTime = config.reflexAegisFailRecovery;
      moduleState.reflexAegis.cooldown = config.reflexAegisCooldown;
      playModuleCue("reflexAegisFail");
      addImpact(player.x, player.y, "#8fbad3", 18);
      statusLine.textContent = "REFLEX Aegis failure. Tech window closed.";
    }
  } else if (moduleState.reflexAegis.recoveryTime > 0) {
    moduleState.reflexAegis.recoveryTime = Math.max(0, moduleState.reflexAegis.recoveryTime - dt);
  }

  if (moduleState.vGripHarpoon.phase === "flying" && moduleState.vGripHarpoon.projectile) {
    const projectile = moduleState.vGripHarpoon.projectile;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    moduleState.vGripHarpoon.tetherPulse = Math.max(0, moduleState.vGripHarpoon.tetherPulse - dt);

    if (moduleState.vGripHarpoon.tetherPulse <= 0) {
      addBeamEffect(player.x, player.y, projectile.x, projectile.y, "#c9f8ff", 3.5, 0.08);
      moduleState.vGripHarpoon.tetherPulse = 0.045;
    }

    if (
      projectile.life <= 0 ||
      projectile.x < -20 ||
      projectile.y < -20 ||
      projectile.x > arena.width + 20 ||
      projectile.y > arena.height + 20 ||
      hitMapWithProjectile(projectile, "player")
    ) {
      resetVGripState();
      statusLine.textContent = "V-GRIP Harpoon missed.";
    } else {
      const caughtTarget = getAllBots().find(
        (bot) => bot.alive && length(projectile.x - bot.x, projectile.y - bot.y) <= projectile.radius + bot.radius,
      );

      if (caughtTarget) {
        moduleState.vGripHarpoon.phase = "pull";
        moduleState.vGripHarpoon.projectile = null;
        moduleState.vGripHarpoon.targetKind = caughtTarget.kind;
        moduleState.vGripHarpoon.pullStopRequested = false;
        applyStatusEffect(caughtTarget, "slow", getStatusDuration(config.grappleSnareDuration), config.grappleSnare);
        applyStatusEffect(caughtTarget, "snare", getStatusDuration(config.grappleSnareDuration), 1);
        addImpact(caughtTarget.x, caughtTarget.y, "#dffbff", 24);
        applyHitReaction(caughtTarget, player.x, player.y, 1.05);
        addShake(6.4);
        statusLine.textContent = "V-GRIP Harpoon caught. Pulling target.";
      }
    }
  }

  if (moduleState.vGripHarpoon.phase === "pull") {
    const target = getTrackedBot(moduleState.vGripHarpoon.targetKind);
    if (!target) {
      resetVGripState();
    } else {
      const anchor = getGrappleAnchorPoint(target);
      const direction = normalize(anchor.x - target.x, anchor.y - target.y);
      const distance = length(anchor.x - target.x, anchor.y - target.y);
      const step = Math.min(distance, config.grapplePullSpeed * dt);
      target.x += direction.x * step;
      target.y += direction.y * step;
      target.velocityX = direction.x * config.grapplePullSpeed * 0.72;
      target.velocityY = direction.y * config.grapplePullSpeed * 0.72;
      resolveMapCollision(target);
      maybeTeleportEntity(target);
      addBeamEffect(player.x, player.y, target.x, target.y, "#bdf4ff", 4.6, 0.08);

      if (moduleState.vGripHarpoon.pullStopRequested || distance <= 10) {
        addImpact(target.x, target.y, "#effdff", 20);
        resetVGripState();
      }
    }
  }

  if (player.shieldTime <= 0) {
    player.shield = 0;
  }
  if (player.shieldGuardTime <= 0 || player.shield <= 0) {
    player.shieldGuardTime = 0;
    player.shieldBreakRefundReady = false;
  }
}

export function startModuleInput(slotIndex) {
  const module = getModuleBySlot(slotIndex);
  if (!module || moduleState.ghostDriftModule.time > 0 || isReflexAegisLocked()) {
    return;
  }

  if (module.key === "boltLinkJavelin") {
    startBoltLinkJavelinCharge();
  } else if (module.key === "orbitalDistorter") {
    startOrbitalDistorterCharge();
  } else if (module.key === "vGripHarpoon") {
    castVGripHarpoon();
  } else if (module.key === "hexPlateProjector") {
    castHexPlateProjector();
  } else if (module.key === "reflexAegis") {
    castReflexAegis();
  } else if (module.key === "emPulseEmitter") {
    castEmPulseEmitter();
  } else if (module.key === "jetBackThruster") {
    castJetBackThruster();
  } else if (module.key === "chainLightning") {
    castChainLightning();
  } else if (module.key === "blink") {
    castBlink();
  } else if (module.key === "phaseDash") {
    castPhaseDash();
  } else if (module.key === "swarmMissileRack") {
    castSwarmMissileRack();
  } else if (module.key === "railShot") {
    castRailShot();
  } else if (module.key === "voidCoreSingularity") {
    castVoidCoreSingularity();
  } else if (module.key === "ghostDriftModule") {
    castGhostDriftModule();
  } else if (module.key === "spectreProjector") {
    castSpectreProjector();
  } else if (module.key === "overdriveServos") {
    castOverdriveServos();
  }
}

export function releaseModuleInput(slotIndex) {
  const module = getModuleBySlot(slotIndex);
  if (!module) {
    return;
  }

  if (module.key === "boltLinkJavelin") {
    releaseBoltLinkJavelin();
  } else if (module.key === "orbitalDistorter") {
    releaseOrbitalDistorter();
  }
}

