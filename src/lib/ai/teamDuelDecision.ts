import {
  getDifficultyScalarsForBotDifficulty,
  getSharedCombatTacticalProfile,
  getTeamDuelDecisionPriorities,
  type DifficultyScalars,
} from "./tacticalProfiles";

export type BotDifficulty = "easy" | "normal" | "hard";

export interface CombatantCooldownSnapshot {
  primary?: number;
  dash?: number;
  offensive?: number;
  defensive?: number;
}

export interface CombatantSnapshot {
  id: string;
  team: number;
  x: number;
  y: number;
  alive: boolean;
  connected: boolean;
  hp?: number;
  maxHp?: number;
  hasLineOfSight?: boolean;
  isExposed?: boolean;
  targetPriorityBonus?: number;
  threatLevel?: number;
  cooldowns?: CombatantCooldownSnapshot;
}

export interface CombatBotDecisionPriorities {
  idealRange: number;
  fireRange: number;
  strafeScale: number;
  aimJitter: number;
  abilityPressureDistance?: number;
  dodgeAggression?: number;
  shootBurstSize?: number;
  engageBias?: number;
  retreatBias?: number;
  approachPadding?: number;
  retreatPadding?: number;
  forceAdvance?: boolean;
  forceRetreat?: boolean;
  preferLineOfSight?: boolean;
  distanceWeight?: number;
  lineOfSightWeight?: number;
  lowHealthWeight?: number;
  exposedTargetWeight?: number;
  focusTargetId?: string | null;
  focusTargetWeight?: number;
  threatWeight?: number;
}

export interface CombatBotDecisionInput {
  self: CombatantSnapshot;
  allies: CombatantSnapshot[];
  opponents: CombatantSnapshot[];
  priorities: CombatBotDecisionPriorities;
  strafeDirection: -1 | 1;
  aimJitterRoll: number;
}

export interface TeamDuelBotDecisionInput {
  self: CombatantSnapshot;
  allies: CombatantSnapshot[];
  opponents: CombatantSnapshot[];
  difficulty: BotDifficulty;
  strafeDirection: -1 | 1;
  aimJitterRoll: number;
  weaponKey?: string;
  focusTargetId?: string | null;
  shouldPunish?: boolean;
  shouldPressure?: boolean;
  shouldKite?: boolean;
  hasGrapple?: boolean;
  hasShield?: boolean;
  hasEmp?: boolean;
  postAttackMoveMultiplier?: number;
  difficultyScalars?: DifficultyScalars;
}

export type CombatBotDashDirection =
  | "none"
  | "forward"
  | "backward"
  | "strafe-left"
  | "strafe-right";

export interface CombatBotAbilityIntent {
  dash: boolean;
  dashDirection: CombatBotDashDirection;
  offensive: boolean;
  defensive: boolean;
  targetId: string | null;
}

export interface CombatBotDecision {
  movementX: number;
  movementY: number;
  facing: number;
  fireAngle: number | null;
  targetId: string | null;
  targetDistance: number | null;
  targetHasLineOfSight: boolean;
  burstShots: number;
  abilityIntent: CombatBotAbilityIntent;
}

export type TeamDuelBotDecision = CombatBotDecision;

export function decideCombatBotAction(input: CombatBotDecisionInput): CombatBotDecision {
  const target = selectTarget(input.self, input.allies, input.opponents, input.priorities);
  if (!target) {
    return {
      movementX: 0,
      movementY: 0,
      facing: 0,
      fireAngle: null,
      targetId: null,
      targetDistance: null,
      targetHasLineOfSight: false,
      burstShots: 0,
      abilityIntent: {
        dash: false,
        dashDirection: "none",
        offensive: false,
        defensive: false,
        targetId: null,
      },
    };
  }

  const dx = target.x - input.self.x;
  const dy = target.y - input.self.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const facing = Math.atan2(dy, dx);
  const engageBias = input.priorities.engageBias ?? 1;
  const retreatBias = input.priorities.retreatBias ?? 1;
  const approachPadding = input.priorities.approachPadding ?? 40;
  const retreatPadding = input.priorities.retreatPadding ?? 60;
  const targetHasLineOfSight = target.hasLineOfSight !== false;

  let movementX = 0;
  let movementY = 0;

  let shouldAdvance = distance > input.priorities.idealRange + approachPadding || Boolean(input.priorities.forceAdvance);
  let shouldRetreat = distance < input.priorities.idealRange - retreatPadding || Boolean(input.priorities.forceRetreat);

  if (input.priorities.preferLineOfSight && !targetHasLineOfSight) {
    shouldAdvance = true;
    shouldRetreat = false;
  }

  if (shouldAdvance) {
    movementX += (dx / distance) * engageBias;
    movementY += (dy / distance) * engageBias;
  } else if (shouldRetreat) {
    movementX -= (dx / distance) * retreatBias;
    movementY -= (dy / distance) * retreatBias;
  }

  const strafeScale = input.priorities.preferLineOfSight && !targetHasLineOfSight
    ? input.priorities.strafeScale * 0.35
    : input.priorities.strafeScale;
  movementX += (-dy / distance) * strafeScale * input.strafeDirection;
  movementY += (dx / distance) * strafeScale * input.strafeDirection;

  const formationAdjustment = getFormationAdjustment(
    input.self,
    input.allies,
    target,
    input.priorities,
    input.strafeDirection,
  );
  movementX += formationAdjustment.x;
  movementY += formationAdjustment.y;

  const primaryCooldown = input.self.cooldowns?.primary ?? 0;
  const clampedJitterRoll = Math.max(-0.5, Math.min(0.5, input.aimJitterRoll));
  const fireAngle = distance <= input.priorities.fireRange && primaryCooldown <= 0 && targetHasLineOfSight
    ? facing + clampedJitterRoll * input.priorities.aimJitter
    : null;
  const selfMaxHp = Math.max(1, input.self.maxHp ?? input.self.hp ?? 1);
  const selfHp = Math.max(0, input.self.hp ?? selfMaxHp);
  const selfHealthRatio = selfHp / selfMaxHp;
  const targetMaxHp = Math.max(1, target.maxHp ?? target.hp ?? 1);
  const targetHp = Math.max(0, target.hp ?? targetMaxHp);
  const targetHealthRatio = targetHp / targetMaxHp;
  const pressureDistance = input.priorities.abilityPressureDistance ?? Math.max(input.priorities.idealRange, input.priorities.fireRange * 0.62);
  const immediateThreat = (target.threatLevel ?? 0) >= 0.2 && distance < input.priorities.idealRange + 28;
  const offensive =
    distance <= pressureDistance &&
    (Boolean(target.isExposed) || targetHealthRatio <= 0.5 || Boolean(input.priorities.forceAdvance)) &&
    (targetHasLineOfSight || distance <= input.priorities.idealRange * 0.7);
  const defensive =
    selfHealthRatio <= 0.34 ||
    Boolean(input.priorities.forceRetreat) ||
    (immediateThreat && targetHealthRatio >= selfHealthRatio);

  let dashDirection: CombatBotDashDirection = "none";
  let dash = false;
  if (defensive && distance < input.priorities.idealRange + 14) {
    dash = true;
    dashDirection = "backward";
  } else if (!targetHasLineOfSight && input.priorities.preferLineOfSight) {
    dash = true;
    dashDirection = input.strafeDirection < 0 ? "strafe-left" : "strafe-right";
  } else if (offensive && distance > input.priorities.idealRange * 0.82) {
    dash = true;
    dashDirection = "forward";
  }

  return {
    movementX,
    movementY,
    facing,
    fireAngle,
    targetId: target.id,
    targetDistance: distance,
    targetHasLineOfSight,
    burstShots: Math.max(0, Math.trunc(input.priorities.shootBurstSize ?? 0)),
    abilityIntent: {
      dash,
      dashDirection,
      offensive,
      defensive,
      targetId: target.id,
    },
  };
}

export function decideTeamDuelBotAction(input: TeamDuelBotDecisionInput): TeamDuelBotDecision {
  const priorities = input.weaponKey
    ? getSharedCombatTacticalProfile({
      weaponKey: input.weaponKey,
      currentHp: input.self.hp ?? input.self.maxHp ?? 1,
      maxHp: input.self.maxHp ?? input.self.hp ?? 1,
      shouldPunish: Boolean(input.shouldPunish),
      shouldPressure: Boolean(input.shouldPressure),
      shouldKite: Boolean(input.shouldKite),
      focusTargetId: input.focusTargetId,
      hasGrapple: input.hasGrapple,
      hasShield: input.hasShield,
      hasEmp: input.hasEmp,
      postAttackMoveMultiplier: input.postAttackMoveMultiplier,
      difficulty: input.difficultyScalars ?? getDifficultyScalarsForBotDifficulty(input.difficulty),
    }).priorities
    : getTeamDuelDecisionPriorities(input.difficulty);

  return decideCombatBotAction({
    self: input.self,
    allies: input.allies,
    opponents: input.opponents,
    priorities,
    strafeDirection: input.strafeDirection,
    aimJitterRoll: input.aimJitterRoll,
  });
}

function selectTarget(
  source: CombatantSnapshot,
  allies: CombatantSnapshot[],
  opponents: CombatantSnapshot[],
  priorities: CombatBotDecisionPriorities,
) {
  let best: CombatantSnapshot | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  const distanceWeight = priorities.distanceWeight ?? 0.001;
  const lineOfSightWeight = priorities.lineOfSightWeight ?? 0.12;
  const lowHealthWeight = priorities.lowHealthWeight ?? 0.16;
  const exposedTargetWeight = priorities.exposedTargetWeight ?? 0.18;
  const focusTargetWeight = priorities.focusTargetWeight ?? 0.22;
  const threatWeight = priorities.threatWeight ?? 0.08;
  const livingAllies = allies.filter((candidate) => candidate.alive && candidate.connected);

  for (const candidate of opponents) {
    if (!candidate.alive || candidate.team === source.team) {
      continue;
    }

    const dx = candidate.x - source.x;
    const dy = candidate.y - source.y;
    const distanceSq = dx * dx + dy * dy;
    const maxHp = Math.max(1, candidate.maxHp ?? candidate.hp ?? 1);
    const hp = Math.max(0, candidate.hp ?? maxHp);
    const healthRatio = hp / maxHp;
    const nearestSupportDistance = getNearestSupportDistance(candidate, opponents);
    const isolationScore =
      nearestSupportDistance === Number.POSITIVE_INFINITY
        ? 1
        : clamp01((nearestSupportDistance - 180) / 320);
    const allyCommitScore = getAllyCommitScore(candidate, livingAllies, priorities.fireRange);
    const peelScore = getPeelScore(candidate, livingAllies, priorities.fireRange);
    const pursuitPenalty =
      candidate.hasLineOfSight === false && distanceSq > (priorities.fireRange * 1.2) ** 2
        ? 0.12
        : 0;
    const score =
      (candidate.targetPriorityBonus ?? 0) +
      ((candidate.hasLineOfSight !== false) ? lineOfSightWeight : -lineOfSightWeight * 0.35) +
      (1 - healthRatio) * lowHealthWeight +
      ((candidate.isExposed ? 1 : 0) * exposedTargetWeight) +
      ((candidate.id === priorities.focusTargetId ? 1 : 0) * focusTargetWeight) +
      ((candidate.threatLevel ?? 0) * threatWeight) -
      distanceSq * distanceWeight +
      isolationScore * 0.1 +
      allyCommitScore * 0.08 +
      peelScore * 0.12 -
      pursuitPenalty;

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function getFormationAdjustment(
  self: CombatantSnapshot,
  allies: CombatantSnapshot[],
  target: CombatantSnapshot,
  priorities: CombatBotDecisionPriorities,
  strafeDirection: -1 | 1,
) {
  const livingAllies = allies.filter((candidate) => candidate.alive && candidate.connected);
  if (livingAllies.length === 0) {
    return { x: 0, y: 0 };
  }

  let adjustX = 0;
  let adjustY = 0;

  let centroidX = 0;
  let centroidY = 0;
  let nearestAllyDistance = Number.POSITIVE_INFINITY;
  let alliesPressuringTarget = 0;

  for (const ally of livingAllies) {
    centroidX += ally.x;
    centroidY += ally.y;

    const selfDx = self.x - ally.x;
    const selfDy = self.y - ally.y;
    const allyDistance = Math.hypot(selfDx, selfDy) || 1;
    nearestAllyDistance = Math.min(nearestAllyDistance, allyDistance);

    if (allyDistance < 124) {
      const push = ((124 - allyDistance) / 124) * (0.26 + priorities.strafeScale * 0.14);
      adjustX += (selfDx / allyDistance) * push;
      adjustY += (selfDy / allyDistance) * push;
    }

    const targetDistance = Math.hypot(target.x - ally.x, target.y - ally.y);
    if (targetDistance <= priorities.fireRange * 0.82) {
      alliesPressuringTarget += 1;
    }
  }

  centroidX /= livingAllies.length;
  centroidY /= livingAllies.length;

  const centroidDx = centroidX - self.x;
  const centroidDy = centroidY - self.y;
  const centroidDistance = Math.hypot(centroidDx, centroidDy) || 1;
  const shouldRegroup =
    !priorities.forceAdvance &&
    !priorities.forceRetreat &&
    nearestAllyDistance > Math.max(180, priorities.idealRange * 0.55);
  if (shouldRegroup) {
    const regroupStrength = Math.min(0.2, ((nearestAllyDistance - 180) / 260) * 0.2);
    adjustX += (centroidDx / centroidDistance) * regroupStrength;
    adjustY += (centroidDy / centroidDistance) * regroupStrength;
  }

  if (alliesPressuringTarget > 0) {
    const targetDx = target.x - self.x;
    const targetDy = target.y - self.y;
    const targetDistance = Math.hypot(targetDx, targetDy) || 1;
    const flankStrength = (0.08 + priorities.strafeScale * 0.14) * Math.min(1, alliesPressuringTarget * 0.7);
    adjustX += (-targetDy / targetDistance) * flankStrength * strafeDirection;
    adjustY += (targetDx / targetDistance) * flankStrength * strafeDirection;
  }

  return { x: adjustX, y: adjustY };
}

function getNearestSupportDistance(candidate: CombatantSnapshot, opponents: CombatantSnapshot[]) {
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const opponent of opponents) {
    if (!opponent.alive || opponent.id === candidate.id || opponent.team !== candidate.team) {
      continue;
    }

    const distance = Math.hypot(opponent.x - candidate.x, opponent.y - candidate.y);
    nearestDistance = Math.min(nearestDistance, distance);
  }

  return nearestDistance;
}

function getAllyCommitScore(candidate: CombatantSnapshot, allies: CombatantSnapshot[], fireRange: number) {
  if (allies.length === 0) {
    return 0;
  }

  let committedAllies = 0;
  for (const ally of allies) {
    const distance = Math.hypot(candidate.x - ally.x, candidate.y - ally.y);
    if (distance <= fireRange * 0.72) {
      committedAllies += 1;
    }
  }

  return clamp01(committedAllies / Math.max(1, allies.length));
}

function getPeelScore(candidate: CombatantSnapshot, allies: CombatantSnapshot[], fireRange: number) {
  let peelScore = 0;

  for (const ally of allies) {
    const allyMaxHp = Math.max(1, ally.maxHp ?? ally.hp ?? 1);
    const allyHp = Math.max(0, ally.hp ?? allyMaxHp);
    const allyHealthRatio = allyHp / allyMaxHp;
    if (allyHealthRatio > 0.45) {
      continue;
    }

    const distance = Math.hypot(candidate.x - ally.x, candidate.y - ally.y);
    if (distance <= fireRange * 0.62) {
      peelScore = Math.max(peelScore, 1 - allyHealthRatio);
    }
  }

  return clamp01(peelScore);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}