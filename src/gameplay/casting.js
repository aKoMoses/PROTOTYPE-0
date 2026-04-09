import { config, abilityConfig } from "../config.js";
import { approach } from "../utils.js";

/**
 * Starts a purely visual cast telegraph that does NOT block actions.
 */
export function startVisualCast(entity, abilityKey, duration = 0.24) {
  entity.visualCastingAbility = abilityKey;
  entity.visualCastTime = duration;
  entity.totalVisualCastTime = duration;
}

/**
 * Starts a weapon firing telegraph.
 */
export function startWeaponTelegraph(entity, weaponKey, duration = 0.08) {
  entity.weaponCasting = weaponKey;
  entity.weaponChargeTime = duration;
  entity.totalWeaponChargeTime = duration;
}

/**
 * Starts a cast wind-up for an entity.
 * @param {Object} entity - The actor casting the ability (player or enemy).
 * @param {string} abilityKey - The key of the ability from config.castTimes.
 * @param {Function} executeFn - The function to call when the cast completes.
 * @param {Object} params - Parameters to pass to the executeFn.
 */
export function startCast(entity, abilityKey, executeFn, params = {}) {
  const castDuration = abilityConfig.castTimes[abilityKey] || 0;
  
  if (castDuration <= 0) {
    executeFn(params);
    return;
  }

  entity.castingAbility = abilityKey;
  entity.castTime = castDuration;
  entity.totalCastTime = castDuration;
  entity.castParams = params;
  entity.castExecuteFn = executeFn;
}

/**
 * Updates the casting state of an entity.
 * Handles the wind-up countdown, stand-still friction, and execution.
 * @param {Object} entity - The actor to update.
 * @param {number} dt - Delta time.
 * @param {boolean} isDashing - Whether the entity is currently dashing (to bypass friction).
 */
export function updateCasting(entity, dt, isDashing = false) {
  if (!entity.castingAbility || entity.castTime <= 0) {
    entity.castingAbility = null;
    return;
  }

  entity.castTime = Math.max(0, entity.castTime - dt);

  // Apply high friction if not dashing (the "glissade" effect)
  if (!isDashing && entity.castTime > 0) {
    const castFriction = config.playerFriction * 3.2; // Extra high friction for casting
    entity.velocityX = approach(entity.velocityX, 0, castFriction * dt);
    entity.velocityY = approach(entity.velocityY, 0, castFriction * dt);
  }

  // Execute when timer hits zero
  if (entity.castTime <= 0) {
    if (entity.castExecuteFn) {
      entity.castExecuteFn(entity.castParams);
    }
    entity.castingAbility = null;
    entity.castExecuteFn = null;
    entity.castParams = null;
  }

  updateVisualTimers(entity, dt);
}

/**
 * Ticks the non-blocking visual timers.
 */
export function updateVisualTimers(entity, dt) {
  if (entity.visualCastTime > 0) {
    entity.visualCastTime = Math.max(0, entity.visualCastTime - dt);
    if (entity.visualCastTime <= 0) {
      entity.visualCastingAbility = null;
    }
  }

  if (entity.weaponChargeTime > 0) {
    entity.weaponChargeTime = Math.max(0, entity.weaponChargeTime - dt);
    if (entity.weaponChargeTime <= 0) {
      entity.weaponCasting = null;
    }
  }
}
