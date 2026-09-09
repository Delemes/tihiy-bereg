import type { Place, Region, State } from './rpg-model';
import { wingNames, wingRiddles } from './rpg-wings';

// Coordinates stay compatible with the original outdoor maps. New square rooms
// occupy x=256..1280, so their pixels are never stretched into a rectangle.
export const rooms = {
  attic: [
    'Бабушкин чердак',
    'home',
    0,
    0,
    'Под половицей пахнет сухой лавандой.',
  ],
  cellar: [
    'Домашний погреб',
    'home',
    1,
    0,
    'Банки подписаны разными почерками.',
  ],
  pantry: ['Кладовая Веры', 'shop', 8, 0, 'Каждая коробка здесь учтена.'],
  shopcellar: [
    'Подвал магазина',
    'pantry',
    1,
    0,
    'За стеллажом тянет прохладой.',
  ],
  reading: [
    'Читальный зал',
    'library',
    0,
    0,
    'На столе раскрыт старый краеведческий журнал.',
  ],
  archivevault: [
    'Закрытый архив',
    'reading',
    8,
    0,
    'Три печати охраняют семейные тайны.',
  ],
  workshop: [
    'Мастерская Кати',
    'village',
    2,
    0,
    'Здесь чинят всё, что ещё можно спасти.',
  ],
  toolroom: [
    'Инструментальная',
    'workshop',
    8,
    0,
    'На верстаке лежат детали для дальнего похода.',
  ],
  clinic: [
    'Сельский медпункт',
    'village',
    3,
    0,
    'На подоконнике сушатся травы.',
  ],
  dispensary: [
    'Аптечная кладовая',
    'clinic',
    3,
    0,
    'Фельдшер ждёт пропавший ящик лекарств.',
  ],
  guesthouse: [
    'Дом рыбака',
    'village',
    0,
    0,
    'Пахнет печью, мокрой сетью и яблоками.',
  ],
  guestattic: [
    'Мансарда рыбака',
    'guesthouse',
    0,
    0,
    'Кто-то чертил на стене путь к часовне.',
  ],
  dachaloft: [
    'Дачная мансарда',
    'dacha',
    0,
    0,
    'В коробке остались письма о первом лете.',
  ],
  dachacellar: [
    'Дачный погреб',
    'dacha',
    1,
    0,
    'За кирпичной стеной слышится вода.',
  ],
  greenhouse: [
    'Теплица',
    'pushkino',
    7,
    0,
    'Грядки высохли, но почва ещё живая.',
  ],
  seedroom: [
    'Семенная кладовая',
    'greenhouse',
    8,
    0,
    'Соседи оставляют семена в обмен на урожай.',
  ],
  orchard: [
    'Заросший сад',
    'pushkino',
    6,
    0,
    'После заката здесь загораются светлячки.',
  ],
  boathouse: [
    'Лодочный сарай',
    'orchard',
    2,
    0,
    'Между досок спрятана старая карта озера.',
  ],
  grove: [
    'Берёзовая роща',
    'forest',
    6,
    1,
    'В траве расходятся две цепочки следов.',
  ],
  hunterhut: [
    'Изба охотника',
    'grove',
    0,
    1,
    'Хозяин давно не возвращался с промысла.',
  ],
  hutcellar: [
    'Подпол охотника',
    'hunterhut',
    1,
    2,
    'На дверце выцарапан знак банды.',
  ],
  marsh: [
    'Болотная тропа',
    'grove',
    6,
    2,
    'Земля пружинит. В камышах кто-то прячется.',
  ],
  chapel: ['Забытая часовня', 'marsh', 4, 2, 'Пустой колокол звенит от ветра.'],
  crypt: [
    'Склеп под часовней',
    'chapel',
    5,
    3,
    'Чужие сапоги оставили свежую грязь.',
  ],
  reliquary: [
    'Камера колокола',
    'crypt',
    4,
    4,
    'Здесь держат всё, что забрали у соседей.',
  ],
  milloffice: [
    'Контора лесопилки',
    'sawmill',
    2,
    2,
    'Сменные журналы обрываются на одной дате.',
  ],
  bunkhouse: [
    'Барак рабочих',
    'milloffice',
    0,
    2,
    'Под кроватями спрятаны чужие пожитки.',
  ],
  millstore: [
    'Склад лесопилки',
    'bunkhouse',
    8,
    3,
    'Мешки сложены так, чтобы устроить засаду.',
  ],
  engine: [
    'Машинный зал',
    'millstore',
    2,
    3,
    'Старый привод можно запустить заново.',
  ],
  drain: [
    'Дренажный тоннель',
    'mine',
    5,
    2,
    'Поток указывает на ещё один выход.',
  ],
  galleries: [
    'Северные выработки',
    'drain',
    5,
    3,
    'В темноте слышен скрежет металла.',
  ],
  cistern: [
    'Подземный резервуар',
    'galleries',
    1,
    3,
    'Уровень воды держится на честном слове.',
  ],
  depot: [
    'Тайный перевалочный пункт',
    'cistern',
    8,
    4,
    'На ящиках клеймо сельской аптеки.',
  ],
  deepmine: ['Нижняя штольня', 'depot', 5, 4, 'Отсюда никто не слышит дорогу.'],
  smuggler: [
    'Убежище Смотрителя',
    'deepmine',
    2,
    5,
    'Последняя дверь на пути украденных грузов.',
  ],
  refuge: [
    'Забытое убежище',
    'shopcellar',
    1,
    0,
    'Убежище соединяет магазин и старый водосток.',
  ],
} as const;
export type ExtraRegion = keyof typeof rooms;
export const room = (r: string) => rooms[r as ExtraRegion];
export const indoors = (r: string) =>
  (!!room(r) && room(r)[2] !== 6) ||
  ['home', 'dacha', 'shop', 'library', 'mine'].includes(r);
export const unitScale = (r: string) =>
  room(r) ? 1.55 : indoors(r) ? 1.85 : 1;
export const roomNames = Object.fromEntries(
  Object.entries(rooms).map(([id, v]) => [id, v[0]]),
) as Record<ExtraRegion, string>;
export type Passage = {
  from: Region;
  to: Region;
  x: number;
  y: number;
  gate?: string;
  minutes?: number;
};
export const extraRoutes: Record<string, Passage> = {};
export const extraPlaces: Partial<Record<Region, Place[]>> = {};
export function addPlace(
  r: Region,
  id: string,
  name: string,
  x: number,
  y: number,
  kind: Place['kind'],
) {
  (extraPlaces[r] ||= []).push({ id, name, x, y, kind });
}
const gates: Partial<Record<ExtraRegion, string>> = {
  archivevault: 'seal',
  refuge: 'refuge',
  reliquary: 'bell',
  smuggler: 'engine',
  depot: 'cistern',
};
const parentCount: Record<string, number> = {};
for (const [key, [name, parent]] of Object.entries(rooms)) {
  const id = key as ExtraRegion,
    i = parentCount[parent] || 0;
  parentCount[parent] = i + 1;
  // Accessible landmarks on the existing hand-painted exterior maps.
  const old: Record<string, [number, number][]> = {
    village: [
      [556, 415],
      [995, 715],
      [362, 520],
    ],
    forest: [[700, 180]],
    sawmill: [[944, 550]],
    pushkino: [
      [754, 438],
      [1120, 830],
    ],
    mine: [[850, 740]],
    home: [
      [600, 305],
      [1060, 365],
    ],
    dacha: [
      [600, 305],
      [1060, 365],
    ],
    shop: [[520, 310]],
    library: [[500, 310]],
  };
  const [x, y] =
    old[parent]?.[i] ||
    (room(parent)?.[2] === 6
      ? [i % 2 ? 1120 : 416, 520]
      : [i % 2 ? 1040 : 768, 290]);
  const enter = 'enter:' + id,
    back = 'return:' + id;
  addPlace(parent as Region, enter, name, x, y, 'door');
  addPlace(id, back, 'Назад', 360, 505, 'door');
  extraRoutes[enter] = {
    from: parent as Region,
    to: id,
    x: 460,
    y: 505,
    gate: gates[id],
  };
  extraRoutes[back] = { from: id, to: parent as Region, x, y: y + 36 };
}
// A discovered shortcut changes the route home; it is not a dead-end reward.
addPlace('refuge', 'shortcut:drain', 'Водосток к штольне', 1120, 520, 'door');
addPlace('drain', 'shortcut:refuge', 'Тоннель под магазин', 416, 520, 'door');
extraRoutes['shortcut:drain'] = { from: 'refuge', to: 'drain', x: 560, y: 520 };
extraRoutes['shortcut:refuge'] = {
  from: 'drain',
  to: 'refuge',
  x: 980,
  y: 520,
  gate: 'refuge',
};

export type Find = {
  name: string;
  text: string;
  stock?: string;
  count?: number;
  coins?: number;
  flag?: string;
  owner?: string;
  price?: number;
  lock?: boolean;
};
export const finds: Record<string, Find> = {};
function find(
  r: ExtraRegion,
  name: string,
  text: string,
  data: Omit<Find, 'name' | 'text'> = {},
) {
  const id = 'find:' + r;
  finds[id] = { name, text, ...data };
  addPlace(r, id, name, 920, 680, 'chest');
}
find(
  'attic',
  'Половица с зарубкой',
  'Записка бабушки: «Три печати: росток, река, солнце».',
  { flag: 'sealHint' },
);
find(
  'cellar',
  'Запасы на дорогу',
  'Сухари и перевязь сохранились в жестяной коробке.',
  { stock: 'bandages', count: 2 },
);
find('pantry', 'Ящик крупы', 'Вера отложила эти припасы для зимы.', {
  stock: 'bread',
  count: 3,
  owner: 'vera',
  price: 42,
});
find(
  'shopcellar',
  'Стеллаж на колёсах',
  'За банками обнаружилась задвижка. Можно открыть замок.',
  { flag: 'refuge', lock: true },
);
find(
  'reading',
  'Каталог закрытого фонда',
  'Указатель печатей: росток → река → солнце.',
  { flag: 'sealHint' },
);
find(
  'archivevault',
  'Книга исчезнувших троп',
  'На полях отмечена ниша за колоколом.',
  { flag: 'bell' },
);
find('workshop', 'Учебные стрелы', 'Катя продаёт наконечники для вылазок.', {
  stock: 'arrows',
  count: 8,
  owner: 'katya',
  price: 24,
});
find(
  'toolroom',
  'Запертый инструментальный ящик',
  'Внутри лёгкий складной арбалет.',
  { flag: 'crossbow', lock: true, owner: 'katya', price: 220 },
);
find('clinic', 'Перевязочный набор', 'Последний резерв фельдшера.', {
  stock: 'bandages',
  count: 2,
  owner: 'tamara',
  price: 56,
});
find(
  'dispensary',
  'Журнал поставок',
  'Лекарства увезли через лесопилку. Фельдшер обещает награду.',
  { flag: 'medicineQuest' },
);
find('guesthouse', 'Сеть на просушке', 'Рыбак оставил мешочек грузил.', {
  stock: 'stones',
  count: 6,
  owner: 'stepan',
  price: 12,
});
find(
  'guestattic',
  'Карта окрестностей',
  'Отмечены часовня, болото и старая охотничья изба.',
  { flag: 'marshMap' },
);
find(
  'dachaloft',
  'Коробка семян',
  'Под пакетами обнаружилось письмо с планом теплицы.',
  { stock: 'seeds', count: 3 },
);
find('dachacellar', 'Бабушкина заначка', 'Небольшая сумма на первый ремонт.', {
  coins: 30,
  lock: true,
});
find('greenhouse', 'Садовый инвентарь', 'В ящике остались семена репы.', {
  stock: 'seeds',
  count: 2,
});
find(
  'seedroom',
  'Обменный фонд',
  'Семена можно взять за плату. Они принадлежат соседям.',
  { stock: 'seeds', count: 3, owner: 'nina', price: 24 },
);
find(
  'orchard',
  'Дупло старой яблони',
  'Светлячки собираются вокруг блестящего осколка.',
  { flag: 'firefly', coins: 12 },
);
find(
  'boathouse',
  'Сломанная уключина',
  'Метка рыбака поможет открыть нишу часовни.',
  { flag: 'bell' },
);
find(
  'grove',
  'Потерянный колчан',
  'Несколько сухих стрел осталось между корнями.',
  { stock: 'arrows', count: 6 },
);
find('hunterhut', 'Охотничий сундук', 'Натянутый лук пережил хозяина.', {
  flag: 'bow',
  lock: true,
});
find(
  'hutcellar',
  'Контрабандная опись',
  'Среди записей — имя главаря и груз аптечных ящиков.',
  { flag: 'smugglerHint', coins: 20 },
);
find('marsh', 'Сумка травника', 'Зверобой не намок под двойной подкладкой.', {
  stock: 'herbs',
  count: 4,
});
find(
  'chapel',
  'Треснувшая плита',
  'На камне стоят три знака: росток, река и солнце.',
  { flag: 'sealHint' },
);
find('crypt', 'Костяной ключ', 'Ключ спрятан внутри пустого подсвечника.', {
  flag: 'bell',
  lock: true,
});
find(
  'reliquary',
  'Украденный колокол',
  'Малый колокол можно вернуть деревне или продать скупщику.',
  { flag: 'villageBell' },
);
find(
  'milloffice',
  'Сейф начальника смены',
  'В сейфе лежит жалование, которое рабочие не получили.',
  { coins: 48, lock: true },
);
find('bunkhouse', 'Сапоги в мешке', 'В подкладке обнаружена перевязь.', {
  stock: 'bandages',
  count: 2,
});
find(
  'millstore',
  'Армейская упаковка',
  'Две дымовые шашки помогут оторваться от погони.',
  { stock: 'smoke', count: 2 },
);
find(
  'engine',
  'Заклинивший привод',
  'Восстановленный привод откроет нижнюю штольню.',
  { flag: 'engine' },
);
find(
  'drain',
  'Промасленный свёрток',
  'Три метательных ножа пережили сырость.',
  { stock: 'throwing', count: 3 },
);
find(
  'galleries',
  'Забытая кирка',
  'Рядом лежат пригодные металлические детали.',
  { stock: 'ore', count: 3 },
);
find(
  'cistern',
  'Пульт шлюза',
  'Открыв дренаж, вы получаете доступ к тайному складу.',
  { flag: 'cistern' },
);
find('depot', 'Ящик лекарств', 'Это пропавшая поставка сельского медпункта.', {
  flag: 'medicine',
});
find('deepmine', 'Оружейная ниша', 'Охотничье копьё упирается в стену.', {
  flag: 'spear',
  lock: true,
});
find(
  'smuggler',
  'Тетрадь Смотрителя',
  'Список похищенного станет доказательством или товаром.',
  { flag: 'evidence' },
);
find(
  'refuge',
  'Аварийный запас',
  'В убежище ещё можно отдохнуть и перевязаться.',
  { stock: 'meals', count: 2 },
);
for (const r of ['greenhouse', 'orchard'] as const)
  for (let i = 0; i < 3; i++)
    addPlace(
      r,
      `plot:${r}:${i}`,
      'Грядка ' + (i + 1),
      580 + i * 170,
      770,
      'clue',
    );
addPlace('reading', 'seal-puzzle', 'Три печати', 600, 420, 'clue');
addPlace('clinic', 'tamara', 'Тамара', 620, 600, 'npc');
addPlace('guesthouse', 'stepan', 'Степан', 620, 600, 'npc');
addPlace('toolroom', 'boris', 'Борис', 620, 600, 'npc');
addPlace('village', 'constable', 'Участковый', 995, 855, 'npc');
addPlace('orchard', 'night-event', 'Светлячки над травой', 630, 450, 'clue');
export const unlocked = (s: State, gate?: string) =>
  !gate || s.flags.includes(gate);
export const roomObstacles = (r: string): number[][] => {
  const data = room(r);
  if (!data) return [];
  const common = [
    [278, 35, 475, 185],
    [850, 35, 398, 185],
  ];
  if (data[2] === 6)
    return [
      [915, 80, 320, 290],
      [278, 55, 300, 190],
    ];
  if (data[2] === 0) common.push([350, 170, 230, 190]);
  if (data[2] === 7) common.push([290, 180, 140, 160], [1060, 175, 155, 180]);
  return common;
};

addPlace('village', 'notice:law', 'Приёмная участкового', 1010, 910, 'board');
addPlace('dacha', 'gather:table', 'Стол для гостей', 1130, 605, 'clue');

for (const [id, data] of Object.entries(rooms)) {
  const r = id as ExtraRegion,
    skin = data[2];
  addPlace(
    r,
    'wing-note:' + r,
    'Записка: ' + wingNames[skin][0],
    1780,
    610,
    'clue',
  );
  addPlace(
    r,
    'wing-puzzle:' + r,
    'Тайник: ' + wingNames[skin][2],
    1740,
    1640,
    'chest',
  );
  const stock = (
    [
      'tea',
      'bandages',
      'ore',
      'herbs',
      'bread',
      'stones',
      'wood',
      'seeds',
      'arrows',
    ] as const
  )[skin];
  const supply = 'wing-supply:' + r;
  finds[supply] = {
    name: 'Припасы: ' + wingNames[skin][1],
    text: wingRiddles[skin].clue,
    stock,
    count: 2,
    owner: r === 'pantry' ? 'vera' : undefined,
    price: r === 'pantry' ? 28 : undefined,
  };
  addPlace(r, supply, finds[supply].name, 760, 1620, 'chest');
}
