import { detailPlaces } from './rpg-world-details';
import { expansionQuests } from './rpg-journal';
import {
  roomNames,
  extraPlaces,
  rooms,
  unitScale,
  type ExtraRegion,
} from './rpg-regions';
import { newEnemies, pursuers } from './rpg-enemies';
import { restoreExpansion } from './rpg-save';
import { worldBounds } from './rpg-geography';
import { socialPlaces } from './rpg-social';
export type Person = 'anna' | 'katya' | 'nina';
export type Region =
  | 'village'
  | 'forest'
  | 'sawmill'
  | 'pushkino'
  | 'home'
  | 'dacha'
  | 'shop'
  | 'library'
  | 'mine'
  | ExtraRegion;
export type Weapon =
  | 'fists'
  | 'stick'
  | 'knife'
  | 'axe'
  | 'spear'
  | 'saber'
  | 'bow'
  | 'crossbow'
  | 'sling';
export type Stock =
  | 'bread'
  | 'tea'
  | 'bandages'
  | 'meals'
  | 'meat'
  | 'fish'
  | 'herbs'
  | 'wood'
  | 'flowers'
  | 'spice'
  | 'arrows'
  | 'stones'
  | 'throwing'
  | 'smoke'
  | 'seeds'
  | 'crops'
  | 'ore';
export type Status = {
  kind: 'bleed' | 'poison' | 'slow' | 'stun';
  time: number;
  power: number;
};
export type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  owner: string;
  kind: 'arrow' | 'stone' | 'knife' | 'smoke';
  status?: Status['kind'];
  pierce?: boolean;
};
export type Citizen = {
  hp: number;
  hostile: boolean;
  dead: boolean;
  robbed: boolean;
  fear: number;
  x?: number;
  y?: number;
};
export type Foe = {
  id: string;
  x: number;
  y: number;
  hp: number;
  phase: 'idle' | 'chase' | 'windup' | 'recover';
  timer: number;
  aim: number;
  flash: number;
  statuses?: Status[];
  attacks?: number;
};
export type Activity = {
  kind: 'grill' | 'fish' | 'gather' | 'repair' | 'work' | 'lock';
  source: string;
  stage: number;
  elapsed: number;
  meter: number;
  progress: number;
  quality: number;
  heat: number;
  sides: [number, number];
  side: number;
  seasoning: string;
  misses: number;
  done: boolean;
  result: string;
  board?: number[];
  sequence?: number[];
};
export type State = {
  version: 4;
  region: Region;
  x: number;
  y: number;
  facing: number;
  hp: number;
  energy: number;
  hunger: number;
  xp: number;
  coins: number;
  day: number;
  minutes: number;
  herbs: number;
  wood: number;
  flowers: number;
  tea: number;
  fish: number;
  bread: number;
  bandages: number;
  meals: number;
  meat: number;
  spice: number;
  wounds: number;
  reputation: number;
  lostCoins: number;
  weapon: Weapon;
  weapons: Weapon[];
  met: string[];
  collected: string[];
  visited: string[];
  flags: string[];
  affection: Record<Person, number>;
  partner: Person | null;
  skill: 'heart' | 'trail' | null;
  daily: Record<string, number>;
  defeated: string[];
  resolved: string[];
  foes: Record<string, Foe>;
  cooldown: number;
  invulnerable: number;
  swing: number;
  swingHeavy: boolean;
  guarding: boolean;
  dash: number;
  healCooldown: number;
  activity: Activity | null;
  encounter: string | null;
  seed: number;
  log: string[];
  ending: string | null;
  arrows: number;
  stones: number;
  throwing: number;
  smoke: number;
  seeds: number;
  crops: number;
  ore: number;
  lure: { x: number; y: number; time: number } | null;
  projectiles: Projectile[];
  statuses: Status[];
  citizens: Record<string, Citizen>;
  wanted: number;
  murders: string[];
  witnesses: string[];
  hostileMode: boolean;
  sneaking: boolean;
  throwItem: 'stones' | 'throwing' | 'smoke';
  smokeTime: number;
  noise: number;
  guardTime: number;
  attackDelay: number;
  attackKind: 'light' | 'heavy' | 'special';
  attackFacing: number;
  perks: string[];
  trackedQuest: string | null;
  combo: number;
  comboWindow: number;
  attackBuffer: number;
  bufferedAttack: 'light' | 'heavy' | 'special' | null;
  garden: Record<string, { planted: number; watered: number[] }>;
};
export const initialState: State = {
  version: 4,
  region: 'village',
  x: 710,
  y: 858,
  facing: Math.PI / 2,
  hp: 100,
  energy: 100,
  hunger: 85,
  xp: 0,
  coins: 110,
  day: 1,
  minutes: 540,
  herbs: 0,
  wood: 2,
  flowers: 0,
  tea: 1,
  fish: 0,
  bread: 2,
  bandages: 2,
  meals: 0,
  meat: 1,
  spice: 1,
  wounds: 0,
  reputation: 0,
  lostCoins: 0,
  weapon: 'stick',
  weapons: ['fists', 'stick'],
  met: [],
  collected: [],
  visited: ['village'],
  flags: [],
  affection: { anna: 0, katya: 0, nina: 0 },
  partner: null,
  skill: null,
  daily: {},
  defeated: [],
  resolved: [],
  foes: {},
  cooldown: 0,
  invulnerable: 0,
  swing: 0,
  swingHeavy: false,
  guarding: false,
  dash: 0,
  healCooldown: 0,
  activity: null,
  encounter: null,
  seed: 41873,
  log: [],
  ending: null,
  arrows: 8,
  stones: 6,
  throwing: 2,
  smoke: 1,
  seeds: 2,
  crops: 0,
  ore: 0,
  lure: null,
  projectiles: [],
  statuses: [],
  citizens: {},
  wanted: 0,
  murders: [],
  witnesses: [],
  hostileMode: false,
  sneaking: false,
  guardTime: 0,
  throwItem: 'stones',
  smokeTime: 0,
  noise: 0,
  attackDelay: 0,
  attackKind: 'light',
  attackFacing: 0,
  perks: [],
  trackedQuest: null,
  combo: 0,
  comboWindow: 0,
  attackBuffer: 0,
  bufferedAttack: null,
  garden: {},
};
export const has = (s: State, f: string) => s.flags.includes(f);
export const safeRegions: Region[] = [
  ...Object.entries(rooms)
    .filter(([, v]) => v[3] === 0)
    .map(([id]) => id as Region),
  'village',
  'pushkino',
  'home',
  'dacha',
  'shop',
  'library',
];
export const regionNames: Record<Region, string> = {
  ...roomNames,
  village: 'Бережки',
  forest: 'Сосновый бор',
  sawmill: 'Заброшенная лесопилка',
  pushkino: 'Пушкино',
  home: 'Дом в Бережках',
  dacha: 'Своя дача',
  shop: 'Магазин Веры',
  library: 'Библиотека',
  mine: 'Старая штольня',
};
export const people = {
  tamara: {
    name: 'Тамара',
    age: 46,
    role: 'Фельдшер',
    portrait: 6,
    region: 'clinic' as Region,
    about: 'Лечит соседей и разыскивает пропавшие лекарства.',
    likes: 'Помощь ценит выше обещаний.',
  },
  stepan: {
    name: 'Степан',
    age: 61,
    role: 'Рыбак',
    portrait: 7,
    region: 'guesthouse' as Region,
    about: 'Помнит озеро до большой плотины.',
    likes: 'Рассказывает о часовне и старых тропах.',
  },
  boris: {
    name: 'Борис',
    age: 39,
    role: 'Оружейник',
    portrait: 8,
    region: 'toolroom' as Region,
    about: 'Учит обращаться с оружием и продаёт снаряжение.',
    likes: 'Уважает дисциплину.',
  },
  constable: {
    name: 'Сергей',
    age: 43,
    role: 'Участковый',
    portrait: 9,
    region: 'village' as Region,
    about: 'Принимает доказательства и взыскивает штрафы.',
    likes: 'Преступления меняют его отношение.',
  },
  anna: {
    name: 'Анна',
    age: 27,
    role: 'Библиотекарь',
    portrait: 0,
    region: 'library' as Region,
    about: 'Хранит чужие истории. Свою пока не решается написать.',
    likes: 'Ценит честность и право на личные тайны.',
  },
  katya: {
    name: 'Катя',
    age: 29,
    role: 'Механик',
    portrait: 1,
    region: 'village' as Region,
    about:
      'Вернулась из города и открыла мастерскую. Не выносит пустых обещаний.',
    likes: 'Замечает поступки. Не любит, когда за неё решают.',
  },
  nina: {
    name: 'Нина',
    age: 32,
    role: 'Фотограф',
    portrait: 2,
    region: 'pushkino' as Region,
    about: 'Снимает исчезающие деревни. Чтобы самой было куда вернуться.',
    likes: 'Ценит внимание и терпение.',
  },
  mikhail: {
    name: 'Михаил',
    age: 30,
    role: 'Лесник',
    portrait: 3,
    region: 'village' as Region,
    about: 'Знает каждый просёлок и не всё рассказывает с первого раза.',
    likes: 'Друг и проводник. Романтической линии нет.',
  },
  vera: {
    name: 'Вера Павловна',
    age: 55,
    role: 'Хозяйка магазина',
    portrait: 4,
    region: 'shop' as Region,
    about: 'Ведёт счета и помнит, кто кому помог в трудную зиму.',
    likes: 'Соседка и работодатель.',
  },
  lev: {
    name: 'Лев',
    age: 34,
    role: 'Курьер',
    portrait: 5,
    region: 'forest' as Region,
    about: 'Везёт почту на велосипеде, даже когда дорога заканчивается.',
    likes: 'Можно встретить на лесной дороге.',
  },
};
export type Place = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind:
    | 'exit'
    | 'door'
    | 'npc'
    | 'herb'
    | 'wood'
    | 'flower'
    | 'dock'
    | 'well'
    | 'clue'
    | 'camp'
    | 'chest'
    | 'workbench'
    | 'bed'
    | 'grill'
    | 'encounter'
    | 'board'
    | 'valve';
};
const p = (
  id: string,
  name: string,
  x: number,
  y: number,
  kind: Place['kind'],
): Place => ({ id, name, x, y, kind });
export const regionPlaces: Record<Region, Place[]> = {
  ...(Object.fromEntries(
    Object.keys(rooms).map((id) => [id, []]),
  ) as unknown as Record<ExtraRegion, Place[]>),
  village: [
    p('mikhail', 'Михаил', 792, 259, 'npc'),
    p('katya', 'Катя', 945, 527, 'npc'),
    p('enter-home', 'Бабушкин дом', 385, 782, 'door'),
    p('enter-library', 'Библиотека', 482, 488, 'door'),
    p('enter-shop', 'Магазин', 841, 526, 'door'),
    p('clue', 'Старая лодка', 1081, 279, 'clue'),
    p('dock', 'Причал', 1250, 592, 'dock'),
    p('well', 'Колодец', 620, 580, 'well'),
    p('bus', 'Автобус в Пушкино', 823, 829, 'board'),
    p('to-forest', 'В Сосновый бор', 590, 112, 'exit'),
    p('to-mill-road', 'К лесопилке', 555, 935, 'exit'),
    p('lost-bag', 'Потерянный кошелёк', 587, 848, 'chest'),
    ...[914, 1060, 942].map((x, i) =>
      p('flower' + i, 'Ромашки', x, [717, 778, 846][i], 'flower'),
    ),
  ],
  forest: [
    p('forest-return', 'В Бережки', 720, 924, 'exit'),
    p('forest-mill', 'На лесопилку', 1400, 540, 'exit'),
    p('camp', 'Лесной привал', 525, 565, 'camp'),
    p('cache', 'Походный тайник', 1085, 330, 'chest'),
    p('forest-herb0', 'Зверобой', 650, 690, 'herb'),
    p('forest-herb1', 'Зверобой', 915, 520, 'herb'),
    p('forest-herb2', 'Зверобой', 700, 280, 'herb'),
    p('forest-wood0', 'Сухие ветки', 472, 748, 'wood'),
    p('forest-wood1', 'Сухие ветки', 1030, 680, 'wood'),
    p('forest-flower', 'Лесные цветы', 711, 418, 'flower'),
    p('road-event', 'На лесной дороге', 580, 835, 'encounter'),
  ],
  sawmill: [
    p('mill-forest', 'В Сосновый бор', 112, 550, 'exit'),
    p('mill-return', 'В Бережки', 740, 928, 'exit'),
    p('enter-mine', 'Спуск в штольню', 966, 346, 'door'),
    p('heirloom', 'Сейф конторы', 1045, 350, 'chest'),
    p('mill-scrap', 'Крепкая доска', 467, 668, 'wood'),
    p('mill-wood', 'Сухие ветки', 1113, 755, 'wood'),
    p('mill-camp', 'Кострище', 347, 740, 'camp'),
  ],
  pushkino: [
    p('bus-back', 'Автобус в Бережки', 768, 921, 'board'),
    p('enter-dacha', 'Ваша дача', 465, 480, 'door'),
    p('nina', 'Нина', 958, 556, 'npc'),
    p('grill', 'Мангал', 904, 405, 'grill'),
    p('garden-wood', 'Дровник', 1150, 730, 'wood'),
    p('garden-flower', 'Садовые цветы', 920, 800, 'flower'),
  ],
  home: [
    p('leave-home', 'На улицу', 768, 910, 'door'),
    p('bed', 'Кровать', 410, 430, 'bed'),
    p('bench', 'Верстак', 1070, 520, 'workbench'),
    p('stove', 'Плита', 1090, 345, 'grill'),
  ],
  dacha: [
    p('leave-dacha', 'В сад', 768, 910, 'door'),
    p('dacha-bed', 'Кровать', 410, 430, 'bed'),
    p('dacha-bench', 'Рабочий стол', 1070, 520, 'workbench'),
    p('dacha-album', 'Семейный альбом', 630, 420, 'clue'),
  ],
  shop: [
    p('leave-shop', 'На улицу', 768, 910, 'door'),
    p('vera', 'Вера Павловна', 955, 555, 'npc'),
    p('order', 'Ящики с заказами', 535, 650, 'workbench'),
  ],
  library: [
    p('leave-library', 'На улицу', 768, 910, 'door'),
    p('anna', 'Анна', 715, 570, 'npc'),
    p('archive', 'Сельский архив', 700, 280, 'clue'),
  ],
  mine: [
    p('leave-mine', 'На поверхность', 768, 925, 'exit'),
    p('valve', 'Затопленный проход', 770, 550, 'valve'),
    p('ledger', 'Металлический ящик', 1320, 230, 'chest'),
    p('pump', 'Деталь для насоса', 1110, 420, 'chest'),
    p('courier-bag', 'Сумка с письмами', 380, 350, 'chest'),
  ],
};
for (const [r, points] of Object.entries(extraPlaces))
  regionPlaces[r as Region].push(...points);
for (const [r, points] of Object.entries(detailPlaces))
  regionPlaces[r as Region].push(...points);
export const places = regionPlaces.village;
export type Enemy = {
  id: string;
  name: string;
  kind: 'drunk' | 'bandit' | 'boar';
  region: Region;
  x: number;
  y: number;
  hp: number;
  attack: number;
  reward: number;
  xp: number;
  speed: number;
  reach: number;
  windup: number;
  style?:
    | 'melee'
    | 'ranged'
    | 'fast'
    | 'heavy'
    | 'ambush'
    | 'elite'
    | 'miniboss'
    | 'boss'
    | 'spear';
  sprite?: number;
  armor?: number;
  status?: Status['kind'];
  citizen?: string;
};
export const enemies: Enemy[] = [
  ...newEnemies,
  {
    id: 'drunk',
    name: 'Пьяный задира',
    kind: 'drunk',
    region: 'forest',
    x: 895,
    y: 817,
    hp: 52,
    attack: 13,
    reward: 8,
    xp: 20,
    speed: 72,
    reach: 56,
    windup: 0.9,
  },
  {
    id: 'boar',
    name: 'Кабан',
    kind: 'boar',
    region: 'forest',
    x: 825,
    y: 659,
    hp: 72,
    attack: 18,
    reward: 0,
    xp: 35,
    speed: 91,
    reach: 66,
    windup: 1.05,
  },
  {
    id: 'poacher',
    name: 'Браконьер',
    kind: 'bandit',
    region: 'forest',
    x: 1090,
    y: 439,
    hp: 82,
    attack: 14,
    reward: 18,
    xp: 40,
    speed: 77,
    reach: 62,
    windup: 0.8,
  },
  {
    id: 'looter',
    name: 'Мародёр',
    kind: 'bandit',
    region: 'sawmill',
    x: 697,
    y: 678,
    hp: 84,
    attack: 17,
    reward: 22,
    xp: 45,
    speed: 78,
    reach: 65,
    windup: 0.8,
  },
  {
    id: 'foreman',
    name: 'Смотрящий',
    kind: 'bandit',
    region: 'sawmill',
    x: 1040,
    y: 470,
    hp: 118,
    attack: 21,
    reward: 35,
    xp: 70,
    speed: 71,
    reach: 74,
    windup: 1.05,
  },
  {
    id: 'mine-guard',
    name: 'Сторож склада',
    kind: 'drunk',
    region: 'mine',
    x: 990,
    y: 410,
    hp: 100,
    attack: 18,
    reward: 24,
    xp: 50,
    speed: 70,
    reach: 64,
    windup: 0.9,
  },
  {
    id: 'mine-chief',
    name: 'Скупщик',
    kind: 'bandit',
    region: 'mine',
    x: 1310,
    y: 290,
    hp: 145,
    attack: 24,
    reward: 45,
    xp: 90,
    speed: 68,
    reach: 77,
    windup: 1.15,
  },
];
export const activeEnemies = (s: State): Enemy[] => [
  ...(safeRegions.includes(s.region)
    ? []
    : enemies.filter(
        (e) =>
          e.region === s.region &&
          !s.defeated.includes(e.id) &&
          !s.resolved.includes(e.id),
      )),
  ...pursuers(s),
  ...socialPlaces(s, regionPlaces)
    .filter(
      (p) =>
        p.kind === 'npc' && s.citizens[p.id]?.hostile && !s.citizens[p.id].dead,
    )
    .map((p) => ({
      id: 'citizen:' + p.id,
      citizen: p.id,
      name: p.name,
      kind: 'bandit' as const,
      region: s.region,
      x: p.x,
      y: p.y,
      hp: 90,
      attack: 9,
      reward: 0,
      xp: 0,
      speed: 80,
      reach: 65,
      windup: 1.1,
      style: 'melee' as const,
      sprite: 7,
    })),
];
export function available(s: State, q: Place) {
  if (q.kind === 'npc' && (s.citizens[q.id]?.dead || s.citizens[q.id]?.hostile))
    return false;
  if (q.id === 'lost-bag') return s.lostCoins > 0;
  if (q.kind === 'encounter') return !!s.encounter;
  if (['wood', 'herb', 'flower'].includes(q.kind))
    return s.daily['gather:' + q.id] !== s.day;
  return true;
}
export const activePlaces = (s: State) => [
  ...socialPlaces(s, regionPlaces).filter((q) => available(s, q)),
  ...regionPlaces[s.region]
    .filter((q) => q.kind === 'npc' && s.citizens[q.id]?.dead)
    .map((q) => ({
      ...q,
      id: 'memorial:' + q.id,
      name: 'Память: ' + q.name,
      kind: 'clue' as const,
    })),
];
export const nearest = (s: State) =>
  activePlaces(s)
    .map((q) => ({ q, d: Math.hypot(s.x - q.x, s.y - q.y) }))
    .filter((q) => q.d < 64 * unitScale(s.region))
    .sort((a, b) => a.d - b.d)[0]?.q;
export const threatened = (s: State) =>
  activeEnemies(s).some((e) => {
    const f = s.foes[e.id];
    return f && f.phase !== 'idle' && Math.hypot(f.x - s.x, f.y - s.y) < 245;
  });
export function quests(s: State) {
  const q = (
    title: string,
    description: string,
    done: boolean,
    steps: [string, boolean][],
  ) => {
    const owner: Record<string, string> = {
      'Между строк': 'anna',
      'Вода для всех': 'katya',
      'Почта не доходит': 'lev',
      'То, что осталось': 'mikhail',
      'Снимок на память': 'nina',
    };
    const failed = !!s.citizens[owner[title]]?.dead && !done;
    return {
      title,
      description: failed
        ? 'Задание прервано: ' +
          people[owner[title] as keyof typeof people].name +
          ' погиб. Награда и личная история утрачены.'
        : description,
      done: done || failed,
      failed,
      steps,
    };
  };
  return [
    q(
      'Дом, в котором ждут',
      'У Веры в магазине остались ключи от дома и дачи в Пушкино.',
      has(s, 'home'),
      [
        ['Получить ключи', has(s, 'key')],
        ['Войти в дом', has(s, 'home')],
      ],
    ),
    q(
      'Между строк',
      'Найдите бабушкино письмо у старой лодки. Решите с Анной, имеет ли деревня право его прочесть.',
      has(s, 'annaQuest'),
      [
        ['Поговорить с Анной', has(s, 'letterQuest')],
        ['Найти письмо', has(s, 'letter')],
        ['Решить судьбу письма', has(s, 'annaQuest')],
      ],
    ),
    q(
      'Вода для всех',
      'Кате нужна деталь из штольни. После ремонта решите: общий насос или платная вода.',
      has(s, 'pumpDone'),
      [
        ['Выслушать Катю', has(s, 'pumpQuest')],
        ['Найти деталь', has(s, 'pumpPart')],
        ['Наладить насос', has(s, 'pumpDone')],
      ],
    ),
    q(
      'Почта не доходит',
      'На лесной дороге можно встретить Льва. Его сумка осталась в штольне.',
      has(s, 'courierDone'),
      [
        ['Встретить курьера', has(s, 'courierQuest')],
        ['Забрать сумку', has(s, 'mailbag')],
        ['Вернуть письма', has(s, 'courierDone')],
      ],
    ),
    q(
      'То, что осталось',
      'Михаил ищет отцовский компас в сейфе лесопилки.',
      has(s, 'heirloomDone'),
      [
        ['Узнать о компасе', has(s, 'millQuest')],
        ['Найти компас', has(s, 'heirloom')],
        ['Вернуть Михаилу', has(s, 'heirloomDone')],
      ],
    ),
    q(
      'Снимок на память',
      'Найдите альбом на даче, приготовьте хороший ужин и пригласите Нину.',
      has(s, 'ninaQuest'),
      [
        ['Познакомиться с Ниной', s.met.includes('nina')],
        ['Прочесть альбом', has(s, 'album')],
        ['Разделить шашлык', has(s, 'ninaQuest')],
      ],
    ),
    ...expansionQuests(s),
    q(
      'Цена тишины',
      'В штольне спрятана книга незаконных сделок. Её судьба и ваши обещания определят будущее Бережков.',
      !!s.ending,
      [
        ['Найти книгу сделок', has(s, 'ledger')],
        ['Решить её судьбу', has(s, 'truth') || has(s, 'deal')],
        ['Встретить вечер у причала', !!s.ending],
      ],
    ),
  ];
}
export function migrateSave(value: unknown): State | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (
    !['x', 'y', 'hp', 'coins', 'day'].every(
      (k) => typeof raw[k] === 'number' && Number.isFinite(raw[k]),
    ) ||
    !Array.isArray(raw.flags)
  )
    return null;
  const s = structuredClone(initialState);
  for (const k of Object.keys(s) as (keyof State)[])
    if (
      typeof s[k] === 'number' &&
      typeof raw[k] === 'number' &&
      Number.isFinite(raw[k])
    )
      (s as unknown as Record<string, unknown>)[k] = raw[k];
  for (const k of [
    'flags',
    'met',
    'collected',
    'visited',
    'defeated',
    'resolved',
  ] as const)
    if (Array.isArray(raw[k]))
      s[k] = (raw[k] as unknown[]).filter(
        (v): v is string => typeof v === 'string',
      );
  for (const k of ['hp', 'energy', 'hunger'] as const)
    s[k] = Math.max(0, Math.min(100, s[k]));
  for (const k of [
    'coins',
    'xp',
    'bread',
    'bandages',
    'tea',
    'meals',
    'meat',
    'fish',
    'spice',
    'herbs',
    'wood',
    'flowers',
    'lostCoins',
  ] as const)
    s[k] = Math.max(0, Math.floor(s[k]));
  s.wounds = Math.max(0, Math.min(3, Math.floor(s.wounds)));
  s.hp = Math.min(s.hp, 100 - s.wounds * 10);
  s.day = Math.max(1, Math.floor(s.day));
  s.minutes = Math.max(0, s.minutes % 1440);
  if (typeof raw.region === 'string' && raw.region in regionNames)
    s.region = raw.region as Region;
  if (Array.isArray(raw.weapons))
    s.weapons = [
      ...new Set([
        'fists',
        'stick',
        ...raw.weapons.filter((v) =>
          [
            'knife',
            'axe',
            'spear',
            'saber',
            'bow',
            'crossbow',
            'sling',
          ].includes(v),
        ),
      ]),
    ] as Weapon[];
  if (s.weapons.includes(raw.weapon as Weapon)) s.weapon = raw.weapon as Weapon;
  if (raw.affection && typeof raw.affection === 'object')
    for (const k of ['anna', 'katya', 'nina'] as const) {
      const n = (raw.affection as Record<string, unknown>)[k];
      if (typeof n === 'number' && Number.isFinite(n))
        s.affection[k] = Math.max(0, Math.min(6, n));
    }
  if (['anna', 'katya', 'nina'].includes(raw.partner as string))
    s.partner = raw.partner as Person;
  if (['heart', 'trail'].includes(raw.skill as string))
    s.skill = raw.skill as State['skill'];
  if (raw.daily && typeof raw.daily === 'object')
    s.daily = Object.fromEntries(
      Object.entries(raw.daily).filter(
        ([, v]) => typeof v === 'number' && Number.isFinite(v),
      ),
    ) as Record<string, number>;
  if (raw.version === 3 || raw.version === 4) {
    s.ending = typeof raw.ending === 'string' ? raw.ending : null;
    s.encounter = ['courier', 'traveler', 'trader'].includes(
      raw.encounter as string,
    )
      ? (raw.encounter as string)
      : null;
    if (raw.foes && typeof raw.foes === 'object')
      for (const e of enemies) {
        const f = (raw.foes as Record<string, Foe>)[e.id];
        if (
          f &&
          [f.hp, f.x, f.y, f.timer, f.aim, f.flash].every(Number.isFinite) &&
          f.hp > 0 &&
          f.hp <= e.hp &&
          f.x > 90 &&
          f.x < worldBounds(s.region).width - 86 &&
          f.y > 85 &&
          f.y < worldBounds(s.region).height - 59 &&
          ['idle', 'chase', 'windup', 'recover'].includes(f.phase)
        )
          s.foes[e.id] = { ...f, id: e.id };
      }
    const a = raw.activity as Activity | null;
    if (
      a &&
      ['grill', 'fish', 'gather', 'repair', 'work'].includes(a.kind) &&
      typeof a.source === 'string' &&
      [
        a.stage,
        a.elapsed,
        a.meter,
        a.progress,
        a.quality,
        a.heat,
        a.side,
        a.misses,
      ].every(Number.isFinite) &&
      Array.isArray(a.sides) &&
      a.sides.length === 2 &&
      a.sides.every(Number.isFinite)
    )
      s.activity = { ...a };
  } else {
    if (s.met.includes('vera')) s.flags.push('key');
    if (has(s, 'letter')) s.flags.push('letterQuest');
    s.flags = s.flags.filter((f) => f !== 'ending');
    s.invulnerable = 2;
  }
  s.cooldown = 0;
  s.dash = 0;
  s.swing = 0;
  s.guarding = false;
  s.version = 4;
  return restoreExpansion(s, raw);
}
export const validSave = (v: unknown) => migrateSave(v) !== null;
