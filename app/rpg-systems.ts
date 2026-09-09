import { extraRoutes, unlocked } from './rpg-regions';
import {
  has,
  regionNames,
  type State,
  type Region,
  type Weapon,
  type Stock,
} from './rpg-model';
export const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export const maxHealth = (s: State) => 100 - s.wounds * 10;
export { weapons, stockInfo } from './rpg-equipment';
import { weapons, stockInfo } from './rpg-equipment';
export { note, flag, advance, defeat, applyConsumable } from './rpg-core';
import { note, flag, advance } from './rpg-core';
export function trade(s: State, id: string, sell = false): State {
  if (id in weapons) {
    const w = id as Weapon;
    if (sell || s.weapons.includes(w) || s.coins < weapons[w].price) return s;
    return note(
      {
        ...s,
        weapon: w,
        attackDelay: 0,
        attackBuffer: 0,
        bufferedAttack: null,
        combo: 0,
        comboWindow: 0,
        swing: 0,
        weapons: [...s.weapons, w],
        coins: s.coins - weapons[w].price,
      },
      'Экипировано: ' + weapons[w].name,
    );
  }
  if (!(id in stockInfo)) return s;
  const k = id as Stock,
    info = stockInfo[k];
  const soldKey = 'sales:' + s.day,
    sold = s.daily[soldKey] || 0;
  if (sell) {
    if (s[k] < 1 || sold >= 8) return s;
    return note(
      {
        ...s,
        [k]: s[k] - 1,
        coins: s.coins + info.sell,
        daily: { ...s.daily, [soldKey]: sold + 1 },
      },
      `Продано: ${info.name} · ${info.sell} ₽`,
    );
  }
  const boughtKey = 'bought:' + s.day + ':' + id;
  if (!info.price || s.coins < info.price || (s.daily[boughtKey] || 0) >= 5)
    return s;
  return note(
    {
      ...s,
      [k]: s[k] + 1,
      coins: s.coins - info.price,
      daily: { ...s.daily, [boughtKey]: (s.daily[boughtKey] || 0) + 1 },
    },
    'Куплено: ' + info.name,
  );
}
export const routes: Record<
  string,
  {
    from: Region;
    to: Region;
    x: number;
    y: number;
    cost?: number;
    minutes?: number;
  }
> = {
  ...extraRoutes,
  'to-forest': { from: 'village', to: 'forest', x: 720, y: 880, minutes: 20 },
  'forest-return': {
    from: 'forest',
    to: 'village',
    x: 590,
    y: 159,
    minutes: 20,
  },
  'forest-mill': { from: 'forest', to: 'sawmill', x: 170, y: 550, minutes: 15 },
  'mill-forest': {
    from: 'sawmill',
    to: 'forest',
    x: 1340,
    y: 540,
    minutes: 15,
  },
  'to-mill-road': {
    from: 'village',
    to: 'sawmill',
    x: 740,
    y: 870,
    minutes: 35,
  },
  'mill-return': {
    from: 'sawmill',
    to: 'village',
    x: 555,
    y: 887,
    minutes: 35,
  },
  'enter-home': { from: 'village', to: 'home', x: 768, y: 825 },
  'leave-home': { from: 'home', to: 'village', x: 385, y: 795 },
  'enter-shop': { from: 'village', to: 'shop', x: 768, y: 825 },
  'leave-shop': { from: 'shop', to: 'village', x: 841, y: 546 },
  'enter-library': { from: 'village', to: 'library', x: 768, y: 825 },
  'leave-library': { from: 'library', to: 'village', x: 489, y: 514 },
  'enter-dacha': { from: 'pushkino', to: 'dacha', x: 768, y: 825 },
  'leave-dacha': { from: 'dacha', to: 'pushkino', x: 490, y: 552 },
  'enter-mine': { from: 'sawmill', to: 'mine', x: 768, y: 865 },
  'leave-mine': { from: 'mine', to: 'sawmill', x: 961, y: 382 },
  bus: {
    from: 'village',
    to: 'pushkino',
    x: 768,
    y: 857,
    cost: 12,
    minutes: 45,
  },
  'bus-back': {
    from: 'pushkino',
    to: 'village',
    x: 823,
    y: 869,
    cost: 12,
    minutes: 45,
  },
  'walk-pushkino': {
    from: 'village',
    to: 'pushkino',
    x: 768,
    y: 857,
    minutes: 100,
  },
  'walk-back': {
    from: 'pushkino',
    to: 'village',
    x: 823,
    y: 869,
    minutes: 100,
  },
};
export function travel(s: State, id: string): State {
  const r = routes[id];
  if (!r || r.from !== s.region || s.coins < (r.cost || 0)) return s;
  if (['enter-home', 'enter-dacha'].includes(id) && !has(s, 'key'))
    return note(s, 'Ключи хранит Вера в магазине.');
  const gate = extraRoutes[id]?.gate;
  if (!unlocked(s, gate))
    return note(
      s,
      gate === 'engine'
        ? 'Привод в машинном зале ещё не работает.'
        : gate === 'refuge'
          ? 'Осмотрите стеллаж в подвале магазина.'
          : gate === 'seal'
            ? 'Найдите знаки и решите загадку в читальном зале.'
            : 'Путь запечатан. Ищите ключ в часовне или лодочном сарае.',
    );
  const minutes = r.minutes || 2;
  let n = advance(
    {
      ...s,
      region: r.to,
      lure: null,
      projectiles: [],
      attackDelay: 0,
      attackBuffer: 0,
      bufferedAttack: null,
      combo: 0,
      comboWindow: 0,
      smokeTime: 0,
      hostileMode: false,
      x: r.x,
      y: r.y,
      coins: s.coins - (r.cost || 0),
      energy: clamp(s.energy - (minutes >= 90 ? 15 : minutes > 10 ? 4 : 0)),
      foes: { ...s.foes },
      invulnerable: 1.3,
      dash: 0,
      swing: 0,
      guarding: false,
    },
    minutes,
  );
  if (!s.visited.includes(r.to))
    n = { ...n, visited: [...s.visited, r.to], xp: s.xp + 10 };
  if (r.to === 'home') n = flag(n, 'home');
  if (r.to === 'forest' && s.daily.encounter !== n.day) {
    n.seed = (s.seed * 1664525 + 1013904223) >>> 0;
    const kinds = ['courier', 'traveler', 'trader'];
    n.encounter =
      has(s, 'courierQuest') && !has(s, 'courierDone')
        ? 'courier'
        : !has(s, 'courierQuest') && s.day === 1
          ? 'courier'
          : kinds[n.seed % 3];
    n.daily = { ...s.daily, encounter: n.day };
  }
  return note(
    n,
    `${regionNames[r.to]}${minutes > 2 ? ` · ${minutes} мин.` : ''}`,
  );
}
export { tickWorld, type Input } from './rpg-combat';
export { startActivity, activityInput, tickActivity } from './rpg-activities';
