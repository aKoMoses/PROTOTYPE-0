// Map layouts, portals, collision, and spatial helpers
import { arena, config, sandboxModes } from "./config.js";
import { mapState, player, abilityState, bots, sandbox, uiState, survivalEnemies } from "./state.js";
import { clamp, length, normalize, circleIntersectsRect, circleIntersectsCircle, pointToSegmentDistance } from "./utils.js";
import { playMapCue } from "./audio.js";
import { addImpact, addAfterimage, addShake } from "./gameplay/effects.js";

export const duelMapRegistry = {
  electroGallery: {
    key: "electroGallery",
    name: "Electro Gallery",
    subtitle: "Neon conduit arena with linked portals and high-speed repositioning.",
    theme: {
      backgroundStart: "#13253a",
      backgroundEnd: "#071019",
      floorGlow: "#6ae9ff",
      laneGlow: "#7ee9ff",
      warmGlow: "#ffb06b",
      border: "#8cefff",
    },
  },
  bricABroc: {
    key: "bricABroc",
    name: "Bric-a-Broc",
    subtitle: "Scrapyard duel ground with collapsing pillars and shifting cover.",
    theme: {
      backgroundStart: "#261d18",
      backgroundEnd: "#100d0b",
      floorGlow: "#ffb77e",
      laneGlow: "#ff995b",
      warmGlow: "#ffd8a6",
      border: "#ffc78c",
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
  trainingGround: {
    key: "trainingGround",
    name: "Training Range",
    subtitle: "Open firing lane with static bots for clean build testing.",
    theme: {
      backgroundStart: "#1a2229",
      backgroundEnd: "#0b1115",
      floorGlow: "#8fb4ca",
      laneGlow: "#89d6ff",
      warmGlow: "#d0dee8",
      border: "#b7d9ee",
    },
  },
  trainingExpanse: {
    key: "trainingExpanse",
    name: "Wasteland Expanse",
    subtitle: "Large scrollable proving ground with long lanes, sparse cover, and room to stress-test builds.",
    theme: {
      backgroundStart: "#182027",
      backgroundEnd: "#0a0f14",
      floorGlow: "#86c5e7",
      laneGlow: "#8fdcff",
      warmGlow: "#e7c07f",
      border: "#b7d9ee",
    },
  },
};

const mapLayouts = {
  electroGallery: {
    key: "electroGallery",
    name: duelMapRegistry.electroGallery.name,
    subtitle: duelMapRegistry.electroGallery.subtitle,
    theme: duelMapRegistry.electroGallery.theme,
    playerSpawn: { x: 240, y: 450 },
    enemySpawn: { x: 1360, y: 450 },
    trainingSpawn: { x: 240, y: 450 },
    survivalSpawns: [
      { x: 220, y: 180 },
      { x: 1380, y: 180 },
      { x: 220, y: 720 },
      { x: 1380, y: 720 },
      { x: 800, y: 148 },
      { x: 800, y: 752 },
    ],
    arenaDecor: [
      { type: "lane", x: 112, y: 116, w: 1376, h: 118, color: "rgba(86, 116, 150, 0.12)", stroke: "rgba(135, 235, 255, 0.18)" },
      { type: "lane", x: 112, y: 666, w: 1376, h: 118, color: "rgba(86, 116, 150, 0.1)", stroke: "rgba(255, 174, 109, 0.12)" },
      { type: "bridge", x: 640, y: 202, w: 320, h: 92, color: "rgba(73, 102, 130, 0.2)", stroke: "rgba(165, 241, 255, 0.22)" },
      { type: "bridge", x: 640, y: 606, w: 320, h: 92, color: "rgba(73, 102, 130, 0.2)", stroke: "rgba(165, 241, 255, 0.22)" },
      { type: "pit", x: 692, y: 364, w: 216, h: 172, color: "rgba(8, 12, 20, 0.52)", stroke: "rgba(124, 214, 255, 0.22)" },
    ],
    obstacles: [
      { key: "gallery-wall-1", x: 430, y: 278, w: 168, h: 62, style: "gallery-wall" },
      { key: "gallery-wall-2", x: 1002, y: 560, w: 168, h: 62, style: "gallery-wall" },
      { key: "gallery-core-1", x: 660, y: 286, w: 100, h: 156, style: "gallery-block" },
      { key: "gallery-core-2", x: 840, y: 456, w: 100, h: 156, style: "gallery-block" },
      { key: "gallery-column-1", x: 566, y: 370, w: 52, h: 120, style: "gallery-panel" },
      { key: "gallery-column-2", x: 982, y: 410, w: 52, h: 120, style: "gallery-panel" },
    ],
    bushes: [],
    portals: [
      { key: "gallery-portal-a-in", x: 236, y: 186, radius: 34, targetKey: "gallery-portal-a-out", color: "#6ef4ff" },
      { key: "gallery-portal-a-out", x: 1368, y: 710, radius: 34, targetKey: "gallery-portal-a-in", color: "#6ef4ff" },
      { key: "gallery-portal-b-in", x: 1368, y: 186, radius: 34, targetKey: "gallery-portal-b-out", color: "#ff9a6a" },
      { key: "gallery-portal-b-out", x: 236, y: 710, radius: 34, targetKey: "gallery-portal-b-in", color: "#ff9a6a" },
    ],
    pylons: [],
    trainingBots: [],
  },
  bricABroc: {
    key: "bricABroc",
    name: duelMapRegistry.bricABroc.name,
    subtitle: duelMapRegistry.bricABroc.subtitle,
    theme: duelMapRegistry.bricABroc.theme,
    playerSpawn: { x: 248, y: 450 },
    enemySpawn: { x: 1352, y: 450 },
    trainingSpawn: { x: 248, y: 450 },
    survivalSpawns: [
      { x: 214, y: 192 },
      { x: 1390, y: 212 },
      { x: 214, y: 700 },
      { x: 1388, y: 686 },
      { x: 798, y: 176 },
      { x: 826, y: 730 },
    ],
    arenaDecor: [
      { type: "lane", x: 108, y: 132, w: 1384, h: 134, color: "rgba(124, 92, 66, 0.14)", stroke: "rgba(255, 194, 135, 0.14)" },
      { type: "lane", x: 108, y: 634, w: 1384, h: 142, color: "rgba(112, 84, 60, 0.13)", stroke: "rgba(255, 194, 135, 0.12)" },
      { type: "bridge", x: 590, y: 342, w: 420, h: 120, color: "rgba(116, 82, 56, 0.16)", stroke: "rgba(255, 214, 174, 0.16)" },
    ],
    obstacles: [
      { key: "bric-wall-1", x: 362, y: 274, w: 154, h: 68, style: "scrap-wall" },
      { key: "bric-wall-2", x: 1092, y: 536, w: 168, h: 72, style: "scrap-wall" },
      { key: "bric-crate-1", x: 560, y: 578, w: 92, h: 58, style: "crate" },
      { key: "bric-crate-2", x: 952, y: 272, w: 92, h: 58, style: "crate" },
    ],
    bushes: [],
    portals: [],
    pylons: [
      { key: "bric-pillar-1", x: 506, y: 456, radius: 24, hp: 72, height: 178, fallLength: 196, color: "#ffbf80" },
      { key: "bric-pillar-2", x: 812, y: 330, radius: 24, hp: 72, height: 184, fallLength: 208, color: "#ffd39f" },
      { key: "bric-pillar-3", x: 1096, y: 534, radius: 24, hp: 72, height: 178, fallLength: 196, color: "#ff9d63" },
    ],
    trainingBots: [],
  },
  trainingGround: {
    key: "trainingGround",
    name: mapChoices.trainingGround.name,
    subtitle: mapChoices.trainingGround.subtitle,
    theme: mapChoices.trainingGround.theme,
    playerSpawn: { x: 186, y: 450 },
    enemySpawn: { x: 1336, y: 236 },
    trainingSpawn: { x: 186, y: 450 },
    arenaDecor: [
      { type: "lane", x: 120, y: 362, w: 1360, h: 176, color: "rgba(111, 142, 164, 0.08)", stroke: "rgba(173, 223, 252, 0.14)" },
      { type: "bridge", x: 344, y: 422, w: 920, h: 56, color: "rgba(84, 104, 122, 0.08)", stroke: "rgba(173, 223, 252, 0.12)" },
    ],
    obstacles: [],
    bushes: [],
    portals: [],
    pylons: [],
    trainingBots: [
      { x: 656, y: 450 },
      { x: 818, y: 450 },
      { x: 980, y: 450 },
      { x: 1142, y: 450 },
      { x: 1304, y: 450 },
    ],
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
      { type: "lane", x: 220, y: 1120, w: 4760, h: 560, color: "rgba(111, 142, 164, 0.07)", stroke: "rgba(173, 223, 252, 0.12)" },
      { type: "lane", x: 320, y: 420, w: 4560, h: 180, color: "rgba(111, 142, 164, 0.04)", stroke: "rgba(173, 223, 252, 0.08)" },
      { type: "lane", x: 320, y: 2200, w: 4560, h: 180, color: "rgba(111, 142, 164, 0.04)", stroke: "rgba(173, 223, 252, 0.08)" },
      { type: "bridge", x: 1260, y: 1200, w: 480, h: 220, color: "rgba(84, 104, 122, 0.06)", stroke: "rgba(173, 223, 252, 0.10)" },
      { type: "bridge", x: 3460, y: 1200, w: 480, h: 220, color: "rgba(84, 104, 122, 0.06)", stroke: "rgba(173, 223, 252, 0.10)" },
      { type: "pit", x: 2280, y: 1140, w: 640, h: 520, color: "rgba(7, 13, 20, 0.48)", stroke: "rgba(130, 212, 255, 0.16)" },
    ],
    obstacles: [
      { key: "expanse-block-1", x: 1180, y: 700, w: 160, h: 132, style: "core-block" },
      { key: "expanse-block-2", x: 1180, y: 1968, w: 160, h: 132, style: "core-block" },
      { key: "expanse-block-3", x: 3860, y: 700, w: 160, h: 132, style: "core-block" },
      { key: "expanse-block-4", x: 3860, y: 1968, w: 160, h: 132, style: "core-block" },
      { key: "expanse-block-5", x: 1920, y: 840, w: 128, h: 120, style: "gallery-block" },
      { key: "expanse-block-6", x: 3140, y: 1840, w: 128, h: 120, style: "gallery-block" },
      { key: "expanse-pillar-1", x: 2120, y: 1124, w: 82, h: 332, style: "bridge-pillar" },
      { key: "expanse-pillar-2", x: 2980, y: 1124, w: 82, h: 332, style: "bridge-pillar" },
      { key: "expanse-cover-1", x: 760, y: 1328, w: 220, h: 108, style: "gallery-wall" },
      { key: "expanse-cover-2", x: 4220, y: 1328, w: 220, h: 108, style: "gallery-wall" },
    ],
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
    return [mapChoices.trainingGround, mapChoices.trainingExpanse];
  }
  return [mapChoices.electroGallery, mapChoices.bricABroc, mapChoices.randomMap];
}

export function normalizeSelectedMap(mode, mapKey) {
  if (mode === sandboxModes.training.key) {
    return mapKey === mapChoices.trainingExpanse.key
      ? mapChoices.trainingExpanse.key
      : mapChoices.trainingGround.key;
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
  return getSelectableMapsForMode(mode).find((item) => item.key === normalized) ?? mapChoices.trainingGround;
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
  const targetInBush = isEntityInBush(target);
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
