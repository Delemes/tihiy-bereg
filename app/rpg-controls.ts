import type { Input } from './rpg-combat';

// Physical key codes work with both Russian and English keyboard layouts.
export const combatBindings = {
  attack: { key: 'KeyJ', label: 'ЛКМ', keys: ['Mouse0', 'KeyJ'] },
  heavy: { key: 'KeyK', label: 'ПКМ', keys: ['Mouse2', 'KeyK'] },
  dodge: { key: 'Space', label: 'Пробел', keys: ['Space'] },
  guard: {
    key: 'ShiftLeft',
    label: 'Shift',
    keys: ['ShiftLeft', 'ShiftRight'],
  },
  special: { key: 'KeyQ', label: 'Q', keys: ['KeyQ'] },
  throw: { key: 'KeyF', label: 'F', keys: ['KeyF'] },
  heal: { key: 'Digit1', label: '1', keys: ['Digit1', 'Numpad1'] },
  cycle: { key: 'KeyT', label: 'T', keys: ['KeyT'] },
  sneak: { key: 'KeyC', label: 'C', keys: ['KeyC'] },
  hostile: { key: 'KeyV', label: 'V', keys: ['KeyV'] },
} as const;

export const menuShortcuts: Record<string, string> = {
  Tab: 'bag',
  KeyI: 'bag',
  KeyM: 'map',
  KeyL: 'journal',
  KeyR: 'people',
};

export function combatInput(
  held: ReadonlySet<string>,
  pressed: ReadonlySet<string>,
): Input {
  const input: Input = {
    dx:
      Number(held.has('KeyD') || held.has('ArrowRight')) -
      Number(held.has('KeyA') || held.has('ArrowLeft')),
    dy:
      Number(held.has('KeyS') || held.has('ArrowDown')) -
      Number(held.has('KeyW') || held.has('ArrowUp')),
  };
  for (const action of Object.keys(
    combatBindings,
  ) as (keyof typeof combatBindings)[]) {
    const repeat = ['attack', 'heavy', 'guard', 'sneak'].includes(action);
    input[action] = combatBindings[action].keys.some(
      (key) => pressed.has(key) || (repeat && held.has(key)),
    );
  }
  return input;
}

export const controlsHelp = [
  ['WASD / стрелки', 'Идти; мышь задаёт направление атаки'],
  ['E / Enter', 'Разговор, вход, взаимодействие'],
  ['ЛКМ / J', 'Удар или выстрел; удерживайте для серии'],
  ['ПКМ / K', 'Сильная атака: больше урона и расход сил'],
  [combatBindings.dodge.label, 'Уклонение в сторону движения, отменяет замах'],
  [
    'Shift (держать)',
    'Блок спереди; вовремя поднятый блок парирует после изучения навыка',
  ],
  [combatBindings.special.label, 'Особый приём оружия или усиленный выстрел'],
  ['F · T', 'Бросить выбранный предмет · сменить предмет'],
  [combatBindings.heal.label, 'Бинт: лечение и остановка кровотечения'],
  ['C (держать)', 'Скрытность: медленнее и тише'],
  ['V', 'Включить / выключить нападения на мирных NPC'],
  ['Tab / I · M · L · R', 'Рюкзак · карта · дневник · знакомые'],
  ['Esc', 'Меню / назад'],
  ['1–9 в диалоге', 'Выбор реплики'],
] as const;
