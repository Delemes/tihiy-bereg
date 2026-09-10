// Единый слой ввода: физические коды клавиш → игровые действия.
// Игровые системы читают действия, а не события клавиатуры.
// Раскладка переназначаема и хранится отдельно от сохранения игры.

export type GameAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'run'
  | 'sneak'
  | 'attack'
  | 'heavy'
  | 'special'
  | 'dodge'
  | 'guard'
  | 'throw'
  | 'cycle'
  | 'heal'
  | 'hostile'
  | 'interact'
  | 'bag'
  | 'map'
  | 'journal'
  | 'people'
  | 'pause';

export type Bindings = Record<GameAction, readonly string[]>;

// Действия, которые работают при удержании; остальные срабатывают один раз.
export const heldActions: readonly GameAction[] = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'run',
  'sneak',
  'guard',
  'attack',
  'heavy',
];

export const defaultBindings: Bindings = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  sneak: ['KeyC'],
  attack: ['Mouse0', 'KeyJ'],
  heavy: ['Mouse2', 'KeyK'],
  special: ['KeyQ'],
  dodge: ['Space'],
  guard: ['KeyG'],
  throw: ['KeyF'],
  cycle: ['KeyT'],
  heal: ['Digit1', 'Numpad1'],
  hostile: ['KeyV'],
  interact: ['KeyE', 'Enter'],
  bag: ['Tab', 'KeyI'],
  map: ['KeyM'],
  journal: ['KeyL'],
  people: ['KeyR'],
  pause: ['Escape'],
};

export const actionNames: Record<GameAction, string> = {
  moveUp: 'Вверх',
  moveDown: 'Вниз',
  moveLeft: 'Влево',
  moveRight: 'Вправо',
  run: 'Бег',
  sneak: 'Красться',
  attack: 'Удар',
  heavy: 'Сильный удар',
  special: 'Особый приём',
  dodge: 'Уклонение',
  guard: 'Блок',
  throw: 'Бросок',
  cycle: 'Сменить предмет',
  heal: 'Бинт',
  hostile: 'Агрессия',
  interact: 'Взаимодействие',
  bag: 'Рюкзак',
  map: 'Карта',
  journal: 'Дневник',
  people: 'Знакомые',
  pause: 'Меню',
};

const codeLabels: Record<string, string> = {
  Mouse0: 'ЛКМ',
  Mouse1: 'СКМ',
  Mouse2: 'ПКМ',
  Space: 'Пробел',
  Enter: 'Enter',
  Escape: 'Esc',
  Tab: 'Tab',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift ⇧',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

export function keyLabel(code: string): string {
  if (codeLabels[code]) return codeLabels[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}

export function bindingLabel(
  action: GameAction,
  bindings: Bindings = defaultBindings,
): string {
  return (bindings[action] || []).map(keyLabel).join(' / ');
}

/** Кадр ввода: то, что читают движение и бой. Совместим с Input боя. */
export type InputFrame = {
  dx: number;
  dy: number;
  aim?: number;
  run?: boolean;
  sneak?: boolean;
  attack?: boolean;
  heavy?: boolean;
  special?: boolean;
  dodge?: boolean;
  guard?: boolean;
  heal?: boolean;
  throw?: boolean;
  cycle?: boolean;
  hostile?: boolean;
};

const axis = (
  held: ReadonlySet<string>,
  bindings: Bindings,
  plus: GameAction,
  minus: GameAction,
) =>
  Number(bindings[plus].some((k) => held.has(k))) -
  Number(bindings[minus].some((k) => held.has(k)));

/**
 * Направление движения с нормализацией: диагональ не быстрее прямой линии.
 * Возвращает вектор длиной не больше единицы.
 */
export function moveVector(
  held: ReadonlySet<string>,
  bindings: Bindings = defaultBindings,
): { dx: number; dy: number } {
  const dx = axis(held, bindings, 'moveRight', 'moveLeft');
  const dy = axis(held, bindings, 'moveDown', 'moveUp');
  const length = Math.hypot(dx, dy);
  return length > 1 ? { dx: dx / length, dy: dy / length } : { dx, dy };
}

export function actionActive(
  action: GameAction,
  held: ReadonlySet<string>,
  pressed: ReadonlySet<string>,
  bindings: Bindings = defaultBindings,
): boolean {
  const repeats = heldActions.includes(action);
  return (bindings[action] || []).some(
    (key) => pressed.has(key) || (repeats && held.has(key)),
  );
}

/** Собирает кадр ввода для боевого тика. */
export function readInput(
  held: ReadonlySet<string>,
  pressed: ReadonlySet<string>,
  bindings: Bindings = defaultBindings,
): InputFrame {
  const frame: InputFrame = moveVector(held, bindings);
  for (const action of [
    'run',
    'sneak',
    'attack',
    'heavy',
    'special',
    'dodge',
    'guard',
    'throw',
    'cycle',
    'heal',
    'hostile',
  ] as const)
    frame[action] = actionActive(action, held, pressed, bindings);
  return frame;
}

/** Действие меню по нажатой клавише: один источник правды для горячих клавиш. */
export function menuAction(
  code: string,
  bindings: Bindings = defaultBindings,
): 'bag' | 'map' | 'journal' | 'people' | 'pause' | null {
  for (const action of ['bag', 'map', 'journal', 'people', 'pause'] as const)
    if (bindings[action].includes(code)) return action;
  return null;
}

export const bindingsKey = 'tihiy-bereg-controls-v1';

/** Проверяет пользовательскую раскладку: пустые и чужие поля игнорируются. */
export function normalizeBindings(raw: unknown): Bindings {
  const result = Object.fromEntries(
    (Object.keys(defaultBindings) as GameAction[]).map((a) => [
      a,
      [...defaultBindings[a]],
    ]),
  ) as Record<GameAction, string[]>;
  if (!raw || typeof raw !== 'object') return result;
  const source = raw as Record<string, unknown>;
  for (const action of Object.keys(result) as GameAction[]) {
    const value = source[action];
    if (!Array.isArray(value)) continue;
    const codes = value.filter(
      (v): v is string => typeof v === 'string' && v.length > 0 && v.length < 24,
    );
    if (codes.length) result[action] = [...new Set(codes)].slice(0, 3);
  }
  return result;
}

export function loadBindings(): Bindings {
  if (typeof localStorage === 'undefined') return defaultBindings;
  try {
    const raw = localStorage.getItem(bindingsKey);
    return raw ? normalizeBindings(JSON.parse(raw)) : defaultBindings;
  } catch {
    return defaultBindings;
  }
}

export function saveBindings(bindings: Bindings): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(bindingsKey, JSON.stringify(bindings));
    return true;
  } catch {
    return false;
  }
}

/** Переназначение: код закрепляется за действием и снимается с остальных. */
export function rebind(
  bindings: Bindings,
  action: GameAction,
  code: string,
): Bindings {
  const next = Object.fromEntries(
    (Object.keys(bindings) as GameAction[]).map((a) => [
      a,
      bindings[a].filter((k) => k !== code),
    ]),
  ) as Record<GameAction, string[]>;
  next[action] = [code, ...next[action]].slice(0, 3);
  for (const a of Object.keys(next) as GameAction[])
    if (!next[a].length) next[a] = [...defaultBindings[a]];
  return next;
}
