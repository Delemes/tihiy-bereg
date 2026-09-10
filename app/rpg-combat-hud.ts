// Боевое состояние в HUD (§3, §12).
//
// Внизу экрана раньше висела строка «оружие · метательное · розыск»: текст,
// который в бою не менялся и ничего не сообщал о происходящем. Здесь то же
// место занимают два показания, посчитанные из тех же таймеров, которыми
// живёт бой: шкала собственного взмаха и табличка цели с её замахом.
//
// Модуль чистый — только чтение состояния, без DOM и побочных эффектов,
// поэтому его видно тестам вместе с остальными rpg-*.ts.

import { activeEnemies, type State } from './rpg-model';
import { combatPhase, type CombatPhase } from './rpg-combat-state';
import { weapons } from './rpg-equipment';
import { unitScale } from './rpg-regions';
import {
  attackFrames,
  type AttackKind,
  type WeaponClass,
} from './rpg-weapon-profiles';

/** Скорость и отдача живут в снимке боя, а не в сохранении. */
type MotionFields = { vx?: number; vy?: number; hurtTime?: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export type SwingTone =
  | 'ready'
  | 'tired'
  | 'startup'
  | 'active'
  | 'recovery'
  | 'guard'
  | 'dodge'
  | 'hurt'
  | 'stagger'
  | 'dead';

const phaseText: Record<CombatPhase, { label: string; tone: SwingTone }> = {
  dead: { label: 'Поражение', tone: 'dead' },
  stagger: { label: 'Оглушение', tone: 'stagger' },
  hurt: { label: 'Отдача', tone: 'hurt' },
  dodge: { label: 'Уклонение', tone: 'dodge' },
  startup: { label: 'Замах', tone: 'startup' },
  active: { label: 'Удар', tone: 'active' },
  block: { label: 'Блок', tone: 'guard' },
  recovery: { label: 'Восстановление', tone: 'recovery' },
  move: { label: 'Готов', tone: 'ready' },
  idle: { label: 'Готов', tone: 'ready' },
};

export type SwingReadout = {
  phase: CombatPhase;
  tone: SwingTone;
  label: string;
  kind: AttackKind;
  weaponClass: WeaponClass;
  /** отрезки шкалы в секундах: замах, удар, восстановление */
  startup: number;
  active: number;
  recovery: number;
  /** положение курсора 0..1; −1, когда атака не идёт */
  progress: number;
  /** номер удара в серии; 0 — серия закрыта */
  combo: number;
  staminaCost: number;
  tired: boolean;
};

/**
 * Шкала взмаха повторяет те же три отрезка, по которым бой решает, когда
 * появляется hitbox. Игрок видит разницу оружия глазами: у топора длинный
 * замах и долгое восстановление, у ножа — почти мгновенный удар.
 */
export function swingReadout(s: State): SwingReadout {
  const m = s as State & MotionFields;
  const weapon = weapons[s.weapon];
  const busy = s.attackDelay > 0 || s.swing > 0 || s.cooldown > 0;
  const kind: AttackKind = busy ? s.attackKind : 'light';
  const frames = attackFrames(s.weapon, weapon, kind);
  // Бой держит активное окно не короче 0.16 с, а кулдаун покрывает всю атаку.
  const active = Math.max(frames.active, 0.16);
  const total = Math.max(frames.total, frames.startup + active + 0.05);
  const recovery = Math.max(0.02, total - frames.startup - active);
  const phase = combatPhase({
    hp: s.hp,
    attackDelay: s.attackDelay,
    swing: s.swing,
    cooldown: s.cooldown,
    dash: s.dash,
    guarding: s.guarding,
    hurtTime: m.hurtTime,
    statuses: s.statuses,
    moving: Math.hypot(m.vx || 0, m.vy || 0) > 8,
  });
  const elapsed =
    s.attackDelay > 0
      ? frames.startup - s.attackDelay
      : s.swing > 0
        ? frames.startup + (active - s.swing)
        : s.cooldown > 0
          ? total - s.cooldown
          : -1;
  const calm = phase === 'idle' || phase === 'move';
  const tired = calm && s.energy < frames.staminaCost;
  return {
    phase,
    tone: tired ? 'tired' : phaseText[phase].tone,
    label: tired ? 'Мало сил' : phaseText[phase].label,
    kind,
    weaponClass: frames.weaponClass,
    startup: frames.startup,
    active,
    recovery,
    progress: elapsed < 0 ? -1 : clamp01(elapsed / total),
    combo: s.comboWindow > 0 && s.combo > 1 ? s.combo : 0,
    staminaCost: frames.staminaCost,
    tired,
  };
}

export type TargetState =
  | 'windup'
  | 'recover'
  | 'chase'
  | 'flee'
  | 'stagger'
  | 'stun';

const targetText: Record<TargetState, string> = {
  windup: 'замах',
  recover: 'открыт',
  chase: 'наступает',
  flee: 'отходит',
  stagger: 'сбит с шага',
  stun: 'оглушён',
};

const statusText: Record<string, string> = {
  bleed: 'кровь',
  poison: 'яд',
  slow: 'замедлен',
  stun: 'оглушён',
};

export type TargetReadout = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ratio: number;
  state: TargetState;
  label: string;
  /** доля пройденного замаха 0..1; вне замаха 0 */
  telegraph: number;
  /** цель открыта для ответного удара */
  open: boolean;
  tags: string[];
};

/**
 * Цель — не просто ближайший враг, а тот, кто важен сейчас: замах перевешивает
 * расстояние, потому что уклоняются именно от него. Враг, который вас ещё не
 * заметил, в табличку не попадает: HUD не должен выдавать скрытность.
 */
export function targetReadout(s: State): TargetReadout | null {
  const u = unitScale(s.region);
  let best: TargetReadout | null = null;
  let bestScore = Infinity;
  for (const e of activeEnemies(s)) {
    const f = s.foes[e.id];
    if (!f || f.hp <= 0 || f.phase === 'idle') continue;
    const distance = Math.hypot(f.x - s.x, f.y - s.y);
    if (distance > 470 * u) continue;
    const statuses = f.statuses || [];
    const elite = ['boss', 'miniboss', 'elite'].includes(e.style || '');
    const state: TargetState = statuses.some((v) => v.kind === 'stun')
      ? 'stun'
      : f.flash > 0.12
        ? 'stagger'
        : f.phase === 'windup'
          ? 'windup'
          : !e.citizen && !elite && f.hp <= e.hp * 0.2
            ? 'flee'
            : f.phase === 'recover'
              ? 'recover'
              : 'chase';
    const score = distance - (state === 'windup' ? 4000 : 0);
    if (score >= bestScore) continue;
    // Замах босса ускоряется на второй половине здоровья — шкала это учитывает.
    const windup = Math.max(
      0.2,
      e.windup * (e.style === 'boss' && f.hp < e.hp * 0.5 ? 0.8 : 1),
    );
    const tags = [
      ...(e.armor ? ['броня ' + e.armor] : []),
      ...(e.style === 'ranged' || (e.style === 'ambush' && e.reach > 200)
        ? ['стрелок']
        : []),
      ...(e.style === 'boss' || e.style === 'miniboss' ? ['вожак'] : []),
      ...statuses.map((v) => statusText[v.kind]).filter(Boolean),
    ];
    bestScore = score;
    best = {
      id: e.id,
      name: e.name,
      hp: Math.max(0, Math.ceil(f.hp)),
      maxHp: e.hp,
      ratio: clamp01(f.hp / e.hp),
      state,
      label: targetText[state],
      telegraph: state === 'windup' ? clamp01(1 - f.timer / windup) : 0,
      open: state === 'recover' || state === 'stagger' || state === 'stun',
      tags: [...new Set(tags)],
    };
  }
  return best;
}
