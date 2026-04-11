// Player update loop, reset, weapon switching
import { arena, config, abilityConfig, sandboxModes } from "../config.js";
import { weapons, content } from "../content.js";
import { player, abilityState, sandbox, matchState, input, enemy, mapState, enemyBullets, orbitalDistorterFields } from "../state.js";
import { loadout } from "../state/app-state.js";
import { clamp, length, normalize, approach } from "../utils.js";
import { addImpact, addShake, addAfterimage, addHealingText } from "./effects.js";
import { getMapLayout, resolveMapCollision, maybeTeleportEntity } from "../maps.js";
import { getBuildStats, hasPerk, getRuneValue, getActiveDashCooldown, getAbilityBySlot, getPulseMagazineSize } from "../build/loadout.js";
import { getAllBots, isCombatLive, getActiveMoveSpeed, getMoveVector, getPlayerSpawn, clearStatusEffects, updateStatusEffects, tickEntityMarks, clearCombatArtifacts, getStatusState, getZoneEffectsForEntity, finalizePulseReload, defeatPlayer, resetPlayerWeaponMomentum, completePlayerWeaponAttack } from "./combat.js";
import { attackPulseRifle, attackScrapShotgun, attackRailSniper, attackVoltStaff, attackBioInjector, attackChargeLance, fireHeavyCannon, attackElectricAxe, tryDashStrikeHits, resolveQueuedAxeStrike } from "./weapons.js";
import { updateDashAbility, updateBoltLinkJavelinAbility, updateOrbitalDistorterAbility, updateExtraAbilities } from "./abilities.js";
import { updateCasting } from "./casting.js";
import { resetPhantomClone } from "./phantom.js";
import * as dom from "../dom.js";
import { playWeaponEquip } from "../audio.js";

export function setWeapon(nextWeapon) {
  if (player.weapon === nextWeapon) {
    return;
  }

  loadout.weapon = nextWeapon;
  player.weapon = nextWeapon;
  player.fireCooldown = 0;
  player.reloadTime = 0;
  player.weaponCharge = 0;
  player.weaponChargeActive = false;
  player.weaponChargeFlash = 0;
  if (nextWeapon === weapons.pulse.key) {
    player.ammo = getPulseMagazineSize();
  }
  player.comboStep = 0;
  player.comboTimer = 0;
  playWeaponEquip(nextWeapon);
  dom.statusLine.textContent =
    nextWeapon === weapons.axe.key
      ? "Electric Axe equipped. Chain the combo and commit on the finisher."
      : nextWeapon === weapons.shotgun.key
        ? "Scrap Shotgun equipped. Play tight spacing and close for the burst."
      : nextWeapon === weapons.sniper.key
        ? "Rail Sniper equipped. Punish space and mistakes with long confirmed shots."
      : nextWeapon === weapons.staff.key
        ? "Volt Staff equipped. Trade raw burst for sustain and field control."
      : nextWeapon === weapons.injector.key
        ? "Bio-Injector equipped. Mark targets and convert pressure into sustain."
      : nextWeapon === weapons.lance.key
        ? "Charge Lance equipped. Use left click for a lane puncture and C or right click for the drive."
      : nextWeapon === weapons.cannon.key
        ? "Heavy Cannon equipped. Tap for artillery pressure or hold to overload a zone."
      : "Pulse Rifle equipped. Keep the bot under ranged pressure.";
}


export function resetPlayer({ silent = false } = {}) {
  const spawn = getPlayerSpawn();
  const buildStats = getBuildStats();
  player.x = spawn.x;
  player.y = spawn.y;
  player.hp = buildStats.maxHp;
  player.alive = true;
  player.weapon = loadout.weapon;
  player.ammo = getPulseMagazineSize();
  player.reloadTime = 0;
  player.fireCooldown = 0;
  player.weaponCharge = 0;
  player.weaponChargeActive = false;
  player.weaponChargeFlash = 0;
  player.velocityX = 0;
  player.velocityY = 0;
  player.attackStartupTime = 0;
  player.attackCommitTime = 0;
  player.attackCommitX = 0;
  player.attackCommitY = 0;
  player.attackCommitSpeed = 0;
  player.activeAxeStrike = null;
  player.pendingAxeStrike = null;
  player.comboStep = 0;
  player.comboTimer = 0;
  player.lastMissTime = 0;
  player.shield = 0;
  player.shieldTime = 0;
  player.shieldGuardTime = 0;
  player.shieldBreakRefundReady = false;
  player.hasteTime = 0;
  player.afterDashHasteTime = 0;
  player.reflexAegisSpeedTime = 0;
  player.reflexAegisHitBonusTime = 0;
  player.reflexAegisHitBonusDamage = 0;
  player.hitReactionTime = 0;
  player.hitReactionX = 0;
  player.hitReactionY = 0;
  player.ghostTime = 0;
  player.failsafeReady = true;
  player.defenseFailsafeReady = true;
  player.lastStandTime = 0;
  player.lastStandDecayPerSecond = 0;
  player.precisionMomentumStacks = 0;
  player.precisionMomentumFlash = 0;
  player.revivalPrimed = 0;
  player.decoyTime = 0;
  player.injectorMarks = 0;
  player.injectorMarkTime = 0;
  player.mainRuneCooldown = 0;
  player.defenseRuneShieldCooldown = 0;
  resetPlayerWeaponMomentum();
  input.altFiring = false;
  clearStatusEffects(player);
  resetPhantomClone({ silent: true });
  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
  abilityState.dash.activeTime = 0;
  abilityState.dash.invulnerabilityTime = 0;
  abilityState.dash.charges = 1;
  abilityState.dash.rechargeTimer = 0;
  abilityState.dash.upgraded = false;
  abilityState.boltLinkJavelin.cooldown = 0;
  abilityState.boltLinkJavelin.activeTime = 0;
  abilityState.boltLinkJavelin.recastReady = false;
  abilityState.boltLinkJavelin.targetKind = null;
  abilityState.boltLinkJavelin.aimX = 0;
  abilityState.boltLinkJavelin.aimY = 0;
  abilityState.boltLinkJavelin.lastDirectionX = 0;
  abilityState.boltLinkJavelin.lastDirectionY = 0;
  abilityState.boltLinkJavelin.pendingCooldown = false;
  abilityState.orbitalDistorter.cooldown = 0;
  abilityState.orbitalDistorter.charging = false;
  abilityState.orbitalDistorter.chargeTime = 0;
  abilityState.orbitalDistorter.mode = "tap";
  abilityState.orbitalDistorter.moveBoostTime = 0;
  abilityState.vGripHarpoon.cooldown = 0;
  abilityState.vGripHarpoon.phase = "idle";
  abilityState.vGripHarpoon.projectile = null;
  abilityState.vGripHarpoon.targetKind = null;
  abilityState.vGripHarpoon.pullStopRequested = false;
  abilityState.vGripHarpoon.tetherPulse = 0;
  abilityState.hexPlateProjector.cooldown = 0;
  abilityState.reflexAegis.cooldown = 0;
  abilityState.reflexAegis.startupTime = 0;
  abilityState.reflexAegis.activeTime = 0;
  abilityState.reflexAegis.recoveryTime = 0;
  abilityState.reflexAegis.resolveLockTime = 0;
  abilityState.reflexAegis.successFlash = 0;
  abilityState.boltLinkJavelin.cooldown = 0;
  abilityState.orbitalDistorter.cooldown = 0;
  abilityState.vGripHarpoon.cooldown = 0;
  abilityState.swarmMissileRack.cooldown = 0;
  abilityState.hexPlateProjector.cooldown = 0;
  abilityState.voidCoreSingularity.cooldown = 0;
  abilityState.overdriveServos.cooldown = 0;
  abilityState.emPulseEmitter.cooldown = 0;
  abilityState.railShot.cooldown = 0;
  abilityState.phaseDash.cooldown = 0;
  abilityState.phaseDash.time = 0;
  abilityState.spectreProjector.cooldown = 0;
  abilityState.core.cooldown = 0;
  abilityState.core.phantomTime = 0;
  orbitalDistorterFields.length = 0;
  if (!silent) {
    dom.statusLine.textContent = "Player reset. Re-engage.";
  }
}


export function updatePlayer(dt) {
  const move = getMoveVector();
  const combatLive = isCombatLive();
  const previousX = player.x;
  const previousY = player.y;
  player.facing = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.reloadTime = Math.max(0, player.reloadTime - dt);
  player.flash = Math.max(0, player.flash - dt);
  player.combatTimer = Math.max(0, player.combatTimer - dt);
  player.recoil = Math.max(0, player.recoil - dt * 7.5);
  player.weaponChargeFlash = Math.max(0, player.weaponChargeFlash - dt);
  player.comboTimer = Math.max(0, player.comboTimer - dt);
  player.slashFlash = Math.max(0, player.slashFlash - dt);
  player.attackStartupTime = Math.max(0, player.attackStartupTime - dt);
  player.hitReactionTime = Math.max(0, player.hitReactionTime - dt);
  player.mainRuneCooldown = Math.max(0, player.mainRuneCooldown - dt);
  player.defenseRuneShieldCooldown = Math.max(0, player.defenseRuneShieldCooldown - dt);
  player.precisionMomentumFlash = Math.max(0, player.precisionMomentumFlash - dt);
  updateStatusEffects(player, dt);
  tickEntityMarks(player, dt);
  const playerStatus = getStatusState(player);
  const playerZoneEffects = getZoneEffectsForEntity(player, dt);
  const buildStats = getBuildStats();

  if (player.lastStandTime > 0) {
    player.lastStandTime = Math.max(0, player.lastStandTime - dt);
    player.hp = Math.max(0, player.hp - player.lastStandDecayPerSecond * dt);
    player.flash = Math.max(player.flash, 0.06);
    if (player.hp <= 0) {
      defeatPlayer("decay");
      return;
    }
  }

  updateDashAbility(dt);
  updateBoltLinkJavelinAbility(dt);
  updateOrbitalDistorterAbility(dt);
  updateExtraAbilities(dt);
  updateCasting(player, dt, abilityState.dash.activeTime > 0);

  const phaseLocked = abilityState.phaseDash.time > 0;
  const parryLocked =
    abilityState.reflexAegis.startupTime > 0 ||
    abilityState.reflexAegis.activeTime > 0 ||
    abilityState.reflexAegis.recoveryTime > 0;

  if (
    buildStats.outOfCombatRegen > 0 &&
    !input.firing &&
    enemyBullets.length === 0 &&
    player.hp > 0
  ) {
    player.hp = clamp(player.hp + buildStats.outOfCombatRegen * dt, 0, buildStats.maxHp);
  }

  if (!combatLive) {
    player.velocityX = approach(player.velocityX, 0, config.playerFriction * dt);
    player.velocityY = approach(player.velocityY, 0, config.playerFriction * dt);
  } else if (abilityState.dash.activeTime > 0) {
    // Dash owns the movement profile while it is active.
  } else if (player.attackStartupTime > 0) {
    const startupMoveScale = player.weapon === weapons.axe.key ? 0.34 : 0.55;
    const startupMoveSpeed = getActiveMoveSpeed() * playerStatus.speedMultiplier * playerZoneEffects.slowMultiplier * startupMoveScale;
    const targetVelocityX = move.x * startupMoveSpeed;
    const targetVelocityY = move.y * startupMoveSpeed;
    player.velocityX = approach(player.velocityX, targetVelocityX, config.playerAcceleration * 0.78 * dt);
    player.velocityY = approach(player.velocityY, targetVelocityY, config.playerAcceleration * 0.78 * dt);
  } else if (player.attackCommitTime > 0) {
    player.attackCommitTime = Math.max(0, player.attackCommitTime - dt);
    player.velocityX = player.attackCommitX * player.attackCommitSpeed;
    player.velocityY = player.attackCommitY * player.attackCommitSpeed;
    addAfterimage(player.x, player.y, player.facing, player.radius, "#bfffd8");
  } else if (playerStatus.stunned || parryLocked || (player.castingAbility && abilityState.dash.activeTime <= 0)) {
    // Casting aggressive spells stops movement with the "glissade" friction handled in updateCasting.
    // We already handled friction inside updateCasting for player & bots.
    // Ensure we don't apply standard movement here.
    if (player.castingAbility && abilityState.dash.activeTime <= 0) {
       // updateCasting already handles friction for casts.
    } else {
       player.velocityX = approach(player.velocityX, 0, config.playerFriction * dt);
       player.velocityY = approach(player.velocityY, 0, config.playerFriction * dt);
    }
  } else {
    const activeMoveSpeed = getActiveMoveSpeed() * playerStatus.speedMultiplier * playerZoneEffects.slowMultiplier;
    const targetVelocityX = move.x * activeMoveSpeed;
    const targetVelocityY = move.y * activeMoveSpeed;
    const acceleration = move.x !== 0 || move.y !== 0 ? config.playerAcceleration : config.playerFriction;
    player.velocityX = approach(player.velocityX, targetVelocityX, acceleration * dt);
    player.velocityY = approach(player.velocityY, targetVelocityY, acceleration * dt);
  }

  player.x = clamp(player.x + player.velocityX * dt, player.radius, arena.width - player.radius);
  player.y = clamp(player.y + player.velocityY * dt, player.radius, arena.height - player.radius);
  resolveMapCollision(player);
  maybeTeleportEntity(player);

  if (player.pendingAxeStrike && player.attackStartupTime <= 0) {
    resolveQueuedAxeStrike(player.pendingAxeStrike);
    player.pendingAxeStrike = null;
  }

  if (player.activeAxeStrike) {
    const profile = player.activeAxeStrike.profile;
    const hitConnected = tryDashStrikeHits(profile, previousX, previousY, player.x, player.y);

    if (hitConnected) {
      player.activeAxeStrike.connected = true;
      addShake(profile.shake);
      dom.statusLine.textContent = profile.label;
    }

    if (player.attackCommitTime <= 0) {
      if (!player.activeAxeStrike.connected) {
        player.lastMissTime = 0.75;
        dom.statusLine.textContent = profile.miss;
      }

      completePlayerWeaponAttack(player.activeAxeStrike.attackId, player.activeAxeStrike.connected || player.activeAxeStrike.worldHit);
      player.activeAxeStrike = null;
    }
  }

  if (player.reloadTime <= 0 && player.weapon === weapons.pulse.key && player.ammo <= 0) {
    finalizePulseReload(player);
  }

  const wantsLanceAlt = input.altFiring && player.weapon === weapons.lance.key;
  const wantsCannonCharge = player.weapon === weapons.cannon.key && (input.firing || input.altFiring);

  const canUseWeapon = combatLive && !playerStatus.stunned && player.fireCooldown <= 0 && !phaseLocked && !parryLocked;
  if (player.weapon === weapons.sniper.key) {
    if (canUseWeapon && input.firing) {
      player.weaponChargeActive = true;
      player.weaponCharge = clamp(player.weaponCharge + dt / config.sniperChargeTime, 0, 1);
      player.flash = Math.max(player.flash, 0.02 + player.weaponCharge * 0.04);
      if (player.weaponCharge >= 1) {
        player.weaponChargeFlash = Math.max(player.weaponChargeFlash, 0.12);
      }
      return;
    } else if (player.weaponChargeActive) {
      attackRailSniper(player.weaponCharge);
      player.weaponChargeActive = false;
      player.weaponCharge = 0;
      player.combatTimer = 3.0;
      return;
    }
    return;
  } else if (player.weapon === weapons.cannon.key) {
    if (canUseWeapon && wantsCannonCharge) {
      player.weaponChargeActive = true;
      player.weaponCharge = clamp(player.weaponCharge + dt / config.cannonChargeTime, 0, 1);
      player.flash = Math.max(player.flash, 0.03 + player.weaponCharge * 0.06);
      if (player.weaponCharge >= 1) {
        player.weaponChargeFlash = Math.max(player.weaponChargeFlash, 0.16);
      }
    } else if (player.weaponChargeActive) {
      fireHeavyCannon(player.weaponCharge);
      player.weaponChargeActive = false;
      player.weaponCharge = 0;
      player.combatTimer = 3.0;
      return;
    }
  } else if (player.weaponChargeActive) {
    player.weaponChargeActive = false;
    player.weaponCharge = 0;
  }

  if (phaseLocked || parryLocked) {
    player.weaponChargeActive = false;
    player.weaponCharge = 0;
    return;
  }

  if (combatLive && !playerStatus.stunned && player.fireCooldown <= 0 && (input.firing || wantsLanceAlt)) {
    player.combatTimer = 3.0;
    if (wantsLanceAlt && player.weapon === weapons.lance.key) {
      attackChargeLance(true);
    } else if (player.weapon === weapons.axe.key) {
      attackElectricAxe();
    } else if (player.weapon === weapons.shotgun.key) {
      attackScrapShotgun();
    } else if (player.weapon === weapons.staff.key) {
      attackVoltStaff();
    } else if (player.weapon === weapons.injector.key) {
      attackBioInjector();
    } else if (player.weapon === weapons.lance.key) {
      attackChargeLance(false);
    } else if (player.weapon === weapons.cannon.key) {
      return;
    } else {
      attackPulseRifle();
    }
  }
}

