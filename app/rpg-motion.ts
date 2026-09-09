// Модель передвижения героя: разгон, торможение, шаг и бег.
// Чистые функции без DOM и без импортов игрового состояния — легко проверять.

export type Gait = 'idle' | 'walk' | 'run';
export type MotionMode = 'free' | 'sneak' | 'guard' | 'attack' | 'dash';

export type Velocity = { vx: number; vy: number };

export const motionTuning = {
  /** Базовая скорость шага в единицах локации за секунду. */
  walk: 146,
  /** Бег: заметно быстрее шага, но тратит силы. */
  run: 232,
  sneak: 77,
  guard: 66,
  /** Во время замаха герой только доворачивает корпус. */
  attack: 62,
  dash: 420,
  /** Разгон до полной скорости примерно за 0.1 с — управление не инертное. */
  accel: 1750,
  /** Торможение быстрее разгона, чтобы не проезжать узкие проходы. */
  brake: 2600,
  /** Резкая смена направления обрабатывается ещё быстрее. */
  turnBoost: 1.8,
  /** Расход сил за секунду бега. */
  runStamina: 11,
  /** Ниже этого запаса сил бег недоступен. */
  runFloor: 12,
} as const;

export type MotionTuning = typeof motionTuning;

/** Целевая скорость с учётом режима, бега и замедления. */
export function targetSpeed(
  mode: MotionMode,
  running: boolean,
  slowed = false,
  tuning: MotionTuning = motionTuning,
): number {
  const base =
    mode === 'dash'
      ? tuning.dash
      : mode === 'attack'
        ? tuning.attack
        : mode === 'guard'
          ? tuning.guard
          : mode === 'sneak'
            ? tuning.sneak
            : running
              ? tuning.run
              : tuning.walk;
  return base * (slowed ? 0.55 : 1);
}

/**
 * Шаг физики: скорость плавно тянется к цели.
 * Возвращает новую скорость; вызывающая сторона двигает героя по осям.
 */
export function stepMotion(
  velocity: Velocity,
  dx: number,
  dy: number,
  speed: number,
  dt: number,
  tuning: MotionTuning = motionTuning,
): Velocity {
  const length = Math.hypot(dx, dy);
  const targetX = length ? (dx / length) * speed : 0;
  const targetY = length ? (dy / length) * speed : 0;
  const current = Math.hypot(velocity.vx, velocity.vy);
  const turning =
    length > 0 &&
    current > 1 &&
    (velocity.vx * targetX + velocity.vy * targetY) / (current * speed || 1) <
      0.2;
  const rate =
    (length ? tuning.accel * (turning ? tuning.turnBoost : 1) : tuning.brake) *
    dt;
  const diffX = targetX - velocity.vx;
  const diffY = targetY - velocity.vy;
  const diff = Math.hypot(diffX, diffY);
  if (diff <= rate || diff === 0) return { vx: targetX, vy: targetY };
  return {
    vx: velocity.vx + (diffX / diff) * rate,
    vy: velocity.vy + (diffY / diff) * rate,
  };
}

/** Можно ли бежать: есть направление, есть силы, нет боевого действия. */
export function canRun(
  requested: boolean,
  moving: boolean,
  energy: number,
  busy = false,
  tuning: MotionTuning = motionTuning,
): boolean {
  return requested && moving && !busy && energy > tuning.runFloor;
}

/** Походка по фактической скорости, а не по нажатым клавишам. */
export function gaitFor(
  speed: number,
  tuning: MotionTuning = motionTuning,
): Gait {
  if (speed < 12) return 'idle';
  return speed > (tuning.walk + tuning.run) / 2 ? 'run' : 'walk';
}

/** Длина полного цикла шага в единицах локации. Бег — чаще и размашистее. */
export const strideLength: Record<Exclude<Gait, 'idle'>, number> = {
  walk: 52,
  run: 40,
};

/** Порядок кадров атласа: контакт, проходная поза, контакт другой ногой. */
export const walkCycle = [0, 1, 2, 1] as const;

/** Фаза шага наращивается пройденным расстоянием — анимация не «плывёт». */
export function advanceStride(
  phase: number,
  distance: number,
  gait: Gait,
): number {
  if (gait === 'idle') return settleStride(phase);
  const stride = strideLength[gait];
  return (phase + distance / stride) % 1;
}

/**
 * Возврат к покою: фаза доводится до начала цикла, поэтому следующий шаг
 * начинается с кадра контакта, без рывка первого и последнего кадра.
 */
export function settleStride(phase: number): number {
  return phase > 0.5 ? 0 : phase * 0.6 < 0.02 ? 0 : phase * 0.6;
}

/** Столбец атласа для текущей фазы. Покой всегда даёт нейтральный кадр. */
export function walkColumn(phase: number, gait: Gait): number {
  if (gait === 'idle') return 1;
  const index = Math.floor(((phase % 1) + 1) % 1 * walkCycle.length);
  return walkCycle[Math.min(walkCycle.length - 1, Math.max(0, index))];
}

/** Небольшое покачивание корпуса: покой дышит, бег отрывается от земли. */
export function bodyBob(phase: number, gait: Gait, time = 0): number {
  if (gait === 'idle') return Math.sin(time * 1.6) * 0.6;
  const swing = Math.abs(Math.sin(phase * Math.PI * 2));
  return gait === 'run' ? -swing * 2.4 : -swing * 1.1;
}

/** Направление спрайта берётся из фактической скорости: без moonwalk. */
export function facingFromMotion(
  velocity: Velocity,
  fallback: number,
  threshold = 6,
): number {
  return Math.hypot(velocity.vx, velocity.vy) > threshold
    ? Math.atan2(velocity.vy, velocity.vx)
    : fallback;
}
