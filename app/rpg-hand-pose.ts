import type { Weapon } from './rpg-model';

export const walkFrames = [
  [
    [120, 28, 154, 324],
    [469, 24, 148, 326],
    [812, 26, 152, 326],
  ],
  [
    [98, 372, 183, 320],
    [470, 373, 142, 319],
    [806, 373, 182, 319],
  ],
  [
    [97, 725, 188, 322],
    [473, 722, 141, 325],
    [794, 722, 190, 325],
  ],
  [
    [117, 1074, 160, 320],
    [469, 1073, 148, 321],
    [812, 1074, 156, 320],
  ],
] as const;

// Centres of the visible gripping fist in the original walk atlas, per frame.
// Keeping these in source pixels makes the grip follow the actual arm swing.
const fists = [
  [
    [138, 216],
    [489, 237],
    [839, 215],
  ],
  [
    [224, 570],
    [547, 578],
    [947, 571],
  ],
  [
    [146, 929],
    [541, 933],
    [830, 935],
  ],
  [
    [258, 1275],
    [598, 1281],
    [948, 1280],
  ],
] as const;

export function facingRow(angle: number) {
  return Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
    ? Math.cos(angle) < 0
      ? 1
      : 2
    : Math.sin(angle) < 0
      ? 3
      : 0;
}

export function handPose(face: number, frame: number) {
  const [sx, sy, w, h] = walkFrames[face][frame];
  const [fx, fy] = fists[face][frame];
  return {
    x: (fx - sx - w / 2) * 0.22,
    y: (fy - sy - h) * 0.22,
    crop: [fx - 10, fy - 9, 20, 18] as const,
    behind: face === 3,
  };
}

type WeaponArt = {
  crop: readonly [number, number, number, number];
  grip: readonly [number, number];
  size: number;
  vertical?: boolean;
};
// Grip locations and visual sizes belong to the artwork, never to attack reach.
export const heldWeaponArt: Record<Exclude<Weapon, 'fists'>, WeaponArt> = {
  stick: { crop: [23, 186, 345, 132], grip: [65, 70], size: 34 },
  knife: { crop: [398, 213, 350, 92], grip: [80, 40], size: 29 },
  axe: { crop: [774, 181, 353, 160], grip: [56, 65], size: 36 },
  spear: { crop: [1157, 217, 365, 74], grip: [140, 33], size: 83 },
  saber: { crop: [22, 648, 497, 117], grip: [65, 55], size: 42 },
  bow: {
    crop: [546, 466, 148, 430],
    grip: [122, 225],
    size: 50,
    vertical: true,
  },
  crossbow: { crop: [775, 578, 375, 239], grip: [105, 128], size: 45 },
  sling: { crop: [1197, 592, 313, 201], grip: [195, 115], size: 32 },
};

export function weaponPose(
  weapon: Exclude<Weapon, 'fists'>,
  angle: number,
  windup: number,
  swing: number,
  heavy = false,
  guard = false,
  combo = 1,
) {
  const art = heldWeaponArt[weapon],
    face = facingRow(angle);
  const side = face === 0 || face === 1 ? -1 : 1;
  const ranged = ['bow', 'crossbow', 'sling'].includes(weapon);
  const progress = Math.max(0, Math.min(1, 1 - swing / (heavy ? 0.3 : 0.2)));
  let rotation: number;
  if (windup > 0 || swing > 0) {
    const arc = heavy ? 0.8 : 0.65;
    const sweep =
      ranged || weapon === 'spear'
        ? 0
        : windup > 0
          ? -arc
          : -arc + progress * arc * 2;
    const mirror = face === 1 || face === 3 ? -1 : 1;
    rotation = angle + sweep * mirror * (combo === 2 ? -1 : 1);
  } else if (guard) rotation = -Math.PI / 2 + side * 0.3;
  else if (weapon === 'bow') rotation = side === 1 ? Math.PI : 0;
  else if (weapon === 'spear') rotation = -Math.PI / 2 + side * 0.22;
  else if (ranged) rotation = side === 1 ? 0.1 : Math.PI - 0.1;
  else rotation = Math.PI / 2 - side * 0.65;
  return { ...art, rotation, scale: art.size / art.crop[art.vertical ? 3 : 2] };
}
