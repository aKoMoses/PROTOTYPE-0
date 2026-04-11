// Enemy AI, training bots, enemy actions
import { arena, config, moduleConfig, botDifficultyProfiles, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, playerClone, enemy, trainingBots, moduleState, loadout, sandbox, matchState, input,
  bullets, enemyBullets, boltLinkJavelins, enemyBoltLinkJavelins, orbitalDistorterFields, supportZones, mapState,
  tracers, trainingToolState } from "../state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize, approach, pointToSegmentDistance } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addBeamEffect, addExplosion, addSlashEffect, applyHitReaction, addHealingText, addAbsorbBurst } from "./effects.js";
import { getMapLayout, resolveMapCollision, canSeeTarget, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasImplant, getRuneValue, getStatusDuration, getImplantDamageMultiplier, getPulseMagazineSize, enemyHasAbility } from "../build/loadout.js";
import { getAllBots, isCombatLive, damageBot, spawnBullet, applyStatusEffect, updateStatusEffects,
  clearStatusEffects, getPlayerFieldModifier, spawnEnemyOrbitalDistorterField, startPulseReload, finalizePulseReload,
  tickEntityMarks, applyPlayerDamage, getStatusState, damagePylonsAlongLine, applyInjectorMark,
  getFieldInfluence, getZoneEffectsForEntity, hitMapWithProjectile, addEnergy, consumePlayerEmpowerBonus, tryTriggerReflexAegis, beginSwarmMissileRackCast, applyFieldDragToProjectile } from "./combat.js";
import { getAxeComboProfile, collectTargetsAlongLine } from "./weapons.js";
import { spawnEnemyBoltLinkJavelin, confirmBoltLinkJavelinImpact, expireBoltLinkJavelin } from "./modules.js";
import { finishDuelRound } from "./match.js";
import { resetPlayer } from "./player.js";
import { playWeaponFire, playModuleCue } from "../audio.js";
import { updateCasting, startCast, startVisualCast, startWeaponTelegraph } from "./casting.js";
import { applyPhantomDamage } from "./phantom.js";
import { getCurrentBotDifficultyTier } from "../progression.js";

export function getDifficultyModifiers() {
  return botDifficultyProfiles[getCurrentBotDifficultyTier()] ?? botDifficultyProfiles.normal;
}

export function updateBoltLinkJavelins(dt) {
  for (let i = boltLinkJavelins.length - 1; i >= 0; i -= 1) {
    const javelin = boltLinkJavelins[i];
    applyFieldDragToProjectile(javelin, "player", dt);
    javelin.x += javelin.vx * dt;
    javelin.y += javelin.vy * dt;
    javelin.life -= dt;

    tracers.push({
      x0: javelin.x - javelin.vx * 0.01,
      y0: javelin.y - javelin.vy * 0.01,
      x1: javelin.x + javelin.vx * 0.02,
      y1: javelin.y + javelin.vy * 0.02,
      color: javelin.trail,
      life: 0.04,
      maxLife: 0.04,
    });

    const outOfBounds =
      javelin.x < 0 ||
      javelin.y < 0 ||
      javelin.x > arena.width ||
      javelin.y > arena.height;

    if (hitMapWithProjectile(javelin, "player")) {
      expireBoltLinkJavelin(true);
      boltLinkJavelins.splice(i, 1);
      continue;
    }

    if (outOfBounds || javelin.life <= 0) {
      expireBoltLinkJavelin(true);
      boltLinkJavelins.splice(i, 1);
      continue;
    }

    let consumed = false;

    for (const bot of getAllBots()) {
      if (!bot.alive || javelin.hitTargets.has(bot.kind)) {
        continue;
      }

      if (length(javelin.x - bot.x, javelin.y - bot.y) > javelin.radius + bot.radius) {
        continue;
      }

      javelin.hitTargets.add(bot.kind);
      damageBot(
        bot,
        javelin.damage + consumePlayerEmpowerBonus(),
        javelin.color,
        javelin.x,
        javelin.y,
        0,
      );
      addImpact(bot.x, bot.y, javelin.charged ? "#fff0b4" : "#dff7ff", javelin.charged ? 26 : 18);
      addShake(javelin.charged ? 8.8 : 6.8);
      confirmBoltLinkJavelinImpact(bot);

      if (!javelin.piercing) {
        consumed = true;
        break;
      }
    }

    if (consumed) {
      boltLinkJavelins.splice(i, 1);
    }
  }
}


export function getEnemyWeaponKey() {
  return enemy.weapon ?? enemy.loadout?.weapon ?? weapons.pulse.key;
}

export function getEnemyTargetRange() {
  const weaponKey = getEnemyWeaponKey();
  const hasGrapple = enemyHasAbility("vGripHarpoon");
  const hasShield = enemyHasAbility("hexPlateProjector");
  if (weaponKey === weapons.axe.key) {
    return enemy.hp <= 72 ? 272 : hasGrapple ? 196 : 218;
  }
  if (weaponKey === weapons.shotgun.key) {
    return enemy.hp <= 72 ? 344 : hasGrapple ? 238 : 276;
  }
  if (weaponKey === weapons.sniper.key) {
    return enemy.hp <= 72 ? 720 : 612;
  }
  if (weaponKey === weapons.staff.key) {
    return enemy.hp <= 72 ? 408 : 336;
  }
  if (weaponKey === weapons.injector.key) {
    return enemy.hp <= 72 ? 474 : 392;
  }
  if (weaponKey === weapons.lance.key) {
    return enemy.hp <= 72 ? 256 : hasGrapple ? 214 : 236;
  }
  if (weaponKey === weapons.cannon.key) {
    return enemy.hp <= 72 ? 644 : 508;
  }
  return enemy.hp <= 72 ? 548 : hasShield ? 430 : 404;
}

export function getEnemyBehaviorProfile(distance, shouldPunish) {
  const weaponKey = getEnemyWeaponKey();
  const diff = getDifficultyModifiers();
  const hasGrapple = enemyHasAbility("vGripHarpoon");
  const hasShield = enemyHasAbility("hexPlateProjector");
  const hasEmp = enemyHasAbility("emPulseEmitter");

  let base;

  if (weaponKey === weapons.axe.key) {
    base = {
      strafeScale: shouldPunish ? 1.08 : 0.92,
      engageBias: hasGrapple ? 1.34 : 1.22,
      retreatBias: enemy.hp <= 72 ? 0.92 : 0.48,
      abilityPressureDistance: hasGrapple ? 430 : 300,
      fieldResponseDistance: 212,
      punishWindowDistance: distance < 318,
      dodgeAggression: 0.96,
      shootBurstSize: 0,
    };
  } else if (weaponKey === weapons.shotgun.key) {
    base = {
      strafeScale: shouldPunish ? 1.24 : 1.14,
      engageBias: hasGrapple ? 1.28 : 1.18,
      retreatBias: enemy.hp <= 72 ? 1.04 : 0.66,
      abilityPressureDistance: hasEmp ? 240 : 320,
      fieldResponseDistance: 230,
      punishWindowDistance: distance < 360,
      dodgeAggression: 0.9,
      shootBurstSize: 1,
    };
  } else if (weaponKey === weapons.sniper.key) {
    base = {
      strafeScale: shouldPunish ? 1.06 : 0.88,
      engageBias: 0.76,
      retreatBias: enemy.hp <= 72 ? 1.22 : 1.08,
      abilityPressureDistance: 520,
      fieldResponseDistance: 260,
      punishWindowDistance: distance > 420 && distance < 760,
      dodgeAggression: 1,
      shootBurstSize: 0,
    };
  } else if (weaponKey === weapons.staff.key) {
    base = {
      strafeScale: shouldPunish ? 1.08 : 1.02,
      engageBias: 1.02,
      retreatBias: enemy.hp <= 72 ? 0.94 : 0.72,
      abilityPressureDistance: 320,
      fieldResponseDistance: 220,
      punishWindowDistance: distance < 420,
      dodgeAggression: 0.9,
      shootBurstSize: 0,
    };
  } else if (weaponKey === weapons.injector.key) {
    base = {
      strafeScale: shouldPunish ? 1.16 : 1.04,
      engageBias: 1.04,
      retreatBias: enemy.hp <= 72 ? 1.06 : 0.78,
      abilityPressureDistance: 380,
      fieldResponseDistance: 240,
      punishWindowDistance: distance < 520,
      dodgeAggression: 0.94,
      shootBurstSize: 0,
    };
  } else if (weaponKey === weapons.lance.key) {
    base = {
      strafeScale: shouldPunish ? 1.18 : 1.02,
      engageBias: hasGrapple ? 1.3 : 1.18,
      retreatBias: enemy.hp <= 72 ? 0.88 : 0.54,
      abilityPressureDistance: 360,
      fieldResponseDistance: 210,
      punishWindowDistance: distance < 300,
      dodgeAggression: 0.9,
      shootBurstSize: 0,
    };
  } else if (weaponKey === weapons.cannon.key) {
    base = {
      strafeScale: shouldPunish ? 1.02 : 0.9,
      engageBias: 0.88,
      retreatBias: enemy.hp <= 72 ? 1.18 : 0.98,
      abilityPressureDistance: 480,
      fieldResponseDistance: 240,
      punishWindowDistance: distance > 240 && distance < 760,
      dodgeAggression: 0.96,
      shootBurstSize: 0,
    };
  } else {
    base = {
      strafeScale: shouldPunish ? 1.18 : 1,
      engageBias: 1.08,
      retreatBias: enemy.hp <= 72 ? 1.18 : 0.88,
      abilityPressureDistance: hasShield ? 280 : 340,
      fieldResponseDistance: 250,
      punishWindowDistance: distance < 446,
      dodgeAggression: 0.92,
      shootBurstSize: shouldPunish ? 3 : 2,
    };
  }

  // Apply difficulty scaling.
  base.strafeScale *= 0.84 + diff.spacingAwareness * 0.24;
  base.engageBias *= 0.9 + diff.pressureAdaptation * 0.18;
  base.retreatBias *= 0.88 + diff.spacingAwareness * 0.2;
  base.dodgeAggression = Math.min(1, base.dodgeAggression * diff.dodgeChance * diff.dodgeReaction);
  return base;
}

function getEnemyFocusTarget() {
  if (!playerClone.active || !playerClone.alive) {
    enemy.focusTarget = "player";
    enemy.focusTime = 0;
    return player;
  }

  if (enemy.focusTime > 0) {
    return enemy.focusTarget === "clone" ? playerClone : player;
  }

  const playerDistance = length(player.x - enemy.x, player.y - enemy.y);
  const cloneDistance = length(playerClone.x - enemy.x, playerClone.y - enemy.y);
  const cloneLikely =
    player.decoyTime > 0 ||
    cloneDistance < playerDistance - 24 ||
    (cloneDistance < playerDistance + 28 && Math.random() < 0.42);

  enemy.focusTarget = cloneLikely ? "clone" : "player";
  enemy.focusTime = cloneLikely ? 0.7 : 0.34;
  return cloneLikely ? playerClone : player;
}

export function startEnemyReload(bot = enemy) {
  if (bot.weapon !== weapons.pulse.key || bot.reloadTime > 0) {
    return false;
  }
  bot.reloadTime = config.pulseReloadTime;
  bot.shootCooldown = Math.max(bot.shootCooldown, config.pulseReloadTime);
  return true;
}

export function fireEnemyPulse(targetX, targetY, punishShot = false) {
  if (enemy.reloadTime > 0) {
    return false;
  }
  if (enemy.ammo <= 0) {
    startEnemyReload(enemy);
    return false;
  }

  const diff = getDifficultyModifiers();
  enemy.ammo = Math.max(0, enemy.ammo - 1);
  const spread = (punishShot ? 18 : 30) * diff.spreadMult;
  const spreadX = (Math.random() - 0.5) * spread;
  const spreadY = (Math.random() - 0.5) * spread;
  spawnBullet(enemy, targetX + spreadX, targetY + spreadY, enemyBullets, "#ff8a77", 660, 6 * diff.damageMult, {
    radius: 4,
    source: "enemy-pulse",
    trailColor: "#ffc0b4",
  });
  playWeaponFire(weapons.pulse.key, "enemy");
  addImpact(enemy.x + Math.cos(enemy.facing) * 24, enemy.y + Math.sin(enemy.facing) * 24, "#ff8a77", 12);

  if (enemy.ammo <= 0) {
    startEnemyReload(enemy);
  }
  return true;
}

export function fireEnemyShotgun(targetX, targetY) {
  const diff = getDifficultyModifiers();
  const baseAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = (-0.2 + pellet * 0.1) * diff.spreadMult;
    const angle = baseAngle + spread;
    spawnBullet(
      enemy,
      enemy.x + Math.cos(angle) * 100,
      enemy.y + Math.sin(angle) * 100,
      enemyBullets,
      "#ff9d62",
      config.bulletSpeed * 0.82,
      5 * diff.damageMult,
      {
        radius: 4,
        source: "enemy-shotgun",
        trailColor: "#ffc49a",
      },
    );
  }
  startWeaponTelegraph(enemy, "shotgun", 0.08);
  playWeaponFire(weapons.shotgun.key, "enemy");
  addImpact(enemy.x + Math.cos(baseAngle) * 22, enemy.y + Math.sin(baseAngle) * 22, "#ffb078", 16);
  return true;
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
    applyStatusEffect(bot, "slow", getStatusDuration(effect.bonusSlowDuration ?? 0.4), effect.bonusSlow ?? 0.12);
  }
}

export function applyProjectileEffectToPlayer(projectile) {
  const effect = projectile.effect;
  if (!effect) {
    return;
  }

  if (effect.kind === "staff") {
    healEntity(enemy, effect.heal ?? 0);
    addImpact(enemy.x, enemy.y, "#b8ffd8", 16);
  } else if (effect.kind === "injector") {
    applyInjectorMark(player, effect.markDuration ?? 4, effect.markMax ?? 3);
    if ((player.injectorMarks ?? 0) >= 3) {
      player.injectorMarks = 0;
      player.injectorMarkTime = 0;
      healEntity(enemy, effect.healOnConsume ?? 10);
      addImpact(player.x, player.y, "#f0b8ff", 20);
    }
  } else if (effect.kind === "rail") {
    applyStatusEffect(player, "slow", getStatusDuration(effect.bonusSlowDuration ?? 0.4), effect.bonusSlow ?? 0.12);
  }
}

export function fireEnemySniper(targetX, targetY) {
  const diff = getDifficultyModifiers();
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#ffd27a", config.sniperProjectileSpeed * 0.94, 22 * diff.damageMult, {
    radius: 6,
    life: 0.78,
    piercing: false,
    trailColor: "#ffeab3",
    source: "enemy-sniper",
    chargeRatio: 0.2,
    minDamage: 22,
    maxDamage: 42,
    travelBonusRange: config.sniperTravelBonusRange,
    effect: { kind: "rail", bonusSlow: 0.12, bonusSlowDuration: 0.48, maxSlow: 0.2, maxSlowDuration: 0.7, snareDuration: 0.24, snareMagnitude: 0.72 },
  });
  startWeaponTelegraph(enemy, "sniper", 0.12);
  playWeaponFire(weapons.sniper.key, "enemy");
  addImpact(enemy.x + Math.cos(enemy.facing) * 26, enemy.y + Math.sin(enemy.facing) * 26, "#ffd27a", 18);
  return true;
}

export function fireEnemyStaff(targetX, targetY) {
  const diff = getDifficultyModifiers();
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#9cffc4", 920, 7 * diff.damageMult, {
    radius: 5,
    life: 0.92,
    trailColor: "#d2ffe3",
    source: "enemy-staff",
    effect: { kind: "staff", heal: 6 },
  });
  startWeaponTelegraph(enemy, "staff", 0.1);
  playWeaponFire(weapons.staff.key, "enemy");
  addImpact(enemy.x + Math.cos(enemy.facing) * 24, enemy.y + Math.sin(enemy.facing) * 24, "#9cffc4", 14);
  return true;
}

export function fireEnemyInjector(targetX, targetY) {
  const diff = getDifficultyModifiers();
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#d894ff", 1180, 6 * diff.damageMult, {
    radius: 4,
    life: 0.86,
    trailColor: "#f0beff",
    source: "enemy-injector",
    effect: { kind: "injector", markDuration: 4, markMax: 3, healOnConsume: 10 },
  });
  startWeaponTelegraph(enemy, "injector", 0.1);
  playWeaponFire(weapons.injector.key, "enemy");
  addImpact(enemy.x + Math.cos(enemy.facing) * 22, enemy.y + Math.sin(enemy.facing) * 22, "#d894ff", 12);
  return true;
}

export function fireEnemyLance(target = player, altFire = false) {
  const diff = getDifficultyModifiers();
  const range = altFire ? config.lanceAltRange : config.lancePrimaryRange;
  const width = altFire ? config.lanceAltWidth : config.lancePrimaryWidth;
  const damage = (altFire ? config.lanceAltDamage * 0.78 : config.lancePrimaryDamage * 0.78) * diff.damageMult;
  const hits = collectTargetsAlongLine(enemy, enemy.facing, range, width, [target], true);
  const endX = enemy.x + Math.cos(enemy.facing) * range;
  const endY = enemy.y + Math.sin(enemy.facing) * range;

  addBeamEffect(enemy.x, enemy.y, endX, endY, altFire ? "#ffd7a8" : "#ffe7bf", altFire ? 7 : 4, 0.12);
  addImpact(enemy.x + Math.cos(enemy.facing) * 26, enemy.y + Math.sin(enemy.facing) * 26, "#ffd8ac", altFire ? 20 : 16);
  damagePylonsAlongLine(enemy.x, enemy.y, endX, endY, damage * 0.26, "enemy");
  startWeaponTelegraph(enemy, "lance", 0.12);
  playWeaponFire(weapons.lance.key, "enemy");

  if (hits.length === 0) {
    return true;
  }

  const hit = hits[0].target;
  if (hit === playerClone) {
    applyPhantomDamage(damage, altFire ? "lance-drive" : "lance");
    applyStatusEffect(hit, altFire ? "stun" : "slow", getStatusDuration(altFire ? config.lanceAltShockDuration * 0.8 : config.lancePrimarySlowDuration * 0.8), altFire ? 1 : config.lancePrimarySlow);
    statusLine.textContent = altFire
      ? "Enemy lance drive cracked the phantom copy."
      : "Enemy lance punctured the phantom copy.";
  } else {
    applyPlayerDamage(damage, altFire ? "lance-drive" : "lance", enemy);
    if (moduleState.reflexAegis.resolveLockTime <= 0) {
      applyStatusEffect(hit, altFire ? "stun" : "slow", getStatusDuration((altFire ? config.lanceAltShockDuration : config.lancePrimarySlowDuration) * (1 - getBuildStats().ccReduction)), altFire ? 1 : config.lancePrimarySlow);
    } else {
      return true;
    }
  }
  addImpact(hit.x, hit.y, "#fff0cd", altFire ? 26 : 18);
  addShake(altFire ? 7.2 : 4.8);
  return true;
}

export function fireEnemyCannon(targetX, targetY, charged = false) {
  const diff = getDifficultyModifiers();
  const direction = normalize(targetX - enemy.x, targetY - enemy.y);
  const rawDistance = length(targetX - enemy.x, targetY - enemy.y);
  const clampedDistance = Math.min(config.cannonMaxRange, rawDistance);
  const detonateX = enemy.x + direction.x * clampedDistance;
  const detonateY = enemy.y + direction.y * clampedDistance;
  spawnBullet(
    enemy,
    detonateX,
    detonateY,
    enemyBullets,
    charged ? "#ffdca8" : "#ffb483",
    charged ? config.cannonAltSpeed : config.cannonPrimarySpeed,
    (charged ? config.cannonAltDamage * 0.78 : config.cannonPrimaryDamage * 0.82) * diff.damageMult,
    {
      radius: charged ? config.cannonAltRadius : config.cannonPrimaryRadius,
      life: 1.08,
      trailColor: charged ? "#fff0cc" : "#ffd8ba",
      source: charged ? "enemy-cannon-charged" : "enemy-cannon-shell",
      detonateX,
      detonateY,
      explodeOnDestination: true,
      effect: {
        kind: "cannon",
        splashRadius: charged ? Math.max(110, config.cannonSplashRadius * 1.28) : config.cannonSplashRadius,
        splashDamage: charged ? config.cannonSplashDamage * 1.18 : config.cannonSplashDamage * 0.76,
        statusType: "slow",
        statusDuration: charged ? config.cannonFreezeDuration : config.cannonBurnDuration,
        statusMagnitude: charged ? config.cannonFreezeMagnitude : config.cannonBurnMagnitude,
        directDamageScale: charged ? 0.82 : 0.66,
        impactColor: charged ? "#fff0c8" : "#fff0d8",
        detonateOnDestination: true,
      },
    },
  );
  startWeaponTelegraph(enemy, "cannon", 0.14);
  playWeaponFire(weapons.cannon.key, "enemy");
  addImpact(enemy.x + Math.cos(enemy.facing) * 26, enemy.y + Math.sin(enemy.facing) * 26, charged ? "#ffe3af" : "#ffcca4", charged ? 20 : 22);
  return true;
}

export function fireTrainingPulse(bot, targetX, targetY) {
  const spread = 16;
  spawnBullet(
    bot,
    targetX + (Math.random() - 0.5) * spread,
    targetY + (Math.random() - 0.5) * spread,
    enemyBullets,
    "#8bdcff",
    760,
    8,
    {
      radius: 4.5,
      life: 1,
      trailColor: "#d4f6ff",
      source: "training-pulse",
    },
  );
  startWeaponTelegraph(bot, "pulse", 0.05);
  playWeaponFire(weapons.pulse.key, "enemy");
  addImpact(bot.x + Math.cos(bot.facing) * 20, bot.y + Math.sin(bot.facing) * 20, "#9de8ff", 10);
}

export function queueEnemyAxeStrike() {
  enemy.comboStep = enemy.comboTimer > 0 ? (enemy.comboStep % 3) + 1 : 1;
  enemy.comboTimer = config.axeComboReset;
  const profile = { ...getAxeComboProfile(enemy.comboStep) };
  profile.damage *= 0.74;
  profile.stun *= 0.78;
  enemy.meleeWindupTime = profile.startup;
  enemy.pendingMeleeStrike = {
    profile,
    facing: enemy.facing,
    comboStep: enemy.comboStep,
  };
  startWeaponTelegraph(enemy, "axe", 0.16);
  enemy.shootCooldown = profile.cooldown;
  playWeaponFire(weapons.axe.key, "enemy");
  addImpact(enemy.x + Math.cos(enemy.facing) * 28, enemy.y + Math.sin(enemy.facing) * 28, profile.color, 18);
}

export function resolveEnemyAxeStrike() {
  if (!enemy.pendingMeleeStrike) {
    return;
  }

  const { profile, facing } = enemy.pendingMeleeStrike;
  enemy.pendingMeleeStrike = null;

  if (profile.hitMode === "dashPath") {
    enemy.attackCommitTime = profile.commitDuration;
    enemy.attackCommitX = Math.cos(facing);
    enemy.attackCommitY = Math.sin(facing);
    enemy.attackCommitSpeed = profile.commitSpeed * 0.9;
    enemy.activeMeleeStrike = { profile, connected: false };
    return;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = length(dx, dy);
  const angle = Math.atan2(dy, dx);
  const deltaAngle = Math.atan2(Math.sin(angle - facing), Math.cos(angle - facing));
  let hit = false;

  if (profile.hitMode === "line") {
    const lineStartX = enemy.x + Math.cos(facing) * 18;
    const lineStartY = enemy.y + Math.sin(facing) * 18;
    const lineEndX = enemy.x + Math.cos(facing) * (profile.range + 12);
    const lineEndY = enemy.y + Math.sin(facing) * (profile.range + 12);
    const lineDistance = pointToSegmentDistance(player.x, player.y, lineStartX, lineStartY, lineEndX, lineEndY);
    hit =
      distance <= profile.range + player.radius + 10 &&
      Math.abs(deltaAngle) <= profile.arc &&
      lineDistance <= profile.width + player.radius;
  } else if (profile.hitMode === "arc") {
    hit = distance <= profile.range + player.radius && Math.abs(deltaAngle) <= profile.arc;
  }

  if (hit) {
    applyPlayerDamage(profile.damage, "axe", enemy);
    if (moduleState.reflexAegis.resolveLockTime > 0) {
      return;
    }
    addImpact(player.x, player.y, profile.impactColor, profile.impactSize * 0.7);
    addShake(profile.shake * 0.55);
  }
}

export function updateEnemyAxeCommit(dt, previousX, previousY) {
  if (enemy.attackCommitTime <= 0 || !enemy.activeMeleeStrike) {
    return;
  }

  enemy.attackCommitTime = Math.max(0, enemy.attackCommitTime - dt);
  const nextX = clamp(enemy.x + enemy.attackCommitX * enemy.attackCommitSpeed * dt, enemy.radius, arena.width - enemy.radius);
  const nextY = clamp(enemy.y + enemy.attackCommitY * enemy.attackCommitSpeed * dt, enemy.radius, arena.height - enemy.radius);
  enemy.x = nextX;
  enemy.y = nextY;
  addAfterimage(enemy.x, enemy.y, enemy.facing, enemy.radius + 1, "#ffd1a8");

  const dashDistance = pointToSegmentDistance(player.x, player.y, previousX, previousY, enemy.x, enemy.y);
  if (!enemy.activeMeleeStrike.connected && dashDistance <= enemy.radius + player.radius + 6) {
    enemy.activeMeleeStrike.connected = true;
    applyPlayerDamage(enemy.activeMeleeStrike.profile.damage, "axe-finisher", enemy);
    if (moduleState.reflexAegis.resolveLockTime > 0) {
      return;
    }
    applyStatusEffect(player, "stun", getStatusDuration(enemy.activeMeleeStrike.profile.stun), 1);
    addImpact(player.x, player.y, "#fff1bd", 34);
    addShake(8.4);
  }

  if (enemy.attackCommitTime <= 0) {
    enemy.activeMeleeStrike = null;
  }
}

 // spawnEnemyBoltLinkJavelin is imported from abilities.js

export function castEnemyVGripHarpoon(forward, target = player) {
  startCast(enemy, "vGripHarpoon", executeEnemyVGripHarpoonCast, { forward, target });
}

export function executeEnemyVGripHarpoonCast(params) {
  const { forward, target } = params;
  if (!target || !target.alive) return;

  enemy.abilityCooldowns.vGripHarpoon = config.vGripHarpoonCooldown + 0.6;
  playModuleCue("vGripHarpoon", "enemy");
  addBeamEffect(enemy.x, enemy.y, target.x, target.y, "#ffd5c8", 5, 0.18);
  addImpact(enemy.x, enemy.y, "#9feeff", 32);
  addShake(5.2);

  if (target === player && tryTriggerReflexAegis(enemy, "vGripHarpoon")) {
    return;
  }

  if (target === player && (moduleState.dash.invulnerabilityTime > 0 || moduleState.ghostDriftModule.time > 0)) {
    addImpact(player.x, player.y, "#b8f9c9", 20);
    statusLine.textContent = "You slipped the enemy harpoon with clean timing.";
    return;
  }

  const toEnemy = normalize(enemy.x - target.x, enemy.y - target.y);
  const currentDistance = length(target.x - enemy.x, target.y - enemy.y);
  const desiredDistance = Math.max(enemy.radius + target.radius + 18, currentDistance - config.vGripHarpoonPullDistance * 0.82);
  target.x = enemy.x - toEnemy.x * desiredDistance;
  target.y = enemy.y - toEnemy.y * desiredDistance;
  target.velocityX = toEnemy.x * 260;
  target.velocityY = toEnemy.y * 260;
  resolveMapCollision(target);
  maybeTeleportEntity(target);
  applyStatusEffect(target, "slow", getStatusDuration(config.vGripHarpoonSnareDuration * 0.85), config.vGripHarpoonSnare);
  applyStatusEffect(target, "snare", getStatusDuration(config.vGripHarpoonSnareDuration * 0.85), 1);
  addImpact(target.x, target.y, "#ffe5dd", 22);
  statusLine.textContent = target === playerClone
    ? "Enemy harpoon dragged the phantom copy out of position."
    : "Enemy harpoon dragged you into close pressure.";
}

export function castEnemyHexPlateProjector() {
  startVisualCast(enemy, "hexPlateProjector", 0.3);
  enemy.abilityCooldowns.hexPlateProjector = config.hexPlateProjectorCooldown + 0.5;
  enemy.shield = Math.max(enemy.shield, config.hexPlateProjectorValue);
  enemy.shieldTime = config.hexPlateProjectorDuration;
  enemy.shieldGuardTime = config.hexPlateProjectorDuration;
  enemy.shieldBreakRefundReady = true;
  playModuleCue("hexPlateProjector", "enemy");
  addImpact(enemy.x, enemy.y, "#a8d9ff", 22);
}

export function castEnemyEmPulseEmitter() {
  startVisualCast(enemy, "emPulseEmitter", 0.35);
  enemy.abilityCooldowns.emPulseEmitter = config.emPulseEmitterCooldown + 0.8;
  playModuleCue("emPulseEmitter", "enemy");
  addExplosion(enemy.x, enemy.y, 72, "#cbb0ff");
  addImpact(enemy.x, enemy.y, "#b99cff", 24);
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    if (length(bullets[i].x - enemy.x, bullets[i].y - enemy.y) <= 96) {
      addAbsorbBurst(bullets[i].x, bullets[i].y, 16, "#cbb0ff");
      bullets.splice(i, 1);
    }
  }
  if (length(player.x - enemy.x, player.y - enemy.y) <= 118 + player.radius) {
    applyStatusEffect(player, "slow", getStatusDuration(0.9), 0.34);
  }
}

export function castEnemyJetBackThruster() {
  startVisualCast(enemy, "jetBackThruster", 0.3);
  enemy.abilityCooldowns.jetBackThruster = 4.1;
  const retreat = normalize(enemy.x - player.x, enemy.y - player.y);
  enemy.x = clamp(enemy.x + retreat.x * 150, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + retreat.y * 150, enemy.radius, arena.height - enemy.radius);
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  enemy.shield = Math.max(enemy.shield, 8);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.6);
  playModuleCue("jetBackThruster", "enemy");
  addAfterimage(enemy.x, enemy.y, enemy.facing, enemy.radius + 5, "#fff0a8");
  addImpact(enemy.x, enemy.y, "#fff0a8", 18);
}

export function castEnemyChainLightning(target = player) {
  startCast(enemy, "chainLightning", executeEnemyChainLightningCast, { target });
}

export function executeEnemyChainLightningCast(params) {
  const target = params.target;
  if (!target || !target.alive) return;

  enemy.abilityCooldowns.chainLightning = getStatusDuration(5.6);
  addBeamEffect(enemy.x, enemy.y, target.x, target.y, "#d7bfff", 4.5, 0.14);
  if (target === playerClone) {
    applyPhantomDamage(24, "enemy-chain-lightning");
    applyStatusEffect(target, "slow", getStatusDuration(0.42), 0.2);
  } else {
    applyPlayerDamage(24, "enemy-chain-lightning", enemy);
    if (moduleState.reflexAegis.resolveLockTime <= 0) {
      applyStatusEffect(target, "slow", getStatusDuration(0.5), 0.2);
    } else {
      return;
    }
  }
  addImpact(target.x, target.y, "#d7bfff", 24);
  addImpact(enemy.x, enemy.y, "#9feaff", 28);
  addShake(3.2);
}

export function castEnemyBlink(forward) {
  startVisualCast(enemy, "blink", 0.3);
  enemy.abilityCooldowns.blink = 3.6;
  enemy.x = clamp(enemy.x + forward.x * 132, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + forward.y * 132, enemy.radius, arena.height - enemy.radius);
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  playModuleCue("blink", "enemy");
  addImpact(enemy.x, enemy.y, "#b3f6ff", 18);
}

export function castEnemyPhaseDash(forward) {
  startVisualCast(enemy, "phaseDash", 0.28);
  enemy.abilityCooldowns.phaseDash = 4.8;
  enemy.dodgeVectorX = forward.x;
  enemy.dodgeVectorY = forward.y;
  enemy.dodgeTime = 0.22;
  enemy.shield = Math.max(enemy.shield, 10);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.5);
  playModuleCue("jetBackThruster", "enemy");
  addImpact(enemy.x, enemy.y, "#d2f1ff", 20);
}

export function castEnemySwarmMissileRack(target = player) {
  startCast(enemy, "swarmMissileRack", executeEnemySwarmMissileRackCast, { target });
}

export function executeEnemySwarmMissileRackCast(params) {
  const target = params.target;
  if (!target || !target.alive) return;

  enemy.abilityCooldowns.swarmMissileRack = config.swarmMissileRackCooldown + 0.2;
  const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  const burstId = beginSwarmMissileRackCast("enemy", config.swarmMissileRackMissiles);
  for (let pellet = 0; pellet < config.swarmMissileRackMissiles; pellet += 1) {
    const spread = -0.18 + pellet * (0.36 / Math.max(1, config.swarmMissileRackMissiles - 1));
    const angle = baseAngle + spread;
    spawnBullet(enemy, enemy.x + Math.cos(angle) * 100, enemy.y + Math.sin(angle) * 100, enemyBullets, "#84dcff", config.swarmMissileRackProjectileSpeed * 0.94, config.swarmMissileRackBaseDamage * 0.92, {
      radius: 4.5,
      life: config.swarmMissileRackLifetime,
      trailColor: "#c9f3ff",
      source: "enemy-pulse-burst",
      effect: {
        kind: "swarmMissileRack",
        burstId,
        guideTurnRate: config.swarmMissileRackGuideTurnRate * 0.9,
        guideDot: config.swarmMissileRackGuideDot,
        resolved: false,
      },
    });
  }
  playModuleCue("swarmMissileRack", "enemy");
  addImpact(enemy.x, enemy.y, "#7ddcff", 32);
  addShake(4.8);
  enemy.flash = 0.08;
}

export function castEnemyRailShot(target = player) {
  startCast(enemy, "railShot", executeEnemyRailShotCast, { target });
}

export function executeEnemyRailShotCast(params) {
  const target = params.target;
  if (!target) return;

  enemy.abilityCooldowns.railShot = 5.3;
  playModuleCue("railShot", "enemy");
  addImpact(enemy.x, enemy.y, "#ffd279", 36);
  addShake(6.4);
  enemy.flash = 0.1;
  fireEnemySniper(target.x + (target.velocityX ?? 0) * 0.24, target.y + (target.velocityY ?? 0) * 0.24);
}

export function castEnemyVoidCoreSingularity(target = player) {
  startCast(enemy, "voidCoreSingularity", executeEnemyVoidCoreSingularityCast, { target });
}

export function executeEnemyVoidCoreSingularityCast(params) {
  const target = params.target;
  if (!target) return;

  enemy.abilityCooldowns.voidCoreSingularity = config.voidCoreSingularityCooldown + 0.2;
  supportZones.push({
    type: "voidCoreSingularity",
    team: "enemy",
    x: target.x,
    y: target.y,
    radius: config.voidCoreSingularityRadius * 0.92,
    life: config.voidCoreSingularityDuration * 0.9,
    maxLife: config.voidCoreSingularityDuration * 0.9,
    color: "#d1a2ff",
    slow: config.voidCoreSingularitySlow * 0.9,
    pullStrength: config.voidCoreSingularityPullStrength * 0.92,
  });
  playModuleCue("voidCoreSingularity", "enemy");
  addExplosion(target.x, target.y, config.voidCoreSingularityRadius, "#b999ff");
  addImpact(enemy.x, enemy.y, "#b999ff", 32);
  addShake(5.6);
}

export function castEnemyGhostDriftModule() {
  startVisualCast(enemy, "ghostDriftModule", 0.35);
  enemy.abilityCooldowns.ghostDriftModule = 5.8;
  enemy.shield = Math.max(enemy.shield, 14);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.7);
  playModuleCue("ghostDriftModule", "enemy");
  addImpact(enemy.x, enemy.y, "#d2f1ff", 18);
}

export function castEnemySpectreProjector() {
  startVisualCast(enemy, "spectreProjector", 0.32);
  enemy.abilityCooldowns.spectreProjector = 6.4;
  enemy.postAttackMoveTime = Math.max(enemy.postAttackMoveTime, 0.5);
  playModuleCue("spectreProjector", "enemy");
  addAfterimage(enemy.x - 32, enemy.y + 16, enemy.facing, enemy.radius + 5, "#d8b8ff");
}

export function castEnemyOverdriveServos() {
  startVisualCast(enemy, "overdriveServos", 0.4);
  enemy.abilityCooldowns.overdriveServos = 4.4;
  enemy.hasteTime = Math.max(enemy.hasteTime, 1.8);
  playModuleCue("overdriveServos", "enemy");
  addImpact(enemy.x, enemy.y, "#8dfcc7", 18);
}

export function updateEnemyBoltLinkJavelins(dt) {
  for (let i = enemyBoltLinkJavelins.length - 1; i >= 0; i -= 1) {
    const javelin = enemyBoltLinkJavelins[i];
    applyFieldDragToProjectile(javelin, "enemy", dt);
    javelin.x += javelin.vx * dt;
    javelin.y += javelin.vy * dt;
    javelin.life -= dt;

    tracers.push({
      x0: javelin.x - javelin.vx * 0.01,
      y0: javelin.y - javelin.vy * 0.01,
      x1: javelin.x + javelin.vx * 0.02,
      y1: javelin.y + javelin.vy * 0.02,
      color: javelin.trail,
      life: 0.05,
      maxLife: 0.05,
    });

    if (
      javelin.life <= 0 ||
      javelin.x < -20 ||
      javelin.y < -20 ||
      javelin.x > arena.width + 20 ||
      javelin.y > arena.height + 20
    ) {
      enemyBoltLinkJavelins.splice(i, 1);
      continue;
    }

    if (hitMapWithProjectile(javelin, "enemy")) {
      enemyBoltLinkJavelins.splice(i, 1);
      continue;
    }

    const targets = playerClone.active && playerClone.alive ? [playerClone, player] : [player];
    let hitTarget = null;
    for (const target of targets) {
      if (length(javelin.x - target.x, javelin.y - target.y) <= javelin.radius + target.radius) {
        hitTarget = target;
        break;
      }
    }

    if (!hitTarget) {
      continue;
    }

    enemyBoltLinkJavelins.splice(i, 1);
    addImpact(hitTarget.x, hitTarget.y, javelin.charged ? "#ffd7be" : "#ffb09a", javelin.charged ? 26 : 18);

    if (hitTarget === player && moduleState.dash.invulnerabilityTime > 0) {
      addImpact(player.x, player.y, "#b8f9c9", 20);
      statusLine.textContent = "Clean dash through enemy javelin.";
      continue;
    }

    if (hitTarget === playerClone) {
      applyPhantomDamage(javelin.damage, "boltLinkJavelin");
      applyStatusEffect(hitTarget, "slow", getStatusDuration(javelin.slowDuration * 0.8), javelin.slow);
      applyStatusEffect(hitTarget, "shock", getStatusDuration(javelin.slowDuration * 0.8), 1);
      statusLine.textContent = "Enemy javelin clipped the phantom copy.";
      addShake(javelin.charged ? 6.6 : 4.8);
      continue;
    }

    const defeatedByJavelin = applyPlayerDamage(javelin.damage, "boltLinkJavelin", enemy);
    if (moduleState.reflexAegis.resolveLockTime > 0) {
      continue;
    }
    applyStatusEffect(player, "slow", getStatusDuration(javelin.slowDuration * (1 - getBuildStats().ccReduction)), javelin.slow);
    applyStatusEffect(player, "shock", getStatusDuration(javelin.slowDuration * (1 - getBuildStats().ccReduction)), 1);
    statusLine.textContent = "Enemy javelin electrified and slowed you.";
    addShake(javelin.charged ? 8 : 5.8);

    if (defeatedByJavelin && !player.alive) {
      break;
    }
  }
}

export function updateEnemy(dt) {
  enemy.flash = Math.max(0, enemy.flash - dt);
  updateStatusEffects(enemy, dt);
  tickEntityMarks(enemy, dt);

  if (sandbox.mode !== sandboxModes.duel.key || !enemy.alive || !isCombatLive()) {
    return;
  }

  const diff = getDifficultyModifiers();
  const enemyStatus = getStatusState(enemy);
  const previousX = enemy.x;
  const previousY = enemy.y;
  enemy.reloadTime = Math.max(0, enemy.reloadTime - dt);
  enemy.boltLinkJavelinCooldown = Math.max(0, enemy.boltLinkJavelinCooldown - dt);
  enemy.orbitalDistorterCooldown = Math.max(0, enemy.orbitalDistorterCooldown - dt);
  enemy.dashCooldown = Math.max(0, enemy.dashCooldown - dt);
  enemy.postAttackMoveTime = Math.max(0, enemy.postAttackMoveTime - dt);
  enemy.shieldTime = Math.max(0, enemy.shieldTime - dt);
  enemy.shieldGuardTime = Math.max(0, enemy.shieldGuardTime - dt);
  if (enemy.shieldGuardTime <= 0 || enemy.shield <= 0) {
    enemy.shieldGuardTime = 0;
    enemy.shieldBreakRefundReady = false;
  }
  enemy.hasteTime = Math.max(0, enemy.hasteTime - dt);
  enemy.comboTimer = Math.max(0, enemy.comboTimer - dt);
  enemy.meleeWindupTime = Math.max(0, enemy.meleeWindupTime - dt);
  enemy.abilityCooldowns.vGripHarpoon = Math.max(0, enemy.abilityCooldowns.vGripHarpoon - dt);
  enemy.abilityCooldowns.hexPlateProjector = Math.max(0, enemy.abilityCooldowns.hexPlateProjector - dt);
  enemy.abilityCooldowns.overdriveServos = Math.max(0, enemy.abilityCooldowns.overdriveServos - dt);
  enemy.abilityCooldowns.emPulseEmitter = Math.max(0, enemy.abilityCooldowns.emPulseEmitter - dt);
  enemy.abilityCooldowns.jetBackThruster = Math.max(0, enemy.abilityCooldowns.jetBackThruster - dt);
  enemy.abilityCooldowns.chainLightning = Math.max(0, enemy.abilityCooldowns.chainLightning - dt);
  enemy.abilityCooldowns.blink = Math.max(0, enemy.abilityCooldowns.blink - dt);
  enemy.abilityCooldowns.phaseDash = Math.max(0, enemy.abilityCooldowns.phaseDash - dt);
  enemy.abilityCooldowns.swarmMissileRack = Math.max(0, enemy.abilityCooldowns.swarmMissileRack - dt);
  enemy.abilityCooldowns.railShot = Math.max(0, enemy.abilityCooldowns.railShot - dt);
  enemy.abilityCooldowns.voidCoreSingularity = Math.max(0, enemy.abilityCooldowns.voidCoreSingularity - dt);
  enemy.abilityCooldowns.ghostDriftModule = Math.max(0, enemy.abilityCooldowns.ghostDriftModule - dt);
  enemy.abilityCooldowns.spectreProjector = Math.max(0, enemy.abilityCooldowns.spectreProjector - dt);
  enemy.abilityCooldowns.overdriveServos = Math.max(0, enemy.abilityCooldowns.overdriveServos - dt);
  enemy.focusTime = Math.max(0, (enemy.focusTime ?? 0) - dt);
  player.lastMissTime = Math.max(0, (player.lastMissTime ?? 0) - dt);
  enemy.shootCooldown -= dt;
  enemy.strafeTimer += dt;
  enemy.dodgeCooldown = Math.max(0, enemy.dodgeCooldown - dt);
  updateCasting(enemy, dt);

  if (enemy.shieldTime <= 0) {
    enemy.shield = 0;
  }
  if (enemy.reloadTime <= 0 && enemy.weapon === weapons.pulse.key && enemy.ammo <= 0) {
    finalizePulseReload(enemy);
  }

  const focusTargetEntity = getEnemyFocusTarget();
  const targetX = focusTargetEntity.x;
  const targetY = focusTargetEntity.y;
  const targetVelocityX = focusTargetEntity.velocityX ?? 0;
  const targetVelocityY = focusTargetEntity.velocityY ?? 0;
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = length(dx, dy);
  const forward = normalize(dx, dy);
  const side = { x: -forward.y, y: forward.x };
  const enemyFieldModifier = getFieldInfluence(enemy);
  const enemyZoneEffects = getZoneEffectsForEntity(enemy, dt);
  const playerLow = player.hp <= 38;
  const enemyLow = enemy.hp <= 72;
  const targetOnAxe = focusTargetEntity.weapon === weapons.axe.key;
  const enemyOnAxe = enemy.weapon === weapons.axe.key;
  const enemyOnShotgun = enemy.weapon === weapons.shotgun.key;
  const enemyOnPulse = enemy.weapon === weapons.pulse.key;
  const enemyOnSniper = enemy.weapon === weapons.sniper.key;
  const enemyOnStaff = enemy.weapon === weapons.staff.key;
  const enemyOnInjector = enemy.weapon === weapons.injector.key;
  const enemyOnLance = enemy.weapon === weapons.lance.key;
  const enemyOnCannon = enemy.weapon === weapons.cannon.key;
  const playerExposed =
    focusTargetEntity === playerClone
      ? playerClone.actionQueue.length === 0 && playerClone.actionFlash <= 0.04
      : (player.lastMissTime ?? 0) > 0 ||
        player.fireCooldown > 0.16 ||
        player.attackStartupTime > 0 ||
        player.attackCommitTime > 0 ||
        player.activeAxeStrike !== null ||
        player.pendingAxeStrike !== null;
  const targetRange = getEnemyTargetRange();
  const punishWindow = playerExposed || playerLow;
  const shouldPunish =
    (punishWindow && (diff.punishAwareness >= 1 || Math.random() < diff.punishAwareness)) ||
    (focusTargetEntity !== player && focusTargetEntity.hp <= focusTargetEntity.maxHp * 0.42);
  const behaviorProfile = getEnemyBehaviorProfile(distance, shouldPunish);
  const shouldKite =
    (enemyLow || (targetOnAxe && distance < 332) || (enemyOnPulse && distance < 210)) &&
    (diff.spacingAwareness >= 1 || Math.random() < diff.spacingAwareness);
  const pressureOpportunity = shouldPunish || playerLow || (enemyOnShotgun && distance < targetRange + 44) || (enemyOnAxe && distance < targetRange + 30);
  const shouldPressure =
    pressureOpportunity &&
    distance < 420 &&
    (diff.pressureAdaptation >= 1 || Math.random() < diff.pressureAdaptation);
  const actionDelay = playerExposed ? diff.actionDelay * 0.4 : diff.actionDelay;
  const canUseDefensiveAbility = !enemyStatus.stunned && (enemyLow || diff.defensiveReaction >= 1 || Math.random() < diff.defensiveReaction);
  const canUseOffensiveAbility = !enemyStatus.stunned && (diff.abilityTiming >= 1 || Math.random() < diff.abilityTiming);

  let moveX = 0;
  let moveY = 0;

  if (enemyStatus.stunned) {
    enemy.dodgeTime = 0;
    enemy.attackCommitTime = 0;
  } else if (enemy.dodgeTime > 0) {
    enemy.dodgeTime = Math.max(0, enemy.dodgeTime - dt);
    moveX = enemy.dodgeVectorX;
    moveY = enemy.dodgeVectorY;
    addAfterimage(enemy.x, enemy.y, Math.atan2(moveY, moveX), enemy.radius, "#ffc3b8");
  } else if (enemy.attackCommitTime > 0 && enemy.activeMeleeStrike) {
    updateEnemyAxeCommit(dt, previousX, previousY);
  } else {
    if (!enemy.strafeDir || Math.random() < dt * diff.strafeChangeRate) {
      enemy.strafeDir = Math.random() < 0.5 ? 1 : -1;
    }
    const strafeScale = (enemy.postAttackMoveTime > 0 ? 1.38 : 1) * behaviorProfile.strafeScale;
    const strafeDirection = enemy.strafeDir;
    moveX = side.x * strafeDirection * 1.12 * strafeScale;
    moveY = side.y * strafeDirection * 1.12 * strafeScale;

    if (distance > targetRange + 28 || shouldPressure) {
      moveX += forward.x * behaviorProfile.engageBias;
      moveY += forward.y * behaviorProfile.engageBias;
    } else if (distance < targetRange - 74 || shouldKite) {
      moveX -= forward.x * behaviorProfile.retreatBias;
      moveY -= forward.y * behaviorProfile.retreatBias;
    }

    if (enemy.castTime > 0) {
      const castFriction = config.playerFriction * 3.2;
      enemy.velocityX = approach(enemy.velocityX, 0, castFriction * dt);
      enemy.velocityY = approach(enemy.velocityY, 0, castFriction * dt);
      moveX *= 0.1;
      moveY *= 0.1;
    }

    if (enemy.meleeWindupTime > 0) {
      moveX *= 0.28;
      moveY *= 0.28;
    }
  }

  enemy.velocityX += moveX * config.enemyAccel * dt;
  enemy.velocityY += moveY * config.enemyAccel * dt;
  const desired = normalize(moveX, moveY);
  const speed =
      (enemy.dodgeTime > 0 ? config.enemyDodgeSpeed : config.enemySpeed) *
      (enemyStatus.stunned ? 0 : 1) *
      (enemy.hasteTime > 0 ? 1.12 : 1) *
      enemyStatus.speedMultiplier *
      enemyFieldModifier.slowMultiplier *
      enemyZoneEffects.slowMultiplier;
  if (!(enemy.attackCommitTime > 0 && enemy.activeMeleeStrike)) {
    enemy.x = clamp(enemy.x + desired.x * speed * dt, enemy.radius, arena.width - enemy.radius);
    enemy.y = clamp(enemy.y + desired.y * speed * dt, enemy.radius, arena.height - enemy.radius);
  }
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  enemy.facing = Math.atan2(targetY - enemy.y, targetX - enemy.x);

  if (enemyFieldModifier.disrupted) {
    applyStatusEffect(enemy, "stun", 0.28, 1);
    enemy.shootCooldown = Math.max(enemy.shootCooldown, 0.8);
    enemy.dodgeCooldown = Math.max(enemy.dodgeCooldown, 0.7);
    addImpact(enemy.x, enemy.y, "#c9d5ff", 20);
    statusLine.textContent = "Magnetic disruption threw the bot off-balance.";
  }

  const incomingProjectile = bullets.find((bullet) => {
    const nextX = bullet.x + bullet.vx * 0.12;
    const nextY = bullet.y + bullet.vy * 0.12;
    return length(nextX - enemy.x, nextY - enemy.y) < 66;
  });

  if (
    canUseOffensiveAbility &&
    enemyHasAbility("orbitalDistorter") &&
    enemy.orbitalDistorterCooldown <= 0 &&
    (incomingProjectile || (targetOnAxe && distance < behaviorProfile.fieldResponseDistance))
  ) {
    spawnEnemyOrbitalDistorterField();
  }

  if (canUseOffensiveAbility && enemyHasAbility("boltLinkJavelin") && enemy.boltLinkJavelinCooldown <= 0 && distance > 180 && distance < 620) {
    const chargedJavelin = enemyLow || shouldPunish || distance > 360;
    if (shouldPunish || Math.random() < (chargedJavelin ? 0.48 : 0.34)) {
      spawnEnemyBoltLinkJavelin(chargedJavelin, focusTargetEntity);
      enemy.postAttackMoveTime = 0.62;
      enemy.shootCooldown = Math.max(enemy.shootCooldown, 0.18);
    }
  }

  if (
    canUseOffensiveAbility &&
    enemyHasAbility("vGripHarpoon") &&
    enemy.abilityCooldowns.vGripHarpoon <= 0 &&
    distance > targetRange + 120 &&
    (shouldPunish || distance > behaviorProfile.abilityPressureDistance)
  ) {
    castEnemyVGripHarpoon(forward, focusTargetEntity);
    if (diff.comboChaining) {
      enemy.shootCooldown = Math.min(enemy.shootCooldown, 0.12 + actionDelay);
    }
  }

  if (
    canUseDefensiveAbility &&
    enemyHasAbility("hexPlateProjector") &&
    enemy.abilityCooldowns.hexPlateProjector <= 0 &&
    (enemyLow || incomingProjectile)
  ) {
    castEnemyHexPlateProjector();
  }

  if (
    canUseOffensiveAbility &&
    enemyHasAbility("emPulseEmitter") &&
    enemy.abilityCooldowns.emPulseEmitter <= 0 &&
    (incomingProjectile || distance < 126)
  ) {
    castEnemyEmPulseEmitter();
  }

  if (canUseDefensiveAbility && enemyHasAbility("jetBackThruster") && enemy.abilityCooldowns.jetBackThruster <= 0 && (enemyLow || (targetOnAxe && distance < 170))) {
    castEnemyJetBackThruster();
  }

  if (canUseOffensiveAbility && enemyHasAbility("blink") && enemy.abilityCooldowns.blink <= 0 && distance > targetRange + 140) {
    castEnemyBlink(forward);
  }

  if (canUseOffensiveAbility && enemyHasAbility("phaseDash") && enemy.abilityCooldowns.phaseDash <= 0 && (incomingProjectile || (shouldPunish && distance > 170 && distance < 360))) {
    castEnemyPhaseDash(shouldPunish ? forward : { x: side.x, y: side.y });
  }

  if (canUseOffensiveAbility && enemyHasAbility("voidCoreSingularity") && enemy.abilityCooldowns.voidCoreSingularity <= 0 && distance > 180 && distance < 420 && (playerExposed || targetOnAxe)) {
    castEnemyVoidCoreSingularity(focusTargetEntity);
  }

  if (canUseDefensiveAbility && enemyHasAbility("ghostDriftModule") && enemy.abilityCooldowns.ghostDriftModule <= 0 && (enemyLow || incomingProjectile)) {
    castEnemyGhostDriftModule();
  }

  if (canUseDefensiveAbility && enemyHasAbility("spectreProjector") && enemy.abilityCooldowns.spectreProjector <= 0 && enemyLow) {
    castEnemySpectreProjector();
  }

  if (canUseOffensiveAbility && enemyHasAbility("overdriveServos") && enemy.abilityCooldowns.overdriveServos <= 0 && (shouldPunish || distance > targetRange + 90)) {
    castEnemyOverdriveServos();
  }

  if (!enemyStatus.stunned && enemy.weapon === weapons.axe.key && enemy.meleeWindupTime <= 0 && enemy.pendingMeleeStrike) {
    resolveEnemyAxeStrike();
  }

  if (!enemyStatus.stunned && enemyOnPulse && enemy.burstShots > 0 && enemy.shootCooldown <= 0) {
    enemy.burstShots -= 1;
    enemy.shootCooldown = (enemy.burstShots > 0 ? 0.16 : 0.84) * diff.cooldownMult + diff.reactionDelay + actionDelay;
    const pulseAimLead = diff.aimLeadFactor + (playerExposed ? 0.08 : 0.02);
    const leadX = targetX + targetVelocityX * pulseAimLead;
    const leadY = targetY + targetVelocityY * pulseAimLead;
    fireEnemyPulse(leadX, leadY, shouldPunish);
  } else if (!enemyStatus.stunned && enemyOnPulse && enemy.shootCooldown <= 0 && distance < 660) {
    enemy.burstShots = behaviorProfile.shootBurstSize + (diff.comboChaining && shouldPunish ? 1 : 0);
    enemy.shootCooldown = 0.08 * diff.cooldownMult + diff.reactionDelay + actionDelay;
    enemy.postAttackMoveTime = 0.46;
  } else if (!enemyStatus.stunned && enemyOnShotgun && enemy.shootCooldown <= 0 && distance < 340) {
    if (fireEnemyShotgun(targetX, targetY)) {
      enemy.shootCooldown = (shouldPunish ? 0.78 : 0.96) * diff.cooldownMult + diff.reactionDelay + actionDelay;
      enemy.postAttackMoveTime = 0.4;
    }
  } else if (canUseOffensiveAbility && enemyHasAbility("swarmMissileRack") && enemy.abilityCooldowns.swarmMissileRack <= 0 && distance < 320 && shouldPunish) {
    castEnemySwarmMissileRack(focusTargetEntity);
    enemy.shootCooldown = 0.42 * diff.cooldownMult;
  } else if (canUseOffensiveAbility && enemyHasAbility("chainLightning") && enemy.abilityCooldowns.chainLightning <= 0 && distance < 380 && (shouldPunish || playerExposed)) {
    castEnemyChainLightning(focusTargetEntity);
    enemy.shootCooldown = 0.46 * diff.cooldownMult;
  } else if (!enemyStatus.stunned && enemyOnSniper && enemy.shootCooldown <= 0 && distance > 280 && distance < 920) {
    const sniperAimLead = diff.aimLeadFactor + 0.04;
    if (fireEnemySniper(targetX + targetVelocityX * sniperAimLead, targetY + targetVelocityY * sniperAimLead)) {
      enemy.shootCooldown = (shouldPunish ? 1.08 : 1.26) * diff.cooldownMult + diff.reactionDelay + actionDelay;
      enemy.postAttackMoveTime = 0.54;
    }
  } else if (canUseOffensiveAbility && enemyHasAbility("railShot") && enemy.abilityCooldowns.railShot <= 0 && distance > 340 && shouldPunish) {
    castEnemyRailShot(focusTargetEntity);
    enemy.shootCooldown = 0.62 * diff.cooldownMult;
  } else if (!enemyStatus.stunned && enemyOnStaff && enemy.shootCooldown <= 0 && distance < 480) {
    if (fireEnemyStaff(targetX, targetY)) {
      enemy.shootCooldown = 0.52 * diff.cooldownMult + diff.reactionDelay + actionDelay;
      enemy.postAttackMoveTime = 0.32;
    }
  } else if (!enemyStatus.stunned && enemyOnInjector && enemy.shootCooldown <= 0 && distance < 560) {
    const injectorAimLead = Math.max(0.06, diff.aimLeadFactor * 0.68);
    if (fireEnemyInjector(targetX + targetVelocityX * injectorAimLead, targetY + targetVelocityY * injectorAimLead)) {
      enemy.shootCooldown = (shouldPunish ? 0.34 : 0.42) * diff.cooldownMult + diff.reactionDelay + actionDelay;
      enemy.postAttackMoveTime = 0.28;
    }
  } else if (!enemyStatus.stunned && enemyOnCannon && enemy.shootCooldown <= 0 && distance < 820) {
    const cannonAimLead = diff.aimLeadFactor + 0.02;
    if (fireEnemyCannon(targetX + targetVelocityX * cannonAimLead, targetY + targetVelocityY * cannonAimLead, shouldPunish && distance < 260)) {
      enemy.shootCooldown = (shouldPunish ? 1.18 : 1.34) * diff.cooldownMult + diff.reactionDelay + actionDelay;
      enemy.postAttackMoveTime = 0.58;
    }
  } else if (!enemyStatus.stunned && enemyOnLance && enemy.shootCooldown <= 0 && distance < 320) {
    if (fireEnemyLance(focusTargetEntity, shouldPunish && distance < 210)) {
      enemy.shootCooldown = (shouldPunish ? 0.92 : 1.08) * diff.cooldownMult + diff.reactionDelay + actionDelay;
      enemy.postAttackMoveTime = 0.24;
    }
  } else if (!enemyStatus.stunned && enemyOnAxe && enemy.shootCooldown <= 0 && enemy.meleeWindupTime <= 0 && enemy.attackCommitTime <= 0) {
    if ((distance < 296 && shouldPunish) || distance < 188 || (diff.comboChaining && shouldPunish && distance < 324)) {
      queueEnemyAxeStrike();
      enemy.postAttackMoveTime = 0.18;
    }
  }

  if (!enemyStatus.stunned && enemy.dodgeCooldown <= 0) {
    if (incomingProjectile && Math.random() < behaviorProfile.dodgeAggression) {
      const dodgeSide = Math.random() < 0.5 ? -1 : 1;
      enemy.dodgeVectorX = side.x * dodgeSide;
      enemy.dodgeVectorY = side.y * dodgeSide;
      enemy.dodgeTime = config.enemyDodgeDuration + 0.05;
      enemy.dodgeCooldown = config.enemyDodgeCooldown;
      enemy.dashCooldown = 1.6;
      addImpact(enemy.x, enemy.y, "#ffc3b8", 18);
      statusLine.textContent = "The bot is dodging your fire. Track it.";
    } else if ((shouldPunish || player.attackStartupTime > 0) && distance > 150 && distance < 330 && enemy.dashCooldown <= 0 && (diff.dodgeReaction >= 1 || Math.random() < diff.dodgeReaction)) {
      enemy.dodgeVectorX = forward.x;
      enemy.dodgeVectorY = forward.y;
      enemy.dodgeTime = config.enemyDodgeDuration + 0.06;
      enemy.dodgeCooldown = config.enemyDodgeCooldown;
      enemy.dashCooldown = 1.65;
      addImpact(enemy.x, enemy.y, "#ffd0a8", 20);
      enemy.postAttackMoveTime = 0.28;
    }
  }
}

export function updateTrainingBots(dt) {
  for (const bot of trainingBots) {
    bot.flash = Math.max(0, bot.flash - dt);
    updateStatusEffects(bot, dt);
    tickEntityMarks(bot, dt);
    bot.shieldGuardTime = Math.max(0, (bot.shieldGuardTime ?? 0) - dt);
    if (bot.shieldGuardTime <= 0 || bot.shield <= 0) {
      bot.shieldGuardTime = 0;
      bot.shieldBreakRefundReady = false;
    }

    if (!bot.alive) {
      continue;
    }

    updateCasting(bot, dt);

    if (bot.castTime > 0) {
      const botFriction = config.playerFriction * 3.2;
      bot.velocityX = approach(bot.velocityX ?? 0, 0, botFriction * dt);
      bot.velocityY = approach(bot.velocityY ?? 0, 0, botFriction * dt);
    }

    const dx = player.x - bot.x;
    const dy = player.y - bot.y;
    bot.facing = Math.atan2(dy, dx);
    if (trainingToolState.botsFire && isCombatLive()) {
      bot.shootCooldown = Math.max(0, bot.shootCooldown - dt);
      if (bot.shootCooldown <= 0 && !getStatusState(bot).stunned) {
        fireTrainingPulse(bot, player.x, player.y);
        bot.shootCooldown = bot.cadence;
      }
    } else {
      bot.shootCooldown = 999;
    }
    resolveMapCollision(bot);
    maybeTeleportEntity(bot);
  }
}

