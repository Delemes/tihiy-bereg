import { expansionScene, expansionChoice } from './rpg-interactions';
import { socialScene, socialChoice } from './rpg-social-scenes';
import { has, people, type State, type Person, type Stock } from './rpg-model';
import {
  flag,
  note,
  trade,
  stockInfo,
  weapons,
  startActivity,
  travel,
  advance,
  clamp,
  maxHealth,
} from './rpg-systems';
export type Choice = {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};
export type Scene = {
  title: string;
  role: string;
  text: string;
  portrait?: number;
  emotion?: number;
  choices: Choice[];
  menu?: boolean;
};
export type Outcome = {
  state: State;
  node: string;
  text?: string;
  emotion?: number;
  close?: boolean;
};
const c = (
  id: string,
  label: string,
  hint?: string,
  disabled = false,
): Choice => ({ id, label, hint, disabled });
const back = c('go:root', 'Вернуться к разговору');
const leave = c('leave', 'До встречи');
const romance = (id: string): id is Person =>
  ['anna', 'katya', 'nina'].includes(id);
const bondQuest = { anna: 'annaQuest', katya: 'pumpDone', nina: 'ninaQuest' };
const rootText: Record<string, string> = {
  anna: 'Анна отмечает страницу пальцем и отодвигает соседний стул. «Садись. Только не говори, что опять на минутку».',
  katya:
    'Из-под капота доносится стук. Катя выпрямляется, вытирает руки. «Если по делу — слушаю. Если поболтать… тоже слушаю».',
  nina: 'Нина опускает фотоаппарат. «Подожди. Вот теперь можно: свет ушёл, зато у нас появилось время».',
  mikhail:
    'Михаил складывает карту по старым сгибам. «Как дорога? Сначала это, потом новости».',
  vera: '«Проходи, дверь прикрой. Чай стынет, а дела подождут». Вера пододвигает к вам табурет.',
  lev: 'Лев держит велосипед за погнутый руль. «Нога цела. Самолюбие — не очень». ',
};
export function scene(s: State, id: string, node = 'root'): Scene {
  const social = socialScene(s, id, node);
  if (social) return social;
  const extra = expansionScene(s, id, node);
  if (extra) {
    const p = people[id as keyof typeof people];
    return {
      ...extra,
      portrait: p?.portrait,
      emotion: node === 'crime' || s.citizens[id]?.fear ? 2 : 0,
    };
  }
  const person = people[id as keyof typeof people];
  const make = (
    text: string,
    choices: Choice[],
    emotion = 0,
    menu = false,
  ): Scene => ({
    title: person?.name || 'Тихий берег',
    role: person ? `${person.role} · ${person.age} лет` : '',
    portrait: person?.portrait,
    text,
    choices:
      person && node === 'root'
        ? [
            ...choices.filter((c) => c.id !== 'leave'),
            c('go:crime', 'Угрозы и нападение'),
            c('go:social', 'Встретиться вечером'),
            leave,
          ]
        : choices,
    emotion,
    menu,
  });
  if (person) {
    if (node === 'root')
      return make(
        !s.met.includes(id)
          ? (
              {
                anna: '«Ты Лёша? Я Анна. Вчера нашла в формуляре твоей бабушки записку: “Верну после весны”. Она книгу так и не вернула». Анна улыбается. «Надеюсь, ты приехал не только за долгами».',
                katya:
                  '«Лёша, да? Я Катя. Если автобус дымил на подъезде — это ещё не я его чинила. Если доехал — уже почти моя работа».',
                nina: '«Ты новый сосед? Я Нина. Не волнуйся, без спроса не снимаю». Она убирает камеру. «С чужими историями и так слишком легко обойтись небрежно».',
                mikhail:
                  '«Михаил. Лесник, когда в лесу, и сосед — всё остальное время. Ты бабушкин дом открыл? Вера ключи берегла».',
                vera: 'Вера долго смотрит на вас, потом достаёт две связки. «Эта — от дома. Эта — от дачи в Пушкино. Твоя бабушка запрещала продавать дачу раньше, чем ты проведёшь там хотя бы один вечер».',
                lev: '«Не смейся. Навигатор сказал: короткая дорога». Лев кивает на спущенное колесо. «Сумку в штольне отобрали. Там письма. Обычные, бумажные. Люди их ждут». ',
              } as Record<string, string>
            )[id]
          : rootText[id],
        [
          ...(!s.met.includes(id)
            ? [c('meet', 'Представиться и выслушать')]
            : [
                c('go:topics', 'Продолжить разговор'),
                c('go:quest', 'О делах и заданиях'),
                ...(romance(id)
                  ? [c('go:personal', 'Поговорить наедине')]
                  : []),
                ...(id === 'vera' || id === 'katya'
                  ? [
                      c(
                        'go:shop',
                        id === 'vera'
                          ? 'Купить припасы'
                          : 'Посмотреть инструменты',
                      ),
                      c('go:sell', 'Продать'),
                    ]
                  : []),
              ]),
          leave,
        ],
        0,
        true,
      );
    if (node === 'topics')
      return make(
        (
          {
            anna: '«Смешно: я знаю, кто что читал тридцать лет назад, но не знаю, почему сама до сих пор здесь». Она крутит карандаш. «Ты это называешь верностью месту или страхом уехать?»',
            katya:
              '«В городе мне объясняли, как правильно жить. Здесь объясняют, как правильно чинить насос. Хотя насос видели только издалека».',
            nina: '«Мне предлагают серию: “Умирающая деревня”. Красивое название. Только люди здесь не реквизит. А отказаться — значит остаться без заказа».',
            mikhail:
              '«Лесопилка закрылась, а грузовики ездят. И в штольне свет по ночам. Мне говорят: не твоё дело. Только вода из-под неё течёт в наш колодец».',
            vera: '«В кассе не бесконечно. Покупаю восемь вещей за день; продукты привозят по пять упаковок. Работа есть — собрать заказы, если руки свободны».',
            lev: '«Каждое письмо кому-то важно. Даже квитанция. Особенно если пенсия маленькая». ',
          } as Record<string, string>
        )[id],
        [
          ...(!has(s, 'talk:' + id)
            ? id === 'anna'
              ? [
                  c(
                    'anna-stay',
                    'Можно остаться по своей воле. И однажды уехать — тоже.',
                  ),
                  c('anna-dismiss', 'По-моему, ты просто боишься перемен.'),
                ]
              : id === 'katya'
                ? [
                    c(
                      'katya-respect',
                      'Покажешь, как ты это делаешь? Я могу подержать.',
                    ),
                    c('katya-patronize', 'Давай я сам. Это тяжёлая работа.'),
                  ]
                : id === 'nina'
                  ? [
                      c(
                        'nina-honest',
                        'Сними живую деревню. Даже если заказчик хотел другую.',
                      ),
                      c(
                        'nina-market',
                        'Платят за развалины — снимай развалины.',
                      ),
                    ]
                  : [c('listen', 'Я тебя понял. Расскажи, чем помочь.')]
            : []),
          back,
        ],
        0,
      );
    if (node === 'personal' && romance(id)) {
      const committed = s.partner === id;
      return make(
        committed
          ? 'Разговор уже не нужно начинать с повода. Вы немного молчите рядом — и это тоже ответ.'
          : (
              {
                anna: '«Ты всегда спрашиваешь про бабушку. А про себя почти ничего не говоришь». Она закрывает книгу. «Что ты ищешь здесь, Лёша?»',
                katya:
                  '«Я умею починить мотор. С людьми сложнее: запасных деталей нет». Катя усмехается, но взгляда не отводит.',
                nina: '«Я привыкла стоять по другую сторону объектива. Когда на меня смотрят внимательно, всё ещё не знаю, куда деть руки». ',
              } as Record<Person, string>
            )[id],
        [
          ...(!has(s, 'heart:' + id)
            ? [
                c(
                  'heart-honest',
                  id === 'anna'
                    ? 'Место, где не придётся притворяться.'
                    : id === 'katya'
                      ? 'Тебе не нужно быть сильной всё время.'
                      : 'Я хочу узнать тебя, даже без фотографий.',
                ),
                c(
                  'heart-shallow',
                  'Не усложняй. Просто приятно провести время.',
                ),
              ]
            : []),
          c(
            'gift',
            'Подарить цветы',
            '1 букет · один искренний подарок',
            s.flowers < 1 || has(s, 'gift:' + id),
          ),
          ...(!committed
            ? [
                c(
                  'go:commit',
                  'Пригласить на свидание',
                  'Доверие 4 · завершить её историю',
                  s.affection[id] < 4 || !has(s, bondQuest[id]),
                ),
              ]
            : []),
          back,
        ],
        committed ? 1 : 0,
      );
    }
    if (node === 'commit' && romance(id))
      return make(
        s.partner && s.partner !== id
          ? '«Я слышала, что ты уже с другой. Сначала разберись с этим — потом приходи. Мне не нужен человек наполовину».'
          : '«Ты понимаешь, что я спрашиваю не про один вечер?» Она смотрит прямо. «Давай без обещаний, которые удобно забыть».',
        [
          c(
            'commit',
            'Я хочу быть с тобой. Не только сегодня.',
            undefined,
            !!s.partner && s.partner !== id,
          ),
          back,
        ],
        1,
      );
    if (node === 'shop') {
      const ids =
        id === 'katya'
          ? ['knife', 'axe', 'wood']
          : ['bread', 'tea', 'bandages', 'meat', 'spice'];
      return make(
        id === 'katya'
          ? '«Нож быстрый, но придётся подойти близко. Топор медленный; сильным ударом собьёшь замах. Палку тоже рано выбрасывать — длина у неё хорошая».'
          : '«Бери с расчётом на дорогу. Назад пешком можно, голодным — тяжелее».',
        ids
          .map((k) => {
            const w = k === 'knife' || k === 'axe' ? weapons[k] : null,
              st = stockInfo[k as Stock],
              price = w?.price || st?.price || 0;
            return c(
              'buy:' + k,
              `${w?.name || st.name} — ${price} ₽`,
              w?.description || st.description,
              s.coins < price ||
                (w
                  ? s.weapons.includes(k as 'knife' | 'axe')
                  : (s.daily['bought:' + s.day + ':' + k] || 0) >= 5),
            );
          })
          .concat(back),
        0,
        true,
      );
    }
    if (node === 'sell')
      return make(
        '«Куплю то, что сама смогу продать. Восемь вещей за день — больше не возьму».',
        Object.entries(stockInfo)
          .filter(([, v]) => v.sell > 0)
          .map(([k, v]) =>
            c(
              'sell:' + k,
              `${v.name} · у вас ${s[k as Stock]}`,
              `${v.sell} ₽`,
              s[k as Stock] === 0 || (s.daily['sales:' + s.day] || 0) >= 8,
            ),
          )
          .concat(back),
        0,
        true,
      );
    if (node === 'quest') {
      if (id === 'vera')
        return make(
          '«Помощь нужна всегда. Но за обещания не плачу. А с ранами не тяни — обработаем».',
          [
            c(
              'work',
              'Собрать заказы',
              'Три этапа · 42 ₽ за точную работу · раз в день',
              s.daily.work === s.day || s.energy < 16,
            ),
            c(
              'clinic',
              'Обработать раны',
              '45 ₽ · здоровье и лечение травм',
              s.coins < 45 || (s.hp === 100 && !s.wounds),
            ),
            c(
              'soup',
              'Попросить тарелку каши',
              'Если осталось меньше 18 ₽ · раз в день',
              s.coins >= 18 || s.daily.soup === s.day,
            ),
            back,
          ],
        );
      if (id === 'anna')
        return make(
          has(s, 'letter') && !has(s, 'annaQuest')
            ? 'Анна разворачивает письмо. «Это о человеке, которого она ждала. В архиве такого нет». Её палец замирает над последней строкой. «Мы вправе показать это всем?»'
            : has(s, 'annaQuest')
              ? '«Письмо на своём месте. А вот у книги из штольни совсем другая цена молчания».'
              : '«Записка вела к лодке на северном берегу. Я не прошу искать клад. Просто… там могло остаться письмо».',
          [
            ...(!has(s, 'letterQuest')
              ? [c('letter-quest', 'Я поищу письмо.')]
              : []),
            ...(has(s, 'letter') && !has(s, 'annaQuest')
              ? [
                  c(
                    'letter-private',
                    'Оставим это между нами. Она писала одному человеку.',
                  ),
                  c('letter-public', 'Сохраним в архиве, но скроем имена.'),
                ]
              : []),
            ...(has(s, 'ledger') && !has(s, 'truth') && !has(s, 'deal')
              ? [c('go:ledger', 'Показать книгу сделок из штольни')]
              : []),
            back,
          ],
        );
      if (id === 'katya')
        return make(
          has(s, 'pumpFixed') && !has(s, 'pumpDone')
            ? '«Работает!» Катя смеётся и сразу становится серьёзной. «Теперь об оплате. Можно поставить счётчик. А можно договориться с соседями о ремонте по очереди».'
            : has(s, 'pumpDone')
              ? '«Насос больше не кашляет. Хоть у кого-то в деревне теперь стабильная работа».'
              : '«Колодец мелкий, насос старый. В штольне должен быть целый ротор. Принесёшь — починим вместе. Но сначала разберись с заслонкой, иначе туда не пройти».',
          [
            ...(!has(s, 'pumpQuest')
              ? [c('pump-quest', 'Помогу. Что именно искать?')]
              : []),
            ...(has(s, 'pumpPart') && !has(s, 'pumpFixed')
              ? [
                  c(
                    'repair-pump',
                    'Починить насос вместе',
                    'Три этапа: подогнать, закрепить, настроить',
                  ),
                ]
              : []),
            ...(has(s, 'pumpFixed') && !has(s, 'pumpDone')
              ? [
                  c('pump-common', 'Вода общая. Составим график ремонта.'),
                  c('pump-paid', 'Поставим счётчик. Нужно отбить расходы.'),
                ]
              : []),
            back,
          ],
        );
      if (id === 'nina')
        return make(
          has(s, 'album')
            ? 'Нина долго рассматривает альбом. «Твоя дача ведь совсем не пустая. Просто ты ещё не вписан в эти фотографии». Она улыбается. «Исправим?»'
            : '«У тебя на даче должен быть альбом. Я видела его у прежней хозяйки. Хотелось бы узнать имена людей — прежде чем снимать их дом».',
          [
            ...(has(s, 'album') && !has(s, 'albumShared')
              ? [
                  c(
                    'album-share',
                    'Расскажу всё, что знаю. Остальное выясним вместе.',
                  ),
                ]
              : []),
            c(
              'dinner',
              'Пригласить на шашлык',
              'Хороший шашлык + готовая порция + альбом',
              !has(s, 'goodGrill') ||
                !has(s, 'albumShared') ||
                s.meals < 1 ||
                has(s, 'ninaQuest'),
            ),
            back,
          ],
        );
      if (id === 'mikhail')
        return make(
          has(s, 'heirloomDone')
            ? 'Михаил убирает компас во внутренний карман. «Теперь как будто отец опять может подсказать дорогу».'
            : '«В конторе лесопилки остался отцовский компас. Не геройствуй. Смотрящий сдастся, если прижать, а можно просто уйти и вернуться подготовленным».',
          [
            ...(!has(s, 'millQuest')
              ? [c('mill-quest', 'Если найду — верну.')]
              : []),
            c(
              'return-compass',
              'Вернуть компас',
              '65 ₽ · 70 опыта',
              !has(s, 'heirloom') ||
                has(s, 'heirloomDone') ||
                !has(s, 'millQuest'),
            ),
            back,
          ],
        );
      if (id === 'lev')
        return make(
          '«В сумке письма и деньги на марки. Деньги оставь, если надо. Письма только верни».',
          [
            ...(!has(s, 'courierQuest')
              ? [c('courier-quest', 'Найду сумку. Люди дождутся писем.')]
              : []),
            c(
              'return-mail',
              'Отдать сумку целиком',
              '45 ₽ · репутация +1',
              !has(s, 'mailbag') || has(s, 'courierDone'),
            ),
            c(
              'keep-mail-money',
              'Вернуть письма, оставив деньги себе',
              '70 ₽ · доверие к вам пострадает',
              !has(s, 'mailbag') || has(s, 'courierDone'),
            ),
            back,
          ],
        );
    }
    if (node === 'ledger')
      return make(
        'Анна перелистывает книгу. «Это не слухи. Здесь подписи, суммы, адреса». Она понижает голос. «Опубликуем — будет скандал. Спрячем — всё продолжится. За молчание предлагают деньги, я знаю».',
        [
          c(
            'ledger-truth',
            'Пусть все увидят. Я выступлю вместе с тобой.',
            'Без выплаты · открытое расследование',
          ),
          c(
            'ledger-deal',
            'Продадим книгу посреднику. Мне нужен новый старт.',
            '180 ₽ · скрыть доказательства',
          ),
          back,
        ],
        2,
      );
    return make(rootText[id], [back]);
  }
  if (id === 'road-event') {
    if (s.encounter === 'courier') return scene(s, 'lev', node);
    return {
      title:
        s.encounter === 'traveler' ? 'Промокший путник' : 'Торговец у обочины',
      role: 'Случайная встреча',
      text:
        s.encounter === 'traveler'
          ? 'Под сосной человек пытается согреть руки. «До деревни далеко? Я с утра ничего не ел». На рюкзаке болтается порванный ремень.'
          : '«Прямо сейчас отдам бинт за двадцать четыре». Мужчина показывает запечатанную упаковку. «Или обменяю на три зверобоя. В лавке я бы столько не просил».',
      choices:
        s.encounter === 'traveler'
          ? [
              c(
                'help-traveler',
                'Поделиться хлебом и показать дорогу',
                '−1 хлеб · репутация +1',
                s.bread < 1,
              ),
              c('ignore-event', 'Показать дорогу и идти дальше'),
            ]
          : [
              c('event-buy', 'Купить бинт', '24 ₽', s.coins < 24),
              c(
                'event-barter',
                'Обменять три зверобоя',
                '3 травы',
                s.herbs < 3,
              ),
              c('ignore-event', 'Отказаться'),
            ],
    };
  }
  const prop = (title: string, text: string, choices: Choice[]): Scene => ({
    title,
    role: 'Бережки и окрестности',
    text,
    choices: [...choices, c('leave', 'Отойти')],
  });
  if (id === 'bus' || id === 'bus-back')
    return prop(
      'Остановка',
      id === 'bus'
        ? 'Пушкино — сорок пять минут по просёлку. Автобус потряхивает, зато можно поберечь ноги. Тропа вдоль дороги бесплатная.'
        : 'Обратный автобус идёт до Бережков. Пешком дольше, но кошелёк можно не доставать.',
      [
        c('ride', 'Поехать на автобусе', '12 ₽ · 45 минут', s.coins < 12),
        c('walk', 'Пойти пешком', '100 минут · −15 сил'),
      ],
    );
  if (id === 'bed' || id === 'dacha-bed')
    return prop(
      'До утра',
      'Сон восстановит здоровье в пределах травм. Перед сном стоит поесть: за ночь уйдёт 18 сытости.',
      [
        c('sleep', 'Лечь спать', 'Следующий день · 08:00'),
        c('nap', 'Отдохнуть час', '+25 сил · немного проголодаетесь'),
      ],
    );
  if (['grill', 'stove', 'camp', 'mill-camp'].includes(id))
    return prop(
      id === 'grill' ? 'Мангал во дворе' : 'Приготовить ужин',
      'Выберите маринад, разогрейте угли и следите за двумя сторонами мяса. Сильный жар ускоряет готовку, но легко всё испортить.',
      [
        c(
          'cook',
          'Подготовить продукты',
          '1 мясо / рыба + 1 дрова · специи по желанию',
          s.meat + s.fish < 1 || s.wood < 1,
        ),
      ],
    );
  if (['bench', 'dacha-bench'].includes(id))
    return prop(
      'Рабочий стол',
      'Вещи для дороги можно приготовить самому. Травы лучше собирать аккуратно — так их хватит и на чай, и на повязку.',
      [
        c(
          'craft-tea',
          'Заварить крепкий чай',
          '2 зверобоя + 1 дрова',
          s.herbs < 2 || s.wood < 1,
        ),
        c(
          'craft-bandage',
          'Сделать лечебную повязку',
          '2 зверобоя + 10 ₽',
          s.herbs < 2 || s.coins < 10,
        ),
      ],
    );
  if (id === 'order') return scene(s, 'vera', 'quest');
  if (id === 'clue')
    return prop(
      'Лодка на берегу',
      has(s, 'letter')
        ? 'Под сиденьем больше ничего нет.'
        : 'Под сиденьем спрятан конверт. Бумага отсырела, но строки ещё можно прочесть.',
      [
        c(
          'take-letter',
          'Осторожно достать письмо',
          undefined,
          has(s, 'letter'),
        ),
      ],
    );
  if (id === 'dacha-album')
    return prop(
      'Семейный альбом',
      'На фотографиях — ваша дача, стол в саду и незнакомые улыбающиеся люди. На обороте: «Не откладывайте хорошие вечера».',
      [
        c(
          'read-album',
          'Прочесть подписи и запомнить имена',
          undefined,
          has(s, 'album'),
        ),
      ],
    );
  if (id === 'archive')
    return prop(
      'Сельский архив',
      'Газетная вырезка: старую штольню закрыли после подтопления. Заслонку открывают в три этапа: снять стопор, выровнять давление, повернуть вентиль.',
      [],
    );
  if (id === 'valve')
    return prop(
      'Ржавая заслонка',
      has(s, 'valveOpen')
        ? 'Вода ушла. Северные проходы доступны.'
        : 'До северных помещений по колено воды. Нужно выровнять давление и открыть заслонку.',
      [
        c(
          'repair-valve',
          'Взяться за механизм',
          'Три точных действия',
          has(s, 'valveOpen'),
        ),
      ],
    );
  if (
    ['ledger', 'pump', 'courier-bag', 'heirloom', 'cache', 'lost-bag'].includes(
      id,
    )
  ) {
    const f = (
      {
        ledger: 'ledger',
        pump: 'pumpPart',
        'courier-bag': 'mailbag',
        heirloom: 'heirloom',
        cache: 'cache',
        'lost-bag': 'wallet',
      } as Record<string, string>
    )[id];
    const locked =
      (id === 'heirloom' && !s.defeated.includes('foreman')) ||
      (id === 'ledger' && !s.defeated.includes('mine-chief')) ||
      (id === 'pump' && !has(s, 'valveOpen')) ||
      (id === 'courier-bag' && !has(s, 'valveOpen'));
    return prop(
      (
        {
          ledger: 'Книга сделок',
          pump: 'Запасной ротор',
          'courier-bag': 'Почтовая сумка',
          heirloom: 'Сейф конторы',
          cache: 'Тайник',
          'lost-bag': 'Кошелёк',
        } as Record<string, string>
      )[id],
      locked
        ? 'Сначала нужно освободить проход: у сейфа — Смотрящий, у книги — Скупщик; в штольне мешает вода.'
        : has(s, f)
          ? 'Вы уже забрали содержимое.'
          : 'Внутри то, что вы искали. Можно забрать и вернуться к людям.',
      [
        c(
          'loot',
          'Забрать содержимое',
          undefined,
          locked ||
            (id !== 'lost-bag' && has(s, f)) ||
            (id === 'lost-bag' && s.lostCoins <= 0),
        ),
      ],
    );
  }
  if (id === 'well')
    return prop(
      'Деревенский колодец',
      'Вода прохладная. Насос рядом кашляет и замолкает.',
      [c('water', 'Умыться', '+8 сил · раз в день', s.daily.water === s.day)],
    );
  if (id === 'dock')
    return prop(
      'Причал',
      s.ending
        ? s.ending
        : has(s, 'truth') || has(s, 'deal')
          ? 'Все важные слова уже сказаны. Осталось решить, где вы встретите следующую весну.'
          : 'Доски поскрипывают. В воде отражаются сосны. Здесь можно рыбачить, починить настил и однажды подвести итог этому лету.',
      [
        c(
          'fish',
          'Закинуть удочку',
          'Удерживайте натяжение, отпускайте на рывках · 12 сил',
          s.energy < 12 || (s.daily['fish:' + s.day] || 0) >= 4,
        ),
        c(
          'repair-dock',
          'Починить настил',
          '3 дрова · три этапа',
          s.wood < 3 || has(s, 'dock'),
        ),
        c(
          'go:final',
          'Остаться до вечера',
          'Найдите книгу сделок и решите её судьбу',
          !(has(s, 'truth') || has(s, 'deal')) || !!s.ending,
        ),
      ],
    );
  return prop('Тихий берег', 'Ветер стихает. Пора идти дальше.', []);
}
export function finalScene(s: State): Scene {
  return {
    title: 'Последний вечер лета',
    role: 'Решение',
    text: s.partner
      ? `${people[s.partner].name} стоит рядом. В деревне уже знают, что вы решили сделать с книгой. Но куда теперь пойдёт ваша собственная жизнь?`
      : 'На другом берегу зажигаются окна. Уехать всё ещё можно. Остаться — тоже выбор, а не отсутствие выбора.',
    choices: [
      c(
        'ending-stay',
        s.partner ? 'Остаться здесь, вместе.' : 'Остаться и помочь деревне.',
      ),
      c('ending-leave', 'Уехать. Теперь я знаю, куда можно вернуться.'),
      c('leave', 'Я ещё не готов.'),
    ],
    emotion: 1,
    portrait: s.partner ? people[s.partner].portrait : undefined,
  };
}
export function choose(
  s: State,
  id: string,
  action: string,
  node = 'root',
): Outcome {
  if (
    ((action === 'ledger-truth' || action === 'ledger-deal') &&
      (has(s, 'truth') || has(s, 'deal'))) ||
    (action.startsWith('ending-') && s.ending)
  )
    return { state: s, node };
  const shown = node === 'final' ? finalScene(s) : scene(s, id, node);
  if (!shown.choices.some((v) => v.id === action && !v.disabled))
    return { state: s, node };
  const extra =
    socialChoice(s, id, action) || expansionChoice(s, id, action, node);
  if (extra) return extra;
  if (action === 'leave') return { state: s, node, close: true };
  if (action.startsWith('go:')) return { state: s, node: action.slice(3) };
  if (id === 'road-event' && s.encounter === 'courier') id = 'lev';
  if (id === 'order') id = 'vera';
  if (action.startsWith('buy:') || action.startsWith('sell:'))
    return {
      state: trade(s, action.split(':')[1], action.startsWith('sell:')),
      node,
    };
  let n = { ...s },
    text = '',
    emotion = 1;
  const once = (f: string) => {
    n = flag(n, f);
  };
  const trust = (amount: number) => {
    if (romance(id))
      n = {
        ...n,
        affection: {
          ...n.affection,
          [id]: clamp(n.affection[id] + amount, 0, 6),
        },
      };
  };
  if (action === 'meet') {
    n = { ...n, met: [...new Set([...n.met, id])], xp: n.xp + 5 };
    if (id === 'vera') {
      once('key');
      text =
        '«Держи ключи. От дома и от дачи. В Пушкино можно на автобусе за двенадцать рублей — или пешком, если не жалко времени». ';
    } else
      text = (
        {
          anna: '«Тогда будем знакомы без долгов. А про письмо я всё-таки расскажу — спроси, когда будет время».',
          katya:
            '«Договорились. Если хочешь помочь — поговорим о насосе. Если нет — можно просто посидеть».',
          nina: '«Хорошо, сосед. О твоей даче у меня как раз есть одна история».',
          mikhail: '«Заходи. И не лезь в драку, если можно отступить».',
          lev: '«Спасибо, что остановился. Я уж начал разговаривать с велосипедом». ',
        } as Record<string, string>
      )[id];
  } else if (
    [
      'anna-stay',
      'anna-dismiss',
      'katya-respect',
      'katya-patronize',
      'nina-honest',
      'nina-market',
      'listen',
    ].includes(action)
  ) {
    once('talk:' + id);
    const good = [
      'anna-stay',
      'katya-respect',
      'nina-honest',
      'listen',
    ].includes(action);
    trust(good ? 2 : -1);
    emotion = good ? 1 : 2;
    text = (
      {
        'anna-stay':
          '«Спасибо. Все обычно сразу знают, что мне делать. Ты первый оставил это мне».',
        'anna-dismiss':
          '«Возможно. Но я спрашивала не для того, чтобы получить диагноз». Анна отводит взгляд.',
        'katya-respect':
          'Катя протягивает фонарь. «Вот это предложение. Свети сюда — расскажу, где он врёт».',
        'katya-patronize': '«Тяжёлая. И моя». Она забирает ключ обратно.',
        'nina-honest':
          '«Заказчик может отказаться». Нина помолчала. «Но ты прав. Не хочу продавать людям их собственную смерть».',
        'nina-market':
          '«Я не про цену спрашивала». Она убирает камеру в сумку.',
        listen:
          '«Тогда давай по делу. Есть кое-что, с чем одному не справиться». ',
      } as Record<string, string>
    )[action];
  } else if (action === 'heart-honest' || action === 'heart-shallow') {
    once('heart:' + id);
    trust(action === 'heart-honest' ? 1 : -1);
    emotion = action === 'heart-honest' ? 1 : 2;
    text =
      action === 'heart-honest'
        ? 'Она не отвечает сразу. Потом придвигается чуть ближе. «Вот с этого и можно начать».'
        : '«Для меня это не просто способ скоротать вечер». Между вами будто прибавилось расстояния.';
  } else if (action === 'gift') {
    n = { ...n, flowers: n.flowers - 1 };
    once('gift:' + id);
    trust(1);
    text =
      '«Ты заметил, что мне такие нравятся?» Она берёт букет осторожно. «Спасибо. Давай теперь просто поговорим». ';
  } else if (action === 'commit' && romance(id)) {
    n = { ...n, partner: id };
    once('dating:' + id);
    text =
      people[id].name +
      ' берёт вас за руку. «Тогда давай попробуем. Только разговаривай со мной, даже когда будет трудно». ';
  } else if (action === 'letter-quest') {
    once('letterQuest');
    text = '«Лодка на северном берегу, восточнее лесничества. Я буду здесь». ';
  } else if (action === 'letter-private' || action === 'letter-public') {
    once('annaQuest');
    once(action === 'letter-private' ? 'secret' : 'archiveLetter');
    trust(action === 'letter-private' ? 2 : 1);
    n.xp += 55;
    n.reputation += action === 'letter-public' ? 1 : 0;
    text =
      action === 'letter-private'
        ? 'Анна складывает письмо. «Значит, не всё здесь принадлежит истории. Кое-что может остаться человеку».'
        : '«Без имён — честно». Анна берёт чистый лист. «Пусть сохранятся слова, а не чужие сплетни». ';
  } else if (action === 'pump-quest') {
    once('pumpQuest');
    text =
      '«Ротор в восточном помещении штольни. Вход — через старую лесопилку. Вернёшься, будем настраивать вместе». ';
  } else if (
    action === 'repair-pump' ||
    action === 'repair-valve' ||
    action === 'repair-dock'
  ) {
    n = startActivity(
      n,
      'repair',
      action === 'repair-pump'
        ? 'pump'
        : action === 'repair-valve'
          ? 'valve'
          : 'dock',
    );
    return { state: n, node, close: !!n.activity };
  } else if (action === 'pump-common' || action === 'pump-paid') {
    once('pumpDone');
    once(action === 'pump-common' ? 'communityWater' : 'paidWater');
    trust(action === 'pump-common' ? 2 : -1);
    n.xp += 75;
    n.coins += action === 'pump-common' ? 40 : 95;
    n.reputation += action === 'pump-common' ? 2 : -1;
    text =
      action === 'pump-common'
        ? '«Составим». Катя достаёт карандаш. «Знаешь, вдвоём начинать не так страшно».'
        : 'Катя молча пересчитывает деньги. «Работу я сделала. Но думала, мы договаривались о другом». ';
    emotion = action === 'pump-common' ? 1 : 2;
  } else if (action === 'album-share') {
    once('albumShared');
    trust(1);
    text =
      '«Тогда я подпишу снимки настоящими именами». Нина останавливается на пустой странице. «Эту оставим для нас. Для сегодняшнего дня». ';
  } else if (action === 'dinner') {
    once('ninaQuest');
    n.meals--;
    n.xp += 45;
    trust(2);
    text =
      'За столом в саду Нина снимает с плеча камеру. «Сегодня — без фотографий». Вы долго говорите, пока угли не становятся серыми. Она остаётся помогать с посудой. Не потому, что надо.';
    n = advance(n, 80);
  } else if (action === 'mill-quest') {
    once('millQuest');
    text =
      '«Медный компас, буквы на крышке. Сейф в конторе. Только вернись сам — вещь потом». ';
  } else if (action === 'return-compass') {
    once('heirloomDone');
    n.coins += 65;
    n.xp += 70;
    text =
      'Михаил зажимает компас в ладони. «Работа оплачена. А спасибо — отдельно. Буду рядом, если понадобится». ';
  } else if (action === 'courier-quest') {
    once('courierQuest');
    text =
      '«В западном проходе штольни. Только вода там по колено — сперва заслонку». ';
  } else if (action === 'return-mail' || action === 'keep-mail-money') {
    once('courierDone');
    n.coins += action === 'return-mail' ? 45 : 70;
    n.reputation += action === 'return-mail' ? 1 : -2;
    n.xp += 55;
    once(action === 'return-mail' ? 'honestMail' : 'stolenMail');
    text =
      action === 'return-mail'
        ? 'Лев проверяет конверты. «Все. Представляешь, все». Он смеётся впервые за разговор.'
        : 'Лев замечает пустой карман. «Ясно. Письма хоть принёс». Благодарности в голосе почти нет.';
    emotion = action === 'return-mail' ? 1 : 2;
  } else if (action === 'ledger-truth' || action === 'ledger-deal') {
    once(action === 'ledger-truth' ? 'truth' : 'deal');
    trust(action === 'ledger-truth' ? 1 : -3);
    n.reputation += action === 'ledger-truth' ? 2 : -3;
    n.coins += action === 'ledger-deal' ? 180 : 0;
    n.xp += 90;
    emotion = action === 'ledger-truth' ? 1 : 2;
    text =
      action === 'ledger-truth'
        ? '«Я сделаю копии. Ты собери людей». Анна выпрямляется. «Не обещаю, что всё получится. Но теперь хотя бы попробуем».'
        : '«Тогда я не хочу знать, сколько». Анна закрывает книгу. «И не проси меня сказать, что у тебя не было выбора». ';
  } else if (action === 'work') {
    n = startActivity(n, 'work', 'order');
    return { state: n, node, close: !!n.activity };
  } else if (action === 'clinic') {
    n = { ...advance(n, 30), coins: n.coins - 45, wounds: 0, hp: 100 };
    text = '«Вот теперь нормально. Дай руке отдохнуть». Травмы вылечены.';
  } else if (action === 'soup') {
    n = {
      ...n,
      hunger: clamp(n.hunger + 32),
      daily: { ...n.daily, soup: n.day },
    };
    text = '«Сначала поешь. Потом найдём тебе дело». ';
  } else if (action === 'ride' || action === 'walk') {
    n = travel(
      n,
      action === 'ride' ? id : id === 'bus' ? 'walk-pushkino' : 'walk-back',
    );
    return { state: n, node, close: true };
  } else if (action === 'sleep') {
    n = {
      ...n,
      day: n.day + 1,
      minutes: 480,
      hp: maxHealth(n),
      energy: 100,
      hunger: clamp(n.hunger - 18),
      statuses: [],
      attackDelay: 0,
      attackBuffer: 0,
      bufferedAttack: null,
      combo: 0,
      comboWindow: 0,
      projectiles: [],
      guarding: false,
    };
    text = 'Утро. За окном новая погода, в доме тихо. Пора позавтракать.';
  } else if (action === 'nap') {
    n = { ...advance(n, 60), energy: clamp(n.energy + 25) };
    text = 'Час тишины. Сил стало немного больше.';
  } else if (action === 'cook' || action === 'fish') {
    n = startActivity(n, action === 'cook' ? 'grill' : 'fish', id);
    return { state: n, node, close: !!n.activity };
  } else if (action === 'craft-tea') {
    n = {
      ...advance(n, 10),
      herbs: n.herbs - 2,
      wood: n.wood - 1,
      tea: n.tea + 1,
    };
    text = 'Крепкий чай готов. Его можно взять в дорогу.';
  } else if (action === 'craft-bandage') {
    n = {
      ...advance(n, 10),
      herbs: n.herbs - 2,
      coins: n.coins - 10,
      bandages: n.bandages + 1,
    };
    text = 'Повязка готова. Храните её сухой.';
  } else if (action === 'take-letter') {
    once('letter');
    text =
      '«Я не обещаю остаться навсегда. Но следующую весну хочу встретить с тобой». Почерк бабушки. Анне стоит это увидеть.';
  } else if (action === 'read-album') {
    once('album');
    n.xp += 15;
    text = 'Теперь лица на снимках — не чужие. Нине будет что рассказать.';
  } else if (action === 'water') {
    n = {
      ...n,
      energy: clamp(n.energy + 8),
      daily: { ...n.daily, water: n.day },
    };
    text = 'Вода бодрит. Но еду и сон не заменяет.';
  } else if (action === 'loot') {
    const f = (
      {
        ledger: 'ledger',
        pump: 'pumpPart',
        'courier-bag': 'mailbag',
        heirloom: 'heirloom',
        cache: 'cache',
      } as Record<string, string>
    )[id];
    if (f) once(f);
    n.xp += id === 'lost-bag' ? 0 : 20;
    if (id === 'cache') {
      n.bread++;
      n.bandages++;
      n.coins += 15;
    }
    if (id === 'lost-bag') {
      n.coins += n.lostCoins;
      n.lostCoins = 0;
    }
    text =
      id === 'ledger'
        ? 'Подписи и платежи. Отнесите книгу Анне: теперь решение за вами.'
        : id === 'pump'
          ? 'Ротор цел. Катя сможет восстановить насос.'
          : 'Находка в рюкзаке. Не забудьте, кто её ждёт.';
  } else if (
    ['help-traveler', 'event-buy', 'event-barter', 'ignore-event'].includes(
      action,
    )
  ) {
    if (action === 'help-traveler') {
      n.bread--;
      n.reputation++;
      n.xp += 10;
    }
    if (action === 'event-buy') {
      n.coins -= 24;
      n.bandages++;
    }
    if (action === 'event-barter') {
      n.herbs -= 3;
      n.bandages++;
    }
    n.encounter = null;
    return {
      state: note(
        n,
        action === 'help-traveler'
          ? 'Путник запомнит вашу помощь.'
          : 'Попутчик продолжил путь.',
      ),
      node,
      close: true,
    };
  } else if (action.startsWith('ending-')) {
    const future = n.murders.length
      ? 'Берег страха'
      : has(n, 'deal')
        ? 'Цена молчания'
        : has(n, 'communityWater') && n.reputation >= 3
          ? 'Общий берег'
          : 'Первый шаг';
    const epilogue = has(n, 'deal')
      ? 'Лесопилка снова заработала по ночам. Деньги позволили многое изменить в своей жизни, но вода в колодце чище не стала.'
      : has(n, 'communityWater')
        ? 'Деревня собрала подписи, отстояла колодец и запустила общий насос. Споры не закончились — зато люди больше не молчали.'
        : 'Книга стала достоянием деревни. Расследование только начинается; одной правды ещё мало, чтобы наладить жизнь.';
    const together =
      action === 'ending-stay' && n.partner && n.affection[n.partner] >= 3
        ? ` ${people[n.partner].name} осталась рядом. У ваших общих дней ещё нет названия.`
        : action === 'ending-leave'
          ? ' Вы уехали, сохранив ключи. Возвращение больше не будет бегством.'
          : ' Вы остались. Дом впервые перестал казаться чужим.';
    const consequences =
      (n.murders.length
        ? ' Люди помнят погибших: ' +
          n.murders
            .map((id) => people[id as keyof typeof people]?.name || id)
            .join(', ') +
          '. Многие двери навсегда закрылись.'
        : '') +
      (n.wanted ? ' Вы встречаете конец лета под розыском.' : '') +
      (has(n, 'suppliesSafe')
        ? ' Грузы снова доходят до деревни.'
        : has(n, 'smugglerDeal')
          ? ' Посредники продолжают забирать чужие поставки.'
          : '') +
      (has(n, 'bellReturned')
        ? ' По утрам над озером слышен возвращённый колокол.'
        : has(n, 'bellSold')
          ? ' Часовня осталась без голоса.'
          : '');
    n.ending = future + '. ' + epilogue + together + consequences;
    n = flag(n, 'ending');
    n.minutes = 1160;
    text = n.ending || '';
  } else return { state: s, node };
  return { state: note(n, text), node: 'root', text, emotion };
}
