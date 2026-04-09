// Map layouts, portals, collision, and spatial helpers
import { arena, config, sandboxModes } from "./config.js";
import { mapState, player, abilityState, bots, sandbox, survivalEnemies } from "./state.js";
import { uiState } from "./state/app-state.js";
import { clamp, length, normalize, circleIntersectsRect, circleIntersectsCircle, pointToSegmentDistance } from "./utils.js";
import { playMapCue } from "./audio.js";
import { addImpact, addAfterimage, addShake } from "./gameplay/effects.js";

export const duelMapRegistry = {
  electroGallery: {
    key: "electroGallery",
    name: "Electro Gallery",
    subtitle: "Neon conduit arena with linked portals and high-speed repositioning.",
    theme: {
      backgroundStart: "#0a1320",
      backgroundEnd: "#030810",
      floorGlow: "#45d9f0",
      laneGlow: "#4deeff",
      warmGlow: "#ff903b",
      border: "#6bf3ff",
    },
  },
  bricABroc: {
    key: "bricABroc",
    name: "Bric-a-Broc",
    subtitle: "Scrapyard duel ground with collapsing pillars and shifting cover.",
    theme: {
      backgroundStart: "#1a130f",
      backgroundEnd: "#080605",
      floorGlow: "#ff9a4f",
      laneGlow: "#ff843a",
      warmGlow: "#ffc280",
      border: "#ffb46f",
    },
  },
};

export const buildLabVisiblePools = {
  weapons: ["pulse", "axe", "shotgun", "sniper", "staff", "injector", "lance", "cannon"],
  abilities: [
    "shockJavelin",
    "magneticField",
    "magneticGrapple",
    "energyShield",
    "energyParry",
    "empBurst",
    "pulseBurst",
    "gravityWell",
    "phaseShift",
  ],
  perks: [
    "scavengerPlates",
    "reactiveArmor",
    "dashCooling",
    "executionRelay",
    "omnivampCore",
    "lastStandBuffer",
    "precisionMomentum",
    "shockBuffer",
  ],
  ultimates: ["phantomSplit", "revivalProtocol", "empCataclysm"],
};

export const mapChoices = {
  electroGallery: duelMapRegistry.electroGallery,
  bricABroc: duelMapRegistry.bricABroc,
  randomMap: {
    key: "randomMap",
    name: "Random Map",
    subtitle: "Draw a live duel arena from the registered map pool.",
    theme: duelMapRegistry.electroGallery.theme,
  },

  trainingExpanse: {
    key: "trainingExpanse",
    name: "Virtual Sandbox",
    subtitle: "Endless virtual testing grid. No obstacles, pure data.",
    theme: {
      backgroundStart: "#060913",
      backgroundEnd: "#020306",
      floorGlow: "#00ccff",
      laneGlow: "#00e5ff",
      warmGlow: "#00ffff",
      border: "#00f0ff",
    },
  },
};

const mapLayouts = {
  electroGallery: {
    key: "electroGallery",
    name: duelMapRegistry.electroGallery.name,
    subtitle: duelMapRegistry.electroGallery.subtitle,
    theme: duelMapRegistry.electroGallery.theme,
    width: 3200,
    height: 2000,
    scrollable: true,
    playerSpawn: { x: 400, y: 1000 },
    enemySpawn: { x: 2800, y: 1000 },
    trainingSpawn: { x: 400, y: 1000 },
    survivalSpawns: [
      { x: 400, y: 400 },
      { x: 2800, y: 400 },
      { x: 400, y: 1600 },
      { x: 2800, y: 1600 },
      { x: 1600, y: 400 },
      { x: 1600, y: 1600 },
    ],
    arenaDecor: [],
    obstacles: [
      { key: "eg-w-tl", x: 800, y: 300, w: 200, h: 80, style: "gallery-wall", solid: true },
      { key: "eg-w-br", x: 2200, y: 1620, w: 200, h: 80, style: "gallery-wall", solid: true },
      { key: "eg-w-bl", x: 800, y: 1620, w: 200, h: 80, style: "gallery-wall", solid: true },
      { key: "eg-w-tr", x: 2200, y: 300, w: 200, h: 80, style: "gallery-wall", solid: true },
      { key: "eg-c1", x: 1300, y: 600, w: 80, h: 800, style: "gallery-block", solid: true },
      { key: "eg-c2", x: 1820, y: 600, w: 80, h: 800, style: "gallery-block", solid: true },
    ],
    bushes: [
      { x: 1450, y: 900, w: 300, h: 200 },
      { x: 500, y: 1500, w: 200, h: 400 },
      { x: 2500, y: 100, w: 200, h: 400 },
      { x: 500, y: 100, w: 200, h: 400 },
      { x: 2500, y: 1500, w: 200, h: 400 },
    ],
    healPacks: [
      { x: 1600, y: 1000, cooldown: 0 },
      { x: 600, y: 1000, cooldown: 0 },
      { x: 2600, y: 1000, cooldown: 0 },
      { x: 1600, y: 300, cooldown: 0 },
      { x: 1600, y: 1700, cooldown: 0 },
    ],
    portals: [
      { key: "eg-p-1in", x: 200, y: 200, radius: 40, targetKey: "eg-p-1out", color: "#6ef4ff" },
      { key: "eg-p-1out", x: 3000, y: 1800, radius: 40, targetKey: "eg-p-1in", color: "#6ef4ff" },
      { key: "eg-p-2in", x: 3000, y: 200, radius: 40, targetKey: "eg-p-2out", color: "#ff9a6a" },
      { key: "eg-p-2out", x: 200, y: 1800, radius: 40, targetKey: "eg-p-2in", color: "#ff9a6a" },
    ],
    pylons: [],
    trainingBots: [],
  },
  bricABroc: {
    key: "bricABroc",
    name: duelMapRegistry.bricABroc.name,
    subtitle: duelMapRegistry.bricABroc.subtitle,
    theme: duelMapRegistry.bricABroc.theme,
    width: 3200,
    height: 2000,
    scrollable: true,
    playerSpawn: { x: 400, y: 1000 },
    enemySpawn: { x: 2800, y: 1000 },
    trainingSpawn: { x: 400, y: 1000 },
    survivalSpawns: [
      { x: 400, y: 400 },
      { x: 2800, y: 400 },
      { x: 400, y: 1600 },
      { x: 2800, y: 1600 },
      { x: 1600, y: 400 },
      { x: 1600, y: 1600 },
    ],
    arenaDecor: [],
    obstacles: [
      { key: "bb-w1", x: 700, y: 800, w: 100, h: 400, style: "scrap-wall", solid: true },
      { key: "bb-w2", x: 2400, y: 800, w: 100, h: 400, style: "scrap-wall", solid: true },
      { key: "bb-c1", x: 1400, y: 400, w: 400, h: 100, style: "crate", solid: true },
      { key: "bb-c2", x: 1400, y: 1500, w: 400, h: 100, style: "crate", solid: true },
    ],
    bushes: [
      { x: 1000, y: 800, w: 300, h: 400 },
      { x: 1900, y: 800, w: 300, h: 400 },
      { x: 800, y: 200, w: 200, h: 200 },
      { x: 2200, y: 200, w: 200, h: 200 },
      { x: 800, y: 1600, w: 200, h: 200 },
      { x: 2200, y: 1600, w: 200, h: 200 },
    ],
    healPacks: [
      { x: 1600, y: 1000, cooldown: 0 },
      { x: 1000, y: 400, cooldown: 0 },
      { x: 2200, y: 400, cooldown: 0 },
      { x: 1000, y: 1600, cooldown: 0 },
      { x: 2200, y: 1600, cooldown: 0 },
    ],
    portals: [],
    pylons: [
      { key: "bb-pyl-1", x: 1600, y: 600, radius: 32, hp: 120, height: 180, fallLength: 200, color: "#ffbf80" },
      { key: "bb-pyl-2", x: 1600, y: 1400, radius: 32, hp: 120, height: 180, fallLength: 200, color: "#ffd39f" },
      { key: "bb-pyl-3", x: 1300, y: 1000, radius: 32, hp: 120, height: 180, fallLength: 200, color: "#ff9d63" },
      { key: "bb-pyl-4", x: 1900, y: 1000, radius: 32, hp: 120, height: 180, fallLength: 200, color: "#ff9d63" },
    ],
    trainingBots: [],
  },

  trainingExpanse: {
    key: "trainingExpanse",
    name: mapChoices.trainingExpanse.name,
    subtitle: mapChoices.trainingExpanse.subtitle,
    theme: mapChoices.trainingExpanse.theme,
    width: 5200,
    height: 2800,
    scrollable: true,
    playerSpawn: { x: 420, y: 1400 },
    enemySpawn: { x: 4780, y: 1400 },
    trainingSpawn: { x: 420, y: 1400 },
    survivalSpawns: [],
    arenaDecor: [
      { type: "lane", x: 220, y: 1120, w: 4760, h: 560, color: "rgba(0, 255, 255, 0.02)", stroke: "rgba(0, 255, 255, 0.06)" },
    ],
    obstacles: [],
    bushes: [],
    portals: [],
    pylons: [],
    trainingBots: [
      { x: 1180, y: 1400 },
      { x: 1760, y: 1400 },
      { x: 2340, y: 1400 },
      { x: 2920, y: 1400 },
      { x: 3500, y: 1400 },
      { x: 4080, y: 930 },
      { x: 4080, y: 1870 },
      { x: 4660, y: 1400 },
    ],
  },
};


export function cloneRect(rect) {
  return { ...rect };
}

export function getSelectableMapsForMode(mode = uiState.selectedMode) {
  if (mode === sandboxModes.training.key) {
    return [mapChoices.trainingExpanse];
  }
  return [mapChoices.electroGallery, mapChoices.bricABroc, mapChoices.randomMap];
}

export function normalizeSelectedMap(mode, mapKey) {
  if (mode === sandboxModes.training.key) {
    return mapChoices.trainingExpanse.key;
  }
  if (mapKey === mapChoices.randomMap.key || duelMapRegistry[mapKey]) {
    return mapKey;
  }
  return mapChoices.electroGallery.key;
}

export function resolveMapKey(mode, mapKey, resolveRandom = false) {
  const normalized = normalizeSelectedMap(mode, mapKey);
  if (mode === sandboxModes.training.key) {
    return normalized;
  }
  if (normalized === mapChoices.randomMap.key) {
    if (!resolveRandom && duelMapRegistry[sandbox.mapKey]) {
      return sandbox.mapKey;
    }
    const duelPool = Object.keys(duelMapRegistry);
    return duelPool[Math.floor(Math.random() * duelPool.length)] ?? mapChoices.electroGallery.key;
  }
  return normalized;
}

export function getSelectedMapMeta(mode = uiState.selectedMode, mapKey = uiState.selectedMap) {
  const normalized = normalizeSelectedMap(mode, mapKey);
  return getSelectableMapsForMode(mode).find((item) => item.key === normalized) ?? mapChoices.trainingExpanse;
}

export function getMapLayout(mode = sandbox.mode, mapKey = sandbox.mapKey) {
  const resolvedKey = resolveMapKey(mode, mapKey);
  return mapLayouts[resolvedKey] ?? mapLayouts.electroGallery;
}

export function buildMapState(mode = sandbox.mode, mapKey = sandbox.mapKey) {
  const layout = getMapLayout(mode, mapKey);
  mapState.layoutKey = layout.key;
  arena.width = layout.width ?? 1600;
  arena.height = layout.height ?? 900;
  mapState.decor = layout.arenaDecor.map((item) => ({ ...item }));
  mapState.obstacles = layout.obstacles.map((item) => ({ ...cloneRect(item), solid: true }));
  mapState.bushes = layout.bushes.map((item) => ({ ...cloneRect(item) }));
  mapState.healPacks = layout.healPacks ? layout.healPacks.map((item) => ({ ...item })) : [];
  mapState.portals = layout.portals.map((item) => ({ ...item, cooldowns: new Map() }));
  mapState.pylons = layout.pylons.map((item) => ({
    ...item,
    maxHp: item.hp,
    alive: true,
    falling: false,
    fallen: false,
    fallAngle: -Math.PI * 0.5,
    fallenRect: null,
    damageFlash: 0,
    wobbleTime: 0,
  }));
}

export function resetMapState(mode = sandbox.mode, mapKey = sandbox.mapKey) {
  buildMapState(mode, mapKey);
}

export function getPortalTarget(portal) {
  return mapState.portals.find((item) => item.key === portal.targetKey) ?? null;
}

export function getEntityPortalKey(entity) {
  return entity.kind ?? entity.role ?? "player";
}

export function updatePortalCooldowns(dt) {
  for (const portal of mapState.portals) {
    for (const [key, value] of portal.cooldowns.entries()) {
      const nextValue = value - dt;
      if (nextValue <= 0) {
        portal.cooldowns.delete(key);
      } else {
        portal.cooldowns.set(key, nextValue);
      }
    }
  }

  for (const pylon of mapState.pylons) {
    pylon.damageFlash = Math.max(0, (pylon.damageFlash ?? 0) - dt);
    pylon.wobbleTime = Math.max(0, (pylon.wobbleTime ?? 0) - dt);
  }
}

export function maybeTeleportEntity(entity) {
  const entityKey = getEntityPortalKey(entity);
  for (const portal of mapState.portals) {
    if (portal.cooldowns.get(entityKey) > 0) {
      continue;
    }
    if (!circleIntersectsCircle(entity.x, entity.y, entity.radius, portal.x, portal.y, portal.radius)) {
      continue;
    }
    const target = getPortalTarget(portal);
    if (!target) {
      continue;
    }
    entity.x = clamp(target.x, entity.radius, arena.width - entity.radius);
    entity.y = clamp(target.y, entity.radius, arena.height - entity.radius);
    for (const portalNode of mapState.portals) {
      portalNode.cooldowns.set(entityKey, config.portalReuseCooldown);
    }
    addImpact(portal.x, portal.y, portal.color, 24);
    addImpact(target.x, target.y, target.color, 28);
    addAfterimage(entity.x, entity.y, entity.facing ?? 0, entity.radius + 4, target.color);
    addShake(3.6);
    playMapCue("teleport");
    break;
  }
}

export function resolveRectCollision(entity, rect) {
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.h);
  let dx = entity.x - nearestX;
  let dy = entity.y - nearestY;
  let distanceToRect = length(dx, dy);

  if (distanceToRect > entity.radius) {
    return;
  }

  if (distanceToRect === 0) {
    const left = Math.abs(entity.x - rect.x);
    const right = Math.abs(rect.x + rect.w - entity.x);
    const top = Math.abs(entity.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - entity.y);
    const minSide = Math.min(left, right, top, bottom);

    if (minSide === left) {
      dx = -1;
      dy = 0;
      distanceToRect = left;
    } else if (minSide === right) {
      dx = 1;
      dy = 0;
      distanceToRect = right;
    } else if (minSide === top) {
      dx = 0;
      dy = -1;
      distanceToRect = top;
    } else {
      dx = 0;
      dy = 1;
      distanceToRect = bottom;
    }
  }

  const push = entity.radius - distanceToRect + 0.5;
  const normal = normalize(dx, dy);
  entity.x += normal.x * push;
  entity.y += normal.y * push;
}

export function resolvePylonCollision(entity, pylon) {
  if (!pylon.alive || pylon.fallen) {
    return;
  }
  const dx = entity.x - pylon.x;
  const dy = entity.y - pylon.y;
  const distanceToPylon = length(dx, dy);
  const pushRadius = entity.radius + pylon.radius;
  if (distanceToPylon >= pushRadius) {
    return;
  }
  const normal = normalize(dx || 1, dy);
  const push = pushRadius - distanceToPylon + 0.5;
  entity.x += normal.x * push;
  entity.y += normal.y * push;
}

export function resolveMapCollision(entity) {
  for (const obstacle of mapState.obstacles) {
    if (obstacle.solid) {
      resolveRectCollision(entity, obstacle);
    }
  }

  for (const pylon of mapState.pylons) {
    resolvePylonCollision(entity, pylon);
    if (pylon.fallenRect) {
      resolveRectCollision(entity, pylon.fallenRect);
    }
  }

  entity.x = clamp(entity.x, entity.radius, arena.width - entity.radius);
  entity.y = clamp(entity.y, entity.radius, arena.height - entity.radius);
}

export function resolveCharacterBodyBlocking() {
  if (!player.alive) {
    return;
  }

  const playerIntangible = abilityState.phaseShift.time > 0 || abilityState.phaseDash.time > 0 || player.ghostTime > 0;
  if (playerIntangible) {
    return;
  }

  const activeBots = sandbox.mode === sandboxModes.survival.key ? survivalEnemies : bots;
  for (const bot of activeBots) {
    if (sandbox.mode !== sandboxModes.survival.key && !bot.modes.includes(sandbox.mode)) {
      continue;
    }
    if (!bot.alive) {
      continue;
    }

    const distanceBetween = length(bot.x - player.x, bot.y - player.y);
    const minimumDistance = player.radius + bot.radius;
    if (distanceBetween >= minimumDistance) {
      continue;
    }

    const normal = normalize(player.x - bot.x || 1, player.y - bot.y || 0);
    const overlap = minimumDistance - distanceBetween + 0.4;
    const playerPushFactor = bot.role === "training" ? 1 : 0.55;
    const botPushFactor = bot.role === "training" ? 0 : 0.45;

    player.x += normal.x * overlap * playerPushFactor;
    player.y += normal.y * overlap * playerPushFactor;
    bot.x -= normal.x * overlap * botPushFactor;
    bot.y -= normal.y * overlap * botPushFactor;

    resolveMapCollision(player);
    resolveMapCollision(bot);
  }
}

export function isEntityInBush(entity) {
  return mapState.bushes.some((bush) => circleIntersectsRect(entity.x, entity.y, entity.radius, bush));
}

export function canSeeTarget(viewer, target) {
  if (!target || !target.alive) {
    return false;
  }
  const viewerInBush = isEntityInBush(viewer);
  const targetInBush = target.combatTimer <= 0 && isEntityInBush(target);
  if (!targetInBush) {
    return true;
  }
  if (viewerInBush) {
    return true;
  }
  return length(viewer.x - target.x, viewer.y - target.y) < 144;
}

export function getPylonFallRect(pylon) {
  const width = Math.max(26, pylon.radius * 1.35);
  const endX = pylon.x + Math.cos(pylon.fallAngle) * pylon.fallLength;
  const endY = pylon.y + Math.sin(pylon.fallAngle) * pylon.fallLength;
  if (Math.abs(Math.cos(pylon.fallAngle)) >= Math.abs(Math.sin(pylon.fallAngle))) {
    return {
      x: Math.min(pylon.x, endX),
      y: Math.min(pylon.y, endY) - width * 0.5,
      w: Math.abs(endX - pylon.x) || width,
      h: width,
      style: "fallen-pylon",
      solid: true,
    };
  }
  return {
    x: Math.min(pylon.x, endX) - width * 0.5,
    y: Math.min(pylon.y, endY),
    w: width,
    h: Math.abs(endY - pylon.y) || width,
    style: "fallen-pylon",
    solid: true,
  };
}
