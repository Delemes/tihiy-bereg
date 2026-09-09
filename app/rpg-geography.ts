import type { Region } from './rpg-model';
import { room, roomObstacles } from './rpg-regions';
import { wingSkins } from './rpg-wings';
export const WORLD_W = 1536,
  WORLD_H = 1024;
export const worldBounds = (r: Region) =>
  room(r) ? { width: 2560, height: 2048 } : { width: WORLD_W, height: WORLD_H };
const blocks = [
  [178, 567, 247, 188],
  [323, 286, 211, 184],
  [698, 314, 218, 179],
  [721, 94, 234, 138],
  [212, 102, 145, 154],
  [618, 734, 162, 91],
  [800, 735, 71, 65],
  [595, 510, 49, 55],
  [115, 643, 8, 178],
  [126, 827, 221, 8],
  [411, 826, 97, 8],
  [223, 479, 245, 17],
  [514, 479, 70, 17],
  [229, 397, 7, 82],
];
const bank = [
  [0, 1530],
  [90, 1470],
  [150, 1260],
  [220, 1160],
  [290, 1126],
  [360, 1138],
  [430, 1115],
  [505, 1140],
  [620, 1140],
  [733, 1190],
  [865, 1250],
  [1024, 1300],
];
export function isWater(x: number, y: number) {
  if (x > 1130 && x < 1420 && y > 560 && y < 616) return false;
  for (let i = 1; i < bank.length; i++)
    if (y <= bank[i][0]) {
      const a = bank[i - 1],
        b = bank[i];
      return x > a[1] + ((b[1] - a[1]) * (y - a[0])) / (b[0] - a[0]) - 7;
    }
  return false;
}
export function canWalk(x: number, y: number, r: Region = 'village') {
  if (room(r)) {
    if (x < 340 || x > 2214 || y < 220 || y > 1974) return false;
    // Openings align with the door breaks in the painted room walls.
    if (
      (x >= 1170 &&
        x <= 1400 &&
        ((y >= 460 && y <= 550) || (y >= 1484 && y <= 1574))) ||
      (y >= 920 &&
        y <= 1280 &&
        ((x >= 730 && x <= 810) || (x >= 1754 && x <= 1834)))
    )
      return true;
    const col = x >= 1280 ? 1 : 0,
      row = y >= 1024 ? 1 : 0,
      lx = x - col * 1024,
      ly = y - row * 1024;
    if (lx < 340 || lx > 1190 || ly < 220 || ly > 950) return false;
    const skin =
      col || row
        ? wingSkins[room(r)[2]][row === 0 ? 0 : col === 0 ? 1 : 2]
        : room(r)[2];
    const obstacles =
      skin === 6
        ? [
            [915, 80, 320, 290],
            [278, 55, 300, 190],
          ]
        : [
            [278, 35, 475, 185],
            [850, 35, 398, 185],
            ...(skin === 0
              ? [[350, 170, 230, 190]]
              : skin === 7
                ? [
                    [290, 180, 140, 160],
                    [1060, 175, 155, 180],
                  ]
                : []),
          ];
    return !obstacles.some(
      ([bx, by, w, h]) =>
        lx > bx - 7 && lx < bx + w + 7 && ly > by - 3 && ly < by + h + 7,
    );
  }
  if (x <= 90 || x >= 1450 || y <= 85 || y >= 965) return false;
  if (room(r) && (x < 340 || x > 1190 || y < 220 || y > 950)) return false;
  let obstacles: number[][] = [];
  if (r === 'village') {
    if (isWater(x, y)) return false;
    obstacles = blocks;
  }
  if (r === 'forest') {
    if (
      Math.abs(x - (210 + Math.sin(y / 140) * 26)) < 29 &&
      !(y > 508 && y < 570)
    )
      return false;
    obstacles = [
      [536, 425, 125, 100],
      [1060, 90, 240, 195],
    ];
  }
  if (r === 'sawmill')
    obstacles = [
      [310, 65, 580, 220],
      [1060, 173, 195, 165],
      [114, 570, 120, 136],
      [858, 590, 194, 105],
      [370, 564, 123, 80],
    ];
  if (r === 'pushkino')
    obstacles = [
      [100, 70, 570, 390],
      [988, 290, 150, 140],
      [1280, 150, 115, 500],
    ];
  if (r === 'home' || r === 'dacha')
    obstacles = [
      [135, 120, 205, 300],
      [770, 80, 245, 245],
      [1160, 400, 280, 210],
      [320, 95, 400, 150],
    ];
  if (r === 'shop' || r === 'library')
    obstacles = [
      [100, 120, 220, 355],
      [315, 90, 1040, 165],
      [825, 295, 500, 160],
    ];
  if (r === 'mine')
    obstacles = [
      [280, 90, 85, 300],
      [1140, 90, 75, 330],
    ];
  if (room(r)) obstacles = roomObstacles(r);
  return !obstacles.some(
    ([bx, by, w, h]) =>
      x > bx - 7 && x < bx + w + 7 && y > by - 3 && y < by + h + 7,
  );
}
export function findPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  r: Region = 'village',
) {
  if (!canWalk(tx, ty, r)) return [];
  const size = 8,
    cols = Math.ceil(worldBounds(r).width / size),
    start = Math.round(sy / size) * cols + Math.round(sx / size),
    end = Math.round(ty / size) * cols + Math.round(tx / size),
    queue = [start],
    prev = new Map<number, number>([[start, -1]]);
  let found = false;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === end) {
      found = true;
      break;
    }
    const x = id % cols,
      y = Math.floor(id / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        nid = ny * cols + nx;
      if (
        nx < 0 ||
        nx >= cols ||
        ny < 0 ||
        ny > Math.floor(worldBounds(r).height / size) ||
        prev.has(nid) ||
        !canWalk(nx * size, ny * size, r)
      )
        continue;
      prev.set(nid, id);
      queue.push(nid);
    }
  }
  if (!found) return [];
  const path: { x: number; y: number }[] = [];
  for (let id = end; id !== start; id = prev.get(id)!)
    path.push({ x: (id % cols) * size, y: Math.floor(id / cols) * size });
  path.reverse();
  path.push({ x: tx, y: ty });
  return path;
}

export function lineClear(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: Region,
  walk: (x: number, y: number, r: Region) => boolean = canWalk,
) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 12);
  for (let i = 1; i < steps; i++)
    if (!walk(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps, r))
      return false;
  return true;
}
