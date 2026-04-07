// All player ability functions (dash, javelin, field, etc.)
import { arena, config, abilityConfig, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, abilityState, loadout, sandbox, matchState, shockJavelins, enemyShockJavelins, magneticFields, supportZones, input } from "../state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addBeamEffect, addExplosion, addSlashEffect, applyHitReaction, addAbsorbBurst } from "./effects.js";
import { getMapLayout, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasPerk, getRuneValue, getStatusDuration, getPerkDamageMultiplier, getAbilityBySlot, getActiveDashCooldown, getActiveDashCharges, getDashProfile, getAbilityCooldown, hasRuneShard } from "../build/loadout.js";
import { getAllBots, getMoveVector, getPrimaryBot, isCombatLive, damageBot, spawnBullet, applyStatusEffect, getPlayerFieldModifier, getPlayerSpawn, resize } from "./combat.js";
import { bullets, enemyBullets } from "../state.js";
import { playAbilityCue } from "../audio.js";
import { queuePhantomAbility, spawnPhantomClone } from "./phantom.js";
import { collectTargetsAlongLine } from "./weapons.js";

export function getJavelinProfile(mode = abilityState.javelin.mode) {
  const profile = mode === "hold" ? abilityConfig.javelin.hold : abilityConfig.javelin.tap;

  return {
    ...profile,
    piercing: false,
    speed: profile.speed,
    stun: profile.stun ?? 0,
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

function getMagneticGrappleTarget() {
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const hits = collectTargetsAlongLine(
    player,
    Math.atan2(direction.y, direction.x),
    config.grappleRange,
    config.grappleWidth,
    getAllBots(),
    true,
  );
  return hits[0]?.target ?? null;
}

export function startDashInput() {
  if (!isCombatLive()) {
    return;
  }

  if (abilityState.dash.inputHeld || abilityState.dash.charges <= 0 || abilityState.dash.activeTime > 0) {
    return;
  }

  abilityState.dash.inputHeld = true;
  abilityState.dash.holdTime = 0;
  abilityState.dash.upgraded = false;
  executeDash("tap");
}

export function executeDash(dashMode) {
  if (dashMode === "tap" && abilityState.dash.charges <= 0) {
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

  if (abilityState.javelin.cooldown > 0 || abilityState.javelin.charging) {
    return;
  }

  abilityState.javelin.charging = true;
  abilityState.javelin.chargeTime = 0;
  abilityState.javelin.mode = "tap";
  statusLine.textContent = "Charging Shock Javelin.";
}

export function releaseShockJavelin() {
  if (!abilityState.javelin.charging) {
    return;
  }

  const chargeTime = abilityState.javelin.chargeTime;
  const isCharged = chargeTime >= abilityConfig.javelin.chargeThreshold;
  abilityState.javelin.mode = isCharged ? "hold" : "tap";
  const javelinProfile = { ...getJavelinProfile(abilityState.javelin.mode) };
  if (isCharged && hasRuneShard("spells")) {
    javelinProfile.damage += 12;
    javelinProfile.stun += 0.18;
    javelinProfile.radius += 2;
  }
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);

  shockJavelins.push({
    x: player.x + direction.x * (player.radius + 12),
    y: player.y + direction.y * (player.radius + 12),
    vx: direction.x * javelinProfile.speed,
    vy: direction.y * javelinProfile.speed,
    radius: javelinProfile.radius,
    damage: javelinProfile.damage,
    charged: isCharged,
    life: 1.1,
    color: javelinProfile.color,
    glow: javelinProfile.glow,
    trail: javelinProfile.trail,
    piercing: javelinProfile.piercing,
    slow: javelinProfile.slow ?? 0,
    slowDuration: javelinProfile.slowDuration ?? 0,
    stun: javelinProfile.stun ?? 0,
    hitTargets: new Set(),
  });

  abilityState.javelin.charging = false;
  abilityState.javelin.chargeTime = 0;
  abilityState.javelin.cooldown = getAbilityCooldown(abilityConfig.javelin.cooldown);
  triggerAbilityCastRuneEffects();
  player.recoil = Math.max(player.recoil, 0.22);
  queuePhantomAbility("shockJavelin", {
    mode: abilityState.javelin.mode,
    facing: player.facing,
    aimX: input.mouseX,
    aimY: input.mouseY,
  });
  playAbilityCue("shockJavelin");
  addImpact(
    player.x + direction.x * 22,
    player.y + direction.y * 22,
    javelinProfile.color,
    isCharged ? 28 : 22,
  );
  addImpact(
    player.x + direction.x * 28,
    player.y + direction.y * 28,
    isCharged ? "#fff0bb" : "#dff7ff",
    isCharged ? 18 : 14,
  );
  addShake(isCharged ? 8.2 : 6);
  statusLine.textContent = isCharged
    ? "Charged Shock Javelin launched."
    : "Shock Javelin launched.";
}

export function spawnEnemyJavelin(charged = false, targetEntity = player) {
  const direction = normalize((targetEntity?.x ?? player.x) - enemy.x, (targetEntity?.y ?? player.y) - enemy.y);
  const speed = charged ? 860 : 1020;
  const radius = charged ? 14 : 10;
  const damage = charged ? 14 : 10;

  enemyShockJavelins.push({
    x: enemy.x + direction.x * (enemy.radius + 12),
    y: enemy.y + direction.y * (enemy.radius + 12),
    vx: direction.x * speed,
    vy: direction.y * speed,
    radius,
    damage,
    charged,
    life: 1,
    color: charged ? "#ffb497" : "#ff8a77",
    glow: charged ? "#ffd6c8" : "#ffc1b2",
    trail: charged ? "#ffd8b5" : "#ff9c8a",
    stun: charged ? 0.34 : 0,
    slow: charged ? 0 : 0.2,
    slowDuration: charged ? 0 : 0.65,
  });

  enemy.javelinCooldown = charged ? 4.2 : 3.2;
  addImpact(enemy.x + direction.x * 24, enemy.y + direction.y * 24, charged ? "#ffd1bd" : "#ff8a77", charged ? 18 : 12);
}

export function updateJavelinAbility(dt) {
  abilityState.javelin.cooldown = Math.max(0, abilityState.javelin.cooldown - dt);

  if (abilityState.javelin.charging) {
    abilityState.javelin.chargeTime = Math.min(abilityConfig.javelin.maxCharge, abilityState.javelin.chargeTime + dt);
    abilityState.javelin.mode =
      abilityState.javelin.chargeTime >= abilityConfig.javelin.chargeThreshold ? "hold" : "tap";
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
  if (!isCombatLive() || abilityState.grapple.cooldown > 0) {
    return;
  }

  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const target = getMagneticGrappleTarget();
  abilityState.grapple.cooldown = getAbilityCooldown(config.grappleCooldown);
  triggerAbilityCastRuneEffects();
  player.flash = 0.08;
  queuePhantomAbility("magneticGrapple", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  playAbilityCue("magneticGrapple");

  if (!target) {
    addImpact(player.x, player.y, "#c5f6ff", 22);
    addAfterimage(player.x, player.y, player.facing, player.radius + 3, "#9ee9ff");
    addShake(3.8);
    statusLine.textContent = "Magnetic Grapple missed. Commit only when the catch line is real.";
    return;
  }

  const toPlayer = normalize(player.x - target.x, player.y - target.y);
  const currentDistance = length(target.x - player.x, target.y - player.y);
  const desiredDistance = Math.max(player.radius + target.radius + 18, currentDistance - config.grapplePullDistance);
  target.x = player.x - toPlayer.x * desiredDistance;
  target.y = player.y - toPlayer.y * desiredDistance;
  resolveMapCollision(target);
  maybeTeleportEntity(target);
  target.velocityX = toPlayer.x * 320;
  target.velocityY = toPlayer.y * 320;
  applyStatusEffect(target, "slow", getStatusDuration(config.grappleSnareDuration), config.grappleSnare);
  addBeamEffect(player.x, player.y, target.x, target.y, "#bdf4ff", 5, 0.18);
  addImpact(player.x, player.y, "#c5f6ff", 30);
  addImpact(target.x, target.y, "#dffbff", 24);
  applyHitReaction(target, player.x, player.y, 1.1);
  addShake(7.2);
  statusLine.textContent = "Magnetic Grapple caught and dragged the target into punish range.";
}

export function castEnergyShield() {
  if (!isCombatLive() || abilityState.shield.cooldown > 0) {
    return;
  }

  abilityState.shield.cooldown = getAbilityCooldown(config.shieldCooldown);
  triggerAbilityCastRuneEffects();
  player.shield = Math.max(player.shield, 26 + getRuneValue("defense", "primary") * 3);
  player.shieldTime = 2.4;
  queuePhantomAbility("energyShield");
  playAbilityCue("energyShield");
  addImpact(player.x, player.y, "#9cd5ff", 28);
  addShake(4);
  statusLine.textContent = "Energy Shield online. Absorb the next burst.";
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
      currentDamage,
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
  abilityState.pulseBurst.cooldown = getAbilityCooldown(3.2);
  triggerAbilityCastRuneEffects();
  queuePhantomAbility("pulseBurst", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.16 + pellet * 0.08;
    const angle = baseAngle + spread;
    spawnBullet(player, player.x + Math.cos(angle) * 120, player.y + Math.sin(angle) * 120, bullets, "#84dcff", 1320, 12 * getPerkDamageMultiplier(getPrimaryBot()), {
      radius: 4,
      life: 0.66,
      trailColor: "#c9f3ff",
      source: "pulse-burst",
    });
  }
  playAbilityCue("pulseBurst");
  addImpact(player.x + Math.cos(baseAngle) * 24, player.y + Math.sin(baseAngle) * 24, "#84dcff", 18);
  addShake(5.2);
  statusLine.textContent = "Pulse Burst flooded the lane.";
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
  abilityState.gravityWell.cooldown = getAbilityCooldown(5.8);
  triggerAbilityCastRuneEffects();
  queuePhantomAbility("gravityWell", { facing: player.facing, aimX: input.mouseX, aimY: input.mouseY });
  supportZones.push({
    type: "gravity",
    team: "player",
    x: input.mouseX,
    y: input.mouseY,
    radius: 118,
    life: 2.1,
    maxLife: 2.1,
    color: "#b999ff",
    slow: 0.44,
  });
  playAbilityCue("gravityWell");
  addExplosion(input.mouseX, input.mouseY, 124, "#b999ff");
  addShake(5.8);
  statusLine.textContent = "Gravity Well turned the space into a trap.";
}

export function castPhaseShift() {
  if (!isCombatLive() || abilityState.phaseShift.cooldown > 0) {
    return;
  }
  abilityState.phaseShift.cooldown = getAbilityCooldown(5.6);
  triggerAbilityCastRuneEffects();
  abilityState.phaseShift.time = 0.55;
  player.ghostTime = Math.max(player.ghostTime, 0.55);
  queuePhantomAbility("phaseShift");
  playAbilityCue("phaseShift");
  addImpact(player.x, player.y, "#d2f1ff", 24);
  statusLine.textContent = "Phase Shift made you intangible for a blink.";
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
  if (!isCombatLive() || abilityState.ultimate.cooldown > 0) {
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
  player.hasteTime = Math.max(0, player.hasteTime - dt);
  player.afterDashHasteTime = Math.max(0, player.afterDashHasteTime - dt);
  player.ghostTime = Math.max(0, player.ghostTime - dt);
  player.revivalPrimed = Math.max(0, player.revivalPrimed - dt);
  player.decoyTime = Math.max(0, player.decoyTime - dt);

  if (player.shieldTime <= 0) {
    player.shield = 0;
  }
}

export function startAbilityInput(slotIndex) {
  const ability = getAbilityBySlot(slotIndex);
  if (!ability) {
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

