// Enemy AI, training bots, enemy actions
import { config, abilityConfig, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, trainingBots, abilityState, loadout, sandbox, matchState, input,
  bullets, enemyBullets, shockJavelins, enemyShockJavelins, magneticFields, supportZones, mapState } from "../state.js";
import { clamp, length, normalize, approach } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addBeamEffect, addExplosion, addSlashEffect, applyHitReaction, addHealingText } from "./effects.js";
import { getMapLayout, resolveMapCollision, canSeeTarget, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasPerk, getRuneValue, getStatusDuration, getPerkDamageMultiplier, getPulseMagazineSize, enemyHasAbility } from "../build/loadout.js";
import { getAllBots, isCombatLive, damageBot, spawnBullet, applyStatusEffect, updateStatusEffects,
  clearStatusEffects, getPlayerFieldModifier, spawnEnemyMagneticField, startPulseReload, finalizePulseReload,
  tickEntityMarks, applyPlayerDamage, getStatusState, damagePylonsAlongLine, applyInjectorMark } from "./combat.js";

export function updateShockJavelins(dt) {
  for (let i = shockJavelins.length - 1; i >= 0; i -= 1) {
    const javelin = shockJavelins[i];
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
      shockJavelins.splice(i, 1);
      continue;
    }

    if (outOfBounds || javelin.life <= 0) {
      shockJavelins.splice(i, 1);
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
        javelin.damage,
        javelin.color,
        javelin.x,
        javelin.y,
        0,
      );
      addImpact(bot.x, bot.y, javelin.charged ? "#fff0b4" : "#dff7ff", javelin.charged ? 26 : 18);
      addShake(javelin.charged ? 8.8 : 6.8);

      if (javelin.charged) {
        applyStatusEffect(bot, "stun", getStatusDuration(javelin.stun), 1);
        addImpact(bot.x, bot.y, "#fff7d0", 30);
        statusLine.textContent = bot.role === "training"
          ? "Charged javelin stunned the training bot."
          : "Charged javelin stunned the bot.";
      } else {
        applyStatusEffect(bot, "slow", getStatusDuration(javelin.slowDuration), javelin.slow);
        addImpact(bot.x, bot.y, "#bff6ff", 20);
        statusLine.textContent = "Shock Javelin slowed the target.";
      }

      if (!javelin.piercing) {
        consumed = true;
        break;
      }
    }

    if (consumed) {
      shockJavelins.splice(i, 1);
    }
  }
}


export function getEnemyWeaponKey() {
  return enemy.weapon ?? enemy.loadout?.weapon ?? weapons.pulse.key;
}

export function getEnemyTargetRange() {
  const weaponKey = getEnemyWeaponKey();
  const hasGrapple = enemyHasAbility("magneticGrapple");
  const hasShield = enemyHasAbility("energyShield");
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
  return enemy.hp <= 72 ? 548 : hasShield ? 430 : 404;
}

export function getEnemyBehaviorProfile(distance, shouldPunish) {
  const weaponKey = getEnemyWeaponKey();
  const hasGrapple = enemyHasAbility("magneticGrapple");
  const hasShield = enemyHasAbility("energyShield");
  const hasEmp = enemyHasAbility("empBurst");

  if (weaponKey === weapons.axe.key) {
    return {
      strafeScale: shouldPunish ? 1.08 : 0.92,
      engageBias: hasGrapple ? 1.34 : 1.22,
      retreatBias: enemy.hp <= 72 ? 0.92 : 0.48,
      abilityPressureDistance: hasGrapple ? 430 : 300,
      fieldResponseDistance: 212,
      punishWindowDistance: distance < 318,
      dodgeAggression: 0.96,
      shootBurstSize: 0,
    };
  }

  if (weaponKey === weapons.shotgun.key) {
    return {
      strafeScale: shouldPunish ? 1.24 : 1.14,
      engageBias: hasGrapple ? 1.28 : 1.18,
      retreatBias: enemy.hp <= 72 ? 1.04 : 0.66,
      abilityPressureDistance: hasEmp ? 240 : 320,
      fieldResponseDistance: 230,
      punishWindowDistance: distance < 360,
      dodgeAggression: 0.9,
      shootBurstSize: 1,
    };
  }

  if (weaponKey === weapons.sniper.key) {
    return {
      strafeScale: shouldPunish ? 1.06 : 0.88,
      engageBias: 0.76,
      retreatBias: enemy.hp <= 72 ? 1.22 : 1.08,
      abilityPressureDistance: 520,
      fieldResponseDistance: 260,
      punishWindowDistance: distance > 420 && distance < 760,
      dodgeAggression: 1,
      shootBurstSize: 0,
    };
  }

  if (weaponKey === weapons.staff.key) {
    return {
      strafeScale: shouldPunish ? 1.08 : 1.02,
      engageBias: 1.02,
      retreatBias: enemy.hp <= 72 ? 0.94 : 0.72,
      abilityPressureDistance: 320,
      fieldResponseDistance: 220,
      punishWindowDistance: distance < 420,
      dodgeAggression: 0.9,
      shootBurstSize: 0,
    };
  }

  if (weaponKey === weapons.injector.key) {
    return {
      strafeScale: shouldPunish ? 1.16 : 1.04,
      engageBias: 1.04,
      retreatBias: enemy.hp <= 72 ? 1.06 : 0.78,
      abilityPressureDistance: 380,
      fieldResponseDistance: 240,
      punishWindowDistance: distance < 520,
      dodgeAggression: 0.94,
      shootBurstSize: 0,
    };
  }

  return {
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

  enemy.ammo = Math.max(0, enemy.ammo - 1);
  const spread = punishShot ? 18 : 30;
  const spreadX = (Math.random() - 0.5) * spread;
  const spreadY = (Math.random() - 0.5) * spread;
  spawnBullet(enemy, targetX + spreadX, targetY + spreadY, enemyBullets, "#ff8a77", 660, 6, {
    radius: 4,
    source: "enemy-pulse",
    trailColor: "#ffc0b4",
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 24, enemy.y + Math.sin(enemy.facing) * 24, "#ff8a77", 12);

  if (enemy.ammo <= 0) {
    startEnemyReload(enemy);
  }
  return true;
}

export function fireEnemyShotgun(targetX, targetY) {
  const baseAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.2 + pellet * 0.1;
    const angle = baseAngle + spread;
    spawnBullet(
      enemy,
      enemy.x + Math.cos(angle) * 100,
      enemy.y + Math.sin(angle) * 100,
      enemyBullets,
      "#ff9d62",
      config.bulletSpeed * 0.82,
      5,
      {
        radius: 4,
        source: "enemy-shotgun",
        trailColor: "#ffc49a",
      },
    );
  }
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
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#ffd27a", 1760, 18, {
    radius: 6,
    life: 0.78,
    piercing: true,
    trailColor: "#ffeab3",
    source: "enemy-sniper",
    effect: { kind: "rail", bonusSlow: 0.16, bonusSlowDuration: 0.6 },
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 26, enemy.y + Math.sin(enemy.facing) * 26, "#ffd27a", 18);
  return true;
}

export function fireEnemyStaff(targetX, targetY) {
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#9cffc4", 920, 7, {
    radius: 5,
    life: 0.92,
    trailColor: "#d2ffe3",
    source: "enemy-staff",
    effect: { kind: "staff", heal: 6 },
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 24, enemy.y + Math.sin(enemy.facing) * 24, "#9cffc4", 14);
  return true;
}

export function fireEnemyInjector(targetX, targetY) {
  spawnBullet(enemy, targetX, targetY, enemyBullets, "#d894ff", 1180, 6, {
    radius: 4,
    life: 0.86,
    trailColor: "#f0beff",
    source: "enemy-injector",
    effect: { kind: "injector", markDuration: 4, markMax: 3, healOnConsume: 10 },
  });
  addImpact(enemy.x + Math.cos(enemy.facing) * 22, enemy.y + Math.sin(enemy.facing) * 22, "#d894ff", 12);
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
  addImpact(bot.x + Math.cos(bot.facing) * 20, bot.y + Math.sin(bot.facing) * 20, "#9de8ff", 10);
}

export function queueEnemyAxeStrike() {
  enemy.comboStep = enemy.comboTimer > 0 ? (enemy.comboStep % 3) + 1 : 1;
  enemy.comboTimer = 0.92;
  const profile = { ...getAxeComboProfile(enemy.comboStep) };
  profile.damage *= 0.74;
  profile.stun *= 0.78;
  enemy.meleeWindupTime = profile.startup;
  enemy.pendingMeleeStrike = {
    profile,
    facing: enemy.facing,
    comboStep: enemy.comboStep,
  };
  enemy.shootCooldown = profile.cooldown;
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
    applyPlayerDamage(profile.damage, "axe");
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
    applyPlayerDamage(enemy.activeMeleeStrike.profile.damage, "axe-finisher");
    applyStatusEffect(player, "stun", getStatusDuration(enemy.activeMeleeStrike.profile.stun), 1);
    addImpact(player.x, player.y, "#fff1bd", 34);
    addShake(8.4);
  }

  if (enemy.attackCommitTime <= 0) {
    enemy.activeMeleeStrike = null;
  }
}

export function castEnemyGrapple(forward) {
  enemy.abilityCooldowns.grapple = config.grappleCooldown + 0.6;
  enemy.dodgeVectorX = forward.x;
  enemy.dodgeVectorY = forward.y;
  enemy.dodgeTime = 0.16;
  addImpact(enemy.x, enemy.y, "#bfeeff", 18);
}

export function castEnemyShield() {
  enemy.abilityCooldowns.shield = config.shieldCooldown + 0.4;
  enemy.shield = Math.max(enemy.shield, 24);
  enemy.shieldTime = 2.2;
  addImpact(enemy.x, enemy.y, "#a8d9ff", 22);
}

export function castEnemyBooster() {
  enemy.abilityCooldowns.booster = config.boosterCooldown + 0.8;
  enemy.hasteTime = Math.max(enemy.hasteTime, 1.8);
  enemy.dashCooldown = Math.max(0, enemy.dashCooldown - 0.7);
  addImpact(enemy.x, enemy.y, "#85ffe3", 20);
}

export function castEnemyEmp() {
  enemy.abilityCooldowns.emp = config.boosterCooldown + 0.8;
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

export function castEnemyBackstep() {
  enemy.abilityCooldowns.backstep = 4.1;
  const retreat = normalize(enemy.x - player.x, enemy.y - player.y);
  enemy.x = clamp(enemy.x + retreat.x * 150, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + retreat.y * 150, enemy.radius, arena.height - enemy.radius);
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  enemy.shield = Math.max(enemy.shield, 8);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.6);
  addAfterimage(enemy.x, enemy.y, enemy.facing, enemy.radius + 5, "#fff0a8");
  addImpact(enemy.x, enemy.y, "#fff0a8", 18);
}

export function castEnemyChainLightning() {
  enemy.abilityCooldowns.chainLightning = 5.8;
  addBeamEffect(enemy.x, enemy.y, player.x, player.y, "#d7bfff", 4.5, 0.14);
  applyPlayerDamage(24, "#d7bfff", player.x, player.y, true, "enemy-chain-lightning");
  applyStatusEffect(player, "slow", getStatusDuration(0.5), 0.2);
  addImpact(player.x, player.y, "#d7bfff", 18);
}

export function castEnemyBlink(forward) {
  enemy.abilityCooldowns.blink = 3.6;
  enemy.x = clamp(enemy.x + forward.x * 132, enemy.radius, arena.width - enemy.radius);
  enemy.y = clamp(enemy.y + forward.y * 132, enemy.radius, arena.height - enemy.radius);
  resolveMapCollision(enemy);
  maybeTeleportEntity(enemy);
  addImpact(enemy.x, enemy.y, "#b3f6ff", 18);
}

export function castEnemyPhaseDash(forward) {
  enemy.abilityCooldowns.phaseDash = 4.8;
  enemy.dodgeVectorX = forward.x;
  enemy.dodgeVectorY = forward.y;
  enemy.dodgeTime = 0.22;
  enemy.shield = Math.max(enemy.shield, 10);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.5);
  addImpact(enemy.x, enemy.y, "#d2f1ff", 20);
}

export function castEnemyPulseBurst() {
  enemy.abilityCooldowns.pulseBurst = 3.4;
  const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  for (let pellet = 0; pellet < 5; pellet += 1) {
    const spread = -0.16 + pellet * 0.08;
    const angle = baseAngle + spread;
    spawnBullet(enemy, enemy.x + Math.cos(angle) * 100, enemy.y + Math.sin(angle) * 100, enemyBullets, "#84dcff", 1180, 8, {
      radius: 4,
      life: 0.64,
      trailColor: "#c9f3ff",
      source: "enemy-pulse-burst",
    });
  }
  addImpact(enemy.x + Math.cos(baseAngle) * 22, enemy.y + Math.sin(baseAngle) * 22, "#84dcff", 14);
}

export function castEnemyRailShot() {
  enemy.abilityCooldowns.railShot = 5.3;
  fireEnemySniper(player.x + player.velocityX * 0.24, player.y + player.velocityY * 0.24);
}

export function castEnemyGravityWell() {
  enemy.abilityCooldowns.gravityWell = 6.1;
  supportZones.push({
    type: "gravity",
    team: "enemy",
    x: player.x,
    y: player.y,
    radius: 112,
    life: 1.9,
    maxLife: 1.9,
    color: "#d1a2ff",
    slow: 0.4,
  });
  addExplosion(player.x, player.y, 118, "#d1a2ff");
}

export function castEnemyPhaseShift() {
  enemy.abilityCooldowns.phaseShift = 5.8;
  enemy.shield = Math.max(enemy.shield, 14);
  enemy.shieldTime = Math.max(enemy.shieldTime, 0.7);
  addImpact(enemy.x, enemy.y, "#d2f1ff", 18);
}

export function castEnemyHologram() {
  enemy.abilityCooldowns.hologramDecoy = 6.4;
  enemy.postAttackMoveTime = Math.max(enemy.postAttackMoveTime, 0.5);
  addAfterimage(enemy.x - 32, enemy.y + 16, enemy.facing, enemy.radius + 5, "#d8b8ff");
}

export function castEnemySpeedSurge() {
  enemy.abilityCooldowns.speedSurge = 4.4;
  enemy.hasteTime = Math.max(enemy.hasteTime, 1.8);
  addImpact(enemy.x, enemy.y, "#8dfcc7", 18);
}

export function updateEnemyShockJavelins(dt) {
  for (let i = enemyShockJavelins.length - 1; i >= 0; i -= 1) {
    const javelin = enemyShockJavelins[i];
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
      enemyShockJavelins.splice(i, 1);
      continue;
    }

    if (hitMapWithProjectile(javelin, "enemy")) {
      enemyShockJavelins.splice(i, 1);
      continue;
    }

    if (length(javelin.x - player.x, javelin.y - player.y) > javelin.radius + player.radius) {
      continue;
    }

    enemyShockJavelins.splice(i, 1);
    addImpact(player.x, player.y, javelin.charged ? "#ffd7be" : "#ffb09a", javelin.charged ? 26 : 18);

    if (abilityState.dash.invulnerabilityTime > 0) {
      addImpact(player.x, player.y, "#b8f9c9", 20);
      statusLine.textContent = "Clean dash through enemy javelin.";
      continue;
    }

    const defeatedByJavelin = applyPlayerDamage(javelin.damage, "javelin");
    if (javelin.stun > 0) {
      applyStatusEffect(player, "stun", getStatusDuration(javelin.stun * (1 - getBuildStats().ccReduction)), 1);
      statusLine.textContent = "Enemy javelin stunned you.";
    } else {
      applyStatusEffect(player, "slow", getStatusDuration(javelin.slowDuration * (1 - getBuildStats().ccReduction)), javelin.slow);
      statusLine.textContent = "Enemy javelin slowed you.";
    }
    addShake(javelin.charged ? 8 : 5.8);

    if (defeatedByJavelin) {
      if (sandbox.mode === sandboxModes.duel.key) {
        finishDuelRound("enemy");
      } else {
        resetPlayer();
      }
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

  const enemyStatus = getStatusState(enemy);
  const previousX = enemy.x;
  const previousY = enemy.y;
  enemy.reloadTime = Math.max(0, enemy.reloadTime - dt);
  enemy.javelinCooldown = Math.max(0, enemy.javelinCooldown - dt);
  enemy.fieldCooldown = Math.max(0, enemy.fieldCooldown - dt);
  enemy.dashCooldown = Math.max(0, enemy.dashCooldown - dt);
  enemy.postAttackMoveTime = Math.max(0, enemy.postAttackMoveTime - dt);
  enemy.shieldTime = Math.max(0, enemy.shieldTime - dt);
  enemy.hasteTime = Math.max(0, enemy.hasteTime - dt);
  enemy.comboTimer = Math.max(0, enemy.comboTimer - dt);
  enemy.meleeWindupTime = Math.max(0, enemy.meleeWindupTime - dt);
  enemy.abilityCooldowns.grapple = Math.max(0, enemy.abilityCooldowns.grapple - dt);
  enemy.abilityCooldowns.shield = Math.max(0, enemy.abilityCooldowns.shield - dt);
  enemy.abilityCooldowns.booster = Math.max(0, enemy.abilityCooldowns.booster - dt);
  enemy.abilityCooldowns.emp = Math.max(0, enemy.abilityCooldowns.emp - dt);
  enemy.abilityCooldowns.backstep = Math.max(0, enemy.abilityCooldowns.backstep - dt);
  enemy.abilityCooldowns.chainLightning = Math.max(0, enemy.abilityCooldowns.chainLightning - dt);
  enemy.abilityCooldowns.blink = Math.max(0, enemy.abilityCooldowns.blink - dt);
  enemy.abilityCooldowns.phaseDash = Math.max(0, enemy.abilityCooldowns.phaseDash - dt);
  enemy.abilityCooldowns.pulseBurst = Math.max(0, enemy.abilityCooldowns.pulseBurst - dt);
  enemy.abilityCooldowns.railShot = Math.max(0, enemy.abilityCooldowns.railShot - dt);
  enemy.abilityCooldowns.gravityWell = Math.max(0, enemy.abilityCooldowns.gravityWell - dt);
  enemy.abilityCooldowns.phaseShift = Math.max(0, enemy.abilityCooldowns.phaseShift - dt);
  enemy.abilityCooldowns.hologramDecoy = Math.max(0, enemy.abilityCooldowns.hologramDecoy - dt);
  enemy.abilityCooldowns.speedSurge = Math.max(0, enemy.abilityCooldowns.speedSurge - dt);
  player.lastMissTime = Math.max(0, (player.lastMissTime ?? 0) - dt);
  enemy.shootCooldown -= dt;
  enemy.strafeTimer += dt;
  enemy.dodgeCooldown = Math.max(0, enemy.dodgeCooldown - dt);

  if (enemy.shieldTime <= 0) {
    enemy.shield = 0;
  }
  if (enemy.reloadTime <= 0 && enemy.weapon === weapons.pulse.key && enemy.ammo <= 0) {
    finalizePulseReload(enemy);
  }

  const targetX = player.decoyTime > 0 ? player.x - 44 : player.x;
  const targetY = player.decoyTime > 0 ? player.y + 18 : player.y;
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const distance = length(dx, dy);
  const forward = normalize(dx, dy);
  const side = { x: -forward.y, y: forward.x };
  const enemyFieldModifier = getFieldInfluence(enemy);
  const enemyZoneEffects = getZoneEffectsForEntity(enemy);
  const playerLow = player.hp <= 38;
  const enemyLow = enemy.hp <= 72;
  const playerOnAxe = player.weapon === weapons.axe.key;
  const playerOnShotgun = player.weapon === weapons.shotgun.key;
  const enemyOnAxe = enemy.weapon === weapons.axe.key;
  const enemyOnShotgun = enemy.weapon === weapons.shotgun.key;
  const enemyOnPulse = enemy.weapon === weapons.pulse.key;
  const enemyOnSniper = enemy.weapon === weapons.sniper.key;
  const enemyOnStaff = enemy.weapon === weapons.staff.key;
  const enemyOnInjector = enemy.weapon === weapons.injector.key;
  const playerExposed =
    (player.lastMissTime ?? 0) > 0 ||
    player.fireCooldown > 0.16 ||
    player.attackStartupTime > 0 ||
    player.attackCommitTime > 0 ||
    player.activeAxeStrike !== null ||
    player.pendingAxeStrike !== null;
  const targetRange = getEnemyTargetRange();
  const shouldPunish = playerExposed || playerLow;
  const behaviorProfile = getEnemyBehaviorProfile(distance, shouldPunish);
  const shouldKite = enemyLow || (playerOnAxe && distance < 332) || (enemyOnPulse && distance < 210);
  const shouldPressure = shouldPunish && distance < 420;

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
    const strafeScale = (enemy.postAttackMoveTime > 0 ? 1.38 : 1) * behaviorProfile.strafeScale;
    const strafeDirection = Math.sin(enemy.strafeTimer * 1.9) >= 0 ? 1 : -1;
    moveX = side.x * strafeDirection * 1.12 * strafeScale;
    moveY = side.y * strafeDirection * 1.12 * strafeScale;

    if (distance > targetRange + 28 || shouldPressure) {
      moveX += forward.x * behaviorProfile.engageBias;
      moveY += forward.y * behaviorProfile.engageBias;
    } else if (distance < targetRange - 74 || shouldKite) {
      moveX -= forward.x * behaviorProfile.retreatBias;
      moveY -= forward.y * behaviorProfile.retreatBias;
    }

    if (enemy.meleeWindupTime > 0) {
      moveX *= 0.28;
      moveY *= 0.28;
    }
  }

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
    !enemyStatus.stunned &&
    enemyHasAbility("magneticField") &&
    enemy.fieldCooldown <= 0 &&
    (incomingProjectile || (playerOnAxe && distance < behaviorProfile.fieldResponseDistance))
  ) {
    spawnEnemyMagneticField();
  }

  if (!enemyStatus.stunned && enemyHasAbility("shockJavelin") && enemy.javelinCooldown <= 0 && distance > 180 && distance < 620) {
    const chargedJavelin = enemyLow || shouldPunish || distance > 360;
    if (shouldPunish || Math.random() < (chargedJavelin ? 0.48 : 0.34)) {
      spawnEnemyJavelin(chargedJavelin);
      enemy.postAttackMoveTime = 0.62;
      enemy.shootCooldown = Math.max(enemy.shootCooldown, 0.18);
    }
  }

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("magneticGrapple") &&
    enemy.abilityCooldowns.grapple <= 0 &&
    distance > targetRange + 120 &&
    (shouldPunish || distance > behaviorProfile.abilityPressureDistance)
  ) {
    castEnemyGrapple(forward);
  }

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("energyShield") &&
    enemy.abilityCooldowns.shield <= 0 &&
    (enemyLow || incomingProjectile)
  ) {
    castEnemyShield();
  }

  if (
    !enemyStatus.stunned &&
    enemyHasAbility("empBurst") &&
    enemy.abilityCooldowns.emp <= 0 &&
    (incomingProjectile || distance < 126)
  ) {
    castEnemyEmp();
  }

  if (!enemyStatus.stunned && enemyHasAbility("backstepBurst") && enemy.abilityCooldowns.backstep <= 0 && (enemyLow || (playerOnAxe && distance < 170))) {
    castEnemyBackstep();
  }

  if (!enemyStatus.stunned && enemyHasAbility("blinkStep") && enemy.abilityCooldowns.blink <= 0 && distance > targetRange + 140) {
    castEnemyBlink(forward);
  }

  if (!enemyStatus.stunned && enemyHasAbility("phaseDash") && enemy.abilityCooldowns.phaseDash <= 0 && (incomingProjectile || (shouldPunish && distance > 170 && distance < 360))) {
    castEnemyPhaseDash(shouldPunish ? forward : { x: side.x, y: side.y });
  }

  if (!enemyStatus.stunned && enemyHasAbility("gravityWell") && enemy.abilityCooldowns.gravityWell <= 0 && distance > 180 && distance < 420 && (playerExposed || playerOnAxe)) {
    castEnemyGravityWell();
  }

  if (!enemyStatus.stunned && enemyHasAbility("phaseShift") && enemy.abilityCooldowns.phaseShift <= 0 && (enemyLow || incomingProjectile)) {
    castEnemyPhaseShift();
  }

  if (!enemyStatus.stunned && enemyHasAbility("hologramDecoy") && enemy.abilityCooldowns.hologramDecoy <= 0 && enemyLow) {
    castEnemyHologram();
  }

  if (!enemyStatus.stunned && enemyHasAbility("speedSurge") && enemy.abilityCooldowns.speedSurge <= 0 && (shouldPunish || distance > targetRange + 90)) {
    castEnemySpeedSurge();
  }

  if (!enemyStatus.stunned && enemy.weapon === weapons.axe.key && enemy.meleeWindupTime <= 0 && enemy.pendingMeleeStrike) {
    resolveEnemyAxeStrike();
  }

  if (!enemyStatus.stunned && enemyOnPulse && enemy.burstShots > 0 && enemy.shootCooldown <= 0) {
    enemy.burstShots -= 1;
    enemy.shootCooldown = enemy.burstShots > 0 ? 0.16 : 0.84;
    const leadX = targetX + player.velocityX * (playerExposed ? 0.22 : 0.16);
    const leadY = targetY + player.velocityY * (playerExposed ? 0.22 : 0.16);
    fireEnemyPulse(leadX, leadY, shouldPunish);
  } else if (!enemyStatus.stunned && enemyOnPulse && enemy.shootCooldown <= 0 && distance < 660) {
    enemy.burstShots = behaviorProfile.shootBurstSize;
    enemy.shootCooldown = 0.08;
    enemy.postAttackMoveTime = 0.46;
  } else if (!enemyStatus.stunned && enemyOnShotgun && enemy.shootCooldown <= 0 && distance < 340) {
    if (fireEnemyShotgun(targetX, targetY)) {
      enemy.shootCooldown = shouldPunish ? 0.78 : 0.96;
      enemy.postAttackMoveTime = 0.4;
    }
  } else if (!enemyStatus.stunned && enemyHasAbility("pulseBurst") && enemy.abilityCooldowns.pulseBurst <= 0 && distance < 320 && shouldPunish) {
    castEnemyPulseBurst();
    enemy.shootCooldown = 0.42;
  } else if (!enemyStatus.stunned && enemyHasAbility("chainLightning") && enemy.abilityCooldowns.chainLightning <= 0 && distance < 380 && (shouldPunish || playerExposed)) {
    castEnemyChainLightning();
    enemy.shootCooldown = 0.46;
  } else if (!enemyStatus.stunned && enemyOnSniper && enemy.shootCooldown <= 0 && distance > 280 && distance < 920) {
    if (fireEnemySniper(targetX + player.velocityX * 0.2, targetY + player.velocityY * 0.2)) {
      enemy.shootCooldown = shouldPunish ? 1.08 : 1.26;
      enemy.postAttackMoveTime = 0.54;
    }
  } else if (!enemyStatus.stunned && enemyHasAbility("railShot") && enemy.abilityCooldowns.railShot <= 0 && distance > 340 && shouldPunish) {
    castEnemyRailShot();
    enemy.shootCooldown = 0.62;
  } else if (!enemyStatus.stunned && enemyOnStaff && enemy.shootCooldown <= 0 && distance < 480) {
    if (fireEnemyStaff(targetX, targetY)) {
      enemy.shootCooldown = 0.52;
      enemy.postAttackMoveTime = 0.32;
    }
  } else if (!enemyStatus.stunned && enemyOnInjector && enemy.shootCooldown <= 0 && distance < 560) {
    if (fireEnemyInjector(targetX + player.velocityX * 0.12, targetY + player.velocityY * 0.12)) {
      enemy.shootCooldown = shouldPunish ? 0.34 : 0.42;
      enemy.postAttackMoveTime = 0.28;
    }
  } else if (!enemyStatus.stunned && enemyOnAxe && enemy.shootCooldown <= 0 && enemy.meleeWindupTime <= 0 && enemy.attackCommitTime <= 0) {
    if ((distance < 296 && shouldPunish) || distance < 188) {
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
    } else if ((shouldPunish || player.attackStartupTime > 0) && distance > 150 && distance < 330 && enemy.dashCooldown <= 0) {
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

    if (!bot.alive) {
      continue;
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

