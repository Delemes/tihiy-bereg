import { triggerHazards } from './rpg-exploration';
import { activeEnemies, activePlaces, type State } from './rpg-model';
import { weapons } from './rpg-equipment';
import { clamp, defeat, applyConsumable } from './rpg-core';
import { citizen, hurtCitizen } from './rpg-crime';
import { unitScale } from './rpg-regions';
import {
  statusTick,
  damageOverTime,
  spawn,
  hitFoe,
  move,
  angleDiff,
  sight,
  type Walk,
} from './rpg-combat-rules';
import { updateEnemies } from './rpg-combat-ai';
import { updateProjectiles } from './rpg-projectiles';
export { perks, learn } from './rpg-progression';
export { sight } from './rpg-combat-rules';
export type Input = {
  dx: number;
  dy: number;
  attack?: boolean;
  heavy?: boolean;
  special?: boolean;
  dodge?: boolean;
  guard?: boolean;
  heal?: boolean;
  throw?: boolean;
  cycle?: boolean;
  sneak?: boolean;
  hostile?: boolean;
  aim?: number;
};
export function tickWorld(
  s: State,
  dt: number,
  input: Input,
  walk: Walk,
): State {
  dt = clamp(dt, 0, 0.05);
  const u = unitScale(s.region);
  let n: State = {
    ...s,
    lure:
      s.lure && s.lure.time > dt ? { ...s.lure, time: s.lure.time - dt } : null,
    foes: Object.fromEntries(
      Object.entries(s.foes).map(([id, f]) => [
        id,
        { ...f, statuses: [...(f.statuses || [])] },
      ]),
    ),
    projectiles: s.projectiles.map((p) => ({ ...p })),
    statuses: statusTick(s.statuses, dt),
    cooldown: Math.max(0, s.cooldown - dt),
    comboWindow: Math.max(0, s.comboWindow - dt),
    attackBuffer: Math.max(0, s.attackBuffer - dt),
    invulnerable: Math.max(0, s.invulnerable - dt),
    swing: Math.max(0, s.swing - dt),
    dash: Math.max(0, s.dash - dt),
    healCooldown: Math.max(0, s.healCooldown - dt),
    smokeTime: Math.max(0, s.smokeTime - dt),
    noise: Math.max(0, s.noise - dt),
    guardTime: input.guard ? s.guardTime + dt : 0,
    guarding: !!input.guard && s.energy > 2 && s.dash <= 0,
    sneaking: !!input.sneak,
  };
  n.hp -= damageOverTime(s.statuses, dt);
  if (input.hostile) n.hostileMode = !n.hostileMode;
  if (input.cycle)
    n.throwItem = (
      { stones: 'throwing', throwing: 'smoke', smoke: 'stones' } as const
    )[n.throwItem];
  if (input.heal) {
    n = applyConsumable(n, 'bandages');
    if (n.bandages < s.bandages)
      n.statuses = n.statuses.filter((x) => x.kind !== 'bleed');
  }
  const stunned = n.statuses.some((x) => x.kind === 'stun'),
    slow = n.statuses.some((x) => x.kind === 'slow');
  if (stunned) {
    n.guarding = false;
    n.guardTime = 0;
  }
  if (n.guarding && !s.guarding) {
    n.attackDelay = 0;
    n.swing = 0;
    n.attackBuffer = 0;
    n.bufferedAttack = null;
  }
  const length = Math.hypot(input.dx, input.dy);
  if (
    input.aim !== undefined &&
    Number.isFinite(input.aim) &&
    n.attackDelay <= 0 &&
    n.swing <= 0 &&
    n.dash <= 0
  )
    n.facing = input.aim;
  else if (
    input.aim === undefined &&
    length &&
    !n.guarding &&
    n.attackDelay <= 0 &&
    n.swing <= 0 &&
    n.dash <= 0
  )
    n.facing = Math.atan2(input.dy, input.dx);
  const dodgeCost = n.perks.includes('footwork') ? 16 : 22;
  if (input.dodge && !stunned && n.energy >= dodgeCost && n.dash <= 0) {
    n.energy -= dodgeCost;
    n.dash = 0.22;
    n.invulnerable = 0.3;
    n.cooldown = Math.max(n.cooldown, 0.35);
    n.guarding = false;
    n.attackDelay = 0;
    n.attackBuffer = 0;
    n.bufferedAttack = null;
    n.swing = 0;
    if (length) n.facing = Math.atan2(input.dy, input.dx);
  }
  if (!stunned && (length || n.dash > 0)) {
    const speed =
      (n.dash > 0
        ? 420
        : n.guarding
          ? 66
          : n.sneaking
            ? 77
            : n.attackDelay > 0
              ? 65
              : 146) *
      u *
      (slow ? 0.55 : 1);
    const angle = n.dash > 0 ? n.facing : Math.atan2(input.dy, input.dx);
    const distance = speed * dt,
      steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 0; i < steps; i++) {
      const x = n.x + (Math.cos(angle) * distance) / steps,
        y = n.y + (Math.sin(angle) * distance) / steps;
      if (walk(x, n.y, n.region)) n.x = x;
      if (walk(n.x, y, n.region)) n.y = y;
    }
  }
  const list = activeEnemies(n);
  for (const e of list)
    if (!n.foes[e.id])
      n.foes[e.id] = {
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.citizen ? citizen(n, e.citizen).hp : e.hp,
        phase: 'idle',
        timer: 0,
        aim: Math.PI / 2,
        flash: 0,
        statuses: [],
        attacks: 0,
      };
  if (
    input.throw &&
    n.cooldown <= 0 &&
    !n.guarding &&
    !stunned &&
    n[n.throwItem] > 0 &&
    n.energy >= 8
  ) {
    n[n.throwItem]--;
    n.energy -= 8;
    n.cooldown = 0.5;
    n.noise = n.throwItem === 'stones' ? 0 : 2;
    if (n.throwItem === 'smoke') {
      n.smokeTime = 5;
      for (const f of Object.values(n.foes)) {
        f.phase = 'idle';
        f.timer = 2;
      }
    } else
      spawn(
        n,
        'hero',
        n.x,
        n.y,
        n.facing,
        n.throwItem === 'stones' ? 'stone' : 'knife',
        n.throwItem === 'stones' ? 8 : 23,
        360 * u,
        n.throwItem === 'throwing' ? 'bleed' : 'stun',
      );
  }
  const w = weapons[n.weapon];
  if (input.attack || input.heavy || input.special) {
    n.bufferedAttack = input.special
      ? 'special'
      : input.heavy
        ? 'heavy'
        : 'light';
    n.attackBuffer = 0.16;
  }
  if (
    n.bufferedAttack &&
    n.attackBuffer > 0 &&
    n.cooldown <= 0 &&
    !n.guarding &&
    n.dash <= 0 &&
    !stunned
  ) {
    const kind = n.bufferedAttack,
      cost =
        kind === 'special'
          ? n.perks.includes('riposte')
            ? 20
            : 26
          : kind === 'heavy'
            ? 22
            : 7;
    if (n.energy >= cost && (!w.ammo || n[w.ammo] > 0)) {
      n.energy -= cost;
      n.attackKind = kind;
      n.combo = kind === 'light' && n.comboWindow > 0 ? (n.combo % 3) + 1 : 1;
      n.comboWindow = w.speed + 0.65;
      n.attackBuffer = 0;
      n.bufferedAttack = null;
      n.attackFacing = n.facing;
      n.attackDelay = kind === 'light' ? 0.07 : kind === 'heavy' ? 0.23 : 0.16;
      n.cooldown = w.speed * (kind === 'light' ? 1 : 1.45);
      n.noise = 2.5;
    }
  }
  if (n.attackDelay > 0) {
    n.attackDelay = Math.max(0, n.attackDelay - dt);
    if (n.attackDelay === 0 && !stunned) {
      const heavy = n.attackKind !== 'light',
        special = n.attackKind === 'special';
      n.swing = heavy ? 0.3 : 0.2;
      n.swingHeavy = heavy;
      const damage = Math.round(
        w.damage *
          (heavy ? 1.65 : n.combo === 3 ? 1.3 : 1) *
          (n.hunger < 20 ? 0.75 : 1) +
          Math.min(8, Math.floor(n.xp / 160)),
      );
      if (w.mode === 'ranged' && w.ammo && n[w.ammo] > 0) {
        n[w.ammo]--;
        spawn(
          n,
          'hero',
          n.x,
          n.y,
          n.attackFacing,
          w.ammo === 'stones' ? 'stone' : 'arrow',
          damage * (n.perks.includes('archery') ? 1.2 : 1),
          w.reach * u,
          n.weapon === 'sling' && heavy ? 'stun' : undefined,
          heavy,
        );
      } else if (w.mode !== 'ranged') {
        for (const e of list) {
          const f = n.foes[e.id];
          if (!f || f.hp <= 0) continue;
          const d = Math.hypot(f.x - n.x, f.y - n.y),
            diff = Math.abs(
              angleDiff(Math.atan2(f.y - n.y, f.x - n.x), n.attackFacing),
            );
          if (
            d <= (w.reach + (heavy ? 15 : 0)) * u &&
            diff <
              (special ? Math.min(1.6, (w.arc || 1.2) + 0.25) : w.arc || 1.2) &&
            sight(n.x, n.y, f.x, f.y, n.region, walk)
          ) {
            n = hitFoe(
              n,
              e,
              damage,
              heavy,
              heavy && ['knife', 'saber'].includes(n.weapon)
                ? 'bleed'
                : special
                  ? 'slow'
                  : undefined,
            );
            if (n.foes[e.id])
              move(
                n.foes[e.id],
                n.attackFacing,
                (special || n.combo === 3 ? 30 : heavy ? 20 : 7) * u,
                n.region,
                walk,
              );
          }
        }
        if (n.hostileMode)
          for (const p of activePlaces(n).filter(
            (p) =>
              p.kind === 'npc' &&
              !citizen(n, p.id).hostile &&
              !citizen(n, p.id).dead,
          )) {
            if (
              Math.hypot(p.x - n.x, p.y - n.y) < w.reach * u &&
              Math.abs(
                angleDiff(Math.atan2(p.y - n.y, p.x - n.x), n.attackFacing),
              ) < 1.2 &&
              sight(n.x, n.y, p.x, p.y, n.region, walk)
            )
              n = hurtCitizen(n, p.id, damage);
          }
      }
    }
  }
  n = updateEnemies(n, dt, walk);
  n = updateProjectiles(n, dt, walk);

  n = triggerHazards(n);
  if (n.hp <= 0)
    return defeat({
      ...n,
      projectiles: [],
      statuses: [],
      attackDelay: 0,
      hostileMode: false,
    });
  n.energy = clamp(
    n.energy +
      (n.guarding ? -2 : n.cooldown > 0 ? 0 : n.hunger < 20 ? 3 : 11) *
        (n.perks.includes('endurance') ? 1.3 : 1) *
        dt,
  );
  return n;
}
