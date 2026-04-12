// All player ability functions (dash, javelin, field, etc.)
import { arena, config, abilityConfig, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, abilityState, sandbox, matchState, boltLinkJavelins, enemyBoltLinkJavelins, orbitalDistorterFields, supportZones, input } from "../state.js";
import { loadout } from "../state/app-state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addBeamEffect, addExplosion, addSlashEffect, applyHitReaction, addAbsorbBurst } from "./effects.js";
import { getMapLayout, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasPerk, getStatusDuration, getPerkDamageMultiplier, getAbilityBySlot, getActiveDashCooldown, getActiveDashCharges, getDashProfile, getAbilityCooldown } from "../build/loadout.js";
import { getAllBots, getMoveVector, getPrimaryBot, isCombatLive, damageBot, spawnBullet, applyStatusEffect, getPlayerFieldModifier, getPlayerSpawn, resize, hitMapWithProjectile, clearStatusEffects, completePlayerWeaponAttack, consumePlayerEmpowerBonus, beginSwarmMissileRackCast } from "./combat.js";
import { bullets, enemyBullets } from "../state.js";
import { playAbilityCue } from "../audio.js";
import { queuePhantomAbility, spawnPhantomClone } from "./phantom.js";
import { startCast, startVisualCast } from "./casting.js";

export function getBoltLinkJavelinProfile() {
  return {
    speed: config.boltLinkJavelinSpeed,
    damage: config.boltLinkJavelinDamage,
    radius: config.boltLinkJavelinRadius,
    range: config.boltLinkJavelinRange,
    slow: config.boltLinkJavelinSlow,
    slowDuration: config.boltLinkJavelinSlowDuration,
    color: abilityConfig.javelin.color,
    glow: abilityConfig.javelin.glow,
    trail: abilityConfig.javelin.trail,
    piercing: false,
  };
}

export function getOrbitalDistorterProfile(mode = abilityState.orbitalDistorter.mode) {
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
  abilityState.vGripHarpoon.phase = "idle";
  abilityState.vGripHarpoon.projectile = null;
  abilityState.vGripHarpoon.targetKind = null;
  abilityState.vGripHarpoon.pullStopRequested = false;
  abilityState.vGripHarpoon.tetherPulse = 0;
}

function finalizeBoltLinkCycle(startCooldown = true) {
  abilityState.boltLinkJavelin.recastReady = false;
  abilityState.boltLinkJavelin.targetKind = null;
  abilityState.boltLinkJavelin.activeTime = 0;
  abilityState.boltLinkJavelin.pendingCooldown = false;
  if (startCooldown) {
    abilityState.boltLinkJavelin.cooldown = Math.max(
      abilityState.boltLinkJavelin.cooldown,
      getAbilityCooldown(config.boltLinkJavelinCooldown),
    );
  }
}

function isReflexAegisLocked() {
  return (
    abilityState.reflexAegis.startupTime > 0 ||
    abilityState.reflexAegis.activeTime > 0 ||
    abilityState.reflexAegis.recoveryTime > 0
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

  if (isReflexAegisLocked() || abilityState.dash.inputHeld || abilityState.dash.charges <= 0 || abilityState.dash.activeTime > 0) {
    return;
  }

  abilityState.dash.inputHeld = true;
  abilityState.dash.holdTime = 0;
  abilityState.dash.upgraded = false;
  executeDash("tap");
}

export function executeDash(dashMode) {
  if (isReflexAegisLocked() || (dashMode === "tap" && abilityState.dash.charges <= 0)) {
    return;
  }

  const move = getMoveVector();
  const aim = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const dashDirection = move.x !== 0 || move.y !== 0 ? move : aim;
  const dashProfile = getDashProfile(dashMode);

  abilityState.dash.mode = dashMode;
  abilityState.dash.vectorX = dashDirection.x;
  abilityState.dash.vectorY = dashDirection.y;
  abilityState.dash.activeTime = Math.max(abilityState.dash.activeTime, dashProfile.duration);
  abilityState.dash.invulnerabilityTime = Math.max(
    abilityState.dash.invulnerabilityTime,
    dashProfile.invulnerability,
  );

  if (dashMode === "tap") {
    abilityState.dash.charges -= 1;
  }

  if (
    abilityState.dash.charges < getActiveDashCharges() &&
    abilityState.dash.rechargeTimer <= 0
  ) {
    abilityState.dash.rechargeTimer = getActiveDashCooldown();
  }

  player.flash = 0.12;
  if (hasPerk("adrenalInjector")) {
    player.afterDashHasteTime = 1.2;
  }
  if (hasPerk("ghostCircuit")) {
    player.ghostTime = 0.28;
  }
  playAbilityCue("dash");
  addImpact(player.x, player.y, dashMode === "hold" ? "#c8ffe4" : "#9df4b7", dashMode === "hold" ? 34 : 26);
  addShake(dashMode === "hold" ? 7.5 : 6);
}

export function upgradeDashToHold() {
  if (abilityState.dash.mode === "hold") {
    return;
  }

  const holdProfile = getDashProfile("hold");
  abilityState.dash.mode = "hold";
  abilityState.dash.activeTime = Math.max(abilityState.dash.activeTime, holdProfile.duration * 0.82);
  abilityState.dash.invulnerabilityTime = Math.max(
    abilityState.dash.invulnerabilityTime,
    holdProfile.invulnerability,
  );
  addAfterimage(player.x, player.y, player.facing, player.radius + 3, holdProfile.trailColor);
}

export function releaseDashInput() {
  if (!abilityState.dash.inputHeld) {
    return;
  }

  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
}

export function updateDashAbility(dt) {
  const activeDashCharges = getActiveDashCharges();

  if (abilityState.dash.inputHeld) {
    abilityState.dash.holdTime = Math.min(0.4, abilityState.dash.holdTime + dt);
  }

  if (
    abilityState.dash.inputHeld &&
    abilityState.dash.activeTime > 0 &&
    !abilityState.dash.upgraded &&
    abilityState.dash.holdTime >= abilityConfig.dash.holdThreshold
  ) {
    abilityState.dash.upgraded = true;
    upgradeDashToHold();
  }

  if (abilityState.dash.charges > activeDashCharges) {
    abilityState.dash.charges = activeDashCharges;
  }

  if (abilityState.dash.charges < activeDashCharges) {
    abilityState.dash.rechargeTimer = Math.max(0, abilityState.dash.rechargeTimer - dt);

    if (abilityState.dash.rechargeTimer === 0) {
      abilityState.dash.charges += 1;

      if (abilityState.dash.charges < activeDashCharges) {
        abilityState.dash.rechargeTimer = getActiveDashCooldown();
      }
    }
  } else {
    abilityState.dash.rechargeTimer = 0;
  }

  abilityState.dash.invulnerabilityTime = Math.max(0, abilityState.dash.invulnerabilityTime - dt);

  if (abilityState.dash.activeTime > 0) {
    const dashProfile = getDashProfile(abilityState.dash.mode);
    abilityState.dash.activeTime = Math.max(0, abilityState.dash.activeTime - dt);
    player.velocityX = abilityState.dash.vectorX * dashProfile.speed;
    player.velocityY = abilityState.dash.vectorY * dashProfile.speed;
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

  if (abilityState.boltLinkJavelin.recastReady) {
    recastBoltLinkJavelin();
    return;
  }

  if (abilityState.boltLinkJavelin.cooldown > 0 || abilityState.boltLinkJavelin.pendingCooldown || abilityState.boltLinkJavelin.activeTime > 0) {
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

  abilityState.boltLinkJavelin.aimX = input.mouseX;
  abilityState.boltLinkJavelin.aimY = input.mouseY;
  abilityState.boltLinkJavelin.lastDirectionX = direction.x;
  abilityState.boltLinkJavelin.lastDirectionY = direction.y;
  abilityState.boltLinkJavelin.pendingCooldown = true;
  player.recoil = Math.max(player.recoil, 0.22);
  queuePhantomAbility("boltLinkJavelin", {
    facing: player.facing,
    aimX: input.mouseX,
    aimY: input.mouseY,
  });
  playAbilityCue("boltLinkJavelin");
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
  abilityState.boltLinkJavelin.recastReady = true;
  abilityState.boltLinkJavelin.targetKind = target.kind;
  abilityState.boltLinkJavelin.activeTime = getStatusDuration(config.boltLinkJavelinSlowDuration);
  abilityState.boltLinkJavelin.pendingCooldown = true;
  abilityState.boltLinkJavelin.lastDirectionX = direction.x;
  abilityState.boltLinkJavelin.lastDirectionY = direction.y;
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
  if (!abilityState.boltLinkJavelin.recastReady || abilityState.boltLinkJavelin.activeTime <= 0) {
    return false;
  }

  const target = getTrackedBot(abilityState.boltLinkJavelin.targetKind);
  if (!target) {
    finalizeBoltLinkJavelinCycle(true);
    return false;
  }

  const direction =
    abilityState.boltLinkJavelin.lastDirectionX !== 0 || abilityState.boltLinkJavelin.lastDirectionY !== 0
      ? normalize(abilityState.boltLinkJavelin.lastDirectionX, abilityState.boltLinkJavelin.lastDirectionY)
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
  abilityState.boltLinkJavelin.recastReady = false;
  addAfterimage(previousX, previousY, player.facing, player.radius + 4, "#9ce9ff");
  addAfterimage(player.x, player.y, player.facing, player.radius + 5, "#fff0a4");
  addBeamEffect(previousX, previousY, target.x, target.y, "#8fe8ff", 4, 0.14);
  addImpact(player.x, player.y, "#fff0a4", 24);
  addShake(5.8);
  playAbilityCue("blink");
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

export function updateBoltLinkJavelinAbility(dt) {
  abilityState.boltLinkJavelin.cooldown = Math.max(0, abilityState.boltLinkJavelin.cooldown - dt);
  if (abilityState.boltLinkJavelin.activeTime > 0) {
    abilityState.boltLinkJavelin.activeTime = Math.max(0, abilityState.boltLinkJavelin.activeTime - dt);
    const trackedTarget = abilityState.boltLinkJavelin.targetKind ? getTrackedBot(abilityState.boltLinkJavelin.targetKind) : null;
    if (trackedTarget) {
      abilityState.boltLinkJavelin.lastDirectionX = trackedTarget.x - player.x;
      abilityState.boltLinkJavelin.lastDirectionY = trackedTarget.y - player.y;
    }
    if (abilityState.boltLinkJavelin.pendingCooldown && abilityState.boltLinkJavelin.activeTime <= 0) {
      finalizeBoltLinkJavelinCycle(true);
    }
  }
}

export function startOrbitalDistorterCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.orbitalDistorter.cooldown > 0 || abilityState.orbitalDistorter.charging) {
    return;
  }

  abilityState.orbitalDistorter.charging = true;
  abilityState.orbitalDistorter.chargeTime = 0;
  abilityState.orbitalDistorter.mode = "tap";
  statusLine.textContent = "Booting ORBITAL Distorter array...";
}

export function releaseOrbitalDistorter() {
  if (!abilityState.orbitalDistorter.charging) {
    return;
  }

  const isHold = abilityState.orbitalDistorter.chargeTime >= config.orbitalDistorterChargeThreshold;
  abilityState.orbitalDistorter.mode = isHold ? "hold" : "tap";
  const fieldProfile = { ...getOrbitalDistorterProfile(abilityState.orbitalDistorter.mode) };
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
    abilityState.orbitalDistorter.moveBoostTime = fieldProfile.moveBoostDuration;
  }

  abilityState.orbitalDistorter.charging = false;
  abilityState.orbitalDistorter.chargeTime = 0;
  abilityState.orbitalDistorter.cooldown = getAbilityCooldown(config.orbitalDistorterCooldown);
  queuePhantomAbility("orbitalDistorter", {
    mode: abilityState.orbitalDistorter.mode,
    facing: player.facing,
    aimX: centerX,
    aimY: centerY,
  });
  playAbilityCue("orbitalDistorter");
  addImpact(centerX, centerY, fieldProfile.color, isHold ? 28 : 22);
  addShake(isHold ? 6.5 : 4.2);
  statusLine.textContent = isHold
    ? "ORBITAL Distorter zone initialized for tactical control."
    : "ORBITAL Distorter active. Localized projectile disruption engaged.";
}

export function updateOrbitalDistorterAbility(dt) {
  abilityState.orbitalDistorter.cooldown = Math.max(0, abilityState.orbitalDistorter.cooldown - dt);
  abilityState.orbitalDistorter.moveBoostTime = Math.max(0, abilityState.orbitalDistorter.moveBoostTime - dt);

  if (abilityState.orbitalDistorter.charging) {
    abilityState.orbitalDistorter.chargeTime = Math.min(1, abilityState.orbitalDistorter.chargeTime + dt);
    abilityState.orbitalDistorter.mode =
      abilityState.orbitalDistorter.chargeTime >= config.orbitalDistorterChargeThreshold ? "hold" : "tap";
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

  if (abilityState.vGripHarpoon.phase === "pull") {
    abilityState.vGripHarpoon.pullStopRequested = true;
    statusLine.textContent = "V-GRIP cable released early.";
    return;
  }

  if (abilityState.vGripHarpoon.cooldown > 0 || abilityState.vGripHarpoon.phase !== "idle") {
    return;
  }

  startCast(player, "vGripHarpoon", executeVGripHarpoonCast);
}

export function executeVGripHarpoonCast() {
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const life = config.vGripHarpoonRange / Math.max(1, config.vGripHarpoonProjectileSpeed) + 0.12;
  abilityState.vGripHarpoon.cooldown = getAbilityCooldown(config.vGripHarpoonCooldown);
  abilityState.vGripHarpoon.phase = "flying";
  abilityState.vGripHarpoon.projectile = {
    x: player.x + direction.x * (player.radius + 14),
    y: player.y + direction.y * (player.radius + 14),
    vx: direction.x * config.vGripHarpoonProjectileSpeed,
    vy: direction.y * config.vGripHarpoonProjectileSpeed,
    radius: config.vGripHarpoonProjectileRadius,
    life,
    color: "#9feeff",
    trail: "#dffbff",
  };
  abilityState.vGripHarpoon.pullStopRequested = false;
  abilityState.vGripHarpoon.targetKind = null;
  player.flash = 0.08;
  queuePhantomAbility("vGripHarpoon", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("vGripHarpoon");
  addImpact(player.x, player.y, "#9feeff", 32);
  addShake(5.4);
  statusLine.textContent = "V-GRIP Harpoon launched. Awaiting target confirmation.";
}

export function castHexPlateProjector() {
  if (!isCombatLive() || abilityState.hexPlateProjector.cooldown > 0) {
    return;
  }

  startVisualCast(player, "hexPlateProjector", 0.3);
  abilityState.hexPlateProjector.cooldown = getAbilityCooldown(config.shieldCooldown);
  player.shield = Math.max(player.shield, config.shieldValue);
  player.shieldTime = config.shieldDuration;
  player.shieldGuardTime = config.shieldDuration;
  player.shieldBreakRefundReady = true;
  queuePhantomAbility("hexPlateProjector");
  playAbilityCue("hexPlateProjector");
  addImpact(player.x, player.y, "#9cd5ff", 28);
  addShake(4);
  statusLine.textContent = "HEX-PLATE Projector online. Reinforced plating active.";
}

export function castReflexAegis() {
  if (
    !isCombatLive() ||
    abilityState.reflexAegis.cooldown > 0 ||
    isReflexAegisLocked() ||
    abilityState.ghostDriftModule.time > 0
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
  abilityState.reflexAegis.startupTime = config.reflexAegisStartup;
  abilityState.reflexAegis.activeTime = 0;
  abilityState.reflexAegis.recoveryTime = 0;
  abilityState.reflexAegis.resolveLockTime = 0;
  abilityState.reflexAegis.successFlash = 0;
  queuePhantomAbility("reflexAegis");
  playAbilityCue("reflexAegis");
  addImpact(player.x, player.y, "#bdf4ff", 22);
  statusLine.textContent = "REFLEX Aegis armed. Tactical counter window open.";
}

export function castEmPulseEmitter() {
  if (!isCombatLive() || abilityState.emPulseEmitter.cooldown > 0) {
    return;
  }

  startVisualCast(player, "emPulseEmitter", 0.35);
  abilityState.emPulseEmitter.cooldown = getAbilityCooldown(config.boosterCooldown);
  queuePhantomAbility("emPulseEmitter");
  playAbilityCue("emPulseEmitter");
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
  if (!isCombatLive() || abilityState.jetBackThruster.cooldown > 0) {
    return;
  }

  const look = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const retreat = { x: -look.x, y: -look.y };
  player.x += retreat.x * 158;
  player.y += retreat.y * 158;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  abilityState.jetBackThruster.cooldown = getAbilityCooldown(3.6);
  player.shield = Math.max(player.shield, 10);
  player.shieldTime = Math.max(player.shieldTime, 0.7);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.85);
  queuePhantomAbility("jetBackThruster", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("jetBackThruster");
  addAfterimage(player.x, player.y, player.facing, player.radius + 6, "#fff0a8");
  addImpact(player.x, player.y, "#fff0a8", 22);
  addShake(4.6);
  statusLine.textContent = "JET-BACK Thruster engaged for tactical retreat.";
}

export function castChainLightning() {
  if (!isCombatLive() || abilityState.chainLightning.cooldown > 0) {
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

  abilityState.chainLightning.cooldown = getAbilityCooldown(5.4);
  queuePhantomAbility("chainLightning", { facing: player.facing, aimX: firstTarget.x, aimY: firstTarget.y });
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

  playAbilityCue("chainLightning");
  addImpact(player.x + Math.cos(player.facing) * 18, player.y + Math.sin(player.facing) * 18, "#9feaff", 18);
  addShake(6.2);
  statusLine.textContent = "Chain Lightning punished the lane with cascading arcs.";
}

export function castBlink() {
  if (!isCombatLive() || abilityState.blink.cooldown > 0) {
    return;
  }
  startVisualCast(player, "blink", 0.3);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.x += direction.x * 148;
  player.y += direction.y * 148;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  abilityState.blink.cooldown = getAbilityCooldown(3.4);
  player.flash = 0.1;
  queuePhantomAbility("blink", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("blink");
  addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#7df0ff");
  addImpact(player.x, player.y, "#b3f6ff", 24);
  addShake(4.2);
  statusLine.textContent = "Blink Step snapped you through the lane.";
}

export function castPhaseDash() {
  if (!isCombatLive() || abilityState.phaseDash.cooldown > 0) {
    return;
  }
  startVisualCast(player, "overdriveServos", 0.28);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.attackCommitX = direction.x;
  player.attackCommitY = direction.y;
  player.attackCommitSpeed = 1580;
  player.attackCommitTime = 0.18;
  abilityState.phaseDash.cooldown = getAbilityCooldown(4.6);
  abilityState.phaseDash.time = 0.42;
  player.ghostTime = Math.max(player.ghostTime, 0.42);
  queuePhantomAbility("phaseDash", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("phaseDash");
  addImpact(player.x, player.y, "#b0e7ff", 30);
  addShake(5.8);
  statusLine.textContent = "Phase Dash cut you through danger.";
}

export function castSwarmMissileRack() {
  if (!isCombatLive() || abilityState.swarmMissileRack.cooldown > 0) {
    return;
  }

  startCast(player, "swarmMissileRack", executeSwarmMissileRackCast, null);
}

export function executeSwarmMissileRackCast() {
  abilityState.swarmMissileRack.cooldown = getAbilityCooldown(config.swarmMissileRackCooldown);
  queuePhantomAbility("swarmMissileRack", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
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
  playAbilityCue("swarmMissileRack");
  addImpact(player.x, player.y, "#7ddcff", 32);
  addShake(5.6);
  player.flash = 0.08;
  statusLine.textContent = "SWARM-MISSILE Rack deployed. Volley away.";
}

export function castRailShotAbility() {
  if (!isCombatLive() || abilityState.railShot.cooldown > 0) {
    return;
  }

  startCast(player, "railShot", executeRailShotCast, null);
}

export function executeRailShotCast() {
  abilityState.railShot.cooldown = getAbilityCooldown(5.1);
  queuePhantomAbility("railShot", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  spawnBullet(player, input.mouseX, input.mouseY, bullets, "#ffd279", 1820, 46 * getPerkDamageMultiplier(getPrimaryBot()), {
    radius: 7,
    life: 0.72,
    piercing: true,
    trailColor: "#ffeab2",
    source: "rail-shot",
    effect: { kind: "rail", bonusSlow: 0.22, bonusSlowDuration: 0.8 },
  });
  playAbilityCue("railShot");
  addImpact(player.x, player.y, "#ffd279", 38);
  addShake(7.2);
  player.flash = 0.12;
  statusLine.textContent = "RAIL-SHOT Sniper bolt discharged.";
}

export function castVoidCoreSingularity() {
  if (!isCombatLive() || abilityState.voidCoreSingularity.cooldown > 0) {
    return;
  }
  startCast(player, "voidCoreSingularity", executeVoidCoreSingularityCast, null);
}

export function executeVoidCoreSingularityCast() {
  abilityState.voidCoreSingularity.cooldown = getAbilityCooldown(config.voidCoreSingularityCooldown);
  queuePhantomAbility("voidCoreSingularity", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
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
  playAbilityCue("voidCoreSingularity");
  addExplosion(input.mouseX, input.mouseY, config.voidCoreSingularityRadius, "#b999ff");
  addImpact(player.x, player.y, "#b999ff", 32);
  addShake(5.8);
  addShake(5.8);
  statusLine.textContent = "VOID-CORE Singularity collapsed the lane inward.";
}

export function castGhostDriftModule() {
  if (!isCombatLive() || abilityState.ghostDriftModule.cooldown > 0 || abilityState.ghostDriftModule.time > 0) {
    return;
  }
  startVisualCast(player, "ghostDriftModule", 0.35);
  abilityState.ghostDriftModule.cooldown = getAbilityCooldown(config.phaseShiftCooldown);
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
  abilityState.ghostDriftModule.time = config.phaseShiftDuration;
  player.ghostTime = Math.max(player.ghostTime, config.phaseShiftDuration);
  queuePhantomAbility("ghostDriftModule");
  playAbilityCue("phaseShift");
  addImpact(player.x, player.y, "#d2f1ff", 24);
  statusLine.textContent = "GHOST-DRIFT Module active. Vistual distortion engaged.";
}

export function castSpectreProjector() {
  if (!isCombatLive() || abilityState.spectreProjector.cooldown > 0) {
    return;
  }
  startVisualCast(player, "spectreProjector", 0.32);
  abilityState.spectreProjector.cooldown = getAbilityCooldown(6.2);
  player.decoyTime = Math.max(player.decoyTime, 2.8);
  queuePhantomAbility("spectreProjector");
  playAbilityCue("hologramDecoy");
  addAfterimage(player.x - 46, player.y + 20, player.facing, player.radius + 8, "#caa9ff");
  addImpact(player.x, player.y, "#d8b8ff", 24);
  statusLine.textContent = "SPECTRE Projector deployed digital double.";
}

export function castOverdriveServos() {
  if (!isCombatLive() || abilityState.overdriveServos.cooldown > 0) {
    return;
  }
  startVisualCast(player, "overdriveServos", 0.4);
  abilityState.overdriveServos.cooldown = getAbilityCooldown(4.2);
  player.hasteTime = Math.max(player.hasteTime, 2.2);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 1.2);
  queuePhantomAbility("overdriveServos");
  playAbilityCue("overdriveServos");
  addImpact(player.x, player.y, "#8dfcc7", 20);
  statusLine.textContent = "OVERDRIVE Servos engaged. High-pressure surge active.";
}

export function castReactorCore() {
  if (!isCombatLive() || abilityState.core.cooldown > 0 || abilityState.ghostDriftModule.time > 0 || isReflexAegisLocked()) {
    return;
  }

  if (loadout.core === "phantomCore") {
    abilityState.core.cooldown = getAbilityCooldown(config.ultimateCooldown);
    playAbilityCue("phantomSplit");
    spawnPhantomClone();
    statusLine.textContent = "PHANTOM Core active. Echo systems online.";
    return;
  }

  if (loadout.core === "rebootProtocol") {
    abilityState.core.cooldown = getAbilityCooldown(config.ultimateCooldown);
    player.revivalPrimed = 5;
    playAbilityCue("revivalProtocol");
    addImpact(player.x, player.y, "#a3ffd1", 30);
    statusLine.textContent = "REBOOT Protocol primed. Emergency restart window open.";
    return;
  }

  if (loadout.core === "lockdownMatrix") {
    abilityState.core.cooldown = getAbilityCooldown(config.ultimateCooldown);
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
    playAbilityCue("voidCoreSingularity");
    addExplosion(arena.width * 0.5, arena.height * 0.5, 292, "#ff9b70");
    addShake(9);
    statusLine.textContent = "LOCKDOWN Matrix deployed. Space restricted.";
    return;
  }

  if (loadout.core === "empCataclysmCore") {
    abilityState.core.cooldown = getAbilityCooldown(config.ultimateCooldown);
    playAbilityCue("empCataclysm");
    castEmPulseEmitter();
    abilityState.emPulseEmitter.cooldown = Math.max(abilityState.emPulseEmitter.cooldown, 0.1);
    applyStatusEffect(enemy, "stun", getStatusDuration(0.45), 1);
    enemy.dashCooldown = Math.max(enemy.dashCooldown, 1.6);
    addExplosion(player.x, player.y, 148, "#d2b0ff");
    addShake(11.4);
    statusLine.textContent = "EMP-CATACLYSM Core collapsed. Wide tech blackout confirmed.";
    return;
  }

  if (loadout.core === "berserkCore") {
    abilityState.core.cooldown = getAbilityCooldown(config.ultimateCooldown);
    player.hasteTime = Math.max(player.hasteTime, 4.2);
    player.shield = Math.max(player.shield, 28);
    player.shieldTime = Math.max(player.shieldTime, 4.2);
    player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 4.2);
    playAbilityCue("berserkCore");
    addImpact(player.x, player.y, "#ff875d", 34);
    addImpact(player.x, player.y, "#ffd7bc", 52);
    addShake(10.2);
    statusLine.textContent = "Berserk Core online. Offensive pressure maximized.";
  }
}

export function updateExtraAbilities(dt) {
  abilityState.vGripHarpoon.cooldown = Math.max(0, abilityState.vGripHarpoon.cooldown - dt);
  abilityState.hexPlateProjector.cooldown = Math.max(0, abilityState.hexPlateProjector.cooldown - dt);
  abilityState.reflexAegis.cooldown = Math.max(0, abilityState.reflexAegis.cooldown - dt);
  abilityState.overdriveServos.cooldown = Math.max(0, abilityState.overdriveServos.cooldown - dt);
  abilityState.emPulseEmitter.cooldown = Math.max(0, abilityState.emPulseEmitter.cooldown - dt);
  abilityState.jetBackThruster.cooldown = Math.max(0, abilityState.jetBackThruster.cooldown - dt);
  abilityState.chainLightning.cooldown = Math.max(0, abilityState.chainLightning.cooldown - dt);
  abilityState.blink.cooldown = Math.max(0, abilityState.blink.cooldown - dt);
  abilityState.phaseDash.cooldown = Math.max(0, abilityState.phaseDash.cooldown - dt);
  abilityState.phaseDash.time = Math.max(0, abilityState.phaseDash.time - dt);
  abilityState.swarmMissileRack.cooldown = Math.max(0, abilityState.swarmMissileRack.cooldown - dt);
  abilityState.railShot.cooldown = Math.max(0, abilityState.railShot.cooldown - dt);
  abilityState.voidCoreSingularity.cooldown = Math.max(0, abilityState.voidCoreSingularity.cooldown - dt);
  abilityState.ghostDriftModule.cooldown = Math.max(0, abilityState.ghostDriftModule.cooldown - dt);
  abilityState.ghostDriftModule.time = Math.max(0, abilityState.ghostDriftModule.time - dt);
  abilityState.spectreProjector.cooldown = Math.max(0, abilityState.spectreProjector.cooldown - dt);
  abilityState.overdriveServos.cooldown = Math.max(0, abilityState.overdriveServos.cooldown - dt);
  abilityState.core.cooldown = Math.max(0, abilityState.core.cooldown - dt);
  abilityState.core.phantomTime = Math.max(0, abilityState.core.phantomTime - dt);
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
  abilityState.reflexAegis.resolveLockTime = Math.max(0, abilityState.reflexAegis.resolveLockTime - dt);
  abilityState.reflexAegis.successFlash = Math.max(0, abilityState.reflexAegis.successFlash - dt);

  const hadAegisStartup = abilityState.reflexAegis.startupTime > 0;
  if (abilityState.reflexAegis.startupTime > 0) {
    abilityState.reflexAegis.startupTime = Math.max(0, abilityState.reflexAegis.startupTime - dt);
    if (hadAegisStartup && abilityState.reflexAegis.startupTime === 0) {
      abilityState.reflexAegis.activeTime = config.reflexAegisWindow;
    }
  } else if (abilityState.reflexAegis.activeTime > 0) {
    abilityState.reflexAegis.activeTime = Math.max(0, abilityState.reflexAegis.activeTime - dt);
    if (abilityState.reflexAegis.activeTime === 0) {
      abilityState.reflexAegis.energyPool = config.reflexAegisShield;
      abilityState.reflexAegis.recoveryTime = config.reflexAegisFailRecovery;
      abilityState.reflexAegis.cooldown = config.reflexAegisCooldown;
      playAbilityCue("reflexAegisFail");
      addImpact(player.x, player.y, "#8fbad3", 18);
      statusLine.textContent = "REFLEX Aegis failure. Tech window closed.";
    }
  } else if (abilityState.reflexAegis.recoveryTime > 0) {
    abilityState.reflexAegis.recoveryTime = Math.max(0, abilityState.reflexAegis.recoveryTime - dt);
  }

  if (abilityState.vGripHarpoon.phase === "flying" && abilityState.vGripHarpoon.projectile) {
    const projectile = abilityState.vGripHarpoon.projectile;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    abilityState.vGripHarpoon.tetherPulse = Math.max(0, abilityState.vGripHarpoon.tetherPulse - dt);

    if (abilityState.vGripHarpoon.tetherPulse <= 0) {
      addBeamEffect(player.x, player.y, projectile.x, projectile.y, "#c9f8ff", 3.5, 0.08);
      abilityState.vGripHarpoon.tetherPulse = 0.045;
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
        abilityState.vGripHarpoon.phase = "pull";
        abilityState.vGripHarpoon.projectile = null;
        abilityState.vGripHarpoon.targetKind = caughtTarget.kind;
        abilityState.vGripHarpoon.pullStopRequested = false;
        applyStatusEffect(caughtTarget, "slow", getStatusDuration(config.grappleSnareDuration), config.grappleSnare);
        applyStatusEffect(caughtTarget, "snare", getStatusDuration(config.grappleSnareDuration), 1);
        addImpact(caughtTarget.x, caughtTarget.y, "#dffbff", 24);
        applyHitReaction(caughtTarget, player.x, player.y, 1.05);
        addShake(6.4);
        statusLine.textContent = "V-GRIP Harpoon caught. Pulling target.";
      }
    }
  }

  if (abilityState.vGripHarpoon.phase === "pull") {
    const target = getTrackedBot(abilityState.vGripHarpoon.targetKind);
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

      if (abilityState.vGripHarpoon.pullStopRequested || distance <= 10) {
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

export function startAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability || abilityState.ghostDriftModule.time > 0 || isReflexAegisLocked()) {
    return;
  }

  if (ability.key === "boltLinkJavelin") {
    startBoltLinkJavelinCharge();
  } else if (ability.key === "orbitalDistorter") {
    startOrbitalDistorterCharge();
  } else if (ability.key === "vGripHarpoon") {
    castVGripHarpoon();
  } else if (ability.key === "hexPlateProjector") {
    castHexPlateProjector();
  } else if (ability.key === "reflexAegis") {
    castReflexAegis();
  } else if (ability.key === "emPulseEmitter") {
    castEmPulseEmitter();
  } else if (ability.key === "jetBackThruster") {
    castJetBackThruster();
  } else if (ability.key === "chainLightning") {
    castChainLightning();
  } else if (ability.key === "blink") {
    castBlink();
  } else if (ability.key === "phaseDash") {
    castPhaseDash();
  } else if (ability.key === "swarmMissileRack") {
    castSwarmMissileRack();
  } else if (ability.key === "railShot") {
    castRailShotAbility();
  } else if (ability.key === "voidCoreSingularity") {
    castVoidCoreSingularity();
  } else if (ability.key === "ghostDriftModule") {
    castGhostDriftModule();
  } else if (ability.key === "spectreProjector") {
    castSpectreProjector();
  } else if (ability.key === "overdriveServos") {
    castOverdriveServos();
  }
}

export function releaseAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability) {
    return;
  }

  if (ability.key === "boltLinkJavelin") {
    releaseBoltLinkJavelin();
  } else if (ability.key === "orbitalDistorter") {
    releaseOrbitalDistorter();
  }
}

