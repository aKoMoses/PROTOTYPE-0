const NETWORK_ARENA = {
  width: 1600,
  height: 900,
};

const SCALE_X = NETWORK_ARENA.width / 3200;
const SCALE_Y = NETWORK_ARENA.height / 2000;

function sx(value) {
  return Math.round(value * SCALE_X);
}

function sy(value) {
  return Math.round(value * SCALE_Y);
}

function scaleRect(key, x, y, w, h, style) {
  return {
    key,
    x: sx(x),
    y: sy(y),
    w: sx(w),
    h: sy(h),
    style,
  };
}

function scalePoint(x, y) {
  return { x: sx(x), y: sy(y) };
}

export const DEFAULT_NETWORK_MAP_KEY = "electroGallery";

export const networkMapCatalog = {
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
      grid: "rgba(109, 224, 255, 0.08)",
      obstacleFill: "rgba(49, 112, 144, 0.55)",
      obstacleStroke: "rgba(114, 237, 255, 0.45)",
      bushFill: "rgba(58, 145, 119, 0.32)",
      bushStroke: "rgba(117, 255, 214, 0.28)",
      portalFill: "rgba(100, 229, 255, 0.2)",
      portalStroke: "rgba(110, 244, 255, 0.9)",
    },
    arena: NETWORK_ARENA,
    duelSpawns: {
      blue: scalePoint(400, 1000),
      red: scalePoint(2800, 1000),
    },
    teamSpawns: {
      blue: [scalePoint(400, 700), scalePoint(400, 1300)],
      red: [scalePoint(2800, 700), scalePoint(2800, 1300)],
    },
    obstacles: [
      scaleRect("eg-w-tl", 800, 300, 200, 80, "gallery-wall"),
      scaleRect("eg-w-br", 2200, 1620, 200, 80, "gallery-wall"),
      scaleRect("eg-w-bl", 800, 1620, 200, 80, "gallery-wall"),
      scaleRect("eg-w-tr", 2200, 300, 200, 80, "gallery-wall"),
      scaleRect("eg-c1", 1300, 600, 80, 800, "gallery-block"),
      scaleRect("eg-c2", 1820, 600, 80, 800, "gallery-block"),
    ],
    bushes: [
      scaleRect("eg-bush-1", 1450, 900, 300, 200, "bush"),
      scaleRect("eg-bush-2", 500, 1500, 200, 400, "bush"),
      scaleRect("eg-bush-3", 2500, 100, 200, 400, "bush"),
      scaleRect("eg-bush-4", 500, 100, 200, 400, "bush"),
      scaleRect("eg-bush-5", 2500, 1500, 200, 400, "bush"),
    ],
    portals: [
      { key: "eg-p-1in", ...scalePoint(200, 200), radius: sx(40), color: "#6ef4ff" },
      { key: "eg-p-1out", ...scalePoint(3000, 1800), radius: sx(40), color: "#6ef4ff" },
      { key: "eg-p-2in", ...scalePoint(3000, 200), radius: sx(40), color: "#ff9a6a" },
      { key: "eg-p-2out", ...scalePoint(200, 1800), radius: sx(40), color: "#ff9a6a" },
    ],
    pylons: [],
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
      grid: "rgba(255, 180, 111, 0.08)",
      obstacleFill: "rgba(124, 75, 40, 0.58)",
      obstacleStroke: "rgba(255, 176, 106, 0.45)",
      bushFill: "rgba(112, 101, 47, 0.28)",
      bushStroke: "rgba(255, 214, 118, 0.24)",
      portalFill: "rgba(255, 166, 106, 0.2)",
      portalStroke: "rgba(255, 166, 106, 0.85)",
    },
    arena: NETWORK_ARENA,
    duelSpawns: {
      blue: scalePoint(400, 1000),
      red: scalePoint(2800, 1000),
    },
    teamSpawns: {
      blue: [scalePoint(400, 700), scalePoint(400, 1300)],
      red: [scalePoint(2800, 700), scalePoint(2800, 1300)],
    },
    obstacles: [
      scaleRect("bb-w1", 700, 800, 100, 400, "scrap-wall"),
      scaleRect("bb-w2", 2400, 800, 100, 400, "scrap-wall"),
      scaleRect("bb-c1", 1400, 400, 400, 100, "crate"),
      scaleRect("bb-c2", 1400, 1500, 400, 100, "crate"),
    ],
    bushes: [
      scaleRect("bb-bush-1", 1000, 800, 300, 400, "bush"),
      scaleRect("bb-bush-2", 1900, 800, 300, 400, "bush"),
      scaleRect("bb-bush-3", 800, 200, 200, 200, "bush"),
      scaleRect("bb-bush-4", 2200, 200, 200, 200, "bush"),
      scaleRect("bb-bush-5", 800, 1600, 200, 200, "bush"),
      scaleRect("bb-bush-6", 2200, 1600, 200, 200, "bush"),
    ],
    portals: [],
    pylons: [
      { key: "bb-pyl-1", ...scalePoint(1600, 600), radius: sx(32), color: "#ffbf80" },
      { key: "bb-pyl-2", ...scalePoint(1600, 1400), radius: sx(32), color: "#ffd39f" },
      { key: "bb-pyl-3", ...scalePoint(1300, 1000), radius: sx(32), color: "#ff9d63" },
      { key: "bb-pyl-4", ...scalePoint(1900, 1000), radius: sx(32), color: "#ff9d63" },
    ],
  },
};

export const customRoomMapChoices = Object.values(networkMapCatalog).map((entry) => ({
  key: entry.key,
  name: entry.name,
  subtitle: entry.subtitle,
  theme: entry.theme,
}));

export function getNetworkMapConfig(mapKey = DEFAULT_NETWORK_MAP_KEY) {
  return networkMapCatalog[mapKey] ?? networkMapCatalog[DEFAULT_NETWORK_MAP_KEY];
}

export function getNetworkMapChoice(mapKey = DEFAULT_NETWORK_MAP_KEY) {
  const config = getNetworkMapConfig(mapKey);
  return {
    key: config.key,
    name: config.name,
    subtitle: config.subtitle,
    theme: config.theme,
  };
}

export function isValidNetworkMapKey(mapKey) {
  return Boolean(mapKey && networkMapCatalog[mapKey]);
}
