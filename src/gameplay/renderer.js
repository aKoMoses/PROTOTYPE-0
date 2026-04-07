// Canvas rendering (all draw functions)
import { arena, config } from "../config.js";
import { content, weapons } from "../content.js";
import { player, playerClone, enemy, abilityState, loadout, sandbox, input,
  bullets, enemyBullets, impacts, tracers, combatTexts, afterimages, slashEffects,
  shockJavelins, enemyShockJavelins, explosions, magneticFields, absorbBursts,
  supportZones, beamEffects, mapState, globals } from "../state.js";
import { canvas, ctx } from "../dom.js";
import { clamp, length, normalize } from "../utils.js";
import { getMapLayout, canSeeTarget } from "../maps.js";
import { getBuildStats } from "../build/loadout.js";
import { getAllBots, getStatusState } from "./combat.js";
import { mapChoices } from "../maps.js";
import { statusVisuals } from "../content.js";

const cameraState = {
  x: 0,
  y: 0,
  width: 1600,
  height: 900,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  scrollable: false,
  baseWidth: 1600,
  baseHeight: 900,
  lookX: 0,
  lookY: 0,
  layoutKey: null,
  lastUpdateAt: 0,
};

export function resize() {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function syncCameraViewport(layout, viewportWidth, viewportHeight) {
  const scrollable = Boolean(layout.scrollable && (arena.width > cameraState.baseWidth || arena.height > cameraState.baseHeight));

  if (!scrollable) {
    const scale = Math.min(viewportWidth / arena.width, viewportHeight / arena.height);
    cameraState.width = arena.width;
    cameraState.height = arena.height;
    cameraState.scale = scale;
    cameraState.offsetX = (viewportWidth - arena.width * scale) * 0.5;
    cameraState.offsetY = (viewportHeight - arena.height * scale) * 0.5;
    cameraState.scrollable = false;
    return;
  }

  const scale = Math.min(viewportWidth / cameraState.baseWidth, viewportHeight / cameraState.baseHeight);
  const viewWidth = viewportWidth / scale;
  const viewHeight = viewportHeight / scale;
  cameraState.width = viewWidth;
  cameraState.height = viewHeight;
  cameraState.scale = scale;
  cameraState.offsetX = (viewportWidth - viewWidth * scale) * 0.5;
  cameraState.offsetY = (viewportHeight - viewHeight * scale) * 0.5;
  cameraState.scrollable = true;
}

function getCameraLookOffset(lookX = cameraState.lookX, lookY = cameraState.lookY) {
  const lookMagnitude = clamp(
    (Math.hypot(lookX, lookY) - config.cameraLookDeadzone) / (1 - config.cameraLookDeadzone),
    0,
    1,
  );

  return {
    x: lookX * config.cameraLookAheadX * lookMagnitude,
    y: lookY * config.cameraLookAheadY * lookMagnitude,
  };
}

function getCameraTargetPosition(lookOffsetX, lookOffsetY) {
  const safeOffsetX = Math.min(config.cameraLookAheadX, cameraState.width * config.cameraPlayerSafeRatioX);
  const safeOffsetY = Math.min(config.cameraLookAheadY, cameraState.height * config.cameraPlayerSafeRatioY);

  return {
    x: clamp(
      player.x - cameraState.width * 0.5 + clamp(lookOffsetX, -safeOffsetX, safeOffsetX),
      0,
      Math.max(0, arena.width - cameraState.width),
    ),
    y: clamp(
      player.y - cameraState.height * 0.5 + clamp(lookOffsetY, -safeOffsetY, safeOffsetY),
      0,
      Math.max(0, arena.height - cameraState.height),
    ),
  };
}

export function getCameraState(viewportWidth = canvas.clientWidth || window.innerWidth, viewportHeight = canvas.clientHeight || window.innerHeight) {
  const layout = getMapLayout();
  syncCameraViewport(layout, viewportWidth, viewportHeight);

  if (!cameraState.scrollable) {
    const scale = Math.min(viewportWidth / arena.width, viewportHeight / arena.height);
    cameraState.x = 0;
    cameraState.y = 0;
    cameraState.width = arena.width;
    cameraState.height = arena.height;
    cameraState.scale = scale;
    cameraState.offsetX = (viewportWidth - arena.width * scale) * 0.5;
    cameraState.offsetY = (viewportHeight - arena.height * scale) * 0.5;
    cameraState.scrollable = false;
    cameraState.lookX = 0;
    cameraState.lookY = 0;
    cameraState.layoutKey = layout.key;
    cameraState.lastUpdateAt = performance.now();
    return cameraState;
  }

  if (cameraState.layoutKey !== layout.key || !Number.isFinite(cameraState.x) || !Number.isFinite(cameraState.y)) {
    cameraState.lookX = input.lookX ?? 0;
    cameraState.lookY = input.lookY ?? 0;
    const initialOffset = getCameraLookOffset(cameraState.lookX, cameraState.lookY);
    const initialTarget = getCameraTargetPosition(initialOffset.x, initialOffset.y);
    cameraState.x = initialTarget.x;
    cameraState.y = initialTarget.y;
    cameraState.layoutKey = layout.key;
    cameraState.lastUpdateAt = performance.now();
  }

  return cameraState;
}

export function updateCameraState(viewportWidth = canvas.clientWidth || window.innerWidth, viewportHeight = canvas.clientHeight || window.innerHeight) {
  const layout = getMapLayout();
  const previousLayoutKey = cameraState.layoutKey;
  const camera = getCameraState(viewportWidth, viewportHeight);

  if (!camera.scrollable) {
    return camera;
  }

  const now = performance.now();
  const deltaSeconds = clamp(
    cameraState.lastUpdateAt > 0 ? (now - cameraState.lastUpdateAt) / 1000 : 1 / 60,
    1 / 240,
    0.05,
  );
  cameraState.lastUpdateAt = now;

  if (previousLayoutKey !== layout.key) {
    return cameraState;
  }

  const inputAlpha = 1 - Math.exp(-config.cameraLookInputSmoothing * deltaSeconds);
  cameraState.lookX += ((input.lookX ?? 0) - cameraState.lookX) * inputAlpha;
  cameraState.lookY += ((input.lookY ?? 0) - cameraState.lookY) * inputAlpha;

  const lookOffset = getCameraLookOffset();
  const target = getCameraTargetPosition(lookOffset.x, lookOffset.y);
  const catchupFactor = clamp(
    Math.hypot(target.x - cameraState.x, target.y - cameraState.y) / Math.max(1, config.cameraCatchupDistance),
    0,
    1,
  );
  const followRate = config.cameraLookSmoothing + config.cameraCatchupBoost * catchupFactor;
  const followAlpha = 1 - Math.exp(-followRate * deltaSeconds);
  cameraState.x += (target.x - cameraState.x) * followAlpha;
  cameraState.y += (target.y - cameraState.y) * followAlpha;

  return cameraState;
}

export function drawStatusReadout(target) {
  const effects = (target.statusEffects ?? []).filter((effect) => statusVisuals[effect.type]);
  const markCount = target.injectorMarks ?? 0;

  if (effects.length === 0 && markCount <= 0) {
    return;
  }

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.font = "bold 11px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  effects.forEach((effect, index) => {
    const visual = statusVisuals[effect.type];
    const pulse = 1 + Math.sin(performance.now() * 0.02 + index * 0.8) * 0.08;
    const y = -target.radius - 26 - index * 16;
    ctx.lineWidth = effect.type === "stun" ? 4 : 3;
    ctx.strokeStyle = "rgba(6, 12, 18, 0.8)";
    ctx.fillStyle = visual.text;
    ctx.strokeText(visual.label, 0, y);
    ctx.fillText(visual.label, 0, y);

    if (visual.wave === "spark") {
      for (let spark = 0; spark < 3; spark += 1) {
        const angle = performance.now() * 0.01 + spark * ((Math.PI * 2) / 3);
        const sparkX = Math.cos(angle) * (target.radius + 13);
        const sparkY = -target.radius - 14 + Math.sin(angle) * 5;
        ctx.fillStyle = visual.stroke;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2.6 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (visual.wave === "ring") {
      ctx.strokeStyle = visual.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (target.radius + 8) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  if (markCount > 0) {
    const y = -target.radius - 26 - effects.length * 16;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(7, 12, 18, 0.8)";
    ctx.fillStyle = "#f9d8ff";
    ctx.strokeText(`MARK ${markCount}`, 0, y);
    ctx.fillText(`MARK ${markCount}`, 0, y);
  }

  ctx.restore();
}

export function getHitReactionOffset(entity) {
  const ratio = clamp((entity.hitReactionTime ?? 0) / 0.18, 0, 1);
  return {
    x: (entity.hitReactionX ?? 0) * ratio,
    y: (entity.hitReactionY ?? 0) * ratio,
  };
}

export function drawOverheadHealthBar(target, accent = "#77d8ff") {
  if (!target?.alive) {
    return;
  }

  const maxHp = target === player ? getBuildStats().maxHp : target.maxHp;
  const shield = target.shield ?? 0;
  const width = target === player ? 58 : 52;
  const x = target.x - width * 0.5;
  const y = target.y - target.radius - 22;
  const hpRatio = clamp(Math.max(0, target.hp) / Math.max(1, maxHp), 0, 1);
  const shieldRatio = clamp(shield / Math.max(1, maxHp), 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(6, 12, 18, 0.82)";
  ctx.fillRect(x, y, width, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, width * hpRatio, 6);
  if (shieldRatio > 0) {
    ctx.fillStyle = "rgba(189, 231, 255, 0.92)";
    ctx.fillRect(x + width * hpRatio, y, Math.min(width * shieldRatio, width - width * hpRatio), 6);
  }
  ctx.strokeStyle = "rgba(245, 251, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, 6);
  ctx.restore();
}

export function drawProjectileSprite(projectile, hostile = false) {
  const angle = Math.atan2(projectile.vy, projectile.vx);
  const source = projectile.source ?? "weapon";
  const color = projectile.color ?? (hostile ? "#ff8a77" : "#77d8ff");

  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(angle);
  ctx.shadowBlur = 16;
  ctx.shadowColor = projectile.trailColor ?? color;

  if (source.includes("rail")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -3.5);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(255, 241, 198, 0.88)" : "rgba(255, 248, 212, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (source.includes("injector")) {
    ctx.fillStyle = color;
    ctx.fillRect(-12, -2.5, 22, 5);
    ctx.fillStyle = hostile ? "#ffd4f4" : "#ffe9ff";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, -3.5);
    ctx.lineTo(18, 3.5);
    ctx.closePath();
    ctx.fill();
  } else if (source.includes("staff")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(224, 255, 235, 0.7)" : "rgba(236, 255, 242, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (source.includes("cannon")) {
    ctx.fillStyle = color;
    traceRoundedRect(source.includes("charged") ? -12 : -10, source.includes("charged") ? -8 : -7, source.includes("charged") ? 24 : 20, source.includes("charged") ? 16 : 14, 4);
    ctx.fill();
    ctx.fillStyle = hostile ? "rgba(255, 245, 224, 0.8)" : "rgba(240, 252, 255, 0.82)";
    ctx.fillRect(4, source.includes("charged") ? -4 : -3, source.includes("charged") ? 14 : 12, source.includes("charged") ? 8 : 6);
    ctx.strokeStyle = hostile ? "rgba(255, 225, 198, 0.7)" : "rgba(225, 247, 255, 0.78)";
    ctx.lineWidth = 2;
    ctx.strokeRect(source.includes("charged") ? -12 : -10, source.includes("charged") ? -8 : -7, source.includes("charged") ? 24 : 20, source.includes("charged") ? 16 : 14);
    if (source.includes("charged")) {
      ctx.strokeStyle = hostile ? "rgba(255, 244, 200, 0.74)" : "rgba(255, 245, 208, 0.82)";
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(8, 0);
      ctx.lineTo(-4, 8);
      ctx.stroke();
    }
  } else if (source.includes("pulse-burst")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(2, -5);
    ctx.lineTo(-10, -2.5);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 2.5);
    ctx.lineTo(2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(255, 240, 220, 0.72)" : "rgba(227, 250, 255, 0.78)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = hostile ? "rgba(255, 184, 142, 0.5)" : "rgba(140, 232, 255, 0.52)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(4, 0);
    ctx.lineTo(-4, 7);
    ctx.stroke();
  } else if (source.includes("shotgun")) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hostile ? "rgba(255, 223, 213, 0.5)" : "rgba(190, 244, 255, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  if ((projectile.fieldSlowRatio ?? 0) > 0.02) {
    const drag = clamp(projectile.fieldSlowRatio, 0, 1);
    ctx.strokeStyle = hostile ? `rgba(255, 225, 196, ${0.24 + drag * 0.34})` : `rgba(206, 242, 255, ${0.24 + drag * 0.34})`;
    ctx.lineWidth = 1.4 + drag * 1.6;
    ctx.beginPath();
    ctx.arc(-4, 0, projectile.radius + 5 + drag * 5, -1.3, 1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-9, 0, projectile.radius + 8 + drag * 7, -0.9, 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

export function traceRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawActorFrame(actor, palette, options = {}) {
  const speed = length(actor.velocityX ?? 0, actor.velocityY ?? 0);
  const gait = Math.sin(performance.now() * 0.018 + actor.x * 0.01 + actor.y * 0.01) * Math.min(4.5, speed * 0.015);
  const bodyColor = options.bodyColor ?? palette.body;
  const accentColor = options.accentColor ?? palette.accent;
  const detailColor = options.detailColor ?? palette.detail;
  const scale = options.scale ?? 1;
  const headRadius = 9.5 * scale;
  const torsoWidth = 28 * scale;
  const torsoHeight = 34 * scale;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 17 * scale, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = detailColor;
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6 * scale, 10 * scale);
  ctx.lineTo(-8 * scale, 24 * scale + gait);
  ctx.moveTo(6 * scale, 10 * scale);
  ctx.lineTo(8 * scale, 24 * scale - gait);
  ctx.stroke();

  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(-11 * scale, -2 * scale);
  ctx.lineTo(-20 * scale, 10 * scale - gait * 0.5);
  ctx.moveTo(11 * scale, -2 * scale);
  ctx.lineTo(20 * scale, 10 * scale + gait * 0.5);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  traceRoundedRect(-torsoWidth * 0.5, -8 * scale, torsoWidth, torsoHeight, 10 * scale);
  ctx.fill();
  ctx.fillStyle = detailColor;
  traceRoundedRect(-torsoWidth * 0.34, -2 * scale, torsoWidth * 0.68, torsoHeight * 0.64, 8 * scale);
  ctx.fill();
  ctx.fillStyle = accentColor;
  traceRoundedRect(-torsoWidth * 0.14, -5 * scale, torsoWidth * 0.28, torsoHeight * 0.82, 5 * scale);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, -14 * scale, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = detailColor;
  traceRoundedRect(-11 * scale, -20 * scale, 22 * scale, 10 * scale, 5 * scale);
  ctx.fill();
  ctx.fillStyle = accentColor;
  traceRoundedRect(-9 * scale, -18 * scale, 18 * scale, 4 * scale, 2 * scale);
  ctx.fill();

  if (palette.variant === "warhound" || palette.variant === "ironmaw") {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15 * scale, -10 * scale);
    ctx.lineTo(-20 * scale, -18 * scale);
    ctx.moveTo(15 * scale, -10 * scale);
    ctx.lineTo(20 * scale, -18 * scale);
    ctx.stroke();
  } else if (palette.variant === "ghostwire") {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16 * scale, -6 * scale);
    ctx.lineTo(-26 * scale, -16 * scale);
    ctx.moveTo(-10 * scale, 2 * scale);
    ctx.lineTo(-24 * scale, 8 * scale);
    ctx.stroke();
  } else if (palette.variant === "dunepriest") {
    ctx.fillStyle = `${accentColor}66`;
    ctx.beginPath();
    ctx.moveTo(0, -28 * scale);
    ctx.lineTo(-10 * scale, -14 * scale);
    ctx.lineTo(10 * scale, -14 * scale);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawEquippedWeapon(weaponKey, detailColor, tint, glow, actionFlash = 0, chargeRatio = 0) {
  const flashOn = actionFlash > 0;
  if (weaponKey === weapons.axe.key) {
    ctx.fillStyle = detailColor;
    ctx.fillRect(-4, -4, 34, 8);
    ctx.shadowBlur = 28;
    ctx.shadowColor = flashOn ? glow : tint;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(20, -26);
    ctx.lineTo(42, -18);
    ctx.lineTo(38, -4);
    ctx.lineTo(22, -9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 26);
    ctx.lineTo(42, 18);
    ctx.lineTo(38, 4);
    ctx.lineTo(22, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `${glow}88`;
    ctx.fillRect(18, -3, 18, 6);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(212, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -22);
    ctx.lineTo(38, -15);
    ctx.moveTo(20, 22);
    ctx.lineTo(38, 15);
    ctx.moveTo(28, -4);
    ctx.lineTo(43, -1);
    ctx.moveTo(28, 4);
    ctx.lineTo(43, 1);
    ctx.stroke();
    return;
  }

  if (weaponKey === weapons.sniper.key) {
    const chargeGlow = clamp(chargeRatio, 0, 1);
    const jitter = Math.sin(performance.now() * 0.08) * chargeGlow * 1.5;
    ctx.save();
    ctx.translate(0, jitter);
    ctx.fillStyle = detailColor;
    ctx.fillRect(-4, -4, 36, 8);
    ctx.fillStyle = tint;
    ctx.fillRect(18, -5, 34, 10);
    ctx.shadowBlur = 18 + chargeGlow * 18;
    ctx.shadowColor = glow;
    ctx.fillStyle = glow;
    ctx.fillRect(48, -2, 12, 4);
    ctx.fillRect(14, -9, 12, 4);
    ctx.fillStyle = `rgba(255, 226, 134, ${0.18 + chargeGlow * 0.46})`;
    ctx.fillRect(20, -3, 28, 6);
    ctx.strokeStyle = "rgba(255, 245, 210, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();
    if (chargeGlow > 0.08) {
      ctx.strokeStyle = `rgba(255, 240, 180, ${0.22 + chargeGlow * 0.54})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, -9);
      ctx.lineTo(22 + chargeGlow * 8, -15);
      ctx.lineTo(28 + chargeGlow * 10, -7);
      ctx.moveTo(22, 9);
      ctx.lineTo(30 + chargeGlow * 10, 14);
      ctx.lineTo(36 + chargeGlow * 10, 7);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (weaponKey === weapons.staff.key) {
    ctx.fillStyle = detailColor;
    ctx.fillRect(-3, -4, 44, 8);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(54, 0);
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(54, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 255, 232, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(54, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (weaponKey === weapons.injector.key) {
    ctx.fillStyle = detailColor;
    ctx.fillRect(-4, -4, 30, 8);
    ctx.fillStyle = tint;
    ctx.fillRect(18, -7, 20, 14);
    ctx.fillStyle = glow;
    ctx.fillRect(34, -3, 18, 6);
    ctx.fillRect(12, -10, 8, 20);
    return;
  }

  if (weaponKey === weapons.shotgun.key) {
    ctx.fillStyle = detailColor;
    ctx.fillRect(-4, -5, 24, 10);
    ctx.fillStyle = tint;
    ctx.fillRect(20, -4, 18, 8);
    ctx.fillStyle = glow;
    ctx.fillRect(34, -2, 6, 4);
    return;
  }

  if (weaponKey === weapons.lance.key) {
    ctx.fillStyle = detailColor;
    ctx.fillRect(-4, -4, 26, 8);
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(12, -4);
    ctx.lineTo(44, -4);
    ctx.lineTo(56, 0);
    ctx.lineTo(44, 4);
    ctx.lineTo(12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(48, -2);
    ctx.lineTo(64, 0);
    ctx.lineTo(48, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 247, 210, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(58, 0);
    ctx.stroke();
    return;
  }

  if (weaponKey === weapons.cannon.key) {
    const chargeGlow = clamp(chargeRatio, 0, 1);
    const jitter = Math.sin(performance.now() * 0.1) * chargeGlow * 1.6;
    ctx.save();
    ctx.translate(0, jitter);
    ctx.fillStyle = detailColor;
    ctx.fillRect(-6, -6, 24, 12);
    ctx.fillStyle = tint;
    traceRoundedRect(14, -9, 30, 18, 6);
    ctx.fill();
    ctx.shadowBlur = 14 + chargeGlow * 18;
    ctx.shadowColor = glow;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(42, 0, 6 + chargeGlow * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(40, -3, 18, 6);
    if (chargeGlow > 0.06) {
      ctx.strokeStyle = `rgba(255, 230, 179, ${0.35 + chargeGlow * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, -10);
      ctx.lineTo(28 + chargeGlow * 8, -16);
      ctx.lineTo(36 + chargeGlow * 8, -7);
      ctx.moveTo(18, 10);
      ctx.lineTo(30 + chargeGlow * 8, 16);
      ctx.lineTo(38 + chargeGlow * 8, 7);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 239, 220, 0.82)";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, -9, 30, 18);
    ctx.restore();
    return;
  }

  ctx.fillStyle = tint;
  ctx.fillRect(-3, -5, 28, 10);
}

export function drawPendingAxeTelegraph() {
  if (!player.pendingAxeStrike || player.attackStartupTime <= 0) {
    return;
  }

  const profile = player.pendingAxeStrike.profile;
  const facing = player.pendingAxeStrike.facing;
  const progress = 1 - player.attackStartupTime / Math.max(profile.startup, 0.001);
  const alpha = 0.12 + progress * 0.28;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(facing);
  ctx.globalAlpha = alpha;

  if (profile.hitMode === "line") {
    ctx.strokeStyle = "rgba(139, 246, 255, 0.9)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(profile.range, 0);
    ctx.stroke();

    ctx.strokeStyle = "rgba(222, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -profile.width);
    ctx.lineTo(profile.range, -profile.width * 0.5);
    ctx.lineTo(profile.range + 20, 0);
    ctx.lineTo(profile.range, profile.width * 0.5);
    ctx.lineTo(20, profile.width);
    ctx.stroke();
  } else if (profile.hitMode === "arc") {
    ctx.strokeStyle = "rgba(126, 222, 255, 0.82)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, profile.range, -profile.arc, profile.arc);
    ctx.stroke();
  } else if (profile.hitMode === "dashPath") {
    ctx.strokeStyle = "rgba(255, 221, 138, 0.9)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(player.radius + 4, 0);
    ctx.lineTo(profile.range + 12, 0);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 244, 200, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(profile.range - 12, -10);
    ctx.lineTo(profile.range + 10, 0);
    ctx.lineTo(profile.range - 12, 10);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBot(bot) {
  if (!bot.alive) {
    return;
  }

  const visibleToPlayer = canSeeTarget(player, bot);
  const hiddenAlpha = bot.role === "training" ? 0.42 : 0.18;
  const hitOffset = getHitReactionOffset(bot);

  ctx.save();
  ctx.globalAlpha = visibleToPlayer ? 1 : hiddenAlpha;
  ctx.translate(bot.x + hitOffset.x, bot.y + hitOffset.y);
  ctx.rotate(bot.facing);
  drawActorFrame(
    bot,
    {
      body: bot.flash > 0 ? "#f7fbff" : bot.color,
      accent: bot.accent,
      detail: bot.role === "training" ? "#355868" : "#4f2f2f",
      variant: bot.role === "training" ? "ghostwire" : "warhound",
    },
    { scale: bot.role === "training" ? 0.84 : 0.9 },
  );
  drawEquippedWeapon(
    bot.weapon,
    bot.role === "training" ? "#355868" : "#4f2f2f",
    bot.role === "training" ? "#bdefff" : bot.accent,
    bot.role === "training" ? "#e9fbff" : "#ffd5be",
    bot.flash,
    0,
  );

  ctx.restore();

  if (bot.role === "training" && visibleToPlayer) {
    ctx.strokeStyle = "rgba(116, 214, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, bot.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (visibleToPlayer) {
    drawOverheadHealthBar(bot, bot.accent);
    drawStatusReadout(bot);
  }
}

export function drawArenaDecor() {
  const activeLayout = getMapLayout();
  for (const decor of mapState.decor) {
    if (decor.type === "pit") {
      const pitGradient = ctx.createLinearGradient(decor.x, decor.y, decor.x + decor.w, decor.y + decor.h);
      pitGradient.addColorStop(0, decor.color ?? "rgba(13, 20, 27, 0.38)");
      pitGradient.addColorStop(1, "rgba(4, 7, 10, 0.82)");
      ctx.fillStyle = pitGradient;
      ctx.fillRect(decor.x, decor.y, decor.w, decor.h);
      ctx.strokeStyle = decor.stroke ?? "rgba(164, 214, 242, 0.3)";
      ctx.lineWidth = 3;
      ctx.strokeRect(decor.x + 6, decor.y + 6, decor.w - 12, decor.h - 12);
      ctx.strokeStyle = activeLayout.theme?.border ? `${activeLayout.theme.border}2a` : "rgba(96, 152, 188, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(decor.x + 15, decor.y + 15, decor.w - 30, decor.h - 30);
      continue;
    }

    const laneGradient = ctx.createLinearGradient(decor.x, decor.y, decor.x + decor.w, decor.y + decor.h);
    laneGradient.addColorStop(0, decor.color ?? (decor.type === "bridge" ? "rgba(102, 126, 146, 0.3)" : "rgba(76, 108, 132, 0.22)"));
    laneGradient.addColorStop(1, decor.type === "bridge" ? "rgba(28, 42, 58, 0.32)" : "rgba(24, 34, 44, 0.2)");
    ctx.fillStyle = laneGradient;
    ctx.fillRect(decor.x, decor.y, decor.w, decor.h);
    ctx.strokeStyle = decor.stroke ?? (decor.type === "bridge" ? "rgba(196, 235, 255, 0.28)" : "rgba(159, 213, 248, 0.18)");
    ctx.lineWidth = decor.type === "bridge" ? 4 : 2.5;
    ctx.strokeRect(decor.x, decor.y, decor.w, decor.h);

    if (decor.type === "bridge") {
      ctx.strokeStyle = activeLayout.key === "bricABroc" ? "rgba(255, 216, 186, 0.12)" : "rgba(217, 242, 255, 0.14)";
      ctx.lineWidth = 1.2;
      for (let x = decor.x + 18; x < decor.x + decor.w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, decor.y + 12);
        ctx.lineTo(x, decor.y + decor.h - 12);
        ctx.stroke();
      }
    } else if (decor.type === "lane") {
      ctx.strokeStyle = `${activeLayout.theme?.laneGlow ?? "#6deaff"}26`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(decor.x + 16, decor.y + decor.h * 0.5);
      ctx.lineTo(decor.x + decor.w - 16, decor.y + decor.h * 0.5);
      ctx.stroke();
      ctx.strokeStyle = `${activeLayout.theme?.warmGlow ?? "#ffbc7e"}18`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(decor.x + 18, decor.y + 10);
      ctx.lineTo(decor.x + decor.w - 18, decor.y + 10);
      ctx.moveTo(decor.x + 18, decor.y + decor.h - 10);
      ctx.lineTo(decor.x + decor.w - 18, decor.y + decor.h - 10);
      ctx.stroke();
    }
  }
}

export function drawMapObstacles() {
  for (const obstacle of mapState.obstacles) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
    if (obstacle.style === "gallery-block") {
      ctx.fillStyle = "rgba(24, 38, 52, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(122, 231, 255, 0.38)";
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(132, 235, 255, 0.08)";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, obstacle.h - 16);
      ctx.strokeStyle = "rgba(255, 188, 126, 0.12)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 12, obstacle.y + obstacle.h * 0.5);
      ctx.lineTo(obstacle.x + obstacle.w - 12, obstacle.y + obstacle.h * 0.5);
      ctx.stroke();
    } else if (obstacle.style === "gallery-wall") {
      ctx.fillStyle = "rgba(17, 28, 38, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(108, 226, 255, 0.34)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 10);
    } else if (obstacle.style === "gallery-panel") {
      ctx.fillStyle = "rgba(20, 32, 46, 0.92)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 201, 132, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(126, 236, 255, 0.12)";
      ctx.fillRect(obstacle.x + 6, obstacle.y + 10, obstacle.w - 12, obstacle.h - 20);
    } else if (obstacle.style === "scrap-wall") {
      ctx.fillStyle = "rgba(88, 64, 48, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 196, 143, 0.26)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 148, 92, 0.22)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 12, obstacle.y + 10);
      ctx.lineTo(obstacle.x + obstacle.w - 10, obstacle.y + obstacle.h - 10);
      ctx.moveTo(obstacle.x + obstacle.w - 18, obstacle.y + 12);
      ctx.lineTo(obstacle.x + 16, obstacle.y + obstacle.h - 14);
      ctx.stroke();
    } else if (obstacle.style === "core-block") {
      ctx.fillStyle = "rgba(39, 50, 60, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(145, 232, 255, 0.34)";
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(169, 230, 255, 0.08)";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 12);
      ctx.strokeStyle = "rgba(255, 161, 104, 0.18)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 10, obstacle.y + 16);
      ctx.lineTo(obstacle.x + obstacle.w - 10, obstacle.y + 16);
      ctx.moveTo(obstacle.x + 10, obstacle.y + obstacle.h - 16);
      ctx.lineTo(obstacle.x + obstacle.w - 10, obstacle.y + obstacle.h - 16);
      ctx.stroke();
    } else if (obstacle.style === "bridge-pillar") {
      ctx.fillStyle = "rgba(62, 72, 84, 0.94)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(255, 181, 109, 0.2)";
      ctx.fillRect(obstacle.x + obstacle.w * 0.4, obstacle.y, obstacle.w * 0.2, obstacle.h);
      ctx.strokeStyle = "rgba(206, 239, 255, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    } else if (obstacle.style === "crate") {
      ctx.fillStyle = "rgba(96, 76, 62, 0.96)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 203, 160, 0.32)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 214, 178, 0.2)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
      ctx.moveTo(obstacle.x + obstacle.w, obstacle.y);
      ctx.lineTo(obstacle.x, obstacle.y + obstacle.h);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(72, 78, 86, 0.94)";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = "rgba(255, 175, 122, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(136, 228, 255, 0.14)";
      ctx.fillRect(obstacle.x + 6, obstacle.y + 6, obstacle.w - 12, obstacle.h - 12);
    }
    ctx.restore();
  }
}

export function drawBushes() {
  for (const bush of mapState.bushes) {
    const gradient = ctx.createLinearGradient(bush.x, bush.y, bush.x + bush.w, bush.y + bush.h);
    gradient.addColorStop(0, "rgba(64, 138, 98, 0.05)");
    gradient.addColorStop(1, "rgba(118, 226, 160, 0.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(bush.x, bush.y, bush.w, bush.h);
    ctx.strokeStyle = "rgba(194, 255, 224, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bush.x, bush.y, bush.w, bush.h);
    for (let x = bush.x + 8; x < bush.x + bush.w; x += 18) {
      ctx.strokeStyle = "rgba(203, 255, 229, 0.07)";
      ctx.beginPath();
      ctx.moveTo(x, bush.y + bush.h);
      ctx.lineTo(x + 6, bush.y + 8);
      ctx.stroke();
    }
  }
}

export function drawArenaFloorLighting() {
  const activeLayout = getMapLayout();
  const theme = activeLayout.theme ?? mapChoices.electroGallery.theme;
  const centerGlow = ctx.createRadialGradient(
    arena.width * 0.5,
    arena.height * 0.5,
    90,
    arena.width * 0.5,
    arena.height * 0.5,
    760,
  );
  centerGlow.addColorStop(0, `${theme.floorGlow}2c`);
  centerGlow.addColorStop(0.55, `${theme.floorGlow}10`);
  centerGlow.addColorStop(1, "rgba(8, 14, 20, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, arena.width, arena.height);

  const verticalLane = ctx.createLinearGradient(arena.width * 0.5 - 180, 0, arena.width * 0.5 + 180, 0);
  verticalLane.addColorStop(0, "rgba(0, 0, 0, 0)");
  verticalLane.addColorStop(0.5, `${theme.laneGlow}12`);
  verticalLane.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = verticalLane;
  ctx.fillRect(arena.width * 0.5 - 180, 0, 360, arena.height);

  const horizontalLane = ctx.createLinearGradient(0, arena.height * 0.5 - 120, 0, arena.height * 0.5 + 120);
  horizontalLane.addColorStop(0, "rgba(0, 0, 0, 0)");
  horizontalLane.addColorStop(0.5, `${theme.warmGlow}0e`);
  horizontalLane.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizontalLane;
  ctx.fillRect(0, arena.height * 0.5 - 120, arena.width, 240);
}

export function drawPortals() {
  for (const portal of mapState.portals) {
    const pulse = 1 + Math.sin(performance.now() * 0.008 + portal.x * 0.001) * 0.08;
    const cooldownRatio = portal.cooldowns.size
      ? Math.max(...Array.from(portal.cooldowns.values())) / config.portalReuseCooldown
      : 0;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = portal.color;
    ctx.strokeStyle = portal.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, portal.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(235, 248, 255, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, portal.radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    if (cooldownRatio > 0) {
      ctx.fillStyle = `rgba(4, 8, 12, ${0.22 + cooldownRatio * 0.35})`;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, portal.radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 225, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        portal.x,
        portal.y,
        portal.radius * 0.72,
        -Math.PI * 0.5,
        -Math.PI * 0.5 + Math.PI * 2 * (1 - cooldownRatio),
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawPylons() {
  for (const pylon of mapState.pylons) {
    if (pylon.alive) {
      const damageRatio = 1 - pylon.hp / pylon.maxHp;
      const wobble = (pylon.wobbleTime ?? 0) > 0
        ? Math.sin(performance.now() * 0.03 + pylon.x * 0.01) * (4 + damageRatio * 5) * Math.min(1, pylon.wobbleTime * 3)
        : 0;
      ctx.save();
      ctx.translate(wobble, 0);
      ctx.strokeStyle = damageRatio > 0.55 ? "rgba(255, 210, 164, 0.32)" : "rgba(255, 224, 184, 0.16)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pylon.x, pylon.y);
      ctx.lineTo(pylon.x, pylon.y - pylon.height);
      ctx.stroke();
      ctx.shadowBlur = 18 + damageRatio * 10;
      ctx.shadowColor = pylon.color;
      ctx.fillStyle = pylon.color;
      ctx.beginPath();
      ctx.arc(pylon.x, pylon.y - pylon.height, 10 + damageRatio * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = damageRatio > 0.5 ? "rgba(76, 48, 34, 0.96)" : "rgba(44, 38, 34, 0.96)";
      ctx.beginPath();
      ctx.arc(pylon.x, pylon.y, pylon.radius + damageRatio * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = damageRatio > 0.55 ? "rgba(255, 145, 90, 0.52)" : "rgba(255, 180, 110, 0.22)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 232, 205, 0.26)";
      ctx.beginPath();
      ctx.moveTo(pylon.x - 8, pylon.y - 6);
      ctx.lineTo(pylon.x + 10, pylon.y + 4);
      if (damageRatio > 0.34) {
        ctx.moveTo(pylon.x - 2, pylon.y - 14);
        ctx.lineTo(pylon.x + 12, pylon.y - 1);
      }
      if (damageRatio > 0.66) {
        ctx.moveTo(pylon.x - 12, pylon.y + 2);
        ctx.lineTo(pylon.x + 6, pylon.y + 14);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(12, 18, 24, 0.88)";
      ctx.fillRect(pylon.x - 22, pylon.y + 26, 44, 6);
      ctx.fillStyle = pylon.color;
      ctx.fillRect(pylon.x - 22, pylon.y + 26, 44 * (pylon.hp / pylon.maxHp), 6);
      if ((pylon.damageFlash ?? 0) > 0) {
        ctx.fillStyle = `rgba(255, 244, 226, ${pylon.damageFlash * 0.55})`;
        ctx.beginPath();
        ctx.arc(pylon.x, pylon.y - pylon.height, 22 + damageRatio * 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      continue;
    }

    if (pylon.fallenRect) {
      ctx.save();
      ctx.translate(pylon.x, pylon.y);
      ctx.rotate(pylon.fallAngle);
      ctx.fillStyle = "rgba(72, 52, 38, 0.96)";
      ctx.fillRect(0, -11, pylon.fallLength, 22);
      ctx.strokeStyle = `${pylon.color}aa`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(pylon.fallLength, -8);
      ctx.stroke();
      for (let offset = 18; offset < pylon.fallLength; offset += 24) {
        ctx.fillStyle = offset % 48 === 0 ? "rgba(112, 84, 56, 0.92)" : "rgba(82, 60, 44, 0.96)";
        ctx.fillRect(offset, -16, 18, 32);
      }
      ctx.restore();
    }
  }
}


export function drawWorld() {
  const viewportWidth = canvas.clientWidth || window.innerWidth;
  const viewportHeight = canvas.clientHeight || window.innerHeight;
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  const camera = updateCameraState(viewportWidth, viewportHeight);
  const shakeX = (Math.random() - 0.5) * globals.screenShake;
  const shakeY = (Math.random() - 0.5) * globals.screenShake;

  ctx.save();
  ctx.translate(camera.offsetX, camera.offsetY);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

  const activeLayout = getMapLayout();
  const theme = activeLayout.theme ?? mapChoices.electroGallery.theme;
  const gradient = ctx.createLinearGradient(0, 0, arena.width, arena.height);
  gradient.addColorStop(0, theme.backgroundStart);
  gradient.addColorStop(1, theme.backgroundEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  drawArenaFloorLighting();

  drawArenaDecor();

  ctx.strokeStyle = "rgba(124, 183, 223, 0.045)";
  ctx.lineWidth = 1;
  for (let x = 80; x < arena.width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  for (let y = 80; y < arena.height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.setLineDash([18, 16]);
  ctx.strokeStyle = "rgba(155, 220, 255, 0.1)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(arena.width * 0.5, 24);
  ctx.lineTo(arena.width * 0.5, arena.height - 24);
  ctx.moveTo(24, arena.height * 0.5);
  ctx.lineTo(arena.width - 24, arena.height * 0.5);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(119, 216, 255, 0.18)";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, arena.width - 12, arena.height - 12);

  drawBushes();
  drawPortals();
  drawMapObstacles();
  drawPylons();

  for (const impact of impacts) {
    const t = impact.life / impact.maxLife;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, impact.size * (1.6 - t), 0, Math.PI * 2);
    ctx.strokeStyle = `${impact.color}${Math.floor(t * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const tracer of tracers) {
    const t = tracer.life / tracer.maxLife;
    ctx.strokeStyle = `${tracer.color}${Math.floor(t * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 4 * t + 1;
    ctx.beginPath();
    ctx.moveTo(tracer.x0, tracer.y0);
    ctx.lineTo(tracer.x1, tracer.y1);
    ctx.stroke();
  }

  for (const beam of beamEffects) {
    const t = beam.life / beam.maxLife;
    ctx.save();
    ctx.strokeStyle = `${beam.color}${Math.floor(t * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = beam.width * (0.75 + t * 0.45);
    ctx.shadowBlur = 18 * t;
    ctx.shadowColor = beam.color;
    ctx.beginPath();
    ctx.moveTo(beam.x0, beam.y0);
    ctx.lineTo(beam.x1, beam.y1);
    ctx.stroke();
    ctx.restore();
  }

  for (const burst of absorbBursts) {
    const t = burst.life / burst.maxLife;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius * (1.5 - t * 0.4), 0, Math.PI * 2);
    ctx.strokeStyle = `${burst.color}${Math.floor(t * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 5 * t + 1;
    ctx.stroke();
  }

  for (const ghost of afterimages) {
    const t = ghost.life / ghost.maxLife;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.facing);
    ctx.globalAlpha = t * 0.35;
    ctx.fillStyle = ghost.color;
    ctx.beginPath();
    ctx.arc(0, 0, ghost.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const slash of slashEffects) {
    const t = slash.life / slash.maxLife;
    const radius = slash.comboStep === 1 ? 226 : slash.comboStep === 2 ? 148 : 178;
    const arcWidth = slash.comboStep === 1 ? 0.06 : slash.comboStep === 2 ? 1.18 : 0.18;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.rotate(
      slash.comboStep === 1
        ? slash.facing
        : slash.comboStep === 2
          ? slash.facing + 0.28
          : slash.facing,
    );
    ctx.globalAlpha = t * 0.82;
    ctx.strokeStyle =
      slash.comboStep === 1 ? "#98fbff" : slash.comboStep === 2 ? "#57d9ff" : "#ffd985";
    ctx.lineWidth = slash.comboStep === 3 ? 22 - t * 5 : slash.comboStep === 2 ? 18 - t * 4 : 12 - t * 2;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      radius,
      slash.comboStep === 2 ? -arcWidth * 0.88 : -arcWidth,
      arcWidth,
    );
    ctx.stroke();

    ctx.strokeStyle =
      slash.comboStep === 1 ? "rgba(224, 255, 255, 0.75)" : slash.comboStep === 2 ? "rgba(179, 246, 255, 0.62)" : "rgba(255, 225, 162, 0.58)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (slash.comboStep === 1) {
      ctx.moveTo(18, 0);
      ctx.lineTo(radius * 0.92, -5);
      ctx.lineTo(radius * 1.1, -2);
      ctx.lineTo(radius * 1.22, 6);
    } else if (slash.comboStep === 2) {
      ctx.arc(0, 0, radius * 0.92, -arcWidth * 0.76, arcWidth * 0.82);
    } else {
      ctx.moveTo(0, -6);
      ctx.lineTo(radius * 0.85, 0);
      ctx.lineTo(radius * 1.08, 8);
    }
    ctx.stroke();

    if (slash.comboStep === 1) {
      for (let bolt = 0; bolt < 3; bolt += 1) {
        const boltOffset = bolt * 26 + 26;
        ctx.strokeStyle = "rgba(137, 246, 255, 0.58)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boltOffset, -6 + bolt * 2);
        ctx.lineTo(boltOffset + 18, -12 + bolt * 3);
        ctx.lineTo(boltOffset + 30, -4 + bolt * 2);
        ctx.stroke();
      }
    }

    if (slash.comboStep === 2) {
      ctx.strokeStyle = "rgba(170, 245, 255, 0.44)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.74, -arcWidth * 0.72, arcWidth * 0.7);
      ctx.stroke();
    } else if (slash.comboStep === 3) {
      ctx.strokeStyle = "rgba(255, 241, 189, 0.58)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(radius * 1.04, 0);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 214, 120, 0.42)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(radius * 0.86, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const javelin of shockJavelins) {
    ctx.save();
    ctx.translate(javelin.x, javelin.y);
    ctx.rotate(Math.atan2(javelin.vy, javelin.vx));
    ctx.shadowBlur = javelin.charged ? 30 : 20;
    ctx.shadowColor = javelin.glow;
    ctx.fillStyle = javelin.color;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = javelin.charged ? "rgba(255, 245, 214, 0.95)" : "rgba(206, 242, 255, 0.9)";
    ctx.lineWidth = javelin.charged ? 4 : 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = javelin.charged ? "rgba(255, 245, 214, 0.45)" : "rgba(206, 242, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.moveTo(-20, 0);
    ctx.lineTo(-36, 0);
    ctx.stroke();
    ctx.restore();
  }

  for (const javelin of enemyShockJavelins) {
    ctx.save();
    ctx.translate(javelin.x, javelin.y);
    ctx.rotate(Math.atan2(javelin.vy, javelin.vx));
    ctx.shadowBlur = javelin.charged ? 28 : 18;
    ctx.shadowColor = javelin.glow;
    ctx.fillStyle = javelin.color;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = javelin.charged ? "rgba(255, 244, 224, 0.88)" : "rgba(255, 210, 198, 0.82)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  for (const blast of explosions) {
    const t = blast.life / blast.maxLife;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.radius * (1.2 - t * 0.35), 0, Math.PI * 2);
    ctx.strokeStyle = `${blast.color}${Math.floor(t * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 8 * t + 2;
    ctx.stroke();
  }

  for (const zone of supportZones) {
    const pulse = 1 + Math.sin(performance.now() * 0.01 + zone.radius * 0.01) * 0.04;
    if (zone.type === "gravity") {
      const lifeRatio = zone.life / Math.max(0.001, zone.maxLife ?? zone.life ?? 1);
      const spin = performance.now() * 0.0018;
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "rgba(98, 72, 150, 0.12)";
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius * (0.98 + (1 - lifeRatio) * 0.05), 0, Math.PI * 2);
      ctx.fill();

      const coreGradient = ctx.createRadialGradient(zone.x, zone.y, zone.radius * 0.08, zone.x, zone.y, zone.radius);
      coreGradient.addColorStop(0, "rgba(246, 239, 255, 0.32)");
      coreGradient.addColorStop(0.22, "rgba(190, 152, 255, 0.2)");
      coreGradient.addColorStop(0.6, "rgba(126, 104, 208, 0.1)");
      coreGradient.addColorStop(1, "rgba(88, 72, 150, 0)");
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let ring = 0; ring < 4; ring += 1) {
        const radiusFactor = 0.28 + ring * 0.17 + Math.sin(spin * 2.2 + ring * 0.9) * 0.02;
        ctx.strokeStyle = ring === 0 ? "rgba(255, 244, 255, 0.48)" : "rgba(190, 156, 255, 0.28)";
        ctx.lineWidth = ring === 0 ? 2.8 : 1.6;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius * radiusFactor, spin * (ring % 2 === 0 ? 1 : -1), spin * (ring % 2 === 0 ? 1 : -1) + Math.PI * 1.55);
        ctx.stroke();
      }

      for (let particle = 0; particle < 12; particle += 1) {
        const angle = spin * 1.6 + particle * (Math.PI * 2 / 12);
        const outerRadius = zone.radius * (0.74 + Math.sin(spin + particle * 0.8) * 0.08);
        const innerRadius = zone.radius * (0.18 + (particle % 3) * 0.06);
        const startX = zone.x + Math.cos(angle) * outerRadius;
        const startY = zone.y + Math.sin(angle) * outerRadius;
        const endX = zone.x + Math.cos(angle + 0.28) * innerRadius;
        const endY = zone.y + Math.sin(angle + 0.28) * innerRadius;
        ctx.strokeStyle = particle % 2 === 0 ? "rgba(206, 188, 255, 0.44)" : "rgba(154, 214, 255, 0.28)";
        ctx.lineWidth = particle % 2 === 0 ? 2 : 1.3;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(198, 170, 255, 0.72)";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(244, 237, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = zone.type === "lockdown" ? 5 : 3;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = zone.type === "lockdown" ? "rgba(255, 126, 88, 0.08)" : "rgba(120, 222, 255, 0.06)";
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const field of magneticFields) {
    const t = field.life / field.duration;
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.04;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.shadowBlur = 18;
    ctx.shadowColor = field.glow;
    ctx.fillStyle = "rgba(137, 200, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(137, 200, 255, 0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(137, 200, 255, 0.3)";
    ctx.lineWidth = 1.5;
    for (let ring = 0.35; ring < 1; ring += 0.22) {
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius * ring * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let arc = 0; arc < 4; arc += 1) {
      const start = performance.now() * 0.002 + arc * 1.3;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(180, 228, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.arc(field.x, field.y, field.radius * (0.7 + arc * 0.07), start, start + 0.75);
      ctx.stroke();
    }
    ctx.globalAlpha = t * 0.9;
    ctx.restore();
  }

  for (const bullet of bullets) {
    drawProjectileSprite(bullet, false);
  }

  for (const bullet of enemyBullets) {
    drawProjectileSprite(bullet, true);
  }

  for (const bot of getAllBots()) {
    drawBot(bot);
  }

  if (abilityState.grapple.phase === "flying" && abilityState.grapple.projectile) {
    const grapple = abilityState.grapple.projectile;
    ctx.save();
    ctx.translate(grapple.x, grapple.y);
    ctx.rotate(Math.atan2(grapple.vy, grapple.vx));
    ctx.shadowBlur = 22;
    ctx.shadowColor = grapple.trail;
    ctx.fillStyle = grapple.color;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(0, -9);
    ctx.lineTo(-10, -4);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-10, 4);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#effdff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  drawPendingAxeTelegraph();

  if (playerClone.active && playerClone.alive) {
    const cloneAvatar = content.avatars[playerClone.avatar] ?? content.avatars[loadout.avatar] ?? content.avatars.drifter;
    const cloneWeaponSkin = content.weaponSkins[playerClone.weaponSkin] ?? content.weaponSkins[loadout.weaponSkin] ?? content.weaponSkins.stock;
    const cloneHitOffset = getHitReactionOffset(playerClone);
    ctx.save();
    const cloneRecoilOffset = (playerClone.recoil ?? 0) * 7;
    ctx.globalAlpha = 0.82 * Math.max(0.34, playerClone.life / Math.max(0.001, playerClone.maxLife || 1));
    ctx.translate(
      playerClone.x + cloneHitOffset.x - Math.cos(playerClone.facing) * cloneRecoilOffset,
      playerClone.y + cloneHitOffset.y - Math.sin(playerClone.facing) * cloneRecoilOffset,
    );
    ctx.rotate(playerClone.facing);
    if (playerClone.ghostTime > 0) {
      ctx.globalAlpha *= 0.58;
    }
    drawActorFrame(
      playerClone,
      {
        body: playerClone.flash > 0 ? "#fff6ff" : cloneAvatar.bodyColor,
        accent: "#d8bbff",
        detail: cloneAvatar.detailColor,
        variant: cloneAvatar.key,
      },
      { scale: 0.98 },
    );
  drawEquippedWeapon(playerClone.weapon, cloneAvatar.detailColor, cloneWeaponSkin.tint, cloneWeaponSkin.glow, (playerClone.slashFlash ?? 0) + (playerClone.actionFlash ?? 0), 0);
    if (playerClone.shield > 0) {
      ctx.strokeStyle = "rgba(214, 188, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, playerClone.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(225, 204, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, playerClone.radius + 11 + Math.sin(performance.now() * 0.012) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawOverheadHealthBar(playerClone, "#d8bbff");
    drawStatusReadout(playerClone);
  }

  const avatar = content.avatars[loadout.avatar] ?? content.avatars.drifter;
  const weaponSkin = content.weaponSkins[loadout.weaponSkin] ?? content.weaponSkins.stock;
  const playerHitOffset = getHitReactionOffset(player);
  const parryStartup = abilityState.energyParry.startupTime > 0;
  const parryActive = abilityState.energyParry.activeTime > 0;
  const parryVisible = parryStartup || parryActive;
  const parryIntensity = parryActive ? 1 : parryStartup ? 0.62 : 0;
  const parryPulse = 0.5 + Math.sin(performance.now() * (parryActive ? 0.03 : 0.018)) * 0.5;
  ctx.save();
  const recoilOffset = player.recoil * 8;
  ctx.translate(
    player.x + playerHitOffset.x - Math.cos(player.facing) * recoilOffset,
    player.y + playerHitOffset.y - Math.sin(player.facing) * recoilOffset,
  );
  ctx.rotate(player.facing);
  if (player.ghostTime > 0 || abilityState.phaseShift.time > 0) {
    ctx.globalAlpha = abilityState.phaseShift.time > 0 ? 0.34 : 0.5;
  }
  if (player.lastStandTime > 0) {
    ctx.save();
    ctx.rotate(-player.facing);
    ctx.strokeStyle = "rgba(255, 192, 116, 0.88)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 11 + Math.sin(performance.now() * 0.024) * 1.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 111, 82, 0.62)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 18 + Math.cos(performance.now() * 0.018) * 2.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (parryVisible) {
    ctx.save();
    ctx.rotate(-player.facing);
    const shellRadius = player.radius + (parryActive ? 11 : 8);
    const shellGrow = parryPulse * (parryActive ? 2.6 : 1.2);
    const floorRadius = player.radius + 18 + shellGrow;
    ctx.strokeStyle = parryActive ? "rgba(212, 251, 255, 0.98)" : "rgba(138, 218, 255, 0.86)";
    ctx.lineWidth = parryActive ? 4.1 : 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, shellRadius + shellGrow, -Math.PI * 0.78, Math.PI * 0.78);
    ctx.stroke();
    ctx.strokeStyle = parryActive ? "rgba(255, 247, 188, 0.88)" : "rgba(200, 241, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, shellRadius + 7 + shellGrow, -Math.PI * 0.52, Math.PI * 0.52);
    ctx.stroke();
    ctx.strokeStyle = `rgba(116, 232, 255, ${0.22 + parryIntensity * 0.3})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(0, 0, floorRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 241, 170, ${0.32 + parryPulse * 0.28})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, floorRadius, -Math.PI * 0.18, Math.PI * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, floorRadius, Math.PI * 0.82, Math.PI * 1.18);
    ctx.stroke();
    ctx.translate(player.radius + 8, 0);
    ctx.strokeStyle = parryActive ? "rgba(233, 252, 255, 0.98)" : "rgba(177, 234, 255, 0.9)";
    ctx.lineWidth = parryActive ? 4.6 : 3.2;
    ctx.beginPath();
    ctx.moveTo(-5, -14);
    ctx.lineTo(15, 0);
    ctx.lineTo(-5, 14);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 241, 170, ${0.36 + parryPulse * 0.36})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(19, -2);
    ctx.lineTo(-12, 7);
    ctx.stroke();
    for (let index = 0; index < 3; index += 1) {
      const sparkOffset = -10 + index * 9 + parryPulse * 2;
      ctx.strokeStyle = `rgba(148, 238, 255, ${0.24 + parryIntensity * 0.22})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6 + index * 2, sparkOffset);
      ctx.lineTo(6 + index * 4, sparkOffset * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }
  drawActorFrame(
    player,
    {
      body: player.flash > 0 || abilityState.dash.invulnerabilityTime > 0 ? "#f6fdff" : parryVisible ? "#dff8ff" : avatar.bodyColor,
      accent: parryVisible ? "#fff2b2" : avatar.accentColor,
      detail: parryVisible ? "#98dfff" : avatar.detailColor,
      variant: avatar.key,
    },
    { scale: 1 },
  );
  drawEquippedWeapon(
    player.weapon,
    avatar.detailColor,
    weaponSkin.tint,
    weaponSkin.glow,
    player.slashFlash + (player.weaponChargeFlash ?? 0) + (player.energyParryHitBonusTime > 0 ? 0.18 : 0),
    player.weapon === weapons.sniper.key || player.weapon === weapons.cannon.key ? player.weaponCharge : 0,
  );

  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(160, 220, 255, 0.92)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (abilityState.phaseShift.time > 0) {
    ctx.strokeStyle = "rgba(220, 245, 255, 0.9)";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 14 + Math.sin(performance.now() * 0.022) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (abilityState.energyParry.successFlash > 0) {
    ctx.strokeStyle = `rgba(225, 252, 255, ${0.42 + abilityState.energyParry.successFlash * 1.6})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 16 + (1 - abilityState.energyParry.successFlash / 0.24) * 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.energyParryHitBonusTime > 0) {
    ctx.strokeStyle = "rgba(255, 239, 162, 0.88)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 0, 9 + Math.sin(performance.now() * 0.028) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 252, 223, 0.82)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(3, -8);
    ctx.lineTo(18, -2);
    ctx.lineTo(4, 8);
    ctx.stroke();
  }
  ctx.restore();

  if (!playerClone.active && (abilityState.ultimate.phantomTime > 0 || player.decoyTime > 0)) {
    const ghostAlpha = Math.max(abilityState.ultimate.phantomTime, player.decoyTime) / 2.2;
    ctx.save();
    ctx.globalAlpha = ghostAlpha * 0.35;
    ctx.translate(player.x - 44, player.y + 18);
    ctx.fillStyle = "#d8b6ff";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawOverheadHealthBar(player, "#6fe5ff");
  drawStatusReadout(player);

  for (const text of combatTexts) {
    const t = text.life / text.maxLife;
    const progress = 1 - t;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.3);
    ctx.font = `${text.weight} ${text.size}px Trebuchet MS`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(4, 10, 16, 0.86)";
    ctx.fillStyle = text.color;
    const drawX = text.x + text.driftX * progress;
    const drawY = text.y - text.rise * progress;
    ctx.strokeText(text.text, drawX, drawY);
    ctx.fillText(text.text, drawX, drawY);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(119, 216, 255, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(input.mouseX, input.mouseY);
  ctx.stroke();

  ctx.restore();
}

