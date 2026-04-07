// Phantom Split clone runtime
import { config, abilityConfig } from "../config.js";
import { weapons } from "../content.js";
import {
  player,
  playerClone,
  loadout,
  abilityState,
  input,
  bullets,
  enemyBullets,
  shockJavelins,
  magneticFields,
  supportZones,
} from "../state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize, pointToSegmentDistance } from "../utils.js";
import { addImpact, addAfterimage, addBeamEffect, addExplosion, addShake } from "./effects.js";
import { resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, getPerkDamageMultiplier, getStatusDuration } from "../build/loadout.js";
import {
  getAllBots,
  getPrimaryBot,
  spawnBullet,
  damageBot,
  applyStatusEffect,
  clearStatusEffects,
  updateStatusEffects,
  tickEntityMarks,
  getStatusState,
  getZoneEffectsForEntity,
  beginPulseBurstCast,
} from "./combat.js";

function getPhantomDirection(action) {
  if (typeof action.facing === "number") {
    return {
      x: Math.cos(action.facing),
      y: Math.sin(action.facing),
      facing: action.facing,
    };
  }

  const direction = normalize((action.aimX ?? input.mouseX) - playerClone.x, (action.aimY ?? input.mouseY) - playerClone.y);
  return {
    x: direction.x,
    y: direction.y,
    facing: Math.atan2(direction.y, direction.x),
  };
}

function getScaledDamage(baseDamage, target = getPrimaryBot()) {
  return baseDamage * config.phantomDamageScale * getPerkDamageMultiplier(target);
}

function getScaledDuration(baseDuration) {
  return getStatusDuration(Math.max(0.12, baseDuration * config.phantomStatusScale));
}

function getScaledMagnitude(baseMagnitude) {
  return baseMagnitude * Math.max(0.35, config.phantomStatusScale);
}

function getScaledHeal(baseHeal) {
  return Math.max(1, baseHeal * config.phantomHealScale);
}

function collectTargetsAlongLine(owner, facing, range, width, singleTarget = true) {
  const lineStartX = owner.x + Math.cos(facing) * Math.max(10, owner.radius - 2);
  const lineStartY = owner.y + Math.sin(facing) * Math.max(10, owner.radius - 2);
  const lineEndX = owner.x + Math.cos(facing) * range;
  const lineEndY = owner.y + Math.sin(facing) * range;
  const hits = [];

  for (const target of getAllBots()) {
    if (!target?.alive) {
      continue;
    }

    const lineDistance = pointToSegmentDistance(target.x, target.y, lineStartX, lineStartY, lineEndX, lineEndY);
    const targetDistance = length(target.x - owner.x, target.y - owner.y);
    if (lineDistance > width + target.radius || targetDistance > range + target.radius + 12) {
      continue;
    }

    hits.push({ target, targetDistance });
  }

  hits.sort((left, right) => left.targetDistance - right.targetDistance);
  return singleTarget ? hits.slice(0, 1) : hits;
}

function collectTargetsInRadius(centerX, centerY, radius) {
  return getAllBots()
    .filter((target) => target?.alive && length(target.x - centerX, target.y - centerY) <= radius + target.radius)
    .sort((left, right) => length(left.x - centerX, left.y - centerY) - length(right.x - centerX, right.y - centerY));
}

function addCloneFlash(color, size = 20) {
  addImpact(playerClone.x, playerClone.y, color, size);
  addAfterimage(playerClone.x, playerClone.y, playerClone.facing, playerClone.radius + 3, color);
  playerClone.flash = Math.max(playerClone.flash, 0.1);
  playerClone.actionFlash = Math.max(playerClone.actionFlash, 0.16);
}

function executeClonePulse(action) {
  const direction = getPhantomDirection(action);
  playerClone.recoil = 0.8;
  spawnBullet(
    playerClone,
    playerClone.x + direction.x * 920,
    playerClone.y + direction.y * 920,
    bullets,
    "#c8efff",
    config.bulletSpeed,
    getScaledDamage(config.pulseDamage),
    {
      radius: 4,
      source: "phantom-pulse",
      trailColor: "#d7f2ff",
    },
  );
  addCloneFlash("#bfe8ff", 14);
}

function executeCloneShotgun(action) {
  const direction = getPhantomDirection(action);
  const baseAngle = direction.facing;
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.18 + pellet * 0.09;
    const angle = baseAngle + spread;
    spawnBullet(
      playerClone,
      playerClone.x + Math.cos(angle) * 100,
      playerClone.y + Math.sin(angle) * 100,
      bullets,
      "#ffd2b4",
      config.bulletSpeed * 0.84,
      getScaledDamage(8),
      {
        radius: 4,
        source: "phantom-shotgun",
        trailColor: "#ffe0c7",
      },
    );
  }
  playerClone.recoil = 1;
  addCloneFlash("#ffd0aa", 18);
}

function executeCloneSniper(action) {
  const direction = getPhantomDirection(action);
  const charge = Math.max(0, Math.min(1, action.chargeRatio ?? 0.45));
  playerClone.recoil = 1.18;
  spawnBullet(
    playerClone,
    playerClone.x + direction.x * 1200,
    playerClone.y + direction.y * 1200,
    bullets,
    "#ffe1a3",
    config.sniperProjectileSpeed + (config.sniperChargedProjectileSpeed - config.sniperProjectileSpeed) * charge,
    getScaledDamage(config.sniperMinDamage),
    {
      radius: 5,
      life: 0.74,
      piercing: false,
      trailColor: "#fff0bf",
      source: "rail-sniper",
      chargeRatio: charge,
      minDamage: getScaledDamage(config.sniperMinDamage),
      maxDamage: getScaledDamage(config.sniperMaxDamage),
      travelBonusRange: config.sniperTravelBonusRange,
      effect: { kind: "rail", bonusSlow: 0.08, bonusSlowDuration: 0.25, maxSlow: 0.18, maxSlowDuration: 0.45, snareDuration: 0.2, snareMagnitude: 0.64 },
    },
  );
  addCloneFlash("#ffe0a3", 18);
}

function executeCloneStaff(action) {
  const direction = getPhantomDirection(action);
  spawnBullet(
    playerClone,
    playerClone.x + direction.x * 920,
    playerClone.y + direction.y * 920,
    bullets,
    "#b7ffd9",
    940,
    getScaledDamage(12),
    {
      radius: 5,
      life: 0.88,
      trailColor: "#d7ffe7",
      source: "phantom-staff",
      effect: { kind: "staff", heal: getScaledHeal(8) },
    },
  );
  playerClone.shield = Math.max(playerClone.shield, 3);
  playerClone.shieldTime = Math.max(playerClone.shieldTime, 0.8);
  addCloneFlash("#b8ffd8", 18);
}

function executeCloneInjector(action) {
  const direction = getPhantomDirection(action);
  spawnBullet(
    playerClone,
    playerClone.x + direction.x * 980,
    playerClone.y + direction.y * 980,
    bullets,
    "#efc2ff",
    1180,
    getScaledDamage(9),
    {
      radius: 4,
      life: 0.84,
      trailColor: "#f6ddff",
      source: "phantom-injector",
      effect: {
        kind: "injector",
        markDuration: 2.2,
        markMax: 3,
        healOnConsume: getScaledHeal(12),
      },
    },
  );
  addCloneFlash("#e9bbff", 16);
}

function executeCloneLance(action) {
  const direction = getPhantomDirection(action);
  const altFire = Boolean(action.altFire);
  const range = altFire ? config.lanceAltRange : config.lancePrimaryRange;
  const width = altFire ? config.lanceAltWidth : config.lancePrimaryWidth;
  const damage = getScaledDamage(altFire ? config.lanceAltDamage : config.lancePrimaryDamage);
  const hits = collectTargetsAlongLine(playerClone, direction.facing, range, width, true);

  addBeamEffect(
    playerClone.x,
    playerClone.y,
    playerClone.x + direction.x * range,
    playerClone.y + direction.y * range,
    altFire ? "#fff0a5" : "#ffe8a8",
    altFire ? 6 : 3.5,
    0.12,
  );

  if (hits.length === 0) {
    addShake(altFire ? 4.2 : 2.6);
    addCloneFlash("#ffe0b2", altFire ? 18 : 14);
    return;
  }

  for (const hit of hits) {
    damageBot(hit.target, damage, altFire ? "#ffe39a" : "#fff0c2", hit.target.x, hit.target.y, 0);
    applyStatusEffect(
      hit.target,
      altFire ? "stun" : "slow",
      getScaledDuration(altFire ? config.lanceAltShockDuration : config.lancePrimarySlowDuration),
      altFire ? 1 : getScaledMagnitude(config.lancePrimarySlow),
    );
    addImpact(hit.target.x, hit.target.y, "#fff1c7", altFire ? 24 : 18);
  }

  playerClone.recoil = altFire ? 1.05 : 0.72;
  addCloneFlash("#ffe5a8", altFire ? 22 : 16);
}

function executeCloneCannon(action) {
  const direction = getPhantomDirection(action);
  const charged = Boolean(action.charged);
  const detonationDistance = Math.min(config.cannonMaxRange * 0.92, 520);
  const detonateX = playerClone.x + direction.x * detonationDistance;
  const detonateY = playerClone.y + direction.y * detonationDistance;
  spawnBullet(
    playerClone,
    detonateX,
    detonateY,
    bullets,
    charged ? "#ffe4b2" : "#ffd4ac",
    charged ? config.cannonAltSpeed : config.cannonPrimarySpeed,
    getScaledDamage(charged ? config.cannonAltDamage : config.cannonPrimaryDamage),
    {
      radius: charged ? config.cannonAltRadius : config.cannonPrimaryRadius,
      life: 1.06,
      trailColor: charged ? "#fff0cf" : "#ffe6d0",
      source: charged ? "phantom-cannon-charged" : "phantom-cannon-shell",
      detonateX,
      detonateY,
      explodeOnDestination: true,
      effect: {
        kind: "cannon",
        splashRadius: charged ? Math.max(82, config.cannonSplashRadius * 0.95) : config.cannonSplashRadius * 0.82,
        splashDamage: getScaledDamage(charged ? config.cannonSplashDamage * 0.85 : config.cannonSplashDamage),
        statusType: charged ? "burnslow" : "burn",
        statusDuration: charged ? config.cannonFreezeDuration * 0.55 : config.cannonBurnDuration * 0.4,
        statusMagnitude: charged ? config.cannonFreezeMagnitude : config.cannonBurnMagnitude,
        directDamageScale: charged ? 0.8 : 0.68,
        impactColor: charged ? "#fff2d2" : "#fff0d8",
        detonateOnDestination: true,
      },
    },
  );
  playerClone.recoil = charged ? 0.96 : 1.2;
  addCloneFlash(charged ? "#ffe4b7" : "#ffcf9d", charged ? 18 : 22);
}

function executeCloneAxe(action) {
  const comboStep = action.comboStep ?? 1;
  const direction = getPhantomDirection(action);
  const targets = getAllBots().filter((target) => target?.alive);
  let hits = [];

  if (comboStep === 1) {
    hits = collectTargetsAlongLine(playerClone, direction.facing, 224, 14, true);
  } else if (comboStep === 2) {
    hits = targets
      .filter((target) => {
        const distance = length(target.x - playerClone.x, target.y - playerClone.y);
        const angle = Math.atan2(target.y - playerClone.y, target.x - playerClone.x);
        const deltaAngle = Math.atan2(Math.sin(angle - direction.facing), Math.cos(angle - direction.facing));
        return distance <= 136 + target.radius && Math.abs(deltaAngle) <= 1.24;
      })
      .map((target) => ({ target }));
  } else {
    hits = collectTargetsAlongLine(playerClone, direction.facing, 166, 22, false);
  }

  if (hits.length === 0) {
    addCloneFlash(comboStep === 3 ? "#ffe8bf" : "#a8f0ff", 16);
    return;
  }

  for (const hit of hits) {
    const damage = comboStep === 3 ? getScaledDamage(34) : comboStep === 2 ? getScaledDamage(26) : getScaledDamage(22);
    damageBot(hit.target, damage, comboStep === 3 ? "#ffe2a1" : "#8fe7ff", hit.target.x, hit.target.y, 0);
    if (comboStep === 3) {
      applyStatusEffect(hit.target, "stun", getScaledDuration(0.22), 1);
    }
    addImpact(hit.target.x, hit.target.y, comboStep === 3 ? "#fff0c9" : "#c9f8ff", comboStep === 3 ? 28 : 18);
  }

  playerClone.slashFlash = Math.max(playerClone.slashFlash, comboStep === 3 ? 0.22 : 0.14);
  addCloneFlash(comboStep === 3 ? "#ffe2a1" : "#93f3ff", comboStep === 3 ? 22 : 18);
}

function executeCloneJavelin(action) {
  const direction = getPhantomDirection(action);
  shockJavelins.push({
    x: playerClone.x + direction.x * (playerClone.radius + 12),
    y: playerClone.y + direction.y * (playerClone.radius + 12),
    vx: direction.x * (config.javelinSpeed * 0.96),
    vy: direction.y * (config.javelinSpeed * 0.96),
    radius: Math.max(7, config.javelinRadius * 0.84),
    damage: getScaledDamage(config.javelinDamage),
    charged: false,
    life: config.javelinRange / Math.max(1, config.javelinSpeed) + 0.06,
    color: "#a9efff",
    glow: "#dff7ff",
    trail: "#86e6ff",
    piercing: false,
    slow: getScaledMagnitude(config.javelinSlow),
    slowDuration: getScaledDuration(config.javelinSlowDuration),
    stun: 0,
    hitTargets: new Set(),
  });
  playerClone.recoil = Math.max(playerClone.recoil, 0.24);
  addCloneFlash("#9ae9ff", 18);
}

function executeCloneField(action) {
  const holdCast = action.mode === "hold";
  const radius = holdCast ? Math.max(72, abilityConfig.field.hold.radius * 0.72) : Math.max(52, abilityConfig.field.tap.radius * 0.72);
  const centerX = holdCast ? action.aimX ?? playerClone.x : playerClone.x;
  const centerY = holdCast ? action.aimY ?? playerClone.y : playerClone.y;
  magneticFields.push({
    x: centerX,
    y: centerY,
    radius,
    duration: holdCast ? abilityConfig.field.hold.duration * 0.55 : abilityConfig.field.tap.duration * 0.7,
    life: holdCast ? abilityConfig.field.hold.duration * 0.55 : abilityConfig.field.tap.duration * 0.7,
    slow: holdCast ? abilityConfig.field.hold.slow * 0.6 : abilityConfig.field.tap.slow * 0.55,
    damageReduction: holdCast ? 0 : abilityConfig.field.tap.damageReduction * 0.35,
    anchor: "world",
    color: holdCast ? "#b4c7ff" : "#9fdbff",
    glow: holdCast ? "#dce7ff" : "#dbf4ff",
    disruption: holdCast ? 0 : 0.12,
    projectileSlowEdge: holdCast ? config.fieldHoldProjectileSlowEdge * 0.65 : config.fieldTapProjectileSlowEdge * 0.55,
    projectileSlowCore: holdCast ? config.fieldHoldProjectileSlowCore * 0.68 : config.fieldTapProjectileSlowCore * 0.58,
    team: "player",
    touchedTargets: new Set(),
  });
  if (!holdCast) {
    playerClone.shield = Math.max(playerClone.shield, 4);
    playerClone.shieldTime = Math.max(playerClone.shieldTime, 0.9);
  }
  addCloneFlash(holdCast ? "#b7c9ff" : "#9fdbff", holdCast ? 22 : 18);
}

function executeCloneGrapple() {
  playerClone.hasteTime = Math.max(playerClone.hasteTime, 0.85);
  playerClone.ghostTime = Math.max(playerClone.ghostTime, 0.16);
  addCloneFlash("#c7f1ff", 20);
}

function executeCloneShield() {
  playerClone.shield = Math.max(playerClone.shield, (config.shieldValue + 3) * config.phantomShieldScale);
  playerClone.shieldTime = Math.max(playerClone.shieldTime, config.shieldDuration * 0.82);
  playerClone.shieldGuardTime = Math.max(playerClone.shieldGuardTime ?? 0, config.shieldDuration * 0.82);
  addCloneFlash("#b7ddff", 22);
}

function executeCloneEmp() {
  addExplosion(playerClone.x, playerClone.y, 62, "#c3a9ff");
  addCloneFlash("#c1a7ff", 24);
  for (const target of collectTargetsInRadius(playerClone.x, playerClone.y, 96)) {
    damageBot(target, getScaledDamage(12), "#cdb6ff", target.x, target.y, 0);
    applyStatusEffect(target, "slow", getScaledDuration(0.6), 0.2);
  }
  for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
    if (length(enemyBullets[index].x - playerClone.x, enemyBullets[index].y - playerClone.y) <= 88) {
      enemyBullets.splice(index, 1);
    }
  }
}

function executeCloneChainLightning() {
  const ranked = collectTargetsInRadius(playerClone.x, playerClone.y, 420);
  if (ranked.length === 0) {
    return;
  }
  let sourceX = playerClone.x;
  let sourceY = playerClone.y;
  let damage = getScaledDamage(22, ranked[0]);
  const struck = new Set();

  for (let hop = 0; hop < 2 && ranked.length > 0; hop += 1) {
    const target = ranked.find((candidate) => !struck.has(candidate.kind));
    if (!target) {
      break;
    }
    struck.add(target.kind);
    addBeamEffect(sourceX, sourceY, target.x, target.y, hop === 0 ? "#a9eeff" : "#d9beff", hop === 0 ? 4 : 3, 0.12);
    damageBot(target, damage, hop === 0 ? "#a9eeff" : "#d9beff", target.x, target.y, 0);
    applyStatusEffect(target, "slow", getScaledDuration(0.4), 0.12 + hop * 0.04);
    sourceX = target.x;
    sourceY = target.y;
    damage *= 0.7;
  }
  addCloneFlash("#a9eeff", 18);
}

function executeCloneBlink() {
  playerClone.ghostTime = Math.max(playerClone.ghostTime, 0.2);
  addCloneFlash("#b8f4ff", 20);
}

function executeClonePhaseDash() {
  playerClone.ghostTime = Math.max(playerClone.ghostTime, 0.38);
  playerClone.hasteTime = Math.max(playerClone.hasteTime, 0.9);
  addCloneFlash("#c5f0ff", 24);
}

function executeClonePulseBurst(action) {
  const direction = getPhantomDirection(action);
  const missileCount = Math.max(3, config.pulseBurstMissiles - 1);
  const burstId = beginPulseBurstCast("player", missileCount);
  for (let pellet = 0; pellet < missileCount; pellet += 1) {
    const spread = -0.16 + pellet * (0.32 / Math.max(1, missileCount - 1));
    const angle = direction.facing + spread;
    spawnBullet(
      playerClone,
      playerClone.x + Math.cos(angle) * 120,
      playerClone.y + Math.sin(angle) * 120,
      bullets,
      "#a7e7ff",
      config.pulseBurstProjectileSpeed * 0.94,
      getScaledDamage(config.pulseBurstBaseDamage),
      {
        radius: 4.5,
        life: config.pulseBurstLifetime,
        trailColor: "#d8f5ff",
        source: "phantom-pulse-burst",
        effect: {
          kind: "pulseBurst",
          burstId,
          guideTurnRate: config.pulseBurstGuideTurnRate * 0.88,
          guideDot: config.pulseBurstGuideDot,
          resolved: false,
        },
      },
    );
  }
  addCloneFlash("#96e1ff", 20);
}

function executeCloneRailShot(action) {
  const direction = getPhantomDirection(action);
  spawnBullet(
    playerClone,
    playerClone.x + direction.x * 1200,
    playerClone.y + direction.y * 1200,
    bullets,
    "#ffe0a2",
    1760,
    getScaledDamage(40),
    {
      radius: 6,
      life: 0.72,
      piercing: true,
      trailColor: "#fff0ca",
      source: "phantom-rail-shot",
      effect: { kind: "rail", bonusSlow: 0.12, bonusSlowDuration: 0.45 },
    },
  );
  addCloneFlash("#ffe2b5", 20);
}

function executeCloneGravityWell(action) {
  const direction = getPhantomDirection(action);
  supportZones.push({
    type: "gravity",
    team: "player",
    x: action.aimX ?? playerClone.x + direction.x * 120,
    y: action.aimY ?? playerClone.y + direction.y * 120,
    radius: 82,
    life: 1.1,
    maxLife: 1.1,
    color: "#d7c0ff",
    slow: 0.22,
  });
  addCloneFlash("#d7c0ff", 22);
}

function executeClonePhaseShift() {
  playerClone.ghostTime = Math.max(playerClone.ghostTime, 0.34);
  addCloneFlash("#d6f5ff", 20);
}

function executeCloneHologram() {
  playerClone.ghostTime = Math.max(playerClone.ghostTime, 0.24);
  playerClone.shield = Math.max(playerClone.shield, 5);
  playerClone.shieldTime = Math.max(playerClone.shieldTime, 1);
  addCloneFlash("#dbbbff", 22);
}

function executeCloneSpeedSurge() {
  playerClone.hasteTime = Math.max(playerClone.hasteTime, 1.2);
  addCloneFlash("#9ef7cb", 18);
}

function executeCloneAbility(action) {
  switch (action.abilityKey) {
    case "shockJavelin":
      executeCloneJavelin(action);
      break;
    case "magneticField":
      executeCloneField(action);
      break;
    case "magneticGrapple":
      executeCloneGrapple();
      break;
    case "energyShield":
      executeCloneShield();
      break;
    case "empBurst":
      executeCloneEmp();
      break;
    case "backstepBurst":
      executeCloneBlink();
      break;
    case "chainLightning":
      executeCloneChainLightning();
      break;
    case "blinkStep":
      executeCloneBlink();
      break;
    case "phaseDash":
      executeClonePhaseDash();
      break;
    case "pulseBurst":
      executeClonePulseBurst(action);
      break;
    case "railShot":
      executeCloneRailShot(action);
      break;
    case "gravityWell":
      executeCloneGravityWell(action);
      break;
    case "phaseShift":
      executeClonePhaseShift();
      break;
    case "hologramDecoy":
      executeCloneHologram();
      break;
    case "speedSurge":
      executeCloneSpeedSurge();
      break;
    default:
      break;
  }
}

function executeCloneWeapon(action) {
  switch (action.weaponKey) {
    case weapons.axe.key:
      executeCloneAxe(action);
      break;
    case weapons.shotgun.key:
      executeCloneShotgun(action);
      break;
    case weapons.sniper.key:
      executeCloneSniper(action);
      break;
    case weapons.staff.key:
      executeCloneStaff(action);
      break;
    case weapons.injector.key:
      executeCloneInjector(action);
      break;
    case weapons.lance.key:
      executeCloneLance(action);
      break;
    case weapons.cannon.key:
      executeCloneCannon(action);
      break;
    default:
      executeClonePulse(action);
      break;
  }
}

function executeCloneAction(action) {
  if (!playerClone.active || !playerClone.alive) {
    return;
  }

  playerClone.facing = action.facing ?? playerClone.facing;
  if (action.type === "ability") {
    executeCloneAbility(action);
    return;
  }
  if (action.type === "weapon") {
    executeCloneWeapon(action);
  }
}

function queueCloneAction(action) {
  if (!playerClone.active || !playerClone.alive) {
    return;
  }

  playerClone.actionQueue.push({
    time: config.phantomActionDelay,
    facing: player.facing,
    aimX: input.mouseX,
    aimY: input.mouseY,
    ...action,
  });
}

export function queuePhantomWeapon(action) {
  queueCloneAction({
    type: "weapon",
    weaponKey: action.weaponKey ?? player.weapon,
    altFire: Boolean(action.altFire),
    charged: Boolean(action.charged),
    chargeRatio: action.chargeRatio ?? null,
    comboStep: action.comboStep ?? null,
    facing: action.facing ?? player.facing,
    aimX: action.aimX ?? input.mouseX,
    aimY: action.aimY ?? input.mouseY,
  });
}

export function queuePhantomAbility(abilityKey, action = {}) {
  queueCloneAction({
    type: "ability",
    abilityKey,
    mode: action.mode ?? null,
    facing: action.facing ?? player.facing,
    aimX: action.aimX ?? input.mouseX,
    aimY: action.aimY ?? input.mouseY,
  });
}

export function resetPhantomClone({ silent = true } = {}) {
  playerClone.active = false;
  playerClone.alive = false;
  playerClone.life = 0;
  playerClone.hp = 0;
  playerClone.maxHp = 0;
  playerClone.shield = 0;
  playerClone.shieldTime = 0;
  playerClone.shieldGuardTime = 0;
  playerClone.ghostTime = 0;
  playerClone.hasteTime = 0;
  playerClone.flash = 0;
  playerClone.recoil = 0;
  playerClone.slashFlash = 0;
  playerClone.actionFlash = 0;
  playerClone.trail.length = 0;
  playerClone.actionQueue.length = 0;
  playerClone.injectorMarks = 0;
  playerClone.injectorMarkTime = 0;
  clearStatusEffects(playerClone);
  abilityState.ultimate.phantomTime = 0;
  if (!silent) {
    statusLine.textContent = "Phantom copy collapsed.";
  }
}

export function spawnPhantomClone() {
  const buildStats = getBuildStats();
  playerClone.active = true;
  playerClone.alive = true;
  playerClone.kind = "playerClone";
  playerClone.x = player.x;
  playerClone.y = player.y;
  playerClone.facing = player.facing;
  playerClone.radius = Math.max(12, player.radius * 0.96);
  playerClone.maxHp = Math.max(32, buildStats.maxHp * config.phantomHpScale);
  playerClone.hp = playerClone.maxHp;
  playerClone.weapon = loadout.weapon;
  playerClone.avatar = loadout.avatar;
  playerClone.weaponSkin = loadout.weaponSkin;
  playerClone.loadout = {
    weapon: loadout.weapon,
    abilities: [...loadout.abilities],
  };
  playerClone.life = config.phantomDuration;
  playerClone.maxLife = config.phantomDuration;
  playerClone.shield = 0;
  playerClone.shieldTime = 0;
  playerClone.shieldGuardTime = 0;
  playerClone.ghostTime = 0;
  playerClone.hasteTime = 0;
  playerClone.flash = 0.12;
  playerClone.recoil = 0;
  playerClone.slashFlash = 0;
  playerClone.actionFlash = 0.2;
  playerClone.hitReactionTime = 0;
  playerClone.hitReactionX = 0;
  playerClone.hitReactionY = 0;
  playerClone.trail.length = 0;
  playerClone.actionQueue.length = 0;
  playerClone.injectorMarks = 0;
  playerClone.injectorMarkTime = 0;
  clearStatusEffects(playerClone);

  abilityState.ultimate.phantomTime = config.phantomDuration;
  player.decoyTime = Math.max(player.decoyTime, config.phantomDuration);
  player.ghostTime = Math.max(player.ghostTime, 0.7);
  addAfterimage(player.x, player.y, player.facing, player.radius + 8, "#caa3ff");
  addImpact(player.x, player.y, "#d9bbff", 28);
  addImpact(player.x - Math.cos(player.facing) * 24, player.y - Math.sin(player.facing) * 24, "#f0ddff", 20);
  statusLine.textContent = "Phantom Split forged a live copy at 30% power.";
}

export function applyPhantomDamage(amount, source = "hit") {
  if (!playerClone.active || !playerClone.alive) {
    return false;
  }

  let finalDamage = amount;
  if (playerClone.shield > 0) {
    const absorbed = Math.min(playerClone.shield, finalDamage);
    playerClone.shield -= absorbed;
    finalDamage -= absorbed;
    addImpact(playerClone.x, playerClone.y, "#cce8ff", 14);
  }

  if (finalDamage <= 0 || playerClone.ghostTime > 0) {
    return false;
  }

  playerClone.hp = Math.max(0, playerClone.hp - finalDamage);
  playerClone.flash = 0.12;
  playerClone.hitReactionTime = 0.14;
  playerClone.hitReactionX = Math.cos(playerClone.facing) * -0.8;
  playerClone.hitReactionY = Math.sin(playerClone.facing) * -0.8;
  addImpact(playerClone.x, playerClone.y, source === "bullet" ? "#ffb3a2" : "#f6d8ff", finalDamage >= 14 ? 20 : 14);

  if (playerClone.hp <= 0) {
    resetPhantomClone({ silent: true });
    statusLine.textContent = "Phantom copy shattered under pressure.";
    return true;
  }

  return false;
}

export function updatePhantomClone(dt) {
  playerClone.flash = Math.max(0, playerClone.flash - dt);
  playerClone.recoil = Math.max(0, playerClone.recoil - dt * 7.5);
  playerClone.slashFlash = Math.max(0, playerClone.slashFlash - dt);
  playerClone.actionFlash = Math.max(0, playerClone.actionFlash - dt);
  playerClone.hitReactionTime = Math.max(0, playerClone.hitReactionTime - dt);

  if (!playerClone.active || !playerClone.alive) {
    return;
  }

  playerClone.life = Math.max(0, playerClone.life - dt);
  abilityState.ultimate.phantomTime = Math.max(abilityState.ultimate.phantomTime, playerClone.life);
  playerClone.shieldTime = Math.max(0, playerClone.shieldTime - dt);
  playerClone.shieldGuardTime = Math.max(0, (playerClone.shieldGuardTime ?? 0) - dt);
  playerClone.ghostTime = Math.max(0, playerClone.ghostTime - dt);
  playerClone.hasteTime = Math.max(0, playerClone.hasteTime - dt);
  updateStatusEffects(playerClone, dt);
  tickEntityMarks(playerClone, dt);

  if (playerClone.shieldTime <= 0) {
    playerClone.shield = 0;
  }
  if ((playerClone.shieldGuardTime ?? 0) <= 0 || playerClone.shield <= 0) {
    playerClone.shieldGuardTime = 0;
  }

  if (playerClone.life <= 0 || !player.alive) {
    resetPhantomClone({ silent: true });
    return;
  }

  playerClone.trail.push({
    x: player.x,
    y: player.y,
    facing: player.facing,
    weapon: player.weapon,
    age: 0,
  });

  for (let index = playerClone.trail.length - 1; index >= 0; index -= 1) {
    playerClone.trail[index].age += dt;
    if (playerClone.trail[index].age > 0.9) {
      playerClone.trail.splice(index, 1);
    }
  }

  const replaySnapshot =
    playerClone.trail.find((snapshot) => snapshot.age >= config.phantomReplayDelay) ??
    playerClone.trail[0];

  if (replaySnapshot) {
    playerClone.x = replaySnapshot.x;
    playerClone.y = replaySnapshot.y;
    playerClone.facing = replaySnapshot.facing;
    playerClone.weapon = replaySnapshot.weapon;
  }

  const cloneStatus = getStatusState(playerClone);
  const zoneEffects = getZoneEffectsForEntity(playerClone, dt);
  if (cloneStatus.stunned) {
    playerClone.ghostTime = Math.max(playerClone.ghostTime, 0);
  } else if (playerClone.hasteTime > 0 && zoneEffects.slowMultiplier > 0) {
    playerClone.x += Math.cos(playerClone.facing) * 8 * dt;
    playerClone.y += Math.sin(playerClone.facing) * 8 * dt;
  }

  resolveMapCollision(playerClone);
  maybeTeleportEntity(playerClone);

  for (let index = playerClone.actionQueue.length - 1; index >= 0; index -= 1) {
    const action = playerClone.actionQueue[index];
    action.time -= dt;
    if (action.time > 0) {
      continue;
    }
    executeCloneAction(action);
    playerClone.actionQueue.splice(index, 1);
  }
}
