// Visual effect and particle helpers
import { globals } from "../state.js";
import { impacts, tracers, combatTexts, afterimages, slashEffects, explosions, beamEffects, absorbBursts } from "../state.js";
import { length, normalize } from "../utils.js";

export function addImpact(x, y, color, size = 14) {
  impacts.push({
    x,
    y,
    color,
    size,
    life: 0.18,
    maxLife: 0.18,
  });
}

export function addCombatText(x, y, text, color, options = {}) {
  combatTexts.push({
    x,
    y,
    text: String(text),
    color,
    life: options.life ?? 0.56,
    maxLife: options.life ?? 0.56,
    rise: options.rise ?? 32,
    driftX: options.driftX ?? (Math.random() - 0.5) * 16,
    size: options.size ?? 18,
    weight: options.weight ?? 700,
  });
}

export function addDamageText(x, y, amount, options = {}) {
  addCombatText(x, y, `${Math.max(1, Math.round(amount))}`, options.color ?? "#ff7f73", {
    life: options.life ?? (options.heavy ? 0.62 : 0.54),
    rise: options.rise ?? (options.heavy ? 40 : 30),
    size: options.size ?? (options.heavy ? 22 : 18),
    weight: options.weight ?? (options.heavy ? 800 : 700),
  });
}

export function addHealingText(x, y, amount) {
  addCombatText(x, y, `+${Math.max(1, Math.round(amount))}`, "#7dff9e", {
    life: 0.58,
    rise: 28,
    size: 18,
    weight: 700,
  });
}

export function applyHitReaction(entity, sourceX, sourceY, intensity = 1) {
  const direction = normalize(entity.x - sourceX || 1, entity.y - sourceY || 0);
  entity.hitReactionTime = Math.max(entity.hitReactionTime ?? 0, 0.12 + intensity * 0.05);
  entity.hitReactionX = direction.x * (5 + intensity * 4);
  entity.hitReactionY = direction.y * (5 + intensity * 4);
}

export function addAfterimage(x, y, facing, radius, color) {
  afterimages.push({
    x,
    y,
    facing,
    radius,
    color,
    life: 0.12,
    maxLife: 0.12,
  });
}

export function addSlashEffect(x, y, facing, comboStep) {
  slashEffects.push({
    x,
    y,
    facing,
    comboStep,
    life: comboStep === 3 ? 0.16 : comboStep === 2 ? 0.13 : 0.1,
    maxLife: comboStep === 3 ? 0.16 : comboStep === 2 ? 0.13 : 0.1,
  });
}

export function addExplosion(x, y, radius, color, options = {}) {
  explosions.push({
    x,
    y,
    radius,
    color,
    life: options.life ?? 0.18,
    maxLife: options.life ?? 0.18,
    type: options.type ?? "standard",
  });
}

export function addBeamEffect(x0, y0, x1, y1, color, width = 4, life = 0.12) {
  beamEffects.push({
    x0,
    y0,
    x1,
    y1,
    color,
    width,
    life,
    maxLife: life,
  });
}

export function addAbsorbBurst(x, y, radius, color) {
  absorbBursts.push({
    x,
    y,
    radius,
    color,
    life: 0.16,
    maxLife: 0.16,
  });
}

export function addShake(amount) {
  globals.screenShake = Math.max(globals.screenShake, amount);
}
