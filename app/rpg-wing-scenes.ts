import { room } from './rpg-regions';
import { wingRiddles, wingSolved } from './rpg-wings';
import { note, flag } from './rpg-core';
import type { State } from './rpg-model';
import type { Scene, Outcome } from './rpg-story';
export function wingScene(s: State, id: string): Scene | null {
  if (!id.startsWith('wing-note:') && !id.startsWith('wing-puzzle:'))
    return null;
  const data = room(s.region);
  if (!data || !id.endsWith(':' + s.region)) return null;
  const riddle = wingRiddles[data[2]],
    isNote = id.startsWith('wing-note:'),
    solved = wingSolved(s, s.region);
  return {
    title: isNote ? 'Чужая запись' : 'Механизм тайника',
    role: data[0],
    menu: true,
    text: isNote
      ? riddle.clue
      : solved
        ? 'Тайник пуст. Вы уже забрали его содержимое.'
        : riddle.question,
    choices: [
      ...(isNote
        ? [{ id: 'wing:read', label: 'Запомнить подсказку' }]
        : solved
          ? []
          : riddle.answers.map((label, i) => ({
              id: 'wing:answer:' + i,
              label,
              disabled: s.energy < 6,
              hint: s.flags.includes('wing-note:' + s.region)
                ? 'Вспомните записку из соседней комнаты'
                : undefined,
            }))),
      { id: 'leave', label: 'Отойти' },
    ],
  };
}
export function wingChoice(
  s: State,
  id: string,
  action: string,
): Outcome | null {
  if (!action.startsWith('wing:')) return null;
  const data = room(s.region);
  if (!data || !id.endsWith(':' + s.region)) return null;
  if (action === 'wing:read' && id.startsWith('wing-note:'))
    return {
      state: flag(s, 'wing-note:' + s.region),
      node: 'root',
      text: wingRiddles[data[2]].clue,
    };
  if (!id.startsWith('wing-puzzle:') || wingSolved(s, s.region))
    return { state: s, node: 'root' };
  if (s.energy < 6)
    return {
      state: s,
      node: 'root',
      text: 'Нужно хотя бы 6 сил, чтобы сдвинуть механизм.',
    };
  const riddle = wingRiddles[data[2]];
  if (action === 'wing:answer:' + riddle.answer) {
    const n = flag(
      { ...s, coins: s.coins + 12, xp: s.xp + 18, bandages: s.bandages + 1 },
      'wing-solved:' + s.region,
    );
    return {
      state: note(n, 'Тайник открыт · 12 ₽, бинт, 18 опыта'),
      node: 'root',
      text: 'Задвижка отходит. Внутри свёрток с перевязью и мелочью. Здесь давно готовились к дальней дороге.',
    };
  }
  return {
    state: note(
      { ...s, energy: Math.max(0, s.energy - 6) },
      'Механизм заело · −6 сил',
    ),
    node: 'root',
    text: 'Механизм не поддаётся. Возможно, стоит поискать оставленную хозяином подсказку в соседней комнате.',
  };
}
