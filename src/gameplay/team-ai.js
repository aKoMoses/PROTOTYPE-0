import { arena, config, sandboxModes } from "../config.js";
import {
  player,
  playerClone,
  allyBot,
  teamEnemies,
  bullets,
  enemyBullets,
  sandbox,
  matchState,
} from "../state.js";
import { clamp, length, normalize, approach } from "../utils.js";
import { canSeeTarget, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import {
  spawnBullet,
  updateStatusEffects,
  tickEntityMarks,
  getStatusState,
  getFieldInfluence,
  getZoneEffectsForEntity,
  finalizePulseReload,
  startPulseReload,
} from "./combat.js";
import { addAfterimage, addImpact } from "./effects.js";

function getOpposingTargets(bot) {
  if ((bot.team ?? "enemy") === "player") {
    return teamEnemies.filter((candidate) => candidate?.alive);
  }

  const targets = [];
  if (player.alive) {
    targets.push(player);
  }
  if (allyBot?.alive) {
    targets.push(allyBot);
  }
  if (playerClone.active && playerClone.alive) {
    targets.push(playerClone);
  }
  return targets;
}

function getHostileProjectiles(bot) {
  return (bot.team ?? "enemy") === "player" ? enemyBullets : bullets;
}

function getProjectileCollection(bot) {
  return (bot.team ?? "enemy") === "player" ? bullets : enemyBullets;
}

function chooseTarget(bot) {
  const targets = getOpposingTargets(bot);
  if (targets.length === 0) {
    return null;
  }

  let bestTarget = targets[0];
  let bestDistance = length(bestTarget.x - bot.x, bestTarget.y - bot.y);
  for (let index = 1; index < targets.length; index += 1) {
    const candidate = targets[index];
    const distance = length(candidate.x - bot.x, candidate.y - bot.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = candidate;
    }
  }
  return bestTarget;
}

function firePulse(bot, target) {
  if (bot.reloadTime > 0) {
    return false;
  }
  if (bot.ammo <= 0) {
    startPulseReload(bot, true);
    return false;
  }

  bot.ammo = Math.max(0, bot.ammo - 1);
  const leadTime = 0.14;
  const spread = (bot.team ?? "enemy") === "player" ? 18 : 24;
  const aimX = target.x + (target.velocityX ?? 0) * leadTime + (Math.random() - 0.5) * spread;
  const aimY = target.y + (target.velocityY ?? 0) * leadTime + (Math.random() - 0.5) * spread;
  const projectileColor = (bot.team ?? "enemy") === "player" ? "#7fdcff" : "#ff9f8f";
  const trailColor = (bot.team ?? "enemy") === "player" ? "#d7f6ff" : "#ffd2c8";
  spawnBullet(bot, aimX, aimY, getProjectileCollection(bot), projectileColor, 980, 8.5, {
    radius: 4.5,
    source: (bot.team ?? "enemy") === "player" ? "ally-pulse" : "team-enemy-pulse",
    trailColor,
  });
  addImpact(bot.x + Math.cos(bot.facing) * 22, bot.y + Math.sin(bot.facing) * 22, projectileColor, 12);

  if (bot.ammo <= 0) {
    startPulseReload(bot, true);
  }
  return true;
}

function updateSingleBot(bot, dt) {
  if (!bot?.alive) {
    return;
  }

  updateStatusEffects(bot, dt);
  tickEntityMarks(bot, dt);

  if (sandbox.mode !== sandboxModes.teamDuel.key || matchState.phase !== "active") {
    return;
  }

  const botStatus = getStatusState(bot);
  bot.reloadTime = Math.max(0, (bot.reloadTime ?? 0) - dt);
  bot.shootCooldown = Math.max(0, (bot.shootCooldown ?? 0) - dt);
  bot.dodgeCooldown = Math.max(0, (bot.dodgeCooldown ?? 0) - dt);
  bot.dodgeTime = Math.max(0, (bot.dodgeTime ?? 0) - dt);
  bot.shieldTime = Math.max(0, (bot.shieldTime ?? 0) - dt);
  bot.shieldGuardTime = Math.max(0, (bot.shieldGuardTime ?? 0) - dt);
  bot.hasteTime = Math.max(0, (bot.hasteTime ?? 0) - dt);
  bot.strafeTimer = (bot.strafeTimer ?? 0) + dt;

  if (bot.reloadTime <= 0 && bot.ammo <= 0) {
    finalizePulseReload(bot);
  }
  if (bot.shieldTime <= 0) {
    bot.shield = 0;
  }

  const target = chooseTarget(bot);
  if (!target) {
    return;
  }

  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const distance = length(dx, dy);
  const forward = normalize(dx, dy);
  const side = { x: -forward.y, y: forward.x };
  bot.facing = Math.atan2(dy, dx);

  const incomingProjectile = getHostileProjectiles(bot).find((projectile) => {
    const nextX = projectile.x + projectile.vx * 0.1;
    const nextY = projectile.y + projectile.vy * 0.1;
    return length(nextX - bot.x, nextY - bot.y) < 64;
  });

  if (!botStatus.stunned && bot.dodgeCooldown <= 0 && incomingProjectile) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    bot.dodgeVectorX = side.x * direction;
    bot.dodgeVectorY = side.y * direction;
    bot.dodgeTime = config.enemyDodgeDuration;
    bot.dodgeCooldown = config.enemyDodgeCooldown;
    addAfterimage(bot.x, bot.y, bot.facing, bot.radius, (bot.team ?? "enemy") === "player" ? "#bdefff" : "#ffd0c4");
    addImpact(bot.x, bot.y, (bot.team ?? "enemy") === "player" ? "#95e6ff" : "#ffc0b1", 16);
  }

  let moveX = 0;
  let moveY = 0;
  if (!botStatus.stunned) {
    if (bot.dodgeTime > 0) {
      moveX = bot.dodgeVectorX;
      moveY = bot.dodgeVectorY;
    } else {
      const idealRange = (bot.team ?? "enemy") === "player" ? 300 : 320;
      const strafeDirection = Math.sin((bot.strafeTimer ?? 0) * 1.8 + ((bot.team ?? "enemy") === "player" ? 0 : 0.5)) >= 0 ? 1 : -1;
      moveX = side.x * strafeDirection * 0.95;
      moveY = side.y * strafeDirection * 0.95;

      if (distance > idealRange + 36) {
        moveX += forward.x * 1.08;
        moveY += forward.y * 1.08;
      } else if (distance < idealRange - 72) {
        moveX -= forward.x * 0.84;
        moveY -= forward.y * 0.84;
      }
    }
  }

  const desired = normalize(moveX, moveY);
  const fieldModifier = getFieldInfluence(bot);
  const zoneEffects = getZoneEffectsForEntity(bot, dt);
  const speed =
    config.enemySpeed *
    (bot.hasteTime > 0 ? 1.1 : 1) *
    (botStatus.stunned ? 0 : 1) *
    fieldModifier.slowMultiplier *
    zoneEffects.slowMultiplier;
  bot.velocityX = approach(bot.velocityX ?? 0, desired.x * speed, config.playerAcceleration * dt);
  bot.velocityY = approach(bot.velocityY ?? 0, desired.y * speed, config.playerAcceleration * dt);
  bot.x = clamp(bot.x + (bot.velocityX ?? 0) * dt, bot.radius, arena.width - bot.radius);
  bot.y = clamp(bot.y + (bot.velocityY ?? 0) * dt, bot.radius, arena.height - bot.radius);
  resolveMapCollision(bot);
  maybeTeleportEntity(bot);

  if (!botStatus.stunned && bot.shootCooldown <= 0 && distance < 700 && canSeeTarget(bot, target)) {
    if (firePulse(bot, target)) {
      bot.shootCooldown = (bot.team ?? "enemy") === "player" ? 0.22 : 0.3;
    }
  }
}

export function updateTeamDuelBots(dt) {
  if (sandbox.mode !== sandboxModes.teamDuel.key) {
    return;
  }

  updateSingleBot(allyBot, dt);
  for (const bot of teamEnemies) {
    updateSingleBot(bot, dt);
  }
}
