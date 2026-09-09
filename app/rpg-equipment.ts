import type { Weapon, Stock, State } from './rpg-model';

export function equipWeapon(s: State, weapon: Weapon): State {
  if (!s.weapons.includes(weapon) || s.weapon === weapon) return s;
  return {
    ...s,
    weapon,
    attackDelay: 0,
    swing: 0,
    swingHeavy: false,
    attackBuffer: 0,
    bufferedAttack: null,
    combo: 0,
    comboWindow: 0,
    guarding: false,
    guardTime: 0,
    cooldown: Math.max(0.3, s.cooldown),
  };
}
export const weapons: Record<
  Weapon,
  {
    name: string;
    damage: number;
    price: number;
    reach: number;
    speed: number;
    description: string;
    mode?: 'ranged';
    ammo?: 'arrows' | 'stones';
    arc?: number;
    status?: 'bleed' | 'slow';
  }
> = {
  spear: {
    name: 'Охотничье копьё',
    damage: 25,
    price: 185,
    reach: 122,
    speed: 0.72,
    arc: 0.42,
    description: 'Длинный узкий выпад. Особый приём отбрасывает.',
  },
  saber: {
    name: 'Старая сабля',
    damage: 26,
    price: 240,
    reach: 84,
    speed: 0.52,
    arc: 1.5,
    status: 'bleed',
    description: 'Широкая дуга. Сильный удар вызывает кровотечение.',
  },
  bow: {
    name: 'Охотничий лук',
    damage: 24,
    price: 175,
    reach: 540,
    speed: 0.8,
    mode: 'ranged',
    ammo: 'arrows',
    description:
      'Стрелы летят по направлению взгляда. Тяжёлый выстрел пробивает защиту.',
  },
  crossbow: {
    name: 'Лёгкий арбалет',
    damage: 43,
    price: 320,
    reach: 620,
    speed: 1.55,
    mode: 'ranged',
    ammo: 'arrows',
    description: 'Сильный болт и долгая перезарядка. Не подпускайте врага.',
  },
  sling: {
    name: 'Праща',
    damage: 15,
    price: 65,
    reach: 400,
    speed: 0.6,
    mode: 'ranged',
    ammo: 'stones',
    description: 'Дешёвые камни. Сильный выстрел на время оглушает.',
  },
  fists: {
    name: 'Кулаки',
    damage: 9,
    price: 0,
    reach: 44,
    speed: 0.38,
    description: 'Быстрые, но слишком короткие.',
  },
  stick: {
    name: 'Крепкая палка',
    damage: 18,
    price: 0,
    reach: 78,
    speed: 0.62,
    description: 'Длинный замах. Удобно держать дистанцию.',
  },
  knife: {
    name: 'Охотничий нож',
    damage: 21,
    price: 145,
    reach: 56,
    speed: 0.35,
    description: 'Быстрые удары, короткая дистанция.',
  },
  axe: {
    name: 'Топор',
    damage: 34,
    price: 265,
    reach: 72,
    speed: 0.9,
    description: 'Медленный. Сильный удар сбивает замах.',
  },
};
export const stockInfo: Record<
  Stock,
  { name: string; price: number; sell: number; description: string }
> = {
  arrows: {
    name: 'Стрелы',
    price: 4,
    sell: 1,
    description: 'Боеприпасы для лука и арбалета.',
  },
  stones: {
    name: 'Камни',
    price: 2,
    sell: 0,
    description: 'Для пращи или броска. Шум отвлекает дозорных.',
  },
  throwing: {
    name: 'Метательные ножи',
    price: 18,
    sell: 5,
    description: 'Бросок наносит урон и вызывает кровотечение.',
  },
  smoke: {
    name: 'Дымовая шашка',
    price: 35,
    sell: 8,
    description: 'Скрывает вас на 5 секунд и сбивает погоню.',
  },
  seeds: {
    name: 'Семена репы',
    price: 8,
    sell: 2,
    description: 'Посадите и поливайте два разных дня.',
  },
  crops: {
    name: 'Репа',
    price: 0,
    sell: 15,
    description: 'Урожай с грядки. Можно приготовить похлёбку.',
  },
  ore: {
    name: 'Металлические детали',
    price: 20,
    sell: 6,
    description: 'Оружейник делает из них боеприпасы.',
  },
  bread: { name: 'Хлеб', price: 18, sell: 5, description: '+38 сытости' },
  tea: {
    name: 'Травяной чай',
    price: 26,
    sell: 8,
    description: '+32 силы, +8 здоровья',
  },
  bandages: {
    name: 'Бинт',
    price: 32,
    sell: 10,
    description: '+32 здоровья; не лечит травму',
  },
  meals: {
    name: 'Готовый ужин',
    price: 0,
    sell: 16,
    description: '+50 сытости, +20 сил, +12 здоровья',
  },
  meat: { name: 'Мясо', price: 34, sell: 12, description: 'Для приготовления' },
  fish: {
    name: 'Карась',
    price: 0,
    sell: 14,
    description: 'Для приготовления или продажи',
  },
  herbs: {
    name: 'Зверобой',
    price: 0,
    sell: 4,
    description: 'Для чая и повязок',
  },
  wood: {
    name: 'Дрова',
    price: 10,
    sell: 2,
    description: 'Для костра и ремонта',
  },
  flowers: {
    name: 'Цветы',
    price: 0,
    sell: 2,
    description: 'Подарок; одного букета в день достаточно',
  },
  spice: {
    name: 'Лук и специи',
    price: 8,
    sell: 2,
    description: 'Маринад для шашлыка',
  },
};
