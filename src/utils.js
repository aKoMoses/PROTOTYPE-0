// Pure utility functions (no game state dependencies)
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function normalize(x, y) {
  const magnitude = length(x, y) || 1;
  return { x: x / magnitude, y: y / magnitude };
}

export function pointToSegmentDistance(pointX, pointY, x1, y1, x2, y2) {
  const segmentX = x2 - x1;
  const segmentY = y2 - y1;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY || 1;
  const projection = clamp(
    ((pointX - x1) * segmentX + (pointY - y1) * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const nearestX = x1 + segmentX * projection;
  const nearestY = y1 + segmentY * projection;
  return length(pointX - nearestX, pointY - nearestY);
}


export function circleIntersectsRect(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  return length(x - nearestX, y - nearestY) <= radius;
}

export function circleIntersectsCircle(x1, y1, r1, x2, y2, r2) {
  return length(x1 - x2, y1 - y2) <= r1 + r2;
}

function isInsideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function sanitizeIconClass(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

export function approach(current, target, maxDelta) {
  if (current < target) {
    return Math.min(target, current + maxDelta);
  }

  return Math.max(target, current - maxDelta);
}

export function pickRandomItems(source, count) {
  const pool = [...source];
  const picks = [];

  while (pool.length > 0 && picks.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }

  return picks;
}
