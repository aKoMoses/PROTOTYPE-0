// Weapon attack functions (all 6 weapons)
import { config, abilityConfig, sandboxModes } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, abilityState, sandbox, bullets, input, orbitalDistorterFields } from "../state.js";
import { loadout } from "../state/app-state.js";
import { statusLine } from "../dom.js";
import { clamp, length, normalize, pointToSegmentDistance } from "../utils.js";
import { addImpact, addDamageText, addShake, addAfterimage, addSlashEffect, applyHitReaction, addBeamEffect } from "./effects.js";
import { resolveMapCollision, getMapLayout } from "../maps.js";
import { getBuildStats, getWeaponDamageMultiplier, getPulseMagazineSize, getContentItem, getWeaponCooldown, getStatusDuration } from "../build/loadout.js";
import { getAllBots, getPrimaryBot, isCombatLive, damageBot, spawnBullet, startPulseReload, finalizePulseReload, applyStatusEffect, getStatusState, damagePylonsAlongLine, getPlayerSpawn, clearStatusEffects, beginPlayerWeaponAttack, registerPlayerWeaponHit, completePlayerWeaponAttack, resetPlayerWeaponMomentum, consumePlayerEmpowerBonus } from "./combat.js";
import { mapState } from "../state.js";
import { playWeaponFire } from "../audio.js";
import { queuePhantomWeapon } from "./phantom.js";
import { startWeaponTelegraph } from "./casting.js";

export function collectTargetsAlongLine(owner, facing, range, width, targets = getAllBots(), singleTarget = true) {
  const lineStartX = owner.x + Math.cos(facing) * Math.max(10, owner.radius - 2);
  const lineStartY = owner.y + Math.sin(facing) * Math.max(10, owner.radius - 2);
  const lineEndX = owner.x + Math.cos(facing) * range;
  const lineEndY = owner.y + Math.sin(facing) * range;
  const hits = [];

  for (const target of targets) {
    if (!target?.alive) {
      continue;
    }

    const lineDistance = pointToSegmentDistance(target.x, target.y, lineStartX, lineStartY, lineEndX, lineEndY);
    const targetDistance = length(target.x - owner.x, target.y - owner.y);
    if (lineDistance > width + target.radius || targetDistance > range + target.radius + 12) {
      continue;
    }

    hits.push({ target, distance: targetDistance });
  }

  hits.sort((left, right) => left.distance - right.distance);
  return singleTarget ? hits.slice(0, 1) : hits;
}

export function attackPulseRifle() {
  if (player.reloadTime > 0) {
    return;
  }

  if (player.ammo <= 0) {
    startPulseReload(player);
    return;
  }

  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.stock;
  const attackId = beginPlayerWeaponAttack(1);
  player.fireCooldown = getWeaponCooldown(weapons.pulse.key);
  startWeaponTelegraph(player, "pulse", 0.06);
  spawnBullet(player, input.mouseX, input.mouseY, bullets, activeSkin.tint, config.bulletSpeed, config.pulseDamage * getWeaponDamageMultiplier(), {
    radius: 4,
    source: "pulse-rifle",
    trailColor: "#c6f5ff",
    attackId,
  });
  queuePhantomWeapon({ weaponKey: weapons.pulse.key });
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
  const attackId = beginPlayerWeaponAttack(6);
  player.fireCooldown = getWeaponCooldown(weapons.shotgun.key);
  startWeaponTelegraph(player, "shotgun", 0.08);
  const baseAngle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);

  for (let pellet = 0; pellet < 6; pellet += 1) {
    const spread = -0.18 + pellet * 0.072;
    const angle = baseAngle + spread;
    const targetX = player.x + Math.cos(angle) * 100;
    const targetY = player.y + Math.sin(angle) * 100;
    spawnBullet(player, targetX, targetY, bullets, activeSkin.tint, config.bulletSpeed * 0.85, 9 * getWeaponDamageMultiplier(), {
      radius: 4,
      source: "shotgun-pellet",
      trailColor: "#ffd0aa",
      attackId,
    });
  }

  queuePhantomWeapon({ weaponKey: weapons.shotgun.key });
  playWeaponFire(weapons.shotgun.key);

  addImpact(player.x + Math.cos(baseAngle) * 26, player.y + Math.sin(baseAngle) * 26, "#ffb078", 18);
  addShake(5.6);
  player.recoil = 1.4;
  statusLine.textContent = "Scrap Shotgun cracked out a close-range burst.";
}

export function attackRailSniper(chargeRatio = 0) {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.wastelux;
  const charge = clamp(chargeRatio, 0, 1);
  const damageMultiplier = getWeaponDamageMultiplier(getPrimaryBot());
  const attackId = beginPlayerWeaponAttack(1);
  const minDamage = config.sniperMinDamage * damageMultiplier;
  const maxDamage = config.sniperMaxDamage * damageMultiplier;
  const projectileSpeed = config.sniperProjectileSpeed + (config.sniperChargedProjectileSpeed - config.sniperProjectileSpeed) * charge;

  player.fireCooldown = getWeaponCooldown(weapons.sniper.key) * (1 + (1 - charge) * 0.04);
  startWeaponTelegraph(player, "sniper", 0.12);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    projectileSpeed,
    minDamage,
    {
      radius: 6,
      life: 0.72,
      piercing: false,
      trailColor: charge >= 0.72 ? "#fff0b3" : "#ffe7a8",
      source: "rail-sniper",
      chargeRatio: charge,
      minDamage,
      maxDamage,
      travelBonusRange: config.sniperTravelBonusRange,
      attackId,
      effect: {
        kind: "rail",
        bonusSlow: config.sniperSlow,
        bonusSlowDuration: config.sniperSlowDuration,
        maxSlow: 0.32,
        maxSlowDuration: 0.78,
        snareDuration: config.sniperChargedSnareDuration,
        snareMagnitude: config.sniperChargedSnare,
      },
    },
  );
  queuePhantomWeapon({ weaponKey: weapons.sniper.key, chargeRatio: charge });
  playWeaponFire(weapons.sniper.key);
  addBeamEffect(
    player.x + direction.x * 24,
    player.y + direction.y * 24,
    player.x + direction.x * (80 + charge * 40),
    player.y + direction.y * (80 + charge * 40),
    charge >= 0.72 ? "#fff1bd" : "#ffe4a4",
    3 + charge * 3,
    0.08 + charge * 0.06,
  );
  addImpact(player.x + direction.x * 30, player.y + direction.y * 30, charge >= 0.72 ? "#fff0b3" : "#ffe4a4", 18 + charge * 10);
  addShake(6.2 + charge * 3.2);
  player.recoil = 1.1 + charge * 0.6;
  player.weaponChargeFlash = 0.14 + charge * 0.12;
  statusLine.textContent = charge >= 0.72
    ? "Rail Sniper discharged a charged puncture shot. Respect the lane."
    : "Rail Sniper snapped a quick precision round.";
}

export function attackVoltStaff() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.shockglass;
  const attackId = beginPlayerWeaponAttack(1);
  player.fireCooldown = getWeaponCooldown(weapons.staff.key);
  startWeaponTelegraph(player, "staff", 0.1);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    980,
    12 * getWeaponDamageMultiplier(getPrimaryBot()),
    {
      radius: 5,
      life: 0.9,
      trailColor: "#b6ffd4",
      source: "volt-staff",
      attackId,
      effect: { kind: "staff", heal: 8 },
    },
  );
  queuePhantomWeapon({ weaponKey: weapons.staff.key });
  playWeaponFire(weapons.staff.key);
  player.shield = Math.max(player.shield, 6);
  player.shieldTime = Math.max(player.shieldTime, 0.8);
  addImpact(player.x + Math.cos(player.facing) * 24, player.y + Math.sin(player.facing) * 24, "#9cffc4", 16);
  statusLine.textContent = "Volt Staff arc fired. Sustain the exchange.";
}

export function attackBioInjector() {
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.voidchrome;
  const attackId = beginPlayerWeaponAttack(1);
  player.fireCooldown = getWeaponCooldown(weapons.injector.key);
  startWeaponTelegraph(player, "injector", 0.1);
  spawnBullet(
    player,
    input.mouseX,
    input.mouseY,
    bullets,
    activeSkin.tint,
    1260,
    9 * getWeaponDamageMultiplier(getPrimaryBot()),
    {
      radius: 4,
      life: 0.84,
      trailColor: "#f0b2ff",
      source: "injector",
      attackId,
      effect: { kind: "injector", markDuration: 4.2, markMax: 3, healOnConsume: 12 },
    },
  );
  queuePhantomWeapon({ weaponKey: weapons.injector.key });
  playWeaponFire(weapons.injector.key);
  addImpact(player.x + Math.cos(player.facing) * 22, player.y + Math.sin(player.facing) * 22, "#da90ff", 14);
  statusLine.textContent = "Bio-Injector tagged the lane with corrosive pressure.";
}

export function attackChargeLance(altFire = false) {
  const attackId = beginPlayerWeaponAttack(1);
  const range = altFire ? config.lanceAltRange : config.lancePrimaryRange;
  const width = altFire ? config.lanceAltWidth : config.lancePrimaryWidth;
  const damage = (altFire ? config.lanceAltDamage : config.lancePrimaryDamage) * getWeaponDamageMultiplier();
  const endX = player.x + Math.cos(player.facing) * range;
  const endY = player.y + Math.sin(player.facing) * range;
  const hits = collectTargetsAlongLine(player, player.facing, range, width, getAllBots(), true);

  player.fireCooldown = altFire ? config.lanceAltCooldown : config.lancePrimaryCooldown;
  startWeaponTelegraph(player, "lance", 0.12);
  player.recoil = altFire ? 1.1 : 0.78;
  player.flash = Math.max(player.flash, altFire ? 0.14 : 0.1);
  const pylonHit = damagePylonsAlongLine(player.x, player.y, endX, endY, damage * 0.3, "player");
  addBeamEffect(
    player.x,
    player.y,
    endX,
    endY,
    altFire ? "#ffe8a4" : "#ffefc2",
    altFire ? 7 : 4,
    0.14,
  );
  queuePhantomWeapon({ weaponKey: weapons.lance.key, altFire });
  playWeaponFire(weapons.lance.key);
  addImpact(player.x + Math.cos(player.facing) * 28, player.y + Math.sin(player.facing) * 28, "#ffe2a3", altFire ? 22 : 16);

  if (hits.length === 0) {
    completePlayerWeaponAttack(attackId, pylonHit);
    addShake(altFire ? 5.8 : 3.6);
    statusLine.textContent = altFire
      ? "Charge Lance drive missed. The recovery is real if you whiff the burst."
      : "Charge Lance thrust extended the lane without finding a target.";
    return;
  }

  let empowerBonus = null;
  for (const hit of hits) {
    registerPlayerWeaponHit(attackId);
    if (empowerBonus == null) {
      empowerBonus = consumePlayerEmpowerBonus();
    }
    damageBot(hit.target, damage + empowerBonus, altFire ? "#ffe3a0" : "#fff1c9", hit.target.x, hit.target.y, 0);
    empowerBonus = 0;
    applyStatusEffect(
      hit.target,
      altFire ? "stun" : "slow",
      getStatusDuration(altFire ? config.lanceAltShockDuration : config.lancePrimarySlowDuration),
      altFire ? 1 : config.lancePrimarySlow,
    );
    addImpact(hit.target.x, hit.target.y, altFire ? "#fff1bf" : "#fff6dd", altFire ? 28 : 20);
  }

  completePlayerWeaponAttack(attackId, true);

  addShake(altFire ? 8.2 : 5.4);
  statusLine.textContent = altFire
    ? "Charge Lance drive connected and jolted the target."
    : "Charge Lance punctured the lane and slowed the target.";
}

export function fireHeavyCannon(altFire = false) {
  const charge = clamp(typeof altFire === "number" ? altFire : altFire ? 1 : 0, 0, 1);
  const charged = charge >= 0.55;
  const activeSkin = getContentItem("weaponSkins", loadout.weaponSkin) ?? content.weaponSkins.stock;
  const attackId = beginPlayerWeaponAttack(1);
  const direction = normalize(input.mouseX - player.x, input.mouseY - player.y);
  const rawDistance = length(input.mouseX - player.x, input.mouseY - player.y);
  const clampedDistance = Math.min(config.cannonMaxRange, rawDistance);
  const detonateX = player.x + direction.x * clampedDistance;
  const detonateY = player.y + direction.y * clampedDistance;
  player.fireCooldown = charged ? config.cannonAltCooldown : config.cannonPrimaryCooldown;
  startWeaponTelegraph(player, "cannon", 0.14);
  player.recoil = charged ? 1.08 : 1.28;
  player.flash = Math.max(player.flash, charged ? 0.14 : 0.1);
  spawnBullet(
    player,
    detonateX,
    detonateY,
    bullets,
    charged ? "#ffdba6" : activeSkin.tint,
    charged ? config.cannonAltSpeed : config.cannonPrimarySpeed,
    (charged ? config.cannonAltDamage : config.cannonPrimaryDamage) * getWeaponDamageMultiplier(getPrimaryBot()),
    {
      radius: charged ? config.cannonAltRadius : config.cannonPrimaryRadius,
      life: 1.08,
      source: charged ? "cannon-charged" : "cannon-shell",
      trailColor: charged ? "#fff0cc" : "#ffe5cc",
      detonateX,
      detonateY,
      explodeOnDestination: true,
      effect: {
        kind: "cannon",
        splashRadius: charged ? Math.max(110, config.cannonSplashRadius * 1.3) : config.cannonSplashRadius,
        splashDamage: (charged ? config.cannonSplashDamage * 1.35 : config.cannonSplashDamage) * getWeaponDamageMultiplier(getPrimaryBot()),
        statusType: charged ? "burnslow" : "burn",
        statusDuration: charged ? config.cannonFreezeDuration : config.cannonBurnDuration,
        statusMagnitude: charged ? config.cannonFreezeMagnitude : config.cannonBurnMagnitude,
        directDamageScale: charged ? 0.82 : 0.66,
        impactColor: charged ? "#fff0cb" : "#fff0d8",
        pushMin: charged ? config.cannonChargedPushMin : 0,
        pushMax: charged ? config.cannonChargedPushMax : 0,
        detonateOnDestination: true,
      },
      attackId,
    },
  );
  queuePhantomWeapon({ weaponKey: weapons.cannon.key, charged });
  playWeaponFire(weapons.cannon.key);
  addImpact(player.x + Math.cos(player.facing) * 26, player.y + Math.sin(player.facing) * 26, charged ? "#ffe4b0" : "#ffcf9f", charged ? 22 : 24);
  addBeamEffect(player.x, player.y, detonateX, detonateY, charged ? "#fff0cb" : "#ffd7bb", charged ? 4.2 : 3.2, 0.07);
  addShake(charged ? 8.8 : 7.4);
  statusLine.textContent = charged
    ? "Heavy Cannon overload fired. Burn the zone and hold the space."
    : "Heavy Cannon shell fired to the marked impact point.";
}

export function getAxeComboProfile(step) {
  if (step === 1) {
    return {
      hitMode: "line",
      cooldown: 0.56,
      range: 286,
      width: 16,
      arc: 0.16,
      damage: 54,
      cleave: false,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#74f6ff",
      impactColor: "#ddffff",
      startup: 0.12,
      shake: 11.2,
      impactSize: 42,
      label: "Electro Axe opener landed clean and set up the follow-up.",
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
      damage: 66,
      cleave: true,
      commitSpeed: 0,
      commitDuration: 0,
      stun: 0,
      color: "#47cfff",
      impactColor: "#d4f6ff",
      startup: 0.16,
      shake: 15.8,
      impactSize: 50,
      label: "Electro Axe cleave connected and kept the pressure close.",
      miss: "Heavy cleave missed. The recovery is real, so swing with intent.",
    };
  }

  return {
    hitMode: "dashPath",
    cooldown: 0.88,
    range: 172,
    width: 28,
    arc: 0.44,
    damage: 80,
    cleave: false,
    commitSpeed: 1480,
    commitDuration: 0.18,
    stun: 0.48,
    color: "#ffd77e",
    impactColor: "#fff1bd",
    startup: 0.12,
    shake: 20.4,
    impactSize: 58,
    label: "Dash finisher caught, stopped on the target, and stunned it.",
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
  const pylonHit = damagePylonsAlongLine(startX, startY, endX, endY, profile.damage * 0.35, "player");
  if (pylonHit) {
    player.activeAxeStrike.worldHit = true;
  }

  let empowerBonus = null;
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
    registerPlayerWeaponHit(player.activeAxeStrike.attackId);
    if (empowerBonus == null) {
      empowerBonus = consumePlayerEmpowerBonus();
    }
    damageBot(
      bot,
      profile.damage + empowerBonus,
      profile.color,
      bot.x - player.attackCommitX * 6,
      bot.y - player.attackCommitY * 6,
      0,
    );
    empowerBonus = 0;
    applyStatusEffect(bot, "stun", getStatusDuration(profile.stun), 1);
    addImpact(bot.x, bot.y, profile.impactColor, 42);
    addImpact(bot.x, bot.y, "#fff7dc", 24);

    const stopDistance = Math.max(player.radius + bot.radius + 6, 44);
    player.x = bot.x - player.attackCommitX * stopDistance;
    player.y = bot.y - player.attackCommitY * stopDistance;
    resolveMapCollision(player);
    player.attackCommitTime = 0;
    player.velocityX = 0;
    player.velocityY = 0;

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
      worldHit: false,
      attackId: queuedStrike.attackId,
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
  const pylonHit = damagePylonsAlongLine(strikeStartX, strikeStartY, strikeEndX, strikeEndY, profile.damage * 0.45, "player");

  const hits = collectAxeTargets(profile, queuedStrike.facing);

  if (hits.length === 0) {
    completePlayerWeaponAttack(queuedStrike.attackId, pylonHit);
    player.lastMissTime = 0.78;
    addShake(profile.hitMode === "arc" ? 3.2 : 2.4);
    statusLine.textContent = profile.miss;
    return;
  }

  let empowerBonus = null;
  for (const hit of hits) {
    registerPlayerWeaponHit(queuedStrike.attackId);
    if (empowerBonus == null) {
      empowerBonus = consumePlayerEmpowerBonus();
    }
    damageBot(
      hit.bot,
      profile.damage + empowerBonus,
      profile.color,
      hit.bot.x - player.attackCommitX * 8,
      hit.bot.y - player.attackCommitY * 8,
      0,
    );
    empowerBonus = 0;

    addImpact(hit.bot.x, hit.bot.y, profile.impactColor, profile.hitMode === "arc" ? 36 : 28);
    addImpact(hit.bot.x, hit.bot.y, "#fff7dc", profile.hitMode === "arc" ? 20 : 16);

    if (hit.bot.kind === "hunter") {
      hit.bot.dodgeCooldown = Math.max(hit.bot.dodgeCooldown, 0.45);
      hit.bot.postAttackMoveTime = Math.max(hit.bot.postAttackMoveTime, 0.18);
    }
  }

  completePlayerWeaponAttack(queuedStrike.attackId, true);
  addShake(profile.shake);
  statusLine.textContent = profile.label;
}

export function attackElectricAxe() {
  const attackId = beginPlayerWeaponAttack(1);
  player.comboStep = player.comboTimer > 0 ? (player.comboStep % 3) + 1 : 1;
  player.comboTimer = config.axeComboReset;
  const profile = { ...getAxeComboProfile(player.comboStep) };
  if (player.comboStep === 3) {
    profile.damage *= (1 + getBuildStats().finisherBonus) * getWeaponDamageMultiplier();
  } else {
    profile.damage *= getWeaponDamageMultiplier();
  }
  player.fireCooldown = profile.cooldown;
  startWeaponTelegraph(player, "axe", 0.16);
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
    attackId,
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
  queuePhantomWeapon({ weaponKey: weapons.axe.key, comboStep: player.comboStep });
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
  player.defenseFailsafeReady = true;
  player.lastStandTime = 0;
  player.lastStandDecayPerSecond = 0;
  player.precisionMomentumStacks = 0;
  player.precisionMomentumFlash = 0;
  player.revivalPrimed = 0;
  player.decoyTime = 0;
  player.injectorMarks = 0;
  player.injectorMarkTime = 0;
  resetPlayerWeaponMomentum();
  clearStatusEffects(player);
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
  abilityState.emPulseEmitter.cooldown = 0;
  abilityState.jetBackThruster.cooldown = 0;
  abilityState.chainLightning.cooldown = 0;
  abilityState.blink.cooldown = 0;
  abilityState.phaseDash.cooldown = 0;
  abilityState.phaseDash.time = 0;
  abilityState.swarmMissileRack.cooldown = 0;
  abilityState.railShot.cooldown = 0;
  abilityState.voidCoreSingularity.cooldown = 0;
  abilityState.phaseShift.cooldown = 0;
  abilityState.phaseShift.time = 0;
  abilityState.hologramDecoy.cooldown = 0;
  abilityState.overdriveServos.cooldown = 0;
  abilityState.ultimate.cooldown = 0;
  abilityState.ultimate.phantomTime = 0;
  orbitalDistorterFields.length = 0;
  if (!silent) {
    statusLine.textContent = "Player reset. Re-engage.";
  }
}
