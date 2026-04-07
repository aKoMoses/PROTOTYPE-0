// All player ability functions (dash, javelin, field, etc.)
import { arena, config, abilityConfig, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, abilityState, loadout, sandbox, matchState, shockJavelins, enemyShockJavelins, magneticFields, supportZones, input } from "../state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addBeamEffect, addExplosion, addSlashEffect, applyHitReaction, addAbsorbBurst } from "./effects.js";
import { getMapLayout, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasPerk, getRuneValue, getStatusDuration, getPerkDamageMultiplier, getAbilityBySlot, getActiveDashCooldown, getActiveDashCharges, getDashProfile, getAbilityCooldown, hasRuneShard } from "../build/loadout.js";
import { getAllBots, getMoveVector, getPrimaryBot, isCombatLive, damageBot, spawnBullet, applyStatusEffect, getPlayerFieldModifier, getPlayerSpawn, resize, hitMapWithProjectile, clearStatusEffects, completePlayerWeaponAttack, consumePlayerEmpowerBonus, beginPulseBurstCast } from "./combat.js";
import { bullets, enemyBullets } from "../state.js";
import { playAbilityCue } from "../audio.js";
import { queuePhantomAbility, spawnPhantomClone } from "./phantom.js";

export function getJavelinProfile() {
  return {
    speed: abilityConfig.javelin.speed,
    damage: abilityConfig.javelin.damage,
    radius: abilityConfig.javelin.radius,
    range: abilityConfig.javelin.range,
    slow: abilityConfig.javelin.slow,
    slowDuration: abilityConfig.javelin.slowDuration,
    color: abilityConfig.javelin.color,
    glow: abilityConfig.javelin.glow,
    trail: abilityConfig.javelin.trail,
    piercing: false,
  };
}

export function getFieldProfile(mode = abilityState.field.mode) {
  const profile = mode === "hold" ? abilityConfig.field.hold : abilityConfig.field.tap;

  return {
    ...profile,
    radius: profile.radius,
    slow: profile.slow,
    disruption: 0,
    moveBoost: 1,
    moveBoostDuration: 0,
    projectileSlowEdge: profile.projectileSlowEdge,
    projectileSlowCore: profile.projectileSlowCore,
  };
}

function triggerAbilityCastRuneEffects() {
  const defenseCore = getRuneValue("defense", "primary");
  if (defenseCore > 0) {
    const buildStats = getBuildStats();
    player.hp = clamp(player.hp + defenseCore * 2, 0, buildStats.maxHp);
  }

  const spellsCore = getRuneValue("spells", "primary");
  if (spellsCore > 0) {
    player.hasteTime = Math.max(player.hasteTime, 0.35 + spellsCore * 0.12);
  }
}

function getTrackedBot(kind) {
  return getAllBots().find((bot) => bot.alive && bot.kind === kind) ?? null;
}

function resetGrappleState() {
  abilityState.grapple.phase = "idle";
  abilityState.grapple.projectile = null;
  abilityState.grapple.targetKind = null;
  abilityState.grapple.pullStopRequested = false;
  abilityState.grapple.tetherPulse = 0;
}

function finalizeJavelinCycle(startCooldown = true) {
  abilityState.javelin.recastReady = false;
  abilityState.javelin.targetKind = null;
  abilityState.javelin.activeTime = 0;
  abilityState.javelin.pendingCooldown = false;
  if (startCooldown) {
    abilityState.javelin.cooldown = Math.max(
      abilityState.javelin.cooldown,
      getAbilityCooldown(abilityConfig.javelin.cooldown),
    );
  }
}

function isEnergyParryLocked() {
  return (
    abilityState.energyParry.startupTime > 0 ||
    abilityState.energyParry.activeTime > 0 ||
    abilityState.energyParry.recoveryTime > 0
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

  if (isEnergyParryLocked() || abilityState.dash.inputHeld || abilityState.dash.charges <= 0 || abilityState.dash.activeTime > 0) {
    return;
  }

  abilityState.dash.inputHeld = true;
  abilityState.dash.holdTime = 0;
  abilityState.dash.upgraded = false;
  executeDash("tap");
}

export function executeDash(dashMode) {
  if (isEnergyParryLocked() || (dashMode === "tap" && abilityState.dash.charges <= 0)) {
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
  if (hasPerk("adrenalSurge")) {
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

export function startJavelinCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.javelin.recastReady) {
    recastShockJavelin();
    return;
  }

  if (abilityState.javelin.cooldown > 0 || abilityState.javelin.pendingCooldown || abilityState.javelin.activeTime > 0) {
    return;
  }

  const profile = getJavelinProfile();
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);

  shockJavelins.push({
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

  abilityState.javelin.aimX = input.mouseX;
  abilityState.javelin.aimY = input.mouseY;
  abilityState.javelin.lastDirectionX = direction.x;
  abilityState.javelin.lastDirectionY = direction.y;
  triggerAbilityCastRuneEffects();
  player.recoil = Math.max(player.recoil, 0.22);
  queuePhantomAbility("shockJavelin", {
    facing: player.facing,
    aimX: input.mouseX,
    aimY: input.mouseY,
  });
  playAbilityCue("shockJavelin");
  addImpact(player.x + direction.x * 22, player.y + direction.y * 22, profile.color, 24);
  addImpact(player.x + direction.x * 30, player.y + direction.y * 30, "#e6fbff", 16);
  addShake(6.8);
  statusLine.textContent = "Shock Javelin armed a marked engage window.";
}

export function releaseShockJavelin() {
  return;
}

export function confirmShockJavelinImpact(target) {
  if (!target?.alive) {
    finalizeJavelinCycle(true);
    return;
  }

  const direction = normalize(target.x - player.x, target.y - player.y);
  abilityState.javelin.recastReady = true;
  abilityState.javelin.targetKind = target.kind;
  abilityState.javelin.activeTime = getStatusDuration(config.javelinSlowDuration);
  abilityState.javelin.pendingCooldown = true;
  abilityState.javelin.lastDirectionX = direction.x;
  abilityState.javelin.lastDirectionY = direction.y;
  applyStatusEffect(target, "slow", getStatusDuration(config.javelinSlowDuration), config.javelinSlow);
  applyStatusEffect(target, "shock", getStatusDuration(config.javelinSlowDuration), 1);
  addImpact(target.x, target.y, "#fff5bd", 22);
  addShake(7.2);
  statusLine.textContent = "Shock Javelin connected. Recast to blink behind the electrified target.";
}

export function expireShockJavelin(startCooldown = true) {
  finalizeJavelinCycle(startCooldown);
}

export function recastShockJavelin() {
  if (!abilityState.javelin.recastReady || abilityState.javelin.activeTime <= 0) {
    return false;
  }

  const target = getTrackedBot(abilityState.javelin.targetKind);
  if (!target) {
    finalizeJavelinCycle(true);
    return false;
  }

  const direction =
    abilityState.javelin.lastDirectionX !== 0 || abilityState.javelin.lastDirectionY !== 0
      ? normalize(abilityState.javelin.lastDirectionX, abilityState.javelin.lastDirectionY)
      : normalize(target.x - player.x, target.y - player.y);
  const previousX = player.x;
  const previousY = player.y;

  player.x = target.x - direction.x * (target.radius + player.radius + config.javelinRecastDistance);
  player.y = target.y - direction.y * (target.radius + player.radius + config.javelinRecastDistance);
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  player.flash = Math.max(player.flash, 0.12);
  player.ghostTime = Math.max(player.ghostTime, 0.16);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.55);
  abilityState.javelin.recastReady = false;
  addAfterimage(previousX, previousY, player.facing, player.radius + 4, "#9ce9ff");
  addAfterimage(player.x, player.y, player.facing, player.radius + 5, "#fff0a4");
  addBeamEffect(previousX, previousY, target.x, target.y, "#8fe8ff", 4, 0.14);
  addImpact(player.x, player.y, "#fff0a4", 24);
  addShake(5.8);
  playAbilityCue("blinkStep");
  statusLine.textContent = "Shock Javelin recast snapped you behind the target.";
  return true;
}

export function spawnEnemyJavelin(charged = false, targetEntity = player) {
  const direction = normalize((targetEntity?.x ?? player.x) - enemy.x, (targetEntity?.y ?? player.y) - enemy.y);
  const speed = charged ? config.javelinSpeed * 0.94 : config.javelinSpeed;
  const radius = charged ? config.javelinRadius + 1 : config.javelinRadius;
  const damage = charged ? config.javelinDamage * 1.15 : config.javelinDamage * 0.92;

  enemyShockJavelins.push({
    x: enemy.x + direction.x * (enemy.radius + 12),
    y: enemy.y + direction.y * (enemy.radius + 12),
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius,
    damage,
    charged,
    life: config.javelinRange / Math.max(1, speed) + 0.08,
    color: charged ? "#ffd07e" : "#ffb575",
    glow: charged ? "#fff0bc" : "#ffe0b5",
    trail: charged ? "#ffe1a8" : "#ffc28c",
    stun: 0,
    slow: charged ? config.javelinSlow * 1.05 : config.javelinSlow * 0.92,
    slowDuration: config.javelinSlowDuration,
  });

  enemy.javelinCooldown = charged ? 4.8 : 4;
  addImpact(enemy.x + direction.x * 24, enemy.y + direction.y * 24, charged ? "#ffe4ad" : "#ffb27e", charged ? 18 : 12);
}

export function updateJavelinAbility(dt) {
  abilityState.javelin.cooldown = Math.max(0, abilityState.javelin.cooldown - dt);
  if (abilityState.javelin.activeTime > 0) {
    abilityState.javelin.activeTime = Math.max(0, abilityState.javelin.activeTime - dt);
    const trackedTarget = abilityState.javelin.targetKind ? getTrackedBot(abilityState.javelin.targetKind) : null;
    if (trackedTarget) {
      abilityState.javelin.lastDirectionX = trackedTarget.x - player.x;
      abilityState.javelin.lastDirectionY = trackedTarget.y - player.y;
    }
    if (abilityState.javelin.pendingCooldown && abilityState.javelin.activeTime <= 0) {
      finalizeJavelinCycle(true);
    }
  }
}

export function startFieldCharge() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.field.cooldown > 0 || abilityState.field.charging) {
    return;
  }

  abilityState.field.charging = true;
  abilityState.field.chargeTime = 0;
  abilityState.field.mode = "tap";
  statusLine.textContent = "Charging Magnetic Field.";
}

export function releaseMagneticField() {
  if (!abilityState.field.charging) {
    return;
  }

  const isHold = abilityState.field.chargeTime >= abilityConfig.field.chargeThreshold;
  abilityState.field.mode = isHold ? "hold" : "tap";
  const fieldProfile = { ...getFieldProfile(abilityState.field.mode) };
  if (isHold && hasRuneShard("spells")) {
    fieldProfile.duration += 0.6;
    fieldProfile.slow += 0.08;
  }
  const centerX = fieldProfile.anchor === "player" ? player.x : input.mouseX;
  const centerY = fieldProfile.anchor === "player" ? player.y : input.mouseY;

  magneticFields.push({
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
    abilityState.field.moveBoostTime = fieldProfile.moveBoostDuration;
  }

  abilityState.field.charging = false;
  abilityState.field.chargeTime = 0;
  abilityState.field.cooldown = getAbilityCooldown(abilityConfig.field.cooldown);
  triggerAbilityCastRuneEffects();
  queuePhantomAbility("magneticField", {
    mode: abilityState.field.mode,
    facing: player.facing,
    aimX: centerX,
    aimY: centerY,
  });
  playAbilityCue("magneticField");
  addImpact(centerX, centerY, fieldProfile.color, isHold ? 28 : 22);
  addShake(isHold ? 6.5 : 4.2);
  statusLine.textContent = isHold
    ? "Magnetic Field deployed for zone control."
    : "Magnetic Field deployed around you.";
}

export function updateFieldAbility(dt) {
  abilityState.field.cooldown = Math.max(0, abilityState.field.cooldown - dt);
  abilityState.field.moveBoostTime = Math.max(0, abilityState.field.moveBoostTime - dt);

  if (abilityState.field.charging) {
    abilityState.field.chargeTime = Math.min(1, abilityState.field.chargeTime + dt);
    abilityState.field.mode =
      abilityState.field.chargeTime >= abilityConfig.field.chargeThreshold ? "hold" : "tap";
  }

  for (let index = magneticFields.length - 1; index >= 0; index -= 1) {
    const field = magneticFields[index];
    field.life -= dt;

    if (field.anchor === "player") {
      field.x = player.x;
      field.y = player.y;
    }

    if (field.life <= 0) {
      magneticFields.splice(index, 1);
    }
  }
}

export function castMagneticGrapple() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.grapple.phase === "pull") {
    abilityState.grapple.pullStopRequested = true;
    statusLine.textContent = "Magnetic Grapple recast cut the pull early.";
    return;
  }

  if (abilityState.grapple.cooldown > 0 || abilityState.grapple.phase !== "idle") {
    return;
  }

  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const life = config.grappleRange / Math.max(1, config.grappleProjectileSpeed) + 0.12;
  abilityState.grapple.cooldown = getAbilityCooldown(config.grappleCooldown);
  abilityState.grapple.phase = "flying";
  abilityState.grapple.projectile = {
    x: player.x + direction.x * (player.radius + 14),
    y: player.y + direction.y * (player.radius + 14),
    vx: direction.x * config.grappleProjectileSpeed,
    vy: direction.y * config.grappleProjectileSpeed,
    radius: config.grappleProjectileRadius,
    life,
    color: "#9feeff",
    trail: "#dffbff",
  };
  abilityState.grapple.pullStopRequested = false;
  abilityState.grapple.targetKind = null;
  triggerAbilityCastRuneEffects();
  player.flash = 0.08;
  queuePhantomAbility("magneticGrapple", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("magneticGrapple");
  addImpact(player.x, player.y, "#c5f6ff", 24);
  addAfterimage(player.x, player.y, player.facing, player.radius + 3, "#9ee9ff");
  addShake(4.2);
  statusLine.textContent = "Magnetic Grapple launched. Confirm the hook before you commit in.";
}

export function castEnergyShield() {
  if (!isCombatLive() || abilityState.shield.cooldown > 0) {
    return;
  }

  abilityState.shield.cooldown = getAbilityCooldown(config.shieldCooldown);
  triggerAbilityCastRuneEffects();
  player.shield = Math.max(player.shield, config.shieldValue + getRuneValue("defense", "primary") * 3);
  player.shieldTime = config.shieldDuration;
  player.shieldGuardTime = config.shieldDuration;
  player.shieldBreakRefundReady = true;
  queuePhantomAbility("energyShield");
  playAbilityCue("energyShield");
  addImpact(player.x, player.y, "#9cd5ff", 28);
  addShake(4);
  statusLine.textContent = "Energy Shield online. It blocks burst and incoming control while it holds.";
}

export function castEnergyParry() {
  if (
    !isCombatLive() ||
    abilityState.energyParry.cooldown > 0 ||
    isEnergyParryLocked() ||
    abilityState.phaseShift.time > 0
  ) {
    return;
  }

  if (player.pendingAxeStrike?.attackId != null) {
    completePlayerWeaponAttack(player.pendingAxeStrike.attackId, false);
  }
  if (player.activeAxeStrike?.attackId != null) {
    completePlayerWeaponAttack(player.activeAxeStrike.attackId, player.activeAxeStrike.connected || player.activeAxeStrike.worldHit);
  }

  triggerAbilityCastRuneEffects();
  player.attackStartupTime = 0;
  player.attackCommitTime = 0;
  player.pendingAxeStrike = null;
  player.activeAxeStrike = null;
  player.weaponCharge = 0;
  player.weaponChargeActive = false;
  abilityState.energyParry.startupTime = config.energyParryStartup;
  abilityState.energyParry.activeTime = 0;
  abilityState.energyParry.recoveryTime = 0;
  abilityState.energyParry.resolveLockTime = 0;
  abilityState.energyParry.successFlash = 0;
  queuePhantomAbility("energyParry");
  playAbilityCue("energyParry");
  addImpact(player.x, player.y, "#bdf4ff", 22);
  statusLine.textContent = "Energy Parry armed. Hold the read and catch the hit clean.";
}

export function castEmpBurst() {
  if (!isCombatLive() || abilityState.emp.cooldown > 0) {
    return;
  }

  abilityState.emp.cooldown = getAbilityCooldown(config.boosterCooldown);
  triggerAbilityCastRuneEffects();
  queuePhantomAbility("empBurst");
  playAbilityCue("empBurst");
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

  statusLine.textContent = "EMP Burst disrupted nearby tech pressure.";
}

export function castBackstepBurst() {
  if (!isCombatLive() || abilityState.backstep.cooldown > 0) {
    return;
  }

  const look = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const retreat = { x: -look.x, y: -look.y };
  player.x += retreat.x * 158;
  player.y += retreat.y * 158;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  abilityState.backstep.cooldown = getAbilityCooldown(3.6);
  triggerAbilityCastRuneEffects();
  player.shield = Math.max(player.shield, 10);
  player.shieldTime = Math.max(player.shieldTime, 0.7);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 0.85);
  queuePhantomAbility("backstepBurst", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("backstepBurst");
  addAfterimage(player.x, player.y, player.facing, player.radius + 6, "#fff0a8");
  addImpact(player.x, player.y, "#fff0a8", 22);
  addShake(4.6);
  statusLine.textContent = "Backstep Burst snapped you out of close pressure.";
}

export function castChainLightning() {
  if (!isCombatLive() || abilityState.chainLightning.cooldown > 0) {
    return;
  }

  const aliveBots = getAllBots().filter((bot) => bot.alive);
  if (aliveBots.length === 0) {
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

  abilityState.chainLightning.cooldown = getAbilityCooldown(5.4);
  triggerAbilityCastRuneEffects();
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

export function castBlinkStep() {
  if (!isCombatLive() || abilityState.blink.cooldown > 0) {
    return;
  }
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.x += direction.x * 148;
  player.y += direction.y * 148;
  resolveMapCollision(player);
  maybeTeleportEntity(player);
  abilityState.blink.cooldown = getAbilityCooldown(3.4);
  triggerAbilityCastRuneEffects();
  player.flash = 0.1;
  queuePhantomAbility("blinkStep", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("blinkStep");
  addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#7df0ff");
  addImpact(player.x, player.y, "#b3f6ff", 24);
  addShake(4.2);
  statusLine.textContent = "Blink Step snapped you through the lane.";
}

export function castPhaseDash() {
  if (!isCombatLive() || abilityState.phaseDash.cooldown > 0) {
    return;
  }
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  player.attackCommitX = direction.x;
  player.attackCommitY = direction.y;
  player.attackCommitSpeed = 1580;
  player.attackCommitTime = 0.18;
  abilityState.phaseDash.cooldown = getAbilityCooldown(4.6);
  triggerAbilityCastRuneEffects();
  abilityState.phaseDash.time = 0.42;
  player.ghostTime = Math.max(player.ghostTime, 0.42);
  queuePhantomAbility("phaseDash", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("phaseDash");
  addImpact(player.x, player.y, "#b0e7ff", 30);
  addShake(5.8);
  statusLine.textContent = "Phase Dash cut you through danger.";
}

export function castPulseBurst() {
  if (!isCombatLive() || abilityState.pulseBurst.cooldown > 0) {
    return;
  }
  abilityState.pulseBurst.cooldown = getAbilityCooldown(config.pulseBurstCooldown);
  triggerAbilityCastRuneEffects();
  queuePhantomAbility("pulseBurst", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  const burstId = beginPulseBurstCast("player", config.pulseBurstMissiles);
  for (let pellet = 0; pellet < config.pulseBurstMissiles; pellet += 1) {
    const spread = -0.18 + pellet * (0.36 / Math.max(1, config.pulseBurstMissiles - 1));
    const angle = baseAngle + spread;
    spawnBullet(player, player.x + Math.cos(angle) * 120, player.y + Math.sin(angle) * 120, bullets, "#7ddcff", config.pulseBurstProjectileSpeed, config.pulseBurstBaseDamage * getPerkDamageMultiplier(getPrimaryBot()), {
      radius: 4.5,
      life: config.pulseBurstLifetime,
      trailColor: "#c9f3ff",
      source: "pulse-burst",
      effect: {
        kind: "pulseBurst",
        burstId,
        guideTurnRate: config.pulseBurstGuideTurnRate,
        guideDot: config.pulseBurstGuideDot,
        resolved: false,
      },
    });
  }
  playAbilityCue("pulseBurst");
  addImpact(player.x + Math.cos(baseAngle) * 24, player.y + Math.sin(baseAngle) * 24, "#84dcff", 18);
  addShake(5.2);
  statusLine.textContent = "Pulse Burst fired. Lock the target in place to cash in the full volley.";
}

export function castRailShotAbility() {
  if (!isCombatLive() || abilityState.railShot.cooldown > 0) {
    return;
  }
  abilityState.railShot.cooldown = getAbilityCooldown(5.1);
  triggerAbilityCastRuneEffects();
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
  addImpact(player.x + Math.cos(player.facing) * 28, player.y + Math.sin(player.facing) * 28, "#ffd279", 22);
  addShake(7.6);
  statusLine.textContent = "Rail Shot tore a high-voltage line through the arena.";
}

export function castGravityWell() {
  if (!isCombatLive() || abilityState.gravityWell.cooldown > 0) {
    return;
  }
  abilityState.gravityWell.cooldown = getAbilityCooldown(config.gravityWellCooldown);
  triggerAbilityCastRuneEffects();
  queuePhantomAbility("gravityWell", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  supportZones.push({
    type: "gravity",
    team: "player",
    x: input.mouseX,
    y: input.mouseY,
    radius: config.gravityWellRadius,
    life: config.gravityWellDuration,
    maxLife: config.gravityWellDuration,
    color: "#b999ff",
    slow: config.gravityWellSlow,
    pullStrength: config.gravityWellPullStrength,
  });
  playAbilityCue("gravityWell");
  addExplosion(input.mouseX, input.mouseY, config.gravityWellRadius + 8, "#b999ff");
  addShake(5.8);
  statusLine.textContent = "Gravity Well collapsed the lane inward. Respect the singularity.";
}

export function castPhaseShift() {
  if (!isCombatLive() || abilityState.phaseShift.cooldown > 0 || abilityState.phaseShift.time > 0) {
    return;
  }
  abilityState.phaseShift.cooldown = getAbilityCooldown(config.phaseShiftCooldown);
  triggerAbilityCastRuneEffects();
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
  abilityState.phaseShift.time = config.phaseShiftDuration;
  player.ghostTime = Math.max(player.ghostTime, config.phaseShiftDuration);
  queuePhantomAbility("phaseShift");
  playAbilityCue("phaseShift");
  addImpact(player.x, player.y, "#d2f1ff", 24);
  statusLine.textContent = "Phase Shift purged the pressure. Dash only until you rematerialize.";
}

export function castHologramDecoy() {
  if (!isCombatLive() || abilityState.hologramDecoy.cooldown > 0) {
    return;
  }
  abilityState.hologramDecoy.cooldown = getAbilityCooldown(6.2);
  triggerAbilityCastRuneEffects();
  player.decoyTime = Math.max(player.decoyTime, 2.8);
  queuePhantomAbility("hologramDecoy");
  playAbilityCue("hologramDecoy");
  addAfterimage(player.x - 46, player.y + 20, player.facing, player.radius + 8, "#caa9ff");
  addImpact(player.x, player.y, "#d8b8ff", 24);
  statusLine.textContent = "Hologram Decoy split your read.";
}

export function castSpeedSurge() {
  if (!isCombatLive() || abilityState.speedSurge.cooldown > 0) {
    return;
  }
  abilityState.speedSurge.cooldown = getAbilityCooldown(4.2);
  triggerAbilityCastRuneEffects();
  player.hasteTime = Math.max(player.hasteTime, 2.2);
  player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 1.2);
  queuePhantomAbility("speedSurge");
  playAbilityCue("speedSurge");
  addImpact(player.x, player.y, "#8dfcc7", 20);
  statusLine.textContent = "Speed Surge pushed your tempo forward.";
}

export function castUltimate() {
  if (!isCombatLive() || abilityState.ultimate.cooldown > 0 || abilityState.phaseShift.time > 0 || isEnergyParryLocked()) {
    return;
  }

  if (loadout.ultimate === "phantomSplit") {
    abilityState.ultimate.cooldown = getAbilityCooldown(config.ultimateCooldown);
    playAbilityCue("phantomSplit");
    spawnPhantomClone();
    return;
  }

  if (loadout.ultimate === "revivalProtocol") {
    abilityState.ultimate.cooldown = getAbilityCooldown(config.ultimateCooldown);
    player.revivalPrimed = 5;
    playAbilityCue("revivalProtocol");
    addImpact(player.x, player.y, "#a3ffd1", 30);
    statusLine.textContent = "Revival Protocol primed. You have one failsafe window.";
    return;
  }

  if (loadout.ultimate === "arenaLockdown") {
    abilityState.ultimate.cooldown = getAbilityCooldown(config.ultimateCooldown);
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
    playAbilityCue("gravityWell");
    addExplosion(arena.width * 0.5, arena.height * 0.5, 292, "#ff9b70");
    addShake(9);
    statusLine.textContent = "Arena Lockdown collapsed the duel space.";
    return;
  }

  if (loadout.ultimate === "empCataclysm") {
    abilityState.ultimate.cooldown = getAbilityCooldown(config.ultimateCooldown);
    playAbilityCue("empCataclysm");
    castEmpBurst();
    abilityState.emp.cooldown = Math.max(abilityState.emp.cooldown, 0.1);
    applyStatusEffect(enemy, "stun", getStatusDuration(0.45), 1);
    enemy.dashCooldown = Math.max(enemy.dashCooldown, 1.6);
    addExplosion(player.x, player.y, 148, "#d2b0ff");
    addShake(11.4);
    statusLine.textContent = "EMP Cataclysm blanked the arena's tech for a moment.";
    return;
  }

  if (loadout.ultimate === "berserkCore") {
    abilityState.ultimate.cooldown = getAbilityCooldown(config.ultimateCooldown);
    player.hasteTime = Math.max(player.hasteTime, 4.2);
    player.shield = Math.max(player.shield, 28);
    player.shieldTime = Math.max(player.shieldTime, 4.2);
    player.afterDashHasteTime = Math.max(player.afterDashHasteTime, 4.2);
    playAbilityCue("berserkCore");
    addImpact(player.x, player.y, "#ff875d", 34);
    addImpact(player.x, player.y, "#ffd7bc", 52);
    addShake(10.2);
    statusLine.textContent = "Berserk Core online. Press relentlessly.";
  }
}

export function updateExtraAbilities(dt) {
  abilityState.grapple.cooldown = Math.max(0, abilityState.grapple.cooldown - dt);
  abilityState.shield.cooldown = Math.max(0, abilityState.shield.cooldown - dt);
  abilityState.energyParry.cooldown = Math.max(0, abilityState.energyParry.cooldown - dt);
  abilityState.booster.cooldown = Math.max(0, abilityState.booster.cooldown - dt);
  abilityState.emp.cooldown = Math.max(0, abilityState.emp.cooldown - dt);
  abilityState.backstep.cooldown = Math.max(0, abilityState.backstep.cooldown - dt);
  abilityState.chainLightning.cooldown = Math.max(0, abilityState.chainLightning.cooldown - dt);
  abilityState.blink.cooldown = Math.max(0, abilityState.blink.cooldown - dt);
  abilityState.phaseDash.cooldown = Math.max(0, abilityState.phaseDash.cooldown - dt);
  abilityState.phaseDash.time = Math.max(0, abilityState.phaseDash.time - dt);
  abilityState.pulseBurst.cooldown = Math.max(0, abilityState.pulseBurst.cooldown - dt);
  abilityState.railShot.cooldown = Math.max(0, abilityState.railShot.cooldown - dt);
  abilityState.gravityWell.cooldown = Math.max(0, abilityState.gravityWell.cooldown - dt);
  abilityState.phaseShift.cooldown = Math.max(0, abilityState.phaseShift.cooldown - dt);
  abilityState.phaseShift.time = Math.max(0, abilityState.phaseShift.time - dt);
  abilityState.hologramDecoy.cooldown = Math.max(0, abilityState.hologramDecoy.cooldown - dt);
  abilityState.speedSurge.cooldown = Math.max(0, abilityState.speedSurge.cooldown - dt);
  abilityState.ultimate.cooldown = Math.max(0, abilityState.ultimate.cooldown - dt);
  abilityState.ultimate.phantomTime = Math.max(0, abilityState.ultimate.phantomTime - dt);
  player.shieldTime = Math.max(0, player.shieldTime - dt);
  player.shieldGuardTime = Math.max(0, player.shieldGuardTime - dt);
  player.hasteTime = Math.max(0, player.hasteTime - dt);
  player.afterDashHasteTime = Math.max(0, player.afterDashHasteTime - dt);
  player.energyParrySpeedTime = Math.max(0, player.energyParrySpeedTime - dt);
  player.energyParryHitBonusTime = Math.max(0, player.energyParryHitBonusTime - dt);
  if (player.energyParryHitBonusTime <= 0) {
    player.energyParryHitBonusDamage = 0;
  }
  player.ghostTime = Math.max(0, player.ghostTime - dt);
  player.revivalPrimed = Math.max(0, player.revivalPrimed - dt);
  player.decoyTime = Math.max(0, player.decoyTime - dt);
  abilityState.energyParry.resolveLockTime = Math.max(0, abilityState.energyParry.resolveLockTime - dt);
  abilityState.energyParry.successFlash = Math.max(0, abilityState.energyParry.successFlash - dt);

  const hadParryStartup = abilityState.energyParry.startupTime > 0;
  if (abilityState.energyParry.startupTime > 0) {
    abilityState.energyParry.startupTime = Math.max(0, abilityState.energyParry.startupTime - dt);
    if (hadParryStartup && abilityState.energyParry.startupTime === 0) {
      abilityState.energyParry.activeTime = config.energyParryWindow;
    }
  } else if (abilityState.energyParry.activeTime > 0) {
    abilityState.energyParry.activeTime = Math.max(0, abilityState.energyParry.activeTime - dt);
    if (abilityState.energyParry.activeTime === 0) {
      abilityState.energyParry.recoveryTime = config.energyParryFailRecovery;
      abilityState.energyParry.cooldown = config.energyParryCooldown;
      playAbilityCue("energyParryFail");
      addImpact(player.x, player.y, "#8fbad3", 18);
      statusLine.textContent = "Energy Parry whiffed. You are briefly punishable.";
    }
  } else if (abilityState.energyParry.recoveryTime > 0) {
    abilityState.energyParry.recoveryTime = Math.max(0, abilityState.energyParry.recoveryTime - dt);
  }

  if (abilityState.grapple.phase === "flying" && abilityState.grapple.projectile) {
    const projectile = abilityState.grapple.projectile;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    abilityState.grapple.tetherPulse = Math.max(0, abilityState.grapple.tetherPulse - dt);

    if (abilityState.grapple.tetherPulse <= 0) {
      addBeamEffect(player.x, player.y, projectile.x, projectile.y, "#c9f8ff", 3.5, 0.08);
      abilityState.grapple.tetherPulse = 0.045;
    }

    if (
      projectile.life <= 0 ||
      projectile.x < -20 ||
      projectile.y < -20 ||
      projectile.x > arena.width + 20 ||
      projectile.y > arena.height + 20 ||
      hitMapWithProjectile(projectile, "player")
    ) {
      resetGrappleState();
      statusLine.textContent = "Magnetic Grapple missed. Commit only when the catch line is real.";
    } else {
      const caughtTarget = getAllBots().find(
        (bot) => bot.alive && length(projectile.x - bot.x, projectile.y - bot.y) <= projectile.radius + bot.radius,
      );

      if (caughtTarget) {
        abilityState.grapple.phase = "pull";
        abilityState.grapple.projectile = null;
        abilityState.grapple.targetKind = caughtTarget.kind;
        abilityState.grapple.pullStopRequested = false;
        applyStatusEffect(caughtTarget, "slow", getStatusDuration(config.grappleSnareDuration), config.grappleSnare);
        applyStatusEffect(caughtTarget, "snare", getStatusDuration(config.grappleSnareDuration), 1);
        addImpact(caughtTarget.x, caughtTarget.y, "#dffbff", 24);
        applyHitReaction(caughtTarget, player.x, player.y, 1.05);
        addShake(6.4);
        statusLine.textContent = "Magnetic Grapple caught. Recast to cut the pull at the right spacing.";
      }
    }
  }

  if (abilityState.grapple.phase === "pull") {
    const target = getTrackedBot(abilityState.grapple.targetKind);
    if (!target) {
      resetGrappleState();
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

      if (abilityState.grapple.pullStopRequested || distance <= 10) {
        addImpact(target.x, target.y, "#effdff", 20);
        resetGrappleState();
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
  if (!ability || abilityState.phaseShift.time > 0 || isEnergyParryLocked()) {
    return;
  }

  if (ability.key === "shockJavelin") {
    startJavelinCharge();
  } else if (ability.key === "magneticField") {
    startFieldCharge();
  } else if (ability.key === "magneticGrapple") {
    castMagneticGrapple();
  } else if (ability.key === "energyShield") {
    castEnergyShield();
  } else if (ability.key === "energyParry") {
    castEnergyParry();
  } else if (ability.key === "empBurst") {
    castEmpBurst();
  } else if (ability.key === "backstepBurst") {
    castBackstepBurst();
  } else if (ability.key === "chainLightning") {
    castChainLightning();
  } else if (ability.key === "blinkStep") {
    castBlinkStep();
  } else if (ability.key === "phaseDash") {
    castPhaseDash();
  } else if (ability.key === "pulseBurst") {
    castPulseBurst();
  } else if (ability.key === "railShot") {
    castRailShotAbility();
  } else if (ability.key === "gravityWell") {
    castGravityWell();
  } else if (ability.key === "phaseShift") {
    castPhaseShift();
  } else if (ability.key === "hologramDecoy") {
    castHologramDecoy();
  } else if (ability.key === "speedSurge") {
    castSpeedSurge();
  }
}

export function releaseAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability) {
    return;
  }

  if (ability.key === "shockJavelin") {
    releaseShockJavelin();
  } else if (ability.key === "magneticField") {
    releaseMagneticField();
  }
}

