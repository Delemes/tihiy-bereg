import { has, people, type State } from './rpg-model';
import { advance, clamp, note } from './rpg-core';
import { partyGuests, partyAttendees } from './rpg-social';
import type { Scene, Outcome } from './rpg-story';
const leave = { id: 'leave', label: 'До встречи' };
const isFriend = (s: State, id: string) =>
  !s.citizens[id]?.dead &&
  !s.citizens[id]?.hostile &&
  !s.citizens[id]?.fear &&
  !s.citizens[id]?.robbed;
export function socialScene(s: State, id: string, node: string): Scene | null {
  if (id.startsWith('away:')) {
    const who = id.slice(5),
      person = people[who as keyof typeof people];
    if (!person || !partyAttendees(s).includes(who)) return null;
    return {
      title: 'Записка от ' + person.name,
      role: 'Вечерние планы',
      menu: true,
      text: '«Сегодня я на даче в Пушкино, вместе с остальными. Вернусь к десяти вечера». Вы узнаёте знакомый почерк.',
      choices: [
        {
          id: 'social:wait-return',
          label: 'Дождаться возвращения',
          hint: Math.ceil(1320 - s.minutes) + ' мин. · время и голод изменятся',
        },
        { id: 'leave', label: 'Отправиться по своим делам' },
      ],
    };
  }
  const p = people[id as keyof typeof people];
  if (p && node === 'social') {
    const invited = s.daily['invite:' + id] === s.day;
    return {
      title: p.name,
      role: 'Встречи и разговоры',
      portrait: p.portrait,
      emotion: 1,
      menu: true,
      text:
        id === 'constable'
          ? '«Пока дежурю, гостей и застолья придётся отложить».'
          : invited
            ? '«Договорились: к шести буду на даче. До десяти посидим, а там пора домой».'
            : '«Заглянуть к тебе на дачу? Смотря кто собирается. Давай рассказывай».',
      choices: [
        {
          id: 'social:invite',
          label: invited ? 'Приглашение принято' : 'Позвать вечером на дачу',
          hint: '18:00–22:00 · Пушкино · ваша дача',
          disabled:
            invited ||
            id === 'constable' ||
            !has(s, 'key') ||
            s.minutes >= 1200 ||
            !isFriend(s, id),
        },
        {
          id: 'social:news',
          label: 'Спросить о соседях',
          disabled: !isFriend(s, id),
        },
        { id: 'go:root', label: 'К другим темам' },
        leave,
      ],
    };
  }
  if (id !== 'gather:table') return null;
  const guests = partyGuests(s),
    names = guests.map((k) => people[k as keyof typeof people].name).join(', '),
    spent = s.daily['party-meal'] === s.day;
  const text = guests.length
    ? `За столом: ${names}. Чашки ещё пусты. Разговор легко повернуть к общим планам — или к тому, о чём все предпочитают молчать.`
    : s.minutes >= 1320
      ? 'Гости разошлись. На завтра можно договориться о новой встрече.'
      : 'Стол готов к гостям. Позовите знакомых через тему «Встретиться вечером», затем приходите к шести. После десяти все уходят домой.';
  return {
    title: 'Вечер на даче',
    role: 'Общий стол',
    portrait: guests.length
      ? people[guests[0] as keyof typeof people].portrait
      : undefined,
    emotion: 1,
    menu: true,
    text,
    choices: [
      {
        id: 'social:wait',
        label: 'Подождать гостей до 18:00',
        hint: 'Время пройдёт; голод увеличится',
        disabled: s.minutes >= 1080 || s.daily.party !== s.day,
      },
      {
        id: 'social:meal',
        label: 'Подать общий ужин',
        hint: '1 готовый ужин · доверие присутствующих · один раз за день',
        disabled: !guests.length || !s.meals || spent,
      },
      {
        id: 'social:tea',
        label: 'Заварить чай на всех',
        hint: '1 чай · восстановление сил · один раз за вечер',
        disabled: !guests.length || !s.tea || s.daily['party-tea'] === s.day,
      },
      {
        id: 'social:beer',
        label: 'Предложить пиво к столу',
        hint: '18 ₽ · участвуют только согласившиеся · замедление героя',
        disabled:
          !guests.length ||
          s.coins < 18 ||
          (s.daily['party-beer-day'] === s.day &&
            s.daily['party-beer-count'] >= 2),
      },
      {
        id: 'social:water',
        label: 'Обсудить будущее деревни',
        hint: 'Реакции зависят от гостей и решения о воде',
        disabled: !guests.length,
      },
      { id: 'leave', label: 'Встать из-за стола' },
    ],
  };
}
export function socialChoice(
  s: State,
  id: string,
  action: string,
): Outcome | null {
  if (!action.startsWith('social:')) return null;
  if (
    action === 'social:wait-return' &&
    id.startsWith('away:') &&
    partyAttendees(s).includes(id.slice(5))
  ) {
    const n = advance(s, 1320 - s.minutes);
    return {
      state: note(
        n,
        'Гости вернулись домой. Теперь можно продолжить разговор.',
      ),
      node: 'root',
      close: true,
    };
  }
  const out = (state: State, text: string): Outcome => ({
    state,
    node: id === 'gather:table' ? 'root' : 'social',
    text,
    emotion: 1,
  });
  if (action === 'social:invite') {
    if (
      !people[id as keyof typeof people] ||
      !isFriend(s, id) ||
      id === 'constable' ||
      !has(s, 'key') ||
      s.minutes >= 1200
    )
      return out(s, 'Сейчас о встрече не договориться.');
    return out(
      { ...s, daily: { ...s.daily, party: s.day, ['invite:' + id]: s.day } },
      '«Хорошо, приду на дачу к шести. Приготовь что-нибудь к столу».',
    );
  }
  if (action === 'social:news')
    return out(
      s,
      s.murders.length
        ? '«После случившегося люди запирают двери раньше. Тут все друг друга знают. Такое не забывается».'
        : has(s, 'communityWater')
          ? '«У нас снова спорят о насосе, но теперь хотя бы собираются вместе. Катя это заметила».'
          : has(s, 'paidWater')
            ? '«Про платную воду уже каждый слышал. Кате теперь непросто смотреть соседям в глаза».'
            : '«Нина собирает фотографии, Анна — старые письма. Позови их вместе: они давно хотели поговорить о деревне».',
    );
  if (id !== 'gather:table')
    return out(s, 'Сначала найдите общий стол на даче.');
  if (action === 'social:wait' && s.minutes < 1080 && s.daily.party === s.day)
    return out(
      advance(s, 1080 - s.minutes),
      'К вечеру на дорожке слышатся знакомые шаги.',
    );
  const guests = partyGuests(s);
  if (!guests.length) return out(s, 'За столом пока никого нет.');
  if (
    action === 'social:meal' &&
    s.meals > 0 &&
    s.daily['party-meal'] !== s.day
  ) {
    const affection = { ...s.affection };
    for (const k of ['anna', 'katya', 'nina'] as const)
      if (guests.includes(k)) affection[k] = Math.min(6, affection[k] + 1);
    return out(
      note(
        advance(
          {
            ...s,
            meals: s.meals - 1,
            hunger: clamp(s.hunger + 38),
            affection,
            daily: { ...s.daily, 'party-meal': s.day },
          },
          25,
        ),
        'Общий ужин · гости почувствовали себя дома',
      ),
      guests.includes('anna') && guests.includes('nina')
        ? 'Анна узнаёт на фотографии знакомую подпись. Нина придвигает альбом; вскоре обе уже смеются над историями, которых вы раньше не слышали.'
        : 'Разговор становится теплее. Кто-то просит рецепт, кто-то приносит чистые тарелки. Так и появляется привычка собираться вместе.',
    );
  }
  if (action === 'social:tea' && s.tea > 0 && s.daily['party-tea'] !== s.day)
    return out(
      advance(
        {
          ...s,
          tea: s.tea - 1,
          energy: clamp(s.energy + 25),
          daily: { ...s.daily, 'party-tea': s.day },
        },
        15,
      ),
      guests.includes('vera')
        ? 'Чай помогает перевести дух. Вера рассказывает, как этот дом пережил самую холодную зиму.'
        : 'Чай помогает перевести дух. Гости обмениваются дорожными историями; спешить уже не хочется.',
    );
  if (action === 'social:beer' && s.coins >= 18) {
    const count =
      s.daily['party-beer-day'] === s.day
        ? s.daily['party-beer-count'] || 0
        : 0;
    if (count >= 2)
      return out(
        s,
        '«Хватит на сегодня. Завтра ещё дела». Гости убирают бутылки со стола.',
      );
    const willing = guests.filter((k) =>
      ['mikhail', 'katya', 'lev'].includes(k),
    );
    if (!willing.length)
      return out(
        s,
        'Гости отказываются от пива и выбирают чай. Покупать его незачем.',
      );
    return out(
      advance(
        {
          ...s,
          coins: s.coins - 18,
          energy: clamp(s.energy - 12),
          statuses: [
            ...s.statuses.filter((v) => v.kind !== 'slow'),
            { kind: 'slow', time: 120, power: 1 },
          ],
          daily: {
            ...s.daily,
            'party-beer-day': s.day,
            'party-beer-count': count + 1,
          },
        },
        20,
      ),
      `${willing.map((k) => people[k as keyof typeof people].name).join(', ')} соглашаются выпить к ужину. Остальные выбирают чай. У вас тяжелеют ноги: некоторое время двигаться будет сложнее.`,
    );
  }
  if (action === 'social:water')
    return out(
      advance(s, 15),
      guests.includes('katya')
        ? has(s, 'paidWater')
          ? 'Катя ставит чашку. «Если уж берём деньги, давайте вслух скажем, на что они идут». За столом становится тише.'
          : has(s, 'communityWater')
            ? 'Катя рисует схему общего насоса на салфетке. Соседи спорят, кто принесёт инструменты, и впервые спор выглядит полезным.'
            : 'Катя напоминает, что насосу всё ещё нужна деталь из штольни. Кто-то предлагает сходить за припасами для вылазки.'
        : guests.includes('anna') && guests.includes('nina')
          ? 'Анна и Нина предлагают собрать письма и фотографии соседей. Они редко согласны в деталях, но обе хотят сохранить эту память.'
          : 'Каждый помнит деревню по-своему. Сегодня вы больше слушаете, чем говорите.',
    );
  return out(s, 'На сегодня этого достаточно.');
}
