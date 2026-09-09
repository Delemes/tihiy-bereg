import { has, threatened, type State, type Stock } from './rpg-model';
import { stockInfo } from './rpg-equipment';
export const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export const maxHealth = (s: State) => 100 - s.wounds * 10;
export const note = (s: State, t: string): State => ({
  ...s,
  log: [...s.log, t].slice(-5),
});
export const flag = (s: State, f: string): State =>
  has(s, f) ? s : { ...s, flags: [...s.flags, f] };
export function advance(s: State, minutes: number): State {
  const t = s.minutes + minutes;
  return {
    ...s,
    minutes: t % 1440,
    day: s.day + Math.floor(t / 1440),
    hunger: clamp(s.hunger - minutes * 0.07),
  };
}
export function defeat(s: State): State {
  const loss = Math.min(45, Math.ceil(s.coins * 0.15));
  return note(
    {
      ...advance(s, 150),
      region: 'home',
      x: 768,
      y: 770,
      hp: 45,
      energy: 45,
      wounds: Math.min(3, s.wounds + 1),
      coins: s.coins - loss,
      lostCoins: s.lostCoins + Math.floor(loss * 0.5),
      foes: {},
      invulnerable: 2,
      dash: 0,
      swing: 0,
      attackDelay: 0,
      attackBuffer: 0,
      bufferedAttack: null,
      combo: 0,
      comboWindow: 0,
      statuses: [],
      projectiles: [],
      guarding: false,
      activity: null,
    },
    `Вас доставили домой. Травма: −10 к пределу здоровья. Потеряно ${loss} ₽; часть денег найдётся у остановки.`,
  );
}
export function applyConsumable(s: State, id: string): State {
  const k =
    ({ bandage: 'bandages', meal: 'meals' } as Record<string, string>)[id] ||
    id;
  if (
    !['tea', 'bandages', 'bread', 'meals'].includes(k) ||
    s[k as Stock] < 1 ||
    s.healCooldown > 0
  )
    return s;
  const n = {
    ...s,
    [k]: s[k as Stock] - 1,
    healCooldown: threatened(s) ? 3 : 0,
  };
  if (k === 'tea') {
    n.energy = clamp(n.energy + 32);
    n.hp = clamp(n.hp + 8, 0, maxHealth(n));
  }
  if (k === 'bandages') {
    n.hp = clamp(n.hp + 32, 0, maxHealth(n));
    n.statuses = s.statuses.filter((v) => v.kind !== 'bleed');
  }
  if (k === 'bread') n.hunger = clamp(n.hunger + 38);
  if (k === 'meals') {
    n.hunger = clamp(n.hunger + 50);
    n.energy = clamp(n.energy + 20);
    n.hp = clamp(n.hp + 12, 0, maxHealth(n));
  }
  return note(n, stockInfo[k as Stock].name + ' использован.');
}
