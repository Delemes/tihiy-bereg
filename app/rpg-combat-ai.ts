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

// Состояния: IDLE / PATROL / SUSPICIOUS / CHASE / ATTACK (windup) / RECOVER /
// HURT (вспышка после попадания) / FLEE / DEAD. В сохранение пишутся те же
// четыре фазы, что и раньше, поэтому старые сейвы остаются валидными.
const ai = {
  /** доля дистанции атаки, на которой враг держится */
  ring: 0.82,
  /** ближе этой доли — отступает, а не липнет к герою */
  press: 0.55,
  /** радиус патруля вокруг поста */
  patrol: 34,
  /** пауза между атаками */
  cooldown: 0.45,
  /** порог вспышки: враг сбит с шага */
  stagger: 0.12,
  /** доля здоровья, при которой обычный враг отступает */
  flee: 0.2,
  /** дистанция расталкивания врагов между собой */
  separation: 26,
  /** дальше этого враг теряет интерес и возвращается на пост */
  leash: 480,
};

type Foe = NonNullable<State['foes'][string]>;
type Post = { x: number; y: number; speed: number; style: string };

/** Устойчивое смещение на врага: одинаковые враги не двигаются синхронно. */
function offset(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** IDLE / PATROL: враг живёт на посту, а не стоит статуей. */
function patrol(
  n: State,
  f: Foe,
  e: Post,
  u: number,
  dt: number,
  walk: Walk,
  seed: number,
) {
  const home = Math.hypot(f.x - e.x, f.y - e.y);
  const back = Math.atan2(e.y - f.y, e.x - f.x);
  if (e.style === 'ambush') {
    if (home > 6) move(f, back, e.speed * u * dt, n.region, walk);
    return;
  }
  if (home > ai.patrol * u) {
    move(f, back, e.speed * 0.6 * u * dt, n.region, walk);
    return;
  }
  const heading =
    Math.sin(n.minutes * 0.35 + seed * 7) * Math.PI + seed * Math.PI * 2;
  f.aim = heading;
  move(f, heading, e.speed * 0.3 * u * dt, n.region, walk);
}

export function updateEnemies(n: State, dt: number, walk: Walk): State {
  const u = unitScale(n.region);
  const list = activeEnemies(n);
  for (const e of list) {
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
    const seed = offset(e.id);
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
    // HURT: попадание сбивает врага с шага и прерывает замах.
    const staggered = f.flash > ai.stagger;
    if (d > ai.leash * u || (n.smokeTime > 0 && d > 45 * u)) {
      f.phase = 'idle';
      patrol(n, f, e, u, dt, walk, seed);
      continue;
    }
    if (f.phase === 'idle') {
      if (d < detect && los) {
        f.phase = 'chase';
        f.timer = 0;
      } else if (d < detect * 1.5 && !los) {
        // SUSPICIOUS: слышит, но не видит — идёт проверить.
        f.aim = angle;
        move(f, angle, e.speed * 0.55 * u * dt, n.region, walk);
        continue;
      } else {
        const lure = n.lure
          ? Math.hypot(n.lure.x - f.x, n.lure.y - f.y)
          : Infinity;
        if (n.lure && lure < 320 * u && lure > 14 * u) {
          f.aim = Math.atan2(n.lure.y - f.y, n.lure.x - f.x);
          move(f, f.aim, e.speed * u * dt, n.region, walk);
        } else patrol(n, f, e, u, dt, walk, seed);
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
    // FLEE: раненый обычный враг разрывает дистанцию вместо обмена ударами.
    if (
      !e.citizen &&
      f.hp <= e.hp * ai.flee &&
      !['boss', 'miniboss', 'elite'].includes(e.style) &&
      f.phase !== 'windup'
    ) {
      f.phase = 'chase';
      f.aim = angle + Math.PI;
      f.timer = Math.max(f.timer, 0.7);
      move(f, angle + Math.PI, spd * 1.05 * dt, n.region, walk);
      continue;
    }
    if (f.phase === 'chase') {
      f.aim = angle;
      if (!los && d > detect) {
        f.phase = 'idle';
        continue;
      }
      const ring = ranged ? Math.max(150 * u, reach * 0.7) : reach * ai.ring;
      if (!staggered) {
        if (d > ring) {
          const flank =
            (e.style === 'fast' || e.style === 'elite' ? 0.5 : 0.2) *
            Math.sin(n.minutes * 0.6 + seed * 6.283);
          move(f, angle + flank, spd * dt, n.region, walk);
        } else if (d < ring * ai.press)
          move(f, angle + Math.PI, spd * 0.85 * dt, n.region, walk);
        else
          move(
            f,
            angle + (seed > 0.5 ? 1 : -1) * (Math.PI / 2),
            spd * 0.5 * dt,
            n.region,
            walk,
          );
      }
      if (d < reach && los && f.timer <= 0 && !staggered) {
        f.phase = 'windup';
        f.aim = angle;
        f.timer =
          e.windup * (e.style === 'boss' && f.hp < e.hp * 0.5 ? 0.8 : 1);
      }
    } else if (f.phase === 'windup') {
      if (staggered) {
        f.phase = 'recover';
        f.timer = 0.5;
        continue;
      }
      if (f.timer <= 0) {
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
            Math.abs(angleDiff(Math.atan2(n.y - f.y, n.x - f.x), f.aim)) <
              cone &&
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
      }
    } else if (f.phase === 'recover' && f.timer <= 0) {
      f.phase = 'chase';
      f.timer = ai.cooldown * (e.style === 'elite' ? 0.7 : 1);
    }
  }
  // Расталкивание: несколько врагов не сливаются в одну кучу спрайтов.
  const crowd = list
    .map((e) => n.foes[e.id])
    .filter((f): f is Foe => !!f && f.hp > 0);
  const gap = ai.separation * u;
  for (let i = 0; i < crowd.length; i++)
    for (let j = i + 1; j < crowd.length; j++) {
      const a = crowd[i],
        b = crowd[j];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dist = Math.hypot(dx, dy);
      if (dist >= gap) continue;
      const push = (gap - Math.max(dist, 1)) / 2,
        away = dist > 0.001 ? Math.atan2(dy, dx) : offset(a.id) * Math.PI * 2;
      move(b, away, push, n.region, walk);
      move(a, away + Math.PI, push, n.region, walk);
    }
  return n;
}
