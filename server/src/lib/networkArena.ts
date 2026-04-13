interface RectLike {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pointInRect(x: number, y: number, rect: RectLike) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const denominator = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (denominator === 0) {
    return false;
  }

  const ua = ((dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)) / denominator;
  const ub = ((bx - ax) * (ay - cy) - (by - ay) * (ax - cx)) / denominator;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

export function circleIntersectsRect(cx: number, cy: number, radius: number, rect: RectLike) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

export function segmentIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: RectLike) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) {
    return true;
  }

  return (
    segmentsIntersect(x1, y1, x2, y2, rect.x, rect.y, rect.x + rect.w, rect.y) ||
    segmentsIntersect(x1, y1, x2, y2, rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h) ||
    segmentsIntersect(x1, y1, x2, y2, rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h) ||
    segmentsIntersect(x1, y1, x2, y2, rect.x, rect.y + rect.h, rect.x, rect.y)
  );
}

export function moveCircleWithCollisions(
  x: number,
  y: number,
  radius: number,
  velocityX: number,
  velocityY: number,
  arenaWidth: number,
  arenaHeight: number,
  obstacles: RectLike[],
) {
  const clampedX = clamp(x + velocityX, radius, arenaWidth - radius);
  let nextX = clampedX;
  for (const obstacle of obstacles) {
    if (circleIntersectsRect(nextX, y, radius, obstacle)) {
      nextX = x;
      break;
    }
  }

  const clampedY = clamp(y + velocityY, radius, arenaHeight - radius);
  let nextY = clampedY;
  for (const obstacle of obstacles) {
    if (circleIntersectsRect(nextX, nextY, radius, obstacle)) {
      nextY = y;
      break;
    }
  }

  return { x: nextX, y: nextY };
}
