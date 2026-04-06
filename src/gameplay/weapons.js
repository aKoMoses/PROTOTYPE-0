// Weapon attack functions (all 6 weapons)
import { config, abilityConfig } from "../config.js";
import { weapons } from "../content.js";
import { player, abilityState, loadout, sandbox, bullets } from "../state.js";
import { clamp, length, normalize } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addSlashEffect, applyHitReaction, addBeamEffect } from "./effects.js";
import { resolveMapCollision, getMapLayout } from "../maps.js";
import { getBuildStats, hasPerk, getRuneValue, getPerkDamageMultiplier, getPulseMagazineSize } from "../build/loadout.js";
import { getAllBots, isCombatLive, damageBot, spawnBullet, startPulseReload, finalizePulseReload, applyStatusEffect, getStatusState, damagePylonsAlongLine } from "./combat.js";
import { mapState } from "../state.js";
import { playWeaponFire } from "../audio.js";

export function attackPulseRifle() {
  if (player.reloadTime > 0) {
    return;
  }

  if (player.ammo <= 0) {
    startPulseReload(player);
    return;
  }

  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.stock;
  player.fireCooldown = getWeaponCooldown(weapons.pulse.key);
  spawnBullet(player, input.mouseX, input.mouseY, bullets, activeSkin.tint, config.bulletSpeed, config.pulseDamage * getPerkDamageMultiplier(), {
    radius: 4,
    source: "pulse-rifle",
    trailColor: "#c6f5ff",
  });
  playWeaponFire(weapons.pulse.key);
  player.ammo = Math.max(0, player.ammo - 1);
  addImpact(player.x + Math.cos(player.facing) * 26, player.y + Math.sin(player.facing) * 26, "#77d8ff", 12);
  player.recoil = 1;
  addShake(2.8);
  if (player.ammo <= 0) {
    startPulseReload(player, true);
    statusLine.textContent = "Pulse Rifle mag emptied. Reloading now.";
  } else {
    statusLine.textContent = sandbox.mode === sandboxModes.duel.key && enemy.alive
      ? "Keep pressure with the pulse rifle."
      : "Pulse rifle online. Track the lane and confirm hits.";
  }
}

export function attackScrapShotgun() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.rustfang;
  player.fireCooldown = getWeaponCooldown(weapons.shotgun.key);
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);

  for (let pellet = 0; pellet < 6; pellet += 1) {
    const spread = -0.18 + pellet * 0.072;
    const angle = baseAngle + spread;
    const targetX = player.x + Math.cos(angle) * 100;
    const targetY = player.y + Math.sin(angle) * 100;
    spawnBullet(player, targetX, targetY, bullets, activeSkin.tint, config.bulletSpeed * 0.85, 9 * getPerkDamageMultiplier(), {
      radius: 4,
      source: "shotgun-pellet",
      trailColor: "#ffd0aa",
    });
  }

  playWeaponFire(weapons.shotgun.key);

  addImpact(player.x + Math.cos(baseAngle) * 26, player.y + Math.sin(baseAngle) * 26, "#ffb078", 18);
  addShake(5.6);
  player.recoil = 1.4;
  statusLine.textContent = "Scrap Shotgun cracked out a close-range burst.";
}

export function attackRailSniper() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.wastelux;
  player.fireCooldown = getWeaponCooldown(weapons.sniper.key);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    1940,
    34 * getPerkDamageMultiplier(getPrimaryBot()),
    {
      radius: 6,
      life: 0.72,
      piercing: true,
      trailColor: "#ffe7a8",
      source: "rail-sniper",
      effect: { kind: "rail", bonusSlow: 0.12, bonusSlowDuration: 0.45 },
    },
  );
  playWeaponFire(weapons.sniper.key);
  addImpact(player.x + direction.x * 30, player.y + direction.y * 30, "#ffe4a4", 20);
  addShake(7.6);
  player.recoil = 1.42;
  statusLine.textContent = "Rail Sniper cracked a long precision shot.";
}

export function attackVoltStaff() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.shockglass;
  player.fireCooldown = getWeaponCooldown(weapons.staff.key);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    980,
    12 * getPerkDamageMultiplier(getPrimaryBot()),
    {
      radius: 5,
      life: 0.9,
      trailColor: "#b6ffd4",
      source: "volt-staff",
      effect: { kind: "staff", heal: 8 },
    },
  );
  playWeaponFire(weapons.staff.key);
  player.shield = Math.max(player.shield, 6);
  player.shieldTime = Math.max(player.shieldTime, 0.8);
  addImpact(player.x + Math.cos(player.facing) * 24, player.y + Math.sin(player.facing) * 24, "#9cffc4", 16);
  statusLine.textContent = "Volt Staff arc fired. Sustain the exchange.";
}

export function attackBioInjector() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.voidchrome;
  player.fireCooldown = getWeaponCooldown(weapons.injector.key);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    1260,
    9 * getPerkDamageMultiplier(getPrimaryBot()),
    {
      radius: 4,
      life: 0.84,
      trailColor: "#f0b2ff",
      source: "injector",
      effect: { kind: "injector", markDuration: 4.2, markMax: 3, healOnConsume: 12 },
    },
  );
  playWeaponFire(weapons.injector.key);
  addImpact(player.x + Math.cos(player.facing) * 22, player.y + Math.sin(player.facing) * 22, "#da90ff", 14);
  statusLine.textContent = "Bio-Injector tagged the lane with corrosive pressure.";
}

export function getAxeComboProfile(step) {
  if (step === 1) {
    return {
      hitMode: "line",
      cooldown: 0.56,
      range: 286,
      width: 16,
      arc: 0.16,
      damage: 68,
      cleave: false,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#74f6ff",
      impactColor: "#ddffff",
      startup: 0.14,
      shake: 11.2,
      impactSize: 42,
      label: "Long electro edge bit hard through the lane.",
      miss: "Long opener whiffed. The axe is punishable if you miss the line.",
    };
  }

  if (step === 2) {
    return {
      hitMode: "arc",
      cooldown: 0.68,
      range: 154,
      width: 56,
      arc: 1.34,
      damage: 80,
      cleave: true,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#47cfff",
      impactColor: "#d4f6ff",
      startup: 0.2,
      shake: 15.8,
      impactSize: 50,
      label: "Heavy cleave cracked wide with brutal electric force.",
      miss: "Heavy cleave missed. The recovery is real, so swing with intent.",
    };
  }

  return {
    hitMode: "dashPath",
    cooldown: 0.94,
    range: 166,
    width: 34,
    arc: 0.44,
    damage: 104,
    cleave: false,
    commitSpeed: 1340,
    commitDuration: 0.24,
    stun: 0.72,
    color: "#ffd77e",
    impactColor: "#fff1bd",
    startup: 0.28,
    shake: 20.4,
    impactSize: 58,
    label: "Dash finisher crushed through the target and stunned it.",
    miss: "Finisher committed through empty space. The axe is deadly, but missing gets you kited.",
  };
}

export function collectAxeTargets(profile, facing = player.facing) {
  const hits = [];

  for (const bot of getAllBots()) {
    if (!bot.alive) {
      continue;
    }

    const toBotX = bot.x - player.x;
    const toBotY = bot.y - player.y;
    const botDistance = length(toBotX, toBotY);
    const botAngle = Math.atan2(toBotY, toBotX);
    const deltaAngle = Math.atan2(
      Math.sin(botAngle - facing),
      Math.cos(botAngle - facing),
    );

    if (profile.hitMode === "arc") {
      if (botDistance > profile.range + bot.radius || Math.abs(deltaAngle) > profile.arc) {
        continue;
      }
    } else if (profile.hitMode === "line") {
      const lineStartX = player.x + Math.cos(facing) * 18;
      const lineStartY = player.y + Math.sin(facing) * 18;
      const lineEndX = player.x + Math.cos(facing) * (profile.range + 12);
      const lineEndY = player.y + Math.sin(facing) * (profile.range + 12);
      const lineDistance = pointToSegmentDistance(bot.x, bot.y, lineStartX, lineStartY, lineEndX, lineEndY);

      if (
        botDistance > profile.range + bot.radius + 10 ||
        Math.abs(deltaAngle) > profile.arc ||
        lineDistance > profile.width + bot.radius
      ) {
        continue;
      }
    } else {
      continue;
    }

    if (profile.hitMode !== "dashPath" && botDistance > profile.range + bot.radius + 10) {
      continue;
    }

    hits.push({ bot, distance: botDistance });
  }

  hits.sort((left, right) => left.distance - right.distance);
  return profile.hitMode === "arc" ? hits : hits.slice(0, 1);
}

export function tryDashStrikeHits(profile, startX, startY, endX, endY) {
  if (!player.activeAxeStrike) {
    return false;
  }

  let hitAny = false;
  damagePylonsAlongLine(startX, startY, endX, endY, profile.damage * 0.35, "player");

  for (const bot of getAllBots()) {
    if (!bot.alive || player.activeAxeStrike.hitTargets.has(bot.kind)) {
      continue;
    }

    const pathDistance = pointToSegmentDistance(bot.x, bot.y, startX, startY, endX, endY);
    const tipX = endX + player.attackCommitX * (profile.range - 38);
    const tipY = endY + player.attackCommitY * (profile.range - 38);
    const forwardDistance = pointToSegmentDistance(bot.x, bot.y, endX, endY, tipX, tipY);

    if (
      pathDistance > player.radius + 10 + bot.radius ||
      forwardDistance > profile.width + bot.radius ||
      length(bot.x - endX, bot.y - endY) > profile.range + bot.radius + 14
    ) {
      continue;
    }

    player.activeAxeStrike.hitTargets.add(bot.kind);
    hitAny = true;
    damageBot(
      bot,
      profile.damage,
      profile.color,
      bot.x - player.attackCommitX * 6,
      bot.y - player.attackCommitY * 6,
      0,
    );
    applyStatusEffect(bot, "stun", getStatusDuration(profile.stun), 1);
    addImpact(bot.x, bot.y, profile.impactColor, 42);
    addImpact(bot.x, bot.y, "#fff7dc", 24);

    if (bot.kind === "hunter") {
      bot.dodgeCooldown = Math.max(bot.dodgeCooldown, 0.55);
    }
  }

  return hitAny;
}

export function resolveQueuedAxeStrike(queuedStrike) {
  if (!queuedStrike) {
    return;
  }

  const { profile } = queuedStrike;

  if (profile.hitMode === "dashPath") {
    player.attackCommitTime = profile.commitDuration;
    player.attackCommitX = Math.cos(queuedStrike.facing);
    player.attackCommitY = Math.sin(queuedStrike.facing);
    player.attackCommitSpeed = profile.commitSpeed;
    player.activeAxeStrike = {
      comboStep: queuedStrike.comboStep,
      hitTargets: new Set(),
      connected: false,
      profile,
    };
    addAfterimage(player.x, player.y, player.facing, player.radius + 4, "#ffe0a0");
    addAfterimage(player.x, player.y, player.facing, player.radius + 8, "rgba(255, 224, 160, 0.8)");
    statusLine.textContent = "Electro Axe finisher committed. Drive through the target.";
    return;
  }

  const strikeStartX = player.x + Math.cos(queuedStrike.facing) * 12;
  const strikeStartY = player.y + Math.sin(queuedStrike.facing) * 12;
  const strikeEndX = player.x + Math.cos(queuedStrike.facing) * (profile.range + 12);
  const strikeEndY = player.y + Math.sin(queuedStrike.facing) * (profile.range + 12);
  damagePylonsAlongLine(strikeStartX, strikeStartY, strikeEndX, strikeEndY, profile.damage * 0.45, "player");

  const hits = collectAxeTargets(profile, queuedStrike.facing);

  if (hits.length === 0) {
    player.lastMissTime = 0.78;
    addShake(profile.hitMode === "arc" ? 3.2 : 2.4);
    statusLine.textContent = profile.miss;
    return;
  }

  for (const hit of hits) {
    damageBot(
      hit.bot,
      profile.damage,
      profile.color,
      hit.bot.x - player.attackCommitX * 8,
      hit.bot.y - player.attackCommitY * 8,
      0,
    );

    addImpact(hit.bot.x, hit.bot.y, profile.impactColor, profile.hitMode === "arc" ? 36 : 28);
    addImpact(hit.bot.x, hit.bot.y, "#fff7dc", profile.hitMode === "arc" ? 20 : 16);

    if (hit.bot.kind === "hunter") {
      hit.bot.dodgeCooldown = Math.max(hit.bot.dodgeCooldown, 0.45);
      hit.bot.postAttackMoveTime = Math.max(hit.bot.postAttackMoveTime, 0.18);
    }
  }

  addShake(profile.shake);
  statusLine.textContent = profile.label;
}

export function attackElectricAxe() {
  player.comboStep = player.comboTimer > 0 ? (player.comboStep % 3) + 1 : 1;
  player.comboTimer = config.axeComboReset;
  const profile = { ...getAxeComboProfile(player.comboStep) };
  if (player.comboStep === 3) {
    profile.damage *= 1 + getBuildStats().finisherBonus;
  } else {
    profile.damage *= getPerkDamageMultiplier();
  }
  player.fireCooldown = profile.cooldown;
  player.attackStartupTime = profile.startup;
  player.attackCommitTime = 0;
  player.attackCommitX = Math.cos(player.facing);
  player.attackCommitY = Math.sin(player.facing);
  player.attackCommitSpeed = 0;
  player.activeAxeStrike = null;
  player.pendingAxeStrike = {
    comboStep: player.comboStep,
    profile,
    facing: player.facing,
  };
  player.recoil = player.comboStep === 3 ? 0.84 : player.comboStep === 2 ? 0.52 : 0.44;
  player.flash = 0.07 + profile.startup * 0.45;
  player.slashFlash = player.comboStep === 3 ? 0.32 : player.comboStep === 2 ? 0.24 : 0.18;

  addSlashEffect(
    player.x + player.attackCommitX * 20,
    player.y + player.attackCommitY * 20,
    player.facing,
    player.comboStep,
  );
  playWeaponFire(weapons.axe.key);
  addImpact(
    player.x + player.attackCommitX * (player.comboStep === 1 ? 56 : player.comboStep === 2 ? 32 : 42),
    player.y + player.attackCommitY * (player.comboStep === 1 ? 56 : player.comboStep === 2 ? 32 : 42),
    profile.color,
    profile.hitMode === "dashPath" ? 20 : profile.impactSize * 0.78,
  );
  if (player.comboStep === 3) {
    addImpact(
      player.x + player.attackCommitX * 42,
      player.y + player.attackCommitY * 42,
      "#fff1bd",
      24,
    );
  }
  addShake(profile.shake * 0.42);
  statusLine.textContent =
    profile.hitMode === "line"
      ? "Electro Axe opener lined up. Confirm the lane."
      : profile.hitMode === "arc"
        ? "Electro Axe cleave winding up."
        : "Electro Axe finisher charging. Commit to the path.";
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
  player.hasteTime = 0;
  player.afterDashHasteTime = 0;
  player.hitReactionTime = 0;
  player.hitReactionX = 0;
  player.hitReactionY = 0;
  player.ghostTime = 0;
  player.failsafeReady = true;
  player.revivalPrimed = 0;
  player.decoyTime = 0;
  player.injectorMarks = 0;
  player.injectorMarkTime = 0;
  clearStatusEffects(player);
  abilityState.dash.inputHeld = false;
  abilityState.dash.holdTime = 0;
  abilityState.dash.activeTime = 0;
  abilityState.dash.invulnerabilityTime = 0;
  abilityState.dash.charges = 1;
  abilityState.dash.rechargeTimer = 0;
  abilityState.dash.upgraded = false;
  abilityState.javelin.cooldown = 0;
  abilityState.javelin.charging = false;
  abilityState.javelin.chargeTime = 0;
  abilityState.javelin.mode = "tap";
  abilityState.field.cooldown = 0;
  abilityState.field.charging = false;
  abilityState.field.chargeTime = 0;
  abilityState.field.mode = "tap";
  abilityState.field.moveBoostTime = 0;
  abilityState.grapple.cooldown = 0;
  abilityState.shield.cooldown = 0;
  abilityState.booster.cooldown = 0;
  abilityState.emp.cooldown = 0;
  abilityState.backstep.cooldown = 0;
  abilityState.chainLightning.cooldown = 0;
  abilityState.blink.cooldown = 0;
  abilityState.phaseDash.cooldown = 0;
  abilityState.phaseDash.time = 0;
  abilityState.pulseBurst.cooldown = 0;
  abilityState.railShot.cooldown = 0;
  abilityState.gravityWell.cooldown = 0;
  abilityState.phaseShift.cooldown = 0;
  abilityState.phaseShift.time = 0;
  abilityState.hologramDecoy.cooldown = 0;
  abilityState.speedSurge.cooldown = 0;
  abilityState.ultimate.cooldown = 0;
  abilityState.ultimate.phantomTime = 0;
  magneticFields.length = 0;
  if (!silent) {
    statusLine.textContent = "Player reset. Re-engage.";
  }
}
