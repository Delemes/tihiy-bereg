import { lineClear as sight } from './rpg-geography';
export { sight };
import type { State, Region, Enemy, Status, Projectile } from './rpg-model';
import { note } from './rpg-core';
import { hurtCitizen } from './rpg-crime';
import { unitScale } from './rpg-regions';
export type Walk = (x: number, y: number, r: Region) => boolean;
export const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const addStatus = (
  a: Status[] | undefined,
  kind: Status['kind'],
  time = 4,
  power = 2,
): Status[] => [
  ...(a || []).filter((s) => s.kind !== kind),
  { kind, time, power },
];
export const statusTick = (a: Status[], dt: number) =>
  a.map((s) => ({ ...s, time: s.time - dt })).filter((s) => s.time > 0);
export const damageOverTime = (a: Status[], dt: number) =>
  a.reduce(
    (v, s) => v + (['bleed', 'poison'].includes(s.kind) ? s.power * dt : 0),
    0,
  );
export function spawn(
  s: State,
  owner: string,
  x: number,
  y: number,
  angle: number,
  kind: Projectile['kind'],
  damage: number,
  range: number,
  status?: Status['kind'],
  pierce = false,
) {
  const speed = (kind === 'stone' ? 320 : 440) * unitScale(s.region);
  s.projectiles.push({
    id: (s.seed = (s.seed * 1664525 + 1013904223) >>> 0),
    owner,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: range / speed,
    damage,
    kind,
    status,
    pierce,
  });
}
export function reward(s: State, e: Enemy): State {
  if (e.citizen || s.defeated.includes(e.id)) return s;
  let n = {
    ...s,
    defeated: [...s.defeated, e.id],
    coins: s.coins + e.reward,
    xp: s.xp + e.xp,
  };
  if (e.kind === 'boar' && e.sprite !== 5)
    n.meat += e.style === 'miniboss' ? 3 : 1;
  if (e.style === 'boss') n = { ...n, flags: [...n.flags, 'boss:' + e.id] };
  return note(
    n,
    `${e.name} повержен${e.xp ? ` · ${e.xp} опыта` : ''}${e.reward ? ` · ${e.reward} ₽` : ''}`,
  );
}
export function hitFoe(
  s: State,
  e: Enemy,
  damage: number,
  heavy = false,
  status?: Status['kind'],
): State {
  if (e.citizen) return hurtCitizen(s, e.citizen, damage);
  const f = s.foes[e.id];
  if (!f || f.hp <= 0) return s;
  const front =
    Math.abs(angleDiff(Math.atan2(s.y - f.y, s.x - f.x), f.aim)) < 1.2;
  const armor =
    (e.armor || 0) + (e.style === 'heavy' && front && !heavy ? 10 : 0);
  const dealt = Math.max(2, damage - (heavy ? armor * 0.25 : armor));
  s.foes[e.id] = {
    ...f,
    hp: f.hp - dealt,
    flash: 0.18,
    phase: heavy ? 'recover' : f.phase === 'idle' ? 'chase' : f.phase,
    timer: heavy ? 0.5 : f.timer,
    statuses: status
      ? addStatus(
          f.statuses,
          status,
          status === 'stun'
            ? e.style === 'boss'
              ? 0.3
              : 0.65
            : status === 'slow'
              ? 2.5
              : 4,
        )
      : f.statuses,
  };
  if (s.foes[e.id].hp <= 0) return reward(s, e);
  return s;
}
export function hurt(
  s: State,
  damage: number,
  angle: number,
  status?: Status['kind'],
): State {
  if (s.invulnerable > 0) return s;
  const block =
    s.guarding && Math.abs(angleDiff(angle, s.facing)) < 1.3 && s.energy >= 10;
  const parry = block && s.perks.includes('parry') && s.guardTime < 0.18;
  if (block) s.energy -= parry ? 4 : 10;
  s.hp -= parry ? 0 : block ? Math.ceil(damage * 0.2) : damage;
  s.invulnerable = parry ? 0.5 : 0.55;
  if (status && !block) s.statuses = addStatus(s.statuses, status, 5, 1.8);
  return note(
    s,
    parry
      ? 'Парирование!'
      : block
        ? 'Удар принят на блок.'
        : `Попадание · −${damage} здоровья${status ? ' · ' + { poison: 'яд', bleed: 'кровотечение', slow: 'замедление', stun: 'оглушение' }[status] : ''}`,
  );
}
export function move(
  f: { x: number; y: number },
  angle: number,
  d: number,
  r: Region,
  walk: Walk,
) {
  for (const offset of [0, 0.65, -0.65, 1.2, -1.2]) {
    const x = f.x + Math.cos(angle + offset) * d,
      y = f.y + Math.sin(angle + offset) * d;
    const steps = Math.max(1, Math.ceil(Math.abs(d) / 6));
    let clear = true;
    for (let i = 1; i <= steps; i++) {
      if (
        !walk(f.x + ((x - f.x) * i) / steps, f.y + ((y - f.y) * i) / steps, r)
      ) {
        clear = false;
        break;
      }
    }
    if (clear) {
      f.x = x;
      f.y = y;
      return;
    }
  }
}
