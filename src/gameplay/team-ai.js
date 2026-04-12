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
import { getTeamDuelBotArchetypeForSlot } from "../lib/ai/teamDuelArchetypes.ts";
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
const LOCAL_TEAM_DUEL_FIRE_COOLDOWN = 0.18;
const LOCAL_TEAM_DUEL_BURST_FIRE_COOLDOWN = 0.095;

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

function getLocalBotModules(bot) {
  return Array.isArray(bot?.loadout?.modules)
    ? bot.loadout.modules.filter((moduleKey) => typeof moduleKey === "string")
    : [];
}

function getLocalBotCapabilityFlags(bot) {
  const modules = getLocalBotModules(bot);
  return {
    hasGrapple: Boolean(bot?.hasGrapple) || modules.includes("vGripHarpoon"),
    hasShield: Boolean(bot?.hasShield) || modules.includes("hexPlateProjector"),
    hasEmp: Boolean(bot?.hasEmp) || modules.includes("emPulseEmitter"),
  };
}

function scoreLocalBotStrafeSide(bot, allies, directionX, directionY) {
  const probeDistance = 88;
  const probeX = bot.x + directionX * probeDistance;
  const probeY = bot.y + directionY * probeDistance;
  const edgePadding = Math.min(probeX, arena.width - probeX, probeY, arena.height - probeY);
  let allyClearance = 0;

  for (const ally of allies) {
    const distance = Math.hypot(probeX - ally.x, probeY - ally.y);
    allyClearance += Math.min(distance, 180);
  }

  return edgePadding + allyClearance * 0.35;
}

function getLocalStrafeDirection(bot, allies, target) {
  const sessionId = getEntityId(bot);
  let hash = 0;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(index)) | 0;
  }

  const baselineDirection = ((Math.floor(Date.now() / 900) + hash) & 1) === 0 ? -1 : 1;
  if (!target) {
    return baselineDirection;
  }

  const targetDx = target.x - bot.x;
  const targetDy = target.y - bot.y;
  const targetDistance = Math.hypot(targetDx, targetDy) || 1;
  const sideLeftX = targetDy / targetDistance;
  const sideLeftY = -targetDx / targetDistance;
  const sideRightX = -sideLeftX;
  const sideRightY = -sideLeftY;

  const leftScore = scoreLocalBotStrafeSide(bot, allies, sideLeftX, sideLeftY);
  const rightScore = scoreLocalBotStrafeSide(bot, allies, sideRightX, sideRightY);
  if (Math.abs(leftScore - rightScore) < 6) {
    return baselineDirection;
  }

  return leftScore > rightScore ? -1 : 1;
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

function getLocalTeamFocusTargetId(bot) {
  const focusCounts = new Map();

  for (const ally of getFriendlyActors(bot)) {
    if (!ally?.focusTargetId) {
      continue;
    }

    focusCounts.set(ally.focusTargetId, (focusCounts.get(ally.focusTargetId) ?? 0) + 1);
  }

  let bestTargetId = null;
  let bestCount = 0;
  focusCounts.forEach((count, targetId) => {
    if (count > bestCount) {
      bestTargetId = targetId;
      bestCount = count;
    }
  });

  return bestTargetId;
}

function getLocalBotPeelPriority(candidate, allies) {
  let bestPriority = 0;

  for (const ally of allies) {
    const allyMaxHp = Math.max(1, ally.maxHp ?? ally.hp ?? 1);
    const allyHp = Math.max(0, ally.hp ?? allyMaxHp);
    const healthRatio = allyHp / allyMaxHp;
    if (healthRatio > 0.45) {
      continue;
    }

    const distance = Math.hypot(candidate.x - ally.x, candidate.y - ally.y);
    if (distance <= 320) {
      bestPriority = Math.max(bestPriority, (1 - healthRatio) * 1.2);
    }
  }

  return bestPriority;
}

function isLocalCombatantExposed(entity) {
  if (!entity?.alive) {
    return false;
  }

  let nearbyAllies = 0;
  let visibleOpponents = 0;

  for (const ally of getFriendlyActors(entity)) {
    if (!ally?.alive) {
      continue;
    }

    const distance = Math.hypot(ally.x - entity.x, ally.y - entity.y);
    if (distance < 190) {
      nearbyAllies += 1;
    }
  }

  for (const opponent of getOpposingTargets(entity)) {
    if (!opponent?.alive) {
      continue;
    }

    const distance = Math.hypot(opponent.x - entity.x, opponent.y - entity.y);
    if (distance < 560 && canSeeTarget(opponent, entity)) {
      visibleOpponents += 1;
    }
  }

  return visibleOpponents > 0 && nearbyAllies === 0;
}

function getLocalThreatLevel(entity) {
  let visibleOpponents = 0;
  let closestOpponentDistance = Number.POSITIVE_INFINITY;

  for (const opponent of getOpposingTargets(entity)) {
    if (!opponent?.alive) {
      continue;
    }

    const distance = Math.hypot(opponent.x - entity.x, opponent.y - entity.y);
    closestOpponentDistance = Math.min(closestOpponentDistance, distance);
    if (canSeeTarget(opponent, entity)) {
      visibleOpponents += 1;
    }
  }

  if (visibleOpponents === 0 || closestOpponentDistance === Number.POSITIVE_INFINITY) {
    return 0;
  }

  return Math.min(0.32, visibleOpponents * 0.08 + Math.max(0, (420 - closestOpponentDistance) / 1200));
}

function toLocalOpponentSnapshot(candidate, viewerBot, allies) {
  return {
    ...toCombatantSnapshot(candidate),
    hasLineOfSight: canSeeTarget(viewerBot, candidate),
    isExposed: isLocalCombatantExposed(candidate),
    threatLevel: getLocalThreatLevel(candidate),
    targetPriorityBonus: allies.some((ally) => ally?.focusTargetId === getEntityId(candidate)) ? 0.18 : 0,
  };
}

function selectLocalFocusTarget(bot, allies, opponents, previousTargetId) {
  const previous = previousTargetId
    ? opponents.find((candidate) => getEntityId(candidate) === previousTargetId && candidate.alive)
    : null;
  if (previous && (canSeeTarget(bot, previous) || (previous.hp ?? config.enemyMaxHp) <= config.enemyMaxHp * 0.38)) {
    return previous;
  }

  const coordinatedTargetId = getLocalTeamFocusTargetId(bot);

  return opponents
    .filter((candidate) => candidate.alive)
    .sort((left, right) => {
      const leftScore =
        (isLocalCombatantExposed(left) ? 2 : 0) +
        ((left.hp ?? config.enemyMaxHp) <= config.enemyMaxHp * 0.45 ? 1 : 0) +
        (canSeeTarget(bot, left) ? 1 : 0) +
        (getEntityId(left) === coordinatedTargetId ? 1.35 : 0) +
        getLocalBotPeelPriority(left, allies);
      const rightScore =
        (isLocalCombatantExposed(right) ? 2 : 0) +
        ((right.hp ?? config.enemyMaxHp) <= config.enemyMaxHp * 0.45 ? 1 : 0) +
        (canSeeTarget(bot, right) ? 1 : 0) +
        (getEntityId(right) === coordinatedTargetId ? 1.35 : 0) +
        getLocalBotPeelPriority(right, allies);
      return rightScore - leftScore;
    })[0] ?? null;
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

  const allies = getFriendlyActors(bot);
  const focusTarget = selectLocalFocusTarget(bot, allies, opponents, bot.focusTargetId ?? null);
  bot.focusTargetId = focusTarget ? getEntityId(focusTarget) : null;

  const targetDistance = focusTarget
    ? Math.hypot(focusTarget.x - bot.x, focusTarget.y - bot.y)
    : null;
  const lowHpThreshold = (bot.maxHp ?? config.enemyMaxHp) * 0.34;
  const selfLow = (bot.hp ?? 0) <= lowHpThreshold;
  const shouldPunish = Boolean(
    focusTarget && (isLocalCombatantExposed(focusTarget) || (focusTarget.hp ?? config.enemyMaxHp) <= config.enemyMaxHp * 0.45)
  );
  const shouldPressure = Boolean(
    focusTarget &&
    canSeeTarget(bot, focusTarget) &&
    targetDistance !== null &&
    targetDistance <= 420 &&
    (shouldPunish || !selfLow)
  );
  const shouldKite = Boolean(
    focusTarget &&
    targetDistance !== null &&
    (selfLow || targetDistance < 230 || getLocalThreatLevel(focusTarget) >= 0.22)
  );
  const capabilityFlags = getLocalBotCapabilityFlags(bot);
  const botSlot = (bot.team ?? "enemy") === "player" ? 0 : Math.max(0, teamEnemies.indexOf(bot) + 1);
  const fallbackPreset = getTeamDuelBotArchetypeForSlot(botSlot);

  const decision = decideTeamDuelBotAction({
    self: {
      ...toCombatantSnapshot(bot),
      cooldowns: {
        primary: bot.shootCooldown ?? 0,
        dash: bot.dodgeCooldown ?? 0,
      },
    },
    allies: allies.map(toCombatantSnapshot),
    opponents: opponents.map((candidate) => toLocalOpponentSnapshot(candidate, bot, allies)),
    difficulty: getLocalBotDifficulty(),
    strafeDirection: getLocalStrafeDirection(bot, allies, focusTarget),
    aimJitterRoll: Math.random() - 0.5,
    weaponKey: bot.weapon ?? bot.loadout?.weapon ?? fallbackPreset.weaponKey,
    focusTargetId: bot.focusTargetId,
    shouldPunish,
    shouldPressure,
    shouldKite,
    hasGrapple: capabilityFlags.hasGrapple || fallbackPreset.hasGrapple,
    hasShield: capabilityFlags.hasShield || fallbackPreset.hasShield,
    hasEmp: capabilityFlags.hasEmp || fallbackPreset.hasEmp,
    postAttackMoveMultiplier: bot.postAttackMoveMultiplier ?? 1,
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
  bot.postAttackMoveMultiplier = decision.fireAngle !== null ? 1.2 : 1;

  if (!botStatus.stunned && bot.shootCooldown <= 0 && decision.fireAngle !== null && canSeeTarget(bot, target)) {
    if (firePulse(bot, target, decision.fireAngle)) {
      if ((bot.burstShots ?? 0) > 0) {
        bot.burstShots = Math.max(0, (bot.burstShots ?? 0) - 1);
        bot.shootCooldown = LOCAL_TEAM_DUEL_BURST_FIRE_COOLDOWN;
      } else {
        bot.burstShots = Math.max(0, decision.burstShots - 1);
        bot.shootCooldown = LOCAL_TEAM_DUEL_FIRE_COOLDOWN;
      }
    }
  } else if (decision.fireAngle === null) {
    bot.burstShots = 0;
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
