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
import {
  advanceStride,
  canRun,
  gaitFor,
  motionTuning,
  stepMotion,
  targetSpeed,
  type Gait,
  type MotionMode,
} from './rpg-motion';
import { attackFrames, type AttackFrames } from './rpg-weapon-profiles';
import { hitStopFor, shakeFor } from './rpg-combat-state';
export { perks, learn } from './rpg-progression';
export { sight } from './rpg-combat-rules';
export { combatPhase } from './rpg-combat-state';
export type Input = {
  dx: number;
  dy: number;
  attack?: boolean;
  heavy?: boolean;
  special?: boolean;
  dodge?: boolean;
  guard?: boolean;
  /** Бег. Старые вызовы его не передают: тогда бег берётся с Shift. */
  run?: boolean;
  heal?: boolean;
  throw?: boolean;
  cycle?: boolean;
  sneak?: boolean;
  hostile?: boolean;
  aim?: number;
};

/**
 * Поля движения и обратной связи. Все необязательные: в старых
 * сохранениях их нет, и игра просто стартует с нулевой скорости.
 */
export type MotionState = {
  /** Скорость в единицах локации за секунду, без масштаба региона. */
  vx?: number;
  vy?: number;
  /** Фаза шага 0..1 для анимации. */
  stride?: number;
  gait?: Gait;
  /** Отдача камеры и короткая остановка кадра при попадании. */
  shake?: number;
  hitStop?: number;
  /** Короткая реакция на полученный урон. */
  hurtTime?: number;
  /** Номер взмаха и уже задетые им цели. */
  swingId?: number;
  swingHits?: string[];
};
type Hero = State & MotionState;

/** Крит без обращения к seed: зависит только от номера взмаха. */
const critical = (id: number, chance: number) =>
  chance > 0 && (Math.imul(id + 1, 2654435761) >>> 0) % 1000 < chance * 1000;

/** Активное окно не короче 0.16 с: удар должен быть виден и попадать. */
const activeWindow = (frames: AttackFrames) => Math.max(frames.active, 0.16);

function swingDamage(n: Hero, frames: AttackFrames): number {
  const combo = frames.kind === 'light' && n.combo === 3 ? 1.3 : 1;
  const starving = n.hunger < 20 ? 0.75 : 1;
  const growth = Math.min(8, Math.floor(n.xp / 160));
  const crit = critical(n.swingId ?? 0, frames.criticalChance);
  return Math.max(
    1,
    Math.round(
      (frames.damage * combo * starving + growth) *
        (crit ? frames.criticalMultiplier : 1),
    ),
  );
}

export function tickWorld(
  s: State,
  dt: number,
  input: Input,
  walk: Walk,
): State {
  dt = clamp(dt, 0, 0.05);
  const u = unitScale(s.region);
  const prev = s as Hero;
  const length = Math.hypot(input.dx, input.dy);
  const walking = length > 0.01;
  // Shift в движении — бег, на месте — блок. Новый слой ввода разводит
  // эти действия явно и присылает run отдельно.
  const shiftOnly = input.run === undefined;
  const wantsRun = shiftOnly ? !!input.guard && walking : !!input.run;
  const wantsGuard = !!input.guard && !(shiftOnly && wantsRun);
  let n: Hero = {
    ...prev,
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
    guardTime: wantsGuard ? s.guardTime + dt : 0,
    guarding: wantsGuard && s.energy > 2 && s.dash <= 0,
    sneaking: !!input.sneak,
    shake: Math.max(0, (prev.shake ?? 0) - dt * 9),
    hitStop: Math.max(0, (prev.hitStop ?? 0) - dt),
    hurtTime: Math.max(0, (prev.hurtTime ?? 0) - dt),
    swingHits: Array.isArray(prev.swingHits) ? [...prev.swingHits] : [],
    swingId: typeof prev.swingId === 'number' ? prev.swingId : 0,
  };
  n.hp -= damageOverTime(s.statuses, dt);
  if (input.hostile) n.hostileMode = !n.hostileMode;
  if (input.cycle)
    n.throwItem = (
      { stones: 'throwing', throwing: 'smoke', smoke: 'stones' } as const
    )[n.throwItem];
  if (input.heal) {
    n = applyConsumable(n, 'bandages') as Hero;
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
    n.swingHits = [];
    if (length) n.facing = Math.atan2(input.dy, input.dx);
  }
  // Попадание на мгновение притормаживает мир, но не таймеры состояний.
  const wdt = (n.hitStop ?? 0) > 0 ? dt * 0.2 : dt;
  const mode: MotionMode =
    n.dash > 0
      ? 'dash'
      : n.attackDelay > 0 || n.swing > 0
        ? 'attack'
        : n.guarding
          ? 'guard'
          : n.sneaking
            ? 'sneak'
            : 'free';
  const running = canRun(wantsRun, walking, n.energy, mode !== 'free');
  const speed = targetSpeed(mode, running, slow);
  const velocity =
    mode === 'dash'
      ? {
          vx: Math.cos(n.facing) * speed,
          vy: Math.sin(n.facing) * speed,
        }
      : stepMotion(
          { vx: prev.vx ?? 0, vy: prev.vy ?? 0 },
          stunned ? 0 : input.dx,
          stunned ? 0 : input.dy,
          speed,
          wdt,
        );
  const pace = Math.hypot(velocity.vx, velocity.vy);
  const distance = pace * u * wdt;
  if (distance > 0.01) {
    const steps = Math.max(1, Math.ceil(distance / 6));
    let blockedX = false,
      blockedY = false;
    for (let i = 0; i < steps; i++) {
      const x = n.x + (velocity.vx * u * wdt) / steps,
        y = n.y + (velocity.vy * u * wdt) / steps;
      if (walk(x, n.y, n.region)) n.x = x;
      else blockedX = true;
      if (walk(n.x, y, n.region)) n.y = y;
      else blockedY = true;
    }
    // У стены гасится только заблокированная ось: остаётся скольжение
    // вдоль стен и углов, а не полная остановка.
    if (blockedX) velocity.vx = 0;
    if (blockedY) velocity.vy = 0;
  }
  n.vx = velocity.vx;
  n.vy = velocity.vy;
  n.gait = gaitFor(Math.hypot(velocity.vx, velocity.vy));
  n.stride = advanceStride(prev.stride ?? 0, pace * wdt, n.gait);
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
    const kind = n.bufferedAttack;
    const frames = attackFrames(n.weapon, w, kind);
    const cost = Math.round(
      frames.staminaCost *
        (kind === 'special' && n.perks.includes('riposte') ? 0.77 : 1),
    );
    if (n.energy >= cost && (!w.ammo || n[w.ammo] > 0)) {
      n.energy -= cost;
      n.attackKind = kind;
      n.combo = kind === 'light' && n.comboWindow > 0 ? (n.combo % 3) + 1 : 1;
      n.comboWindow = frames.total + 0.55;
      n.attackBuffer = 0;
      n.bufferedAttack = null;
      n.attackFacing = n.facing;
      // startup: замах без hitbox
      n.attackDelay = frames.startup;
      // recovery задаёт кулдаун: следующий удар только после всей атаки
      n.cooldown = Math.max(
        frames.total,
        frames.startup + activeWindow(frames) + 0.05,
      );
      n.noise = 2.5;
      n.swingId = (n.swingId ?? 0) + 1;
      n.swingHits = [];
    }
  }
  if (n.attackDelay > 0) {
    n.attackDelay = Math.max(0, n.attackDelay - dt);
    if (n.attackDelay === 0 && !stunned) {
      // startup → active: теперь оружие действительно бьёт
      const frames = attackFrames(n.weapon, w, n.attackKind);
      n.swing = activeWindow(frames);
      n.swingHeavy = n.attackKind !== 'light';
      n.swingHits = [];
      if (w.mode === 'ranged' && w.ammo && n[w.ammo] > 0) {
        n[w.ammo]--;
        spawn(
          n,
          'hero',
          n.x,
          n.y,
          n.attackFacing,
          w.ammo === 'stones' ? 'stone' : 'arrow',
          swingDamage(n, frames) *
            (n.perks.includes('archery') ? 1.2 : 1),
          w.reach * u,
          n.weapon === 'sling' && n.swingHeavy ? 'stun' : undefined,
          n.swingHeavy,
        );
      }
    }
  }
  // ACTIVE: урон проверяется всё активное окно, но одна цель может получить
  // попадание один раз за взмах.
  if (n.swing > 0 && w.mode !== 'ranged' && !stunned) {
    const frames = attackFrames(n.weapon, w, n.attackKind);
    const heavy = n.attackKind !== 'light';
    const special = n.attackKind === 'special';
    const damage = swingDamage(n, frames);
    for (const e of list) {
      const f = n.foes[e.id];
      if (!f || f.hp <= 0) continue;
      const hits = n.swingHits ?? [];
      if (hits.includes(e.id)) continue;
      const d = Math.hypot(f.x - n.x, f.y - n.y),
        diff = Math.abs(
          angleDiff(Math.atan2(f.y - n.y, f.x - n.x), n.attackFacing),
        );
      if (
        d > frames.reach * u ||
        diff > frames.arc ||
        !sight(n.x, n.y, f.x, f.y, n.region, walk)
      )
        continue;
      n.swingHits = [...hits, e.id];
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
      ) as Hero;
      const target = n.foes[e.id];
      if (target) {
        move(target, n.attackFacing, frames.knockback * u, n.region, walk);
        target.flash = Math.max(target.flash, frames.stagger);
      }
      n.hitStop = Math.max(n.hitStop ?? 0, hitStopFor(damage, heavy));
      n.shake = Math.min(6, Math.max(n.shake ?? 0, shakeFor(damage, heavy)));
    }
    if (n.hostileMode)
      for (const p of activePlaces(n).filter(
        (p) =>
          p.kind === 'npc' &&
          !citizen(n, p.id).hostile &&
          !citizen(n, p.id).dead,
      )) {
        const hits = n.swingHits ?? [];
        if (hits.includes(p.id)) continue;
        if (
          Math.hypot(p.x - n.x, p.y - n.y) < frames.reach * u &&
          Math.abs(
            angleDiff(Math.atan2(p.y - n.y, p.x - n.x), n.attackFacing),
          ) < 1.2 &&
          sight(n.x, n.y, p.x, p.y, n.region, walk)
        ) {
          n.swingHits = [...hits, p.id];
          n = hurtCitizen(n, p.id, damage) as Hero;
        }
      }
  }
  const hpBefore = n.hp;
  n = updateEnemies(n, wdt, walk) as Hero;
  n = updateProjectiles(n, wdt, walk) as Hero;

  n = triggerHazards(n) as Hero;
  if (n.hp < hpBefore) {
    // HURT: короткая реакция и срыв разгона — без потери управления.
    n.hurtTime = 0.2;
    n.shake = Math.min(
      6,
      Math.max(n.shake ?? 0, Math.max(1.2, shakeFor(hpBefore - n.hp, false))),
    );
    n.vx = (n.vx ?? 0) * 0.35;
    n.vy = (n.vy ?? 0) * 0.35;
  }
  if (n.hp <= 0)
    return defeat({
      ...n,
      projectiles: [],
      statuses: [],
      attackDelay: 0,
      hostileMode: false,
      swing: 0,
      swingHits: [],
      vx: 0,
      vy: 0,
      stride: 0,
      gait: 'idle',
      hitStop: 0,
      shake: 0,
      hurtTime: 0.45,
    } as Hero);
  n.energy = clamp(
    n.energy +
      (n.guarding
        ? -2
        : running
          ? -motionTuning.runStamina
          : n.cooldown > 0
            ? 0
            : n.hunger < 20
              ? 3
              : 11) *
        (n.perks.includes('endurance') ? 1.3 : 1) *
        dt,
  );
  return n;
}
