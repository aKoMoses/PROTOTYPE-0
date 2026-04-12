import { getTeamDuelDecisionPriorities } from "./tacticalProfiles";

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
}

export interface CombatBotDecision {
  movementX: number;
  movementY: number;
  facing: number;
  fireAngle: number | null;
  targetId: string | null;
  targetDistance: number | null;
  targetHasLineOfSight: boolean;
}

export type TeamDuelBotDecision = CombatBotDecision;

export function decideCombatBotAction(input: CombatBotDecisionInput): CombatBotDecision {
  const target = selectTarget(input.self, input.opponents, input.priorities);
  if (!target) {
    return {
      movementX: 0,
      movementY: 0,
      facing: 0,
      fireAngle: null,
      targetId: null,
      targetDistance: null,
      targetHasLineOfSight: false,
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

  const primaryCooldown = input.self.cooldowns?.primary ?? 0;
  const clampedJitterRoll = Math.max(-0.5, Math.min(0.5, input.aimJitterRoll));
  const fireAngle = distance <= input.priorities.fireRange && primaryCooldown <= 0 && targetHasLineOfSight
    ? facing + clampedJitterRoll * input.priorities.aimJitter
    : null;

  return {
    movementX,
    movementY,
    facing,
    fireAngle,
    targetId: target.id,
    targetDistance: distance,
    targetHasLineOfSight,
  };
}

export function decideTeamDuelBotAction(input: TeamDuelBotDecisionInput): TeamDuelBotDecision {
  return decideCombatBotAction({
    self: input.self,
    allies: input.allies,
    opponents: input.opponents,
    priorities: getTeamDuelDecisionPriorities(input.difficulty),
    strafeDirection: input.strafeDirection,
    aimJitterRoll: input.aimJitterRoll,
  });
}

function selectTarget(source: CombatantSnapshot, opponents: CombatantSnapshot[], priorities: CombatBotDecisionPriorities) {
  let best: CombatantSnapshot | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  const distanceWeight = priorities.distanceWeight ?? 0.001;
  const lineOfSightWeight = priorities.lineOfSightWeight ?? 0.12;
  const lowHealthWeight = priorities.lowHealthWeight ?? 0.16;
  const exposedTargetWeight = priorities.exposedTargetWeight ?? 0.18;
  const focusTargetWeight = priorities.focusTargetWeight ?? 0.22;
  const threatWeight = priorities.threatWeight ?? 0.08;

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
    const score =
      (candidate.targetPriorityBonus ?? 0) +
      ((candidate.hasLineOfSight !== false) ? lineOfSightWeight : -lineOfSightWeight * 0.35) +
      (1 - healthRatio) * lowHealthWeight +
      ((candidate.isExposed ? 1 : 0) * exposedTargetWeight) +
      ((candidate.id === priorities.focusTargetId ? 1 : 0) * focusTargetWeight) +
      ((candidate.threatLevel ?? 0) * threatWeight) -
      distanceSq * distanceWeight;

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}