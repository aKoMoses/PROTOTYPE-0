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
import { decideTeamDuelBotAction } from "../lib/ai/teamDuelDecision.ts";
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
import { getCurrentBotDifficultyTier } from "../progression.js";

const LOCAL_TEAM_DUEL_BOT_DIFFICULTY = {
  easy: "easy",
  normal: "normal",
  hard: "hard",
  nightmare: "hard",
};

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

function getFriendlyActors(bot) {
  if ((bot.team ?? "enemy") === "player") {
    const allies = [];
    if (player.alive) {
      allies.push(player);
    }
    if (allyBot?.alive && allyBot !== bot) {
      allies.push(allyBot);
    }
    if (playerClone.active && playerClone.alive) {
      allies.push(playerClone);
    }
    return allies;
  }

  return teamEnemies.filter((candidate) => candidate?.alive && candidate !== bot);
}

function getEntityId(entity) {
  if (entity === player) {
    return "player";
  }
  if (entity === allyBot) {
    return "ally-bot";
  }
  if (entity === playerClone) {
    return "player-clone";
  }
  return entity.kind ?? "unknown-bot";
}

function getTeamIndex(entity) {
  return (entity.team ?? "enemy") === "player" ? 0 : 1;
}

function toCombatantSnapshot(entity) {
  return {
    id: getEntityId(entity),
    team: getTeamIndex(entity),
    x: entity.x,
    y: entity.y,
    alive: Boolean(entity.alive),
    connected: true,
    hp: entity.hp ?? entity.maxHp ?? config.enemyMaxHp,
    maxHp: entity.maxHp ?? config.playerMaxHp ?? config.enemyMaxHp,
  };
}

function getLocalStrafeDirection(bot) {
  const sessionId = getEntityId(bot);
  let hash = 0;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(index)) | 0;
  }

  return ((Math.floor(Date.now() / 900) + hash) & 1) === 0 ? -1 : 1;
}

function getLocalBotDifficulty() {
  const tier = getCurrentBotDifficultyTier();
  return LOCAL_TEAM_DUEL_BOT_DIFFICULTY[tier] ?? "normal";
}

function getHostileProjectiles(bot) {
  return (bot.team ?? "enemy") === "player" ? enemyBullets : bullets;
}

function getProjectileCollection(bot) {
  return (bot.team ?? "enemy") === "player" ? bullets : enemyBullets;
}

function firePulse(bot, target, aimAngle = null) {
  if (bot.reloadTime > 0) {
    return false;
  }
  if (bot.ammo <= 0) {
    startPulseReload(bot, true);
    return false;
  }

  bot.ammo = Math.max(0, bot.ammo - 1);
  const aimX = Number.isFinite(aimAngle)
    ? bot.x + Math.cos(aimAngle) * arena.width
    : target.x + (target.velocityX ?? 0) * 0.14 + (Math.random() - 0.5) * ((bot.team ?? "enemy") === "player" ? 18 : 24);
  const aimY = Number.isFinite(aimAngle)
    ? bot.y + Math.sin(aimAngle) * arena.height
    : target.y + (target.velocityY ?? 0) * 0.14 + (Math.random() - 0.5) * ((bot.team ?? "enemy") === "player" ? 18 : 24);
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

  const opponents = getOpposingTargets(bot);
  if (opponents.length === 0) {
    return;
  }

  const decision = decideTeamDuelBotAction({
    self: {
      ...toCombatantSnapshot(bot),
      cooldowns: {
        primary: bot.shootCooldown ?? 0,
        dash: bot.dodgeCooldown ?? 0,
      },
    },
    allies: getFriendlyActors(bot).map(toCombatantSnapshot),
    opponents: opponents.map((candidate) => ({
      ...toCombatantSnapshot(candidate),
      hasLineOfSight: canSeeTarget(bot, candidate),
      isExposed: true,
      threatLevel: candidate === player ? 0.24 : 0.12,
    })),
    difficulty: getLocalBotDifficulty(),
    strafeDirection: getLocalStrafeDirection(bot),
    aimJitterRoll: Math.random() - 0.5,
  });

  const target = opponents.find((candidate) => getEntityId(candidate) === decision.targetId) ?? opponents[0] ?? null;
  if (!target) {
    return;
  }

  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const distance = length(dx, dy);
  const forward = normalize(dx, dy);
  const side = { x: -forward.y, y: forward.x };
  bot.facing = decision.facing;

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
      moveX = decision.movementX;
      moveY = decision.movementY;
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

  if (!botStatus.stunned && bot.shootCooldown <= 0 && decision.fireAngle !== null && canSeeTarget(bot, target)) {
    if (firePulse(bot, target, decision.fireAngle)) {
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
