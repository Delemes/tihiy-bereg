import { explorationScene, explorationChoice } from './rpg-exploration';
import { wingScene, wingChoice } from './rpg-wing-scenes';
import {
  has,
  people,
  activeEnemies,
  type State,
  type Stock,
  type Weapon,
} from './rpg-model';
import { finds } from './rpg-regions';
import { stockInfo, weapons } from './rpg-equipment';
import { advance, flag, note, maxHealth } from './rpg-core';
import { trade } from './rpg-systems';
import { startActivity } from './rpg-activities';
import {
  crime,
  provoke,
  threatenCitizen,
  citizen,
  payFine,
  fine,
} from './rpg-crime';
import { learn, perks } from './rpg-combat';
import type { Scene, Choice, Outcome } from './rpg-story';
const c = (
  id: string,
  label: string,
  hint?: string,
  disabled = false,
): Choice => ({ id, label, hint, disabled });
const leave = c('leave', 'Закончить');
const back = c('go:root', 'Вернуться');
const make = (
  title: string,
  text: string,
  choices: Choice[],
  role = 'Исследование',
): Scene => ({ title, text, choices: [...choices, leave], role, menu: true });
const newPeople = ['tamara', 'stepan', 'boris', 'constable'];
export function expansionScene(
  s: State,
  id: string,
  node: string,
): Scene | null {
  const detail = wingScene(s, id) || explorationScene(s, id);
  if (detail) return detail;
  if (id === 'notice:law')
    return make(
      'Приёмная участкового',
      'Через приёмную можно уплатить взыскание или передать доказательства в район. Погибших это не вернёт.',
      [
        c(
          'fine',
          'Уплатить взыскание',
          fine(s) + ' ₽',
          !s.wanted || s.coins < fine(s),
        ),
        c(
          'evidence:law',
          'Передать доказательства',
          '90 ₽',
          !has(s, 'evidence') || has(s, 'evidenceDone'),
        ),
      ],
    );
  const person = people[id as keyof typeof people];
  if (id.startsWith('memorial:')) {
    const who = id.slice(9);
    return make(
      'Пустое место',
      `${people[who as keyof typeof people]?.name || who} погиб. Соседи помнят случившееся. Его незавершённые дела останутся без награды.`,
      who === 'vera' && !has(s, 'key')
        ? [c('emergency-key', 'Найти связку бабушкиных ключей')]
        : [],
    );
  }
  if (person && citizen(s, id).dead)
    return make(person.name, 'Этот человек погиб. Разговор невозможен.', []);
  if (person && node === 'crime')
    return make(
      person.name,
      'Это навредит человеку и изменит вашу историю. Свидетели могут поднять розыск; убийство навсегда прекращает личные задания.',
      [
        c(
          'crime:threat',
          'Запугать',
          'Проверка уровня и оружия; провал приводит к драке',
          has(s, 'threatened:' + id),
        ),
        c(
          'crime:rob',
          'Потребовать кошелёк',
          '24 ₽, один раз; торговля с этим человеком прекратится',
          citizen(s, id).robbed,
        ),
        c(
          'crime:attack',
          'Начать нападение',
          'После выхода из разговора начнётся бой',
        ),
        back,
      ],
    );
  if (
    person &&
    (citizen(s, id).fear > 0 || citizen(s, id).robbed) &&
    id !== 'constable'
  )
    return make(
      person.name,
      '«Отойди. После того, что ты сделал, нам не о чем говорить».',
      [c('go:crime', 'Прибегнуть к силе')],
      'Недоверие',
    );
  if (newPeople.includes(id)) {
    if (node === 'shop')
      return make(
        person!.name,
        'Выберите снаряжение. Боеприпасы продаются поштучно; запас на день ограничен.',
        [
          ...Object.entries(weapons)
            .filter(([, w]) => w.price > 0)
            .map(([id, w]) =>
              c(
                'buy:' + id,
                w.name,
                `${w.price} ₽ · ${w.description}`,
                s.weapons.includes(id as Weapon) || s.coins < w.price,
              ),
            ),
          ...['arrows', 'stones', 'throwing', 'smoke', 'seeds'].map((id) =>
            c(
              'buy:' + id,
              stockInfo[id as Stock].name,
              stockInfo[id as Stock].price + ' ₽',
              s.coins < stockInfo[id as Stock].price,
            ),
          ),
          back,
        ],
      );
    if (node === 'training')
      return make(
        'Уроки Бориса',
        'Каждый уровень даёт одно очко развития. Освоенный приём остаётся с вами.',
        Object.entries(perks)
          .map(([id, p]) =>
            c(
              'learn:' + id,
              p.name,
              `Уровень ${p.level} · ${p.description}`,
              s.perks.includes(id) ||
                1 + Math.floor(s.xp / 160) < p.level ||
                s.perks.length >= Math.floor(s.xp / 160),
            ),
          )
          .concat(back),
      );
    const texts: Record<string, string> = {
      tamara: has(s, 'medicineReturned')
        ? '«С лекарствами спокойнее. Теперь хоть можно строить планы на зиму».'
        : has(s, 'medicine')
          ? 'Тамара узнаёт аптечное клеймо. «Ты нашёл их? Я уже думала ехать в район и просить в долг».'
          : '«Бинтами всё не вылечишь. Лекарства пропали по дороге — следы ведут к старому складу под лесопилкой».',
      stepan: has(s, 'bellReturned')
        ? '«Слышал колокол утром? Хороший звук. Почти как раньше».'
        : '«Часовню разграбили. Малый колокол утащили в склеп. Если вернёшь, соберём всем миром тебе награду».',
      boris:
        '«Оружие выбирают под дорогу. Копьё держит зверя подальше, лук требует пространства, арбалет — времени. Могу продать, научить или перековать детали».',
      constable: s.wanted
        ? `«Тебя ищут. Взыскание — ${fine(s)} рублей. Смерть человека деньгами не отменить».`
        : '«Если найдёшь доказательства о пропавших грузах, приноси сюда. Одних слухов мне недостаточно».',
    };
    const choices: Choice[] =
      id === 'tamara'
        ? [
            c(
              'accept:medicineQuest',
              'Расспросить о пропаже',
              undefined,
              has(s, 'medicineQuest'),
            ),
            c(
              'medicine:return',
              'Передать лекарства',
              '80 ₽, репутация +2, бесплатное лечение',
              !has(s, 'medicine') || has(s, 'medicineReturned'),
            ),
            c(
              'medical',
              'Перевязка и лечение травмы',
              '45 ₽; один приём в день',
              s.coins < 45 || s.daily.medical === s.day,
            ),
          ]
        : id === 'stepan'
          ? [
              c(
                'accept:bellQuest',
                'Выслушать историю колокола',
                undefined,
                has(s, 'bellQuest'),
              ),
              c(
                'bell:return',
                'Вернуть колокол',
                '60 ₽ и репутация +2',
                !has(s, 'villageBell') ||
                  has(s, 'bellReturned') ||
                  has(s, 'bellSold'),
              ),
              c(
                'lake:lesson',
                'Послушать об озёрной рыбе',
                'Один раз · +20 опыта',
                has(s, 'fishLesson'),
              ),
            ]
          : id === 'boris'
            ? [
                c('go:shop', 'Купить оружие и боеприпасы'),
                c('go:training', 'Обучиться приёму'),
                c(
                  'craft:arrows',
                  'Сделать 8 стрел',
                  '1 деталь, 1 дрова и 10 сил',
                  s.ore < 1 || s.wood < 1 || s.energy < 10,
                ),
                c(
                  'craft:meal',
                  'Приготовить овощную похлёбку',
                  '2 репы, 1 дрова',
                  s.crops < 2 || s.wood < 1,
                ),
              ]
            : [
                c(
                  'fine',
                  'Уплатить взыскание',
                  fine(s) + ' ₽',
                  s.wanted === 0 || s.coins < fine(s),
                ),
                c(
                  'evidence:law',
                  'Передать доказательства',
                  '90 ₽, репутация +3',
                  !has(s, 'evidence') || has(s, 'evidenceDone'),
                ),
              ];
    return make(
      person!.name,
      texts[id],
      [...choices, c('go:crime', 'Угрозы и нападение')],
      person!.role,
    );
  }
  if (id === 'seal-puzzle')
    return make(
      'Печати архива',
      'В журнале сказано: «Сначала жизнь, затем вода, затем свет». Нажмите знаки в этом порядке.',
      [
        c('seal:right', 'Росток → река → солнце', undefined, has(s, 'seal')),
        c('seal:wrong', 'Солнце → росток → река', undefined, has(s, 'seal')),
      ],
    );
  if (id === 'night-event')
    return make(
      'Светлячки в саду',
      s.minutes >= 1140
        ? 'Они складываются в цепочку над старым пнём. Тихое движение позволит увидеть, что скрыто под мхом.'
        : 'Пока светло, в траве ничего не видно. Здесь стоит задержаться после семи вечера.',
      [
        c(
          'firefly:wait',
          'Тихо проследить за огоньками',
          'Редкая находка · 10 сил',
          s.minutes < 1140 || has(s, 'fireflySecret') || s.energy < 10,
        ),
      ],
    );
  if (id.startsWith('plot:')) {
    const g = s.garden[id],
      wet = g?.watered.includes(s.day),
      ready = g && s.day - g.planted >= 2 && g.watered.length >= 2;
    return make(
      'Грядка',
      !g
        ? 'Пустая земля. Сначала разрыхлите её и посадите семя.'
        : ready
          ? 'Репа созрела. Можно собирать.'
          : wet
            ? 'Почва влажная. Рост продолжается до следующего дня.'
            : 'Земля подсохла. Урожаю нужны поливы в два разных дня.',
      [
        c(
          'garden:plant',
          'Разрыхлить и посеять',
          '1 семя, 8 сил, 15 минут',
          !!g || s.seeds < 1 || s.energy < 8,
        ),
        c(
          'garden:water',
          'Полить',
          '4 силы, 10 минут',
          !g || wet || s.energy < 4,
        ),
        c('garden:harvest', 'Собрать урожай', '2 репы', !ready),
      ],
    );
  }
  const f = finds[id];
  if (f) {
    const taken = has(s, 'taken:' + id),
      locked = f.lock && !has(s, 'unlocked:' + id),
      boss = activeEnemies(s).some((e) => e.style === 'boss');
    const mechanic = ['engine', 'cistern'].includes(f.flag || '');
    return make(
      f.name,
      taken ? 'Здесь больше ничего нет.' : f.text,
      [
        ...(mechanic
          ? [
              c(
                'repair:' + f.flag,
                'Восстановить механизм',
                'Собрать электрическую схему',
                has(s, f.flag!),
              ),
            ]
          : [
              ...(locked
                ? [
                    c(
                      'picklock',
                      'Подобрать штифты замка',
                      '6 попыток; неудача заклинит замок до завтра',
                      taken || s.daily['jam:' + id] === s.day,
                    ),
                  ]
                : []),
              ...(f.owner
                ? [
                    c(
                      'find:buy',
                      'Выкупить у владельца',
                      `${f.price} ₽`,
                      taken ||
                        s.coins < (f.price || 0) ||
                        citizen(s, f.owner).dead ||
                        citizen(s, f.owner).robbed ||
                        citizen(s, f.owner).fear > 0,
                    ),
                    c(
                      'find:steal',
                      'Украсть',
                      'Свидетели сообщат о краже',
                      taken || locked || boss,
                    ),
                  ]
                : [
                    c(
                      'find:take',
                      'Забрать находку',
                      boss ? 'Сначала победите хозяина убежища.' : undefined,
                      taken || locked || boss,
                    ),
                  ]),
            ]),
        ...(id === 'find:reliquary'
          ? [
              c(
                'bell:sell',
                'Сбыть колокол перекупщику',
                '110 ₽; деревня останется без колокола',
                !has(s, 'villageBell') ||
                  has(s, 'bellReturned') ||
                  has(s, 'bellSold'),
              ),
            ]
          : []),
        ...(id === 'find:smuggler'
          ? [
              c(
                'evidence:deal',
                'Продать тетрадь посреднику',
                '145 ₽; поставки продолжат исчезать',
                !has(s, 'evidence') || has(s, 'evidenceDone'),
              ),
            ]
          : []),
      ],
      f.owner ? 'Чужая собственность' : 'Находка',
    );
  }
  return null;
}
export function expansionChoice(
  s: State,
  id: string,
  action: string,
  node: string,
): Outcome | null {
  const detail = wingChoice(s, id, action) || explorationChoice(s, id, action);
  if (detail) return detail;
  let n = s;
  const done = (text?: string, close = false): Outcome => ({
    state: n,
    node,
    text,
    close,
    emotion: n.citizens[id]?.fear ? 2 : text ? 1 : 0,
  });
  if (action.startsWith('crime:')) {
    const kind = action.slice(6);
    n =
      kind === 'attack'
        ? provoke(s, id)
        : threatenCitizen(s, id, kind === 'rob');
    return done(undefined, true);
  }
  if (action.startsWith('learn:')) {
    n = learn(s, action.slice(6));
    return done();
  }
  if (action === 'fine') {
    n = payFine(s);
    return done('Патруль получил распоряжение прекратить преследование.');
  }
  if (action === 'medical') {
    n = advance(
      {
        ...s,
        coins: s.coins - 45,
        wounds: Math.max(0, s.wounds - 1),
        statuses: [],
        daily: { ...s.daily, medical: s.day },
      },
      60,
    );
    n.hp = maxHealth(n);
    return done('Тамара перевязала раны и сняла одну травму.');
  }
  if (action.startsWith('accept:')) {
    n = flag(s, action.slice(7));
    return done('Место отмечено в дневнике.');
  }
  if (action === 'medicine:return') {
    n = flag(
      {
        ...s,
        coins: s.coins + 80,
        reputation: s.reputation + 2,
        wounds: Math.max(0, s.wounds - 1),
        statuses: [],
        xp: s.xp + 75,
      },
      'medicineReturned',
    );
    n.hp = maxHealth(n);
    return done('«Теперь у нас будет спокойная зима. Спасибо, Лёша».');
  }
  if (action === 'bell:return') {
    n = flag(
      {
        ...s,
        coins: s.coins + 60,
        reputation: s.reputation + 2,
        xp: s.xp + 65,
      },
      'bellReturned',
    );
    return done(
      'Степан бережно заворачивает колокол. Наутро он снова зазвонит над деревней.',
    );
  }
  if (action === 'bell:sell') {
    n = flag(
      { ...s, coins: s.coins + 110, reputation: s.reputation - 2 },
      'bellSold',
    );
    return done('Посредник увозит колокол. В часовню он уже не вернётся.');
  }
  if (action === 'evidence:law' || action === 'evidence:deal') {
    const law = action.endsWith('law');
    n = flag(
      flag(
        {
          ...s,
          coins: s.coins + (law ? 90 : 145),
          reputation: s.reputation + (law ? 3 : -3),
          xp: s.xp + 100,
        },
        'evidenceDone',
      ),
      law ? 'suppliesSafe' : 'smugglerDeal',
    );
    return done(
      law
        ? 'Поставки взяли под охрану. Деревня получит лекарства и зерно.'
        : 'Доказательства исчезли. Ваш кошелёк стал тяжелее, а деревня — беднее.',
    );
  }
  if (action === 'lake:lesson') {
    n = flag({ ...s, xp: s.xp + 20 }, 'fishLesson');
    return done(
      '«На рывке уступи. Рыба устанет быстрее тебя, если не торопиться».',
    );
  }
  if (action === 'craft:arrows') {
    n = advance(
      {
        ...s,
        arrows: s.arrows + 8,
        ore: s.ore - 1,
        wood: s.wood - 1,
        energy: s.energy - 10,
      },
      30,
    );
    return done('Борис выправил наконечники. Получено 8 стрел.');
  }
  if (action === 'craft:meal') {
    n = advance(
      { ...s, crops: s.crops - 2, wood: s.wood - 1, meals: s.meals + 1 },
      25,
    );
    return done('Овощная похлёбка готова.');
  }
  if (action === 'emergency-key') {
    n = flag(s, 'key');
    return done(
      'Связка сохранилась под прилавком. Дом можно открыть, но Вера уже не встретит вас.',
    );
  }
  if (action === 'seal:right') {
    n = flag({ ...s, xp: s.xp + 25 }, 'seal');
    return done('Печати отступили. Дверь закрытого архива открыта.');
  }
  if (action === 'seal:wrong') {
    n = advance({ ...s, energy: Math.max(0, s.energy - 5) }, 10);
    return done('Печати не поддаются. Попробуйте прочитать подсказку иначе.');
  }
  if (action === 'firefly:wait') {
    n = flag(
      advance(
        { ...s, energy: s.energy - 10, smoke: s.smoke + 1, xp: s.xp + 25 },
        30,
      ),
      'fireflySecret',
    );
    return done('Под мхом оказался дорожный свёрток с дымовой шашкой.');
  }
  if (action.startsWith('garden:')) {
    const garden = { ...s.garden };
    if (action === 'garden:plant') {
      garden[id] = { planted: s.day, watered: [] };
      n = advance(
        { ...s, seeds: s.seeds - 1, energy: s.energy - 8, garden },
        15,
      );
    }
    if (action === 'garden:water') {
      garden[id] = { ...garden[id], watered: [...garden[id].watered, s.day] };
      n = advance({ ...s, energy: s.energy - 4, garden }, 10);
    }
    if (action === 'garden:harvest') {
      delete garden[id];
      n = flag(
        advance({ ...s, crops: s.crops + 2, xp: s.xp + 6, garden }, 10),
        'harvested',
      );
    }
    return done();
  }
  if (action === 'picklock') {
    n = startActivity(s, 'lock', id);
    return done(undefined, n.activity !== s.activity);
  }
  if (action.startsWith('repair:')) {
    n = startActivity(s, 'repair', action.slice(7));
    return done(undefined, n.activity !== s.activity);
  }
  if (action.startsWith('find:')) {
    const f = finds[id];
    if (!f) return null;
    if (action === 'find:buy') n = { ...n, coins: n.coins - (f.price || 0) };
    if (action === 'find:steal' && f.owner) n = crime(n, f.owner, 'theft');
    n = flag(n, 'taken:' + id);
    if (f.stock && f.stock in stockInfo)
      n = { ...n, [f.stock]: n[f.stock as Stock] + (f.count || 1) };
    if (f.coins) n = { ...n, coins: n.coins + f.coins };
    if (f.flag) {
      n = flag(n, f.flag);
      if (f.flag in weapons && !n.weapons.includes(f.flag as Weapon))
        n = { ...n, weapons: [...n.weapons, f.flag as Weapon] };
    }
    n = note({ ...n, xp: n.xp + 10 }, f.name + ' — получено.');
    return done(f.text);
  }
  if (
    newPeople.includes(id) &&
    (action.startsWith('buy:') || action.startsWith('sell:'))
  ) {
    n = trade(s, action.split(':')[1], action.startsWith('sell:'));
    return done();
  }
  return null;
}
