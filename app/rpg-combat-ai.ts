import { activeEnemies, type State } from './rpg-model';
import { citizen, hurtCitizen } from './rpg-crime';
import { unitScale } from './rpg-regions';
import {
  statusTick,
  damageOverTime,
  reward,
  move,
  sight,
  spawn,
  hurt,
  angleDiff,
  type Walk,
} from './rpg-combat-rules';
export function updateEnemies(n: State, dt: number, walk: Walk): State {
  const u = unitScale(n.region);
  for (const e of activeEnemies(n)) {
    const f = n.foes[e.id];
    if (!f) continue;
    if (e.citizen) f.hp = citizen(n, e.citizen).hp;
    f.hp -= damageOverTime(f.statuses || [], dt);
    f.statuses = statusTick(f.statuses || [], dt);
    f.flash = Math.max(0, f.flash - dt);
    f.timer -= dt;
    if (f.hp <= 0) {
      n = e.citizen ? hurtCitizen(n, e.citizen, 999) : reward(n, e);
      continue;
    }
    if (f.statuses.some((s) => s.kind === 'stun')) continue;
    const d = Math.hypot(n.x - f.x, n.y - f.y),
      angle = Math.atan2(n.y - f.y, n.x - f.x),
      los = sight(f.x, f.y, n.x, n.y, n.region, walk);
    const detect =
      (n.smokeTime > 0
        ? 30
        : n.noise > 0
          ? 340
          : n.sneaking
            ? n.perks.includes('survival')
              ? 65
              : 95
            : e.style === 'ambush'
              ? 100
              : 240) * u;
    if (d > 480 * u || (n.smokeTime > 0 && d > 45 * u)) {
      f.phase = 'idle';
      if (Math.hypot(f.x - e.x, f.y - e.y) > 8)
        move(
          f,
          Math.atan2(e.y - f.y, e.x - f.x),
          e.speed * u * dt,
          n.region,
          walk,
        );
      continue;
    }
    if (f.phase === 'idle') {
      if (d < detect && los) f.phase = 'chase';
      else {
        if (
          n.lure &&
          Math.hypot(n.lure.x - f.x, n.lure.y - f.y) < 320 * u &&
          Math.hypot(n.lure.x - f.x, n.lure.y - f.y) > 14 * u
        ) {
          f.aim = Math.atan2(n.lure.y - f.y, n.lure.x - f.x);
          move(f, f.aim, e.speed * u * dt, n.region, walk);
        }
        continue;
      }
    }
    const ranged =
      e.style === 'ranged' || (e.style === 'ambush' && e.reach > 200);
    const reach = e.reach * u,
      spd =
        e.speed *
        u *
        (f.statuses.some((s) => s.kind === 'slow') ? 0.5 : 1) *
        (e.style === 'boss' && f.hp < e.hp * 0.5 ? 1.2 : 1);
    if (f.phase === 'chase') {
      f.aim = angle;
      if (ranged && d < 140 * u)
        move(f, angle + Math.PI, spd * dt, n.region, walk);
      if (d < reach && los) {
        f.phase = 'windup';
        f.aim = angle;
        f.timer =
          e.windup * (e.style === 'boss' && f.hp < e.hp * 0.5 ? 0.8 : 1);
      } else {
        const flank =
          e.style === 'fast' || e.style === 'elite'
            ? 0.45 * Math.sin((f.attacks || 0) + n.minutes)
            : 0;
        move(f, angle + flank, spd * dt, n.region, walk);
      }
    } else if (f.phase === 'windup' && f.timer <= 0) {
      f.attacks = (f.attacks || 0) + 1;
      if (ranged || (e.style === 'boss' && f.attacks % 3 === 0)) {
        for (const spread of e.style === 'boss' ? [-0.25, 0, 0.25] : [0])
          spawn(
            n,
            e.id,
            f.x,
            f.y,
            f.aim + spread,
            'arrow',
            e.attack,
            600 * u,
            e.status,
          );
      } else {
        const charging = e.style === 'miniboss' || e.style === 'fast';
        if (charging) move(f, f.aim, 70 * u, n.region, walk);
        const dist = Math.hypot(n.x - f.x, n.y - f.y),
          cone = e.style === 'boss' && f.attacks % 2 === 0 ? 1.35 : 1.05;
        if (
          dist < reach + 10 * u &&
          Math.abs(angleDiff(Math.atan2(n.y - f.y, n.x - f.x), f.aim)) < cone &&
          sight(f.x, f.y, n.x, n.y, n.region, walk)
        )
          n = hurt(n, e.attack, Math.atan2(f.y - n.y, f.x - n.x), e.status);
      }
      f.phase = 'recover';
      f.timer =
        e.style === 'heavy' || e.style === 'miniboss'
          ? 1.35
          : e.style === 'elite'
            ? 0.45
            : 0.85;
    } else if (f.phase === 'recover' && f.timer <= 0) f.phase = 'chase';
  }

  return n;
}
