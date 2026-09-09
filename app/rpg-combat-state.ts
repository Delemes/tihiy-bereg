// Боевая машина состояний героя и учёт попаданий одного взмаха.
// Модуль не импортирует игровое состояние: работает со структурным снимком.

export type CombatPhase =
  | 'dead'
  | 'hurt'
  | 'stagger'
  | 'dodge'
  | 'block'
  | 'startup'
  | 'active'
  | 'recovery'
  | 'move'
  | 'idle';

export type CombatSnapshot = {
  hp: number;
  attackDelay: number;
  swing: number;
  cooldown: number;
  dash: number;
  guarding: boolean;
  hurtTime?: number;
  statuses?: readonly { kind: string }[];
  moving?: boolean;
};

/** Единая точка истины о том, что герой делает прямо сейчас. */
export function combatPhase(s: CombatSnapshot): CombatPhase {
  if (s.hp <= 0) return 'dead';
  if ((s.statuses || []).some((v) => v.kind === 'stun')) return 'stagger';
  if ((s.hurtTime || 0) > 0) return 'hurt';
  if (s.dash > 0) return 'dodge';
  if (s.attackDelay > 0) return 'startup';
  if (s.swing > 0) return 'active';
  if (s.guarding) return 'block';
  if (s.cooldown > 0) return 'recovery';
  return s.moving ? 'move' : 'idle';
}

/** Фазы, в которых нельзя начать новое действие. */
export const lockedPhases: readonly CombatPhase[] = [
  'dead',
  'stagger',
  'hurt',
  'startup',
  'active',
  'dodge',
];

export const canAct = (phase: CombatPhase) => !lockedPhases.includes(phase);

/** В уклонении и в кадрах неуязвимости урон не проходит. */
export const isVulnerable = (phase: CombatPhase) =>
  phase !== 'dodge' && phase !== 'dead';

/** Движение остаётся доступным, но с разной скоростью. */
export const movementMode = (phase: CombatPhase) =>
  phase === 'dodge'
    ? 'dash'
    : phase === 'startup' || phase === 'active'
      ? 'attack'
      : phase === 'block'
        ? 'guard'
        : 'free';

/**
 * Взмах: список уже задетых цепей. Один взмах не может ударить цель дважды,
 * поэтому активное окно можно делать длинным без двойного урона.
 */
export type Swing = { id: number; hits: string[] };

export const openSwing = (id: number): Swing => ({ id, hits: [] });

/** Регистрирует попадание. false — цель уже получила урон этим взмахом. */
export function registerHit(swing: Swing | null, target: string): boolean {
  if (!swing) return true;
  if (swing.hits.includes(target)) return false;
  swing.hits.push(target);
  return true;
}

export const swingHasHit = (swing: Swing | null, target: string) =>
  !!swing && swing.hits.includes(target);

/** Нормализация взмаха из сохранения: чужие данные не должны ломать бой. */
export function normalizeSwing(raw: unknown): Swing | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as { id?: unknown; hits?: unknown };
  if (typeof value.id !== 'number' || !Number.isFinite(value.id)) return null;
  const hits = Array.isArray(value.hits)
    ? value.hits.filter((v): v is string => typeof v === 'string').slice(0, 24)
    : [];
  return { id: value.id, hits };
}

/** Сила отдачи камеры: тряска только для тяжёлых событий. */
export function shakeFor(damage: number, heavy: boolean): number {
  if (!heavy && damage < 24) return 0;
  return Math.min(6, (heavy ? 2.6 : 0) + damage / 12);
}

/** Короткая остановка кадра при попадании. Слабые удары её не получают. */
export function hitStopFor(damage: number, heavy: boolean): number {
  if (damage < 6) return 0;
  return heavy ? 0.07 : 0.035;
}
