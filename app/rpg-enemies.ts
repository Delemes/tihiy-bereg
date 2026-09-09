import type { Enemy, Region, State } from './rpg-model';
export const archetypes = {
  ruffian: {
    name: 'Лесной задира',
    style: 'melee',
    sprite: 2,
    hp: 58,
    attack: 12,
    speed: 85,
    reach: 65,
    windup: 0.85,
  },
  archer: {
    name: 'Браконьер-лучник',
    style: 'ranged',
    sprite: 0,
    hp: 56,
    attack: 13,
    speed: 76,
    reach: 360,
    windup: 1.25,
  },
  runner: {
    name: 'Налётчик',
    style: 'fast',
    sprite: 2,
    hp: 44,
    attack: 10,
    speed: 143,
    reach: 55,
    windup: 0.6,
  },
  shield: {
    name: 'Щитоносец',
    style: 'heavy',
    sprite: 1,
    hp: 115,
    attack: 23,
    speed: 58,
    reach: 78,
    windup: 1.3,
    armor: 7,
  },
  wolf: {
    name: 'Серый волк',
    style: 'fast',
    sprite: 4,
    hp: 50,
    attack: 12,
    speed: 148,
    reach: 57,
    windup: 0.7,
    status: 'bleed',
  },
  viper: {
    name: 'Болотная гадюка',
    style: 'ambush',
    sprite: 5,
    hp: 32,
    attack: 8,
    speed: 90,
    reach: 50,
    windup: 0.55,
    status: 'poison',
  },
  scout: {
    name: 'Засадный стрелок',
    style: 'ambush',
    sprite: 0,
    hp: 60,
    attack: 16,
    speed: 95,
    reach: 290,
    windup: 1.0,
  },
  pikeman: {
    name: 'Сторож с копьём',
    style: 'spear',
    sprite: 3,
    hp: 86,
    attack: 17,
    speed: 78,
    reach: 116,
    windup: 1.0,
  },
  duelist: {
    name: 'Сборщик дани',
    style: 'elite',
    sprite: 2,
    hp: 112,
    attack: 17,
    speed: 112,
    reach: 72,
    windup: 0.75,
    status: 'bleed',
  },
  tusker: {
    name: 'Секач',
    style: 'miniboss',
    sprite: 6,
    hp: 180,
    attack: 24,
    speed: 100,
    reach: 93,
    windup: 1.35,
  },
  warden: {
    name: 'Звонарь',
    style: 'boss',
    sprite: 1,
    hp: 260,
    attack: 26,
    speed: 76,
    reach: 118,
    windup: 1.4,
    armor: 5,
  },
  keeper: {
    name: 'Смотритель',
    style: 'boss',
    sprite: 7,
    hp: 330,
    attack: 28,
    speed: 88,
    reach: 140,
    windup: 1.3,
    armor: 7,
  },
} satisfies Record<string, Partial<Enemy>>;
const packs: [Region, (keyof typeof archetypes)[]][] = [
  ['grove', ['wolf', 'archer']],
  ['hunterhut', ['ruffian']],
  ['hutcellar', ['runner', 'shield']],
  ['marsh', ['viper', 'viper', 'scout']],
  ['chapel', ['pikeman', 'archer']],
  ['crypt', ['runner', 'duelist']],
  ['reliquary', ['warden']],
  ['milloffice', ['archer', 'ruffian']],
  ['bunkhouse', ['runner', 'pikeman']],
  ['millstore', ['shield', 'scout']],
  ['engine', ['duelist', 'archer']],
  ['drain', ['viper', 'runner']],
  ['galleries', ['pikeman', 'scout']],
  ['cistern', ['tusker']],
  ['depot', ['shield', 'archer', 'runner']],
  ['deepmine', ['duelist', 'pikeman']],
  ['smuggler', ['keeper', 'archer']],
];
export const newEnemies: Enemy[] = packs.flatMap(([region, pack]) =>
  pack.map((kind, i) => ({
    id: `${region}:${kind}:${i}`,
    kind:
      kind === 'wolf' || kind === 'tusker' || kind === 'viper'
        ? 'boar'
        : 'bandit',
    region,
    x: [680, 970, 470][i],
    y: [490, 610, 610][i],
    reward:
      kind === 'keeper'
        ? 95
        : kind === 'warden'
          ? 70
          : kind === 'tusker'
            ? 0
            : 10,
    xp: kind === 'keeper' ? 150 : kind === 'warden' ? 100 : 30,
    ...archetypes[kind],
  })),
);
for (const [region, pack] of packs) {
  for (let wing = 0; wing < 2; wing++) {
    const kind =
      pack.includes('wolf') || pack.includes('viper')
        ? wing
          ? 'viper'
          : 'wolf'
        : wing
          ? 'runner'
          : 'archer';
    newEnemies.push({
      id: region + ':wing:' + wing,
      kind: kind === 'wolf' || kind === 'viper' ? 'boar' : 'bandit',
      region,
      x: wing ? 1740 : 1760,
      y: wing ? 1510 : 500,
      reward: 7,
      xp: 22,
      ...archetypes[kind],
    });
  }
}
// Pursuers use one persistent ID per district/day. Defeating one grants no money
// or XP, and cannot be farmed by repeatedly crossing a doorway.
export function pursuers(s: State): Enemy[] {
  if (
    s.wanted < 3 ||
    ['home', 'dacha', 'attic', 'cellar', 'dachaloft', 'dachacellar'].includes(
      s.region,
    )
  )
    return [];
  if (!['village', 'pushkino', 'forest', 'sawmill'].includes(s.region))
    return [];
  const id = `pursuit:${s.day}:${s.region}`;
  if (s.defeated.includes(id)) return [];
  return [
    {
      id,
      name: s.wanted >= 8 ? 'Охотник за головой' : 'Патрульный',
      kind: 'bandit',
      region: s.region,
      x: s.region === 'pushkino' ? 800 : 680,
      y: 840,
      hp: 100 + Math.min(100, s.wanted * 6),
      attack: 17,
      reward: 0,
      xp: 0,
      speed: 106,
      reach: 82,
      windup: 1.05,
      style: 'elite',
      sprite: 7,
      armor: 3,
    },
  ];
}
