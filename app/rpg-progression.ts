import type { State } from './rpg-model';
import { note } from './rpg-core';
export const perks = {
  footwork: {
    name: 'Лёгкий шаг',
    description: 'Уклонение стоит 16 сил вместо 22.',
    level: 2,
  },
  parry: {
    name: 'Парирование',
    description: 'Первые 0,18 с блока полностью отражают удар.',
    level: 3,
  },
  archery: {
    name: 'Твёрдая рука',
    description: '+20% урона стрелами.',
    level: 3,
  },
  endurance: {
    name: 'Второе дыхание',
    description: '+30% восстановления сил вне атаки.',
    level: 2,
  },
  survival: {
    name: 'Следопыт',
    description: 'Скрытность сокращает заметность ещё на треть.',
    level: 4,
  },
  riposte: {
    name: 'Ответный выпад',
    description: 'Направленный особый приём требует на 6 сил меньше.',
    level: 5,
  },
};
export function learn(s: State, key: string): State {
  const p = perks[key as keyof typeof perks],
    level = 1 + Math.floor(s.xp / 160);
  if (
    !p ||
    s.perks.includes(key) ||
    level < p.level ||
    s.perks.length >= Math.floor(s.xp / 160)
  )
    return s;
  return note({ ...s, perks: [...s.perks, key] }, 'Изучено: ' + p.name);
}
