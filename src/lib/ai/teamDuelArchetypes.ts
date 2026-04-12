import { weapons } from "../../content.js";

export type BotCombatRole = "anchor" | "flanker" | "hunter" | "support";

export interface TeamDuelBotArchetypePreset {
  displayName: string;
  role: BotCombatRole;
  weaponKey: string;
  hasGrapple: boolean;
  hasShield: boolean;
  hasEmp: boolean;
}

export const TEAM_DUEL_BOT_ARCHETYPE_PRESETS: TeamDuelBotArchetypePreset[] = [
  { displayName: "Pulse Anchor", role: "anchor", weaponKey: weapons.pulse.key, hasGrapple: false, hasShield: true, hasEmp: false },
  { displayName: "Breaker Diver", role: "flanker", weaponKey: weapons.shotgun.key, hasGrapple: true, hasShield: false, hasEmp: true },
  { displayName: "Rail Hunter", role: "hunter", weaponKey: weapons.sniper.key, hasGrapple: false, hasShield: false, hasEmp: false },
  { displayName: "Axe Reaper", role: "flanker", weaponKey: weapons.axe.key, hasGrapple: true, hasShield: false, hasEmp: false },
  { displayName: "Field Medic", role: "support", weaponKey: weapons.staff.key, hasGrapple: false, hasShield: true, hasEmp: false },
  { displayName: "Toxin Controller", role: "support", weaponKey: weapons.injector.key, hasGrapple: false, hasShield: false, hasEmp: true },
  { displayName: "Lance Skirmisher", role: "flanker", weaponKey: weapons.lance.key, hasGrapple: true, hasShield: false, hasEmp: false },
  { displayName: "Siege Anchor", role: "anchor", weaponKey: weapons.cannon.key, hasGrapple: false, hasShield: false, hasEmp: true },
];

export function getTeamDuelBotArchetypeForSlot(slot: number) {
  return TEAM_DUEL_BOT_ARCHETYPE_PRESETS[slot % TEAM_DUEL_BOT_ARCHETYPE_PRESETS.length] ?? TEAM_DUEL_BOT_ARCHETYPE_PRESETS[0];
}