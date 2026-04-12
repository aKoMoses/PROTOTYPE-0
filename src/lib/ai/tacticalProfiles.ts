import type { BotDifficulty, CombatBotDecisionPriorities } from "./teamDuelDecision";
import { weapons } from "../../content.js";

export type CombatArchetype =
  | "brawler"
  | "skirmisher"
  | "marksman"
  | "controller"
  | "support";

export interface DifficultyScalars {
  spacingAwareness: number;
  pressureAdaptation: number;
  dodgeChance: number;
  dodgeReaction: number;
}

export interface SharedCombatTacticalContext {
  weaponKey: string;
  currentHp: number;
  maxHp: number;
  shouldPunish: boolean;
  shouldPressure: boolean;
  shouldKite: boolean;
  focusTargetId?: string | null;
  hasGrapple?: boolean;
  hasShield?: boolean;
  hasEmp?: boolean;
  postAttackMoveMultiplier?: number;
  difficulty: DifficultyScalars;
}

type DuelTacticalContext = SharedCombatTacticalContext;

interface BaseDuelWeaponProfile {
  archetype: CombatArchetype;
  targetRange: { healthy: number; lowHp: number };
  fireRange: number;
  aimJitter: number;
  strafeScale: { calm: number; punish: number };
  engageBias: number;
  retreatBias: { healthy: number; lowHp: number };
  abilityPressureDistance: number;
  fieldResponseDistance: number;
  dodgeAggression: number;
  shootBurstSize: number;
  lineOfSightWeight?: number;
  exposedTargetWeight?: number;
  lowHealthWeight?: number;
  threatWeight?: number;
  distanceWeight?: number;
  focusTargetWeight?: number;
  adapt?: (context: DuelTacticalContext, profile: ResolvedDuelWeaponProfile) => void;
}

export interface ResolvedDuelWeaponProfile {
  archetype: CombatArchetype;
  targetRange: number;
  fireRange: number;
  aimJitter: number;
  strafeScale: number;
  engageBias: number;
  retreatBias: number;
  abilityPressureDistance: number;
  fieldResponseDistance: number;
  dodgeAggression: number;
  shootBurstSize: number;
  priorities: CombatBotDecisionPriorities;
}

const BOT_DIFFICULTY_SCALARS: Record<BotDifficulty, DifficultyScalars> = {
  easy: {
    spacingAwareness: 0.72,
    pressureAdaptation: 0.7,
    dodgeChance: 0.62,
    dodgeReaction: 0.66,
  },
  normal: {
    spacingAwareness: 0.9,
    pressureAdaptation: 0.9,
    dodgeChance: 0.84,
    dodgeReaction: 0.86,
  },
  hard: {
    spacingAwareness: 1,
    pressureAdaptation: 1,
    dodgeChance: 1,
    dodgeReaction: 1,
  },
};

const TEAM_DUEL_PROFILES: Record<BotDifficulty, CombatBotDecisionPriorities> = {
  easy: {
    idealRange: 360,
    fireRange: 620,
    strafeScale: 0.4,
    aimJitter: 0.18,
    engageBias: 1,
    retreatBias: 1,
    approachPadding: 40,
    retreatPadding: 60,
    preferLineOfSight: true,
    distanceWeight: 0.001,
    lineOfSightWeight: 0.16,
    lowHealthWeight: 0.1,
    exposedTargetWeight: 0.08,
    threatWeight: 0.05,
  },
  normal: {
    idealRange: 330,
    fireRange: 700,
    strafeScale: 0.58,
    aimJitter: 0.1,
    engageBias: 1,
    retreatBias: 1,
    approachPadding: 40,
    retreatPadding: 60,
    preferLineOfSight: true,
    distanceWeight: 0.001,
    lineOfSightWeight: 0.16,
    lowHealthWeight: 0.1,
    exposedTargetWeight: 0.08,
    threatWeight: 0.05,
  },
  hard: {
    idealRange: 300,
    fireRange: 760,
    strafeScale: 0.75,
    aimJitter: 0.04,
    engageBias: 1,
    retreatBias: 1,
    approachPadding: 40,
    retreatPadding: 60,
    preferLineOfSight: true,
    distanceWeight: 0.001,
    lineOfSightWeight: 0.16,
    lowHealthWeight: 0.1,
    exposedTargetWeight: 0.08,
    threatWeight: 0.05,
  },
};

const DUEL_WEAPON_PROFILES: Record<string, BaseDuelWeaponProfile> = {
  [weapons.axe.key]: {
    archetype: "brawler",
    targetRange: { healthy: 218, lowHp: 272 },
    fireRange: 220,
    aimJitter: 0.05,
    strafeScale: { calm: 0.92, punish: 1.08 },
    engageBias: 1.22,
    retreatBias: { healthy: 0.48, lowHp: 0.92 },
    abilityPressureDistance: 300,
    fieldResponseDistance: 212,
    dodgeAggression: 0.96,
    shootBurstSize: 0,
    adapt(context, profile) {
      if (context.hasGrapple) {
        profile.targetRange = context.currentHp <= 72 ? 272 : 196;
        profile.engageBias = 1.34;
        profile.abilityPressureDistance = 430;
      }
    },
  },
  [weapons.shotgun.key]: {
    archetype: "brawler",
    targetRange: { healthy: 276, lowHp: 344 },
    fireRange: 340,
    aimJitter: 0.05,
    strafeScale: { calm: 1.14, punish: 1.24 },
    engageBias: 1.18,
    retreatBias: { healthy: 0.66, lowHp: 1.04 },
    abilityPressureDistance: 320,
    fieldResponseDistance: 230,
    dodgeAggression: 0.9,
    shootBurstSize: 1,
    adapt(context, profile) {
      if (context.hasGrapple) {
        profile.targetRange = context.currentHp <= 72 ? 344 : 238;
        profile.engageBias = 1.28;
      }
      if (context.hasEmp) {
        profile.abilityPressureDistance = 240;
      }
    },
  },
  [weapons.sniper.key]: {
    archetype: "marksman",
    targetRange: { healthy: 612, lowHp: 720 },
    fireRange: 920,
    aimJitter: 0.03,
    strafeScale: { calm: 0.88, punish: 1.06 },
    engageBias: 0.76,
    retreatBias: { healthy: 1.08, lowHp: 1.22 },
    abilityPressureDistance: 520,
    fieldResponseDistance: 260,
    dodgeAggression: 1,
    shootBurstSize: 0,
    lineOfSightWeight: 0.28,
  },
  [weapons.staff.key]: {
    archetype: "support",
    targetRange: { healthy: 336, lowHp: 408 },
    fireRange: 480,
    aimJitter: 0.05,
    strafeScale: { calm: 1.02, punish: 1.08 },
    engageBias: 1.02,
    retreatBias: { healthy: 0.72, lowHp: 0.94 },
    abilityPressureDistance: 320,
    fieldResponseDistance: 220,
    dodgeAggression: 0.9,
    shootBurstSize: 0,
  },
  [weapons.injector.key]: {
    archetype: "controller",
    targetRange: { healthy: 392, lowHp: 474 },
    fireRange: 560,
    aimJitter: 0.05,
    strafeScale: { calm: 1.04, punish: 1.16 },
    engageBias: 1.04,
    retreatBias: { healthy: 0.78, lowHp: 1.06 },
    abilityPressureDistance: 380,
    fieldResponseDistance: 240,
    dodgeAggression: 0.94,
    shootBurstSize: 0,
    exposedTargetWeight: 0.32,
  },
  [weapons.lance.key]: {
    archetype: "skirmisher",
    targetRange: { healthy: 236, lowHp: 256 },
    fireRange: 320,
    aimJitter: 0.05,
    strafeScale: { calm: 1.02, punish: 1.18 },
    engageBias: 1.18,
    retreatBias: { healthy: 0.54, lowHp: 0.88 },
    abilityPressureDistance: 360,
    fieldResponseDistance: 210,
    dodgeAggression: 0.9,
    shootBurstSize: 0,
    adapt(context, profile) {
      if (context.hasGrapple) {
        profile.targetRange = context.currentHp <= 72 ? 256 : 214;
        profile.engageBias = 1.3;
      }
    },
  },
  [weapons.cannon.key]: {
    archetype: "marksman",
    targetRange: { healthy: 508, lowHp: 644 },
    fireRange: 820,
    aimJitter: 0.05,
    strafeScale: { calm: 0.9, punish: 1.02 },
    engageBias: 0.88,
    retreatBias: { healthy: 0.98, lowHp: 1.18 },
    abilityPressureDistance: 480,
    fieldResponseDistance: 240,
    dodgeAggression: 0.96,
    shootBurstSize: 0,
    lineOfSightWeight: 0.26,
  },
  [weapons.pulse.key]: {
    archetype: "skirmisher",
    targetRange: { healthy: 404, lowHp: 548 },
    fireRange: 660,
    aimJitter: 0.08,
    strafeScale: { calm: 1, punish: 1.18 },
    engageBias: 1.08,
    retreatBias: { healthy: 0.88, lowHp: 1.18 },
    abilityPressureDistance: 340,
    fieldResponseDistance: 250,
    dodgeAggression: 0.92,
    shootBurstSize: 2,
    adapt(context, profile) {
      if (context.hasShield) {
        profile.targetRange = context.currentHp <= 72 ? 548 : 430;
        profile.abilityPressureDistance = 280;
      }
      if (context.shouldPunish) {
        profile.shootBurstSize = 3;
      }
    },
  },
};

export function getTeamDuelDecisionPriorities(difficulty: BotDifficulty): CombatBotDecisionPriorities {
  return { ...TEAM_DUEL_PROFILES[difficulty] };
}

export function getDifficultyScalarsForBotDifficulty(difficulty: BotDifficulty): DifficultyScalars {
  return { ...BOT_DIFFICULTY_SCALARS[difficulty] };
}

export function getSharedCombatTacticalProfile(context: SharedCombatTacticalContext): ResolvedDuelWeaponProfile {
  const base = DUEL_WEAPON_PROFILES[context.weaponKey] ?? DUEL_WEAPON_PROFILES[weapons.pulse.key];
  const hpThreshold = context.currentHp <= Math.min(72, context.maxHp * 0.3) ? "lowHp" : "healthy";
  const profile: ResolvedDuelWeaponProfile = {
    archetype: base.archetype,
    targetRange: base.targetRange[hpThreshold],
    fireRange: base.fireRange,
    aimJitter: base.aimJitter,
    strafeScale: context.shouldPunish ? base.strafeScale.punish : base.strafeScale.calm,
    engageBias: base.engageBias,
    retreatBias: base.retreatBias[hpThreshold],
    abilityPressureDistance: base.abilityPressureDistance,
    fieldResponseDistance: base.fieldResponseDistance,
    dodgeAggression: base.dodgeAggression,
    shootBurstSize: base.shootBurstSize,
    priorities: {
      idealRange: base.targetRange[hpThreshold],
      fireRange: base.fireRange,
      strafeScale: (context.postAttackMoveMultiplier ?? 1) * (context.shouldPunish ? base.strafeScale.punish : base.strafeScale.calm) * 1.12,
      aimJitter: base.aimJitter,
      engageBias: base.engageBias,
      retreatBias: base.retreatBias[hpThreshold],
      approachPadding: 28,
      retreatPadding: 74,
      forceAdvance: context.shouldPressure,
      forceRetreat: context.shouldKite,
      preferLineOfSight: true,
      distanceWeight: base.distanceWeight ?? 0.001,
      lineOfSightWeight: base.lineOfSightWeight ?? 0.22,
      lowHealthWeight: base.lowHealthWeight ?? 0.2,
      exposedTargetWeight: base.exposedTargetWeight ?? 0.28,
      focusTargetId: context.focusTargetId,
      focusTargetWeight: base.focusTargetWeight ?? 0.34,
      threatWeight: base.threatWeight ?? 0.08,
      abilityPressureDistance: base.abilityPressureDistance,
      dodgeAggression: base.dodgeAggression,
      shootBurstSize: base.shootBurstSize,
    },
  };

  base.adapt?.(context, profile);

  const difficulty = context.difficulty;
  profile.strafeScale *= 0.84 + difficulty.spacingAwareness * 0.24;
  profile.engageBias *= 0.9 + difficulty.pressureAdaptation * 0.18;
  profile.retreatBias *= 0.88 + difficulty.spacingAwareness * 0.2;
  profile.dodgeAggression = Math.min(1, profile.dodgeAggression * difficulty.dodgeChance * difficulty.dodgeReaction);

  profile.priorities = {
    ...profile.priorities,
    idealRange: profile.targetRange,
    strafeScale: (context.postAttackMoveMultiplier ?? 1) * profile.strafeScale * 1.12,
    engageBias: profile.engageBias,
    retreatBias: profile.retreatBias,
    abilityPressureDistance: profile.abilityPressureDistance,
    dodgeAggression: profile.dodgeAggression,
    shootBurstSize: profile.shootBurstSize,
  };

  return profile;
}

export function getDuelTacticalProfile(context: DuelTacticalContext): ResolvedDuelWeaponProfile {
  return getSharedCombatTacticalProfile(context);
}