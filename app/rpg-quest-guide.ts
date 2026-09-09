import { has, quests, people, type Region, type State } from './rpg-model';
import { partyAttendees } from './rpg-social';

const guide: Record<
  string,
  { person?: string; places: Region[]; chapter: string; stakes: string }
> = {
  'Дом, в котором ждут': {
    person: 'vera',
    places: ['shop', 'home'],
    chapter: 'Возвращение',
    stakes: 'Своя крыша, отдых и начало новой жизни.',
  },
  'Между строк': {
    person: 'anna',
    places: ['library', 'village', 'library'],
    chapter: 'Личная история',
    stakes: 'Доверие Анны и право семьи на свою тайну.',
  },
  'Вода для всех': {
    person: 'katya',
    places: ['village', 'mine', 'village'],
    chapter: 'Бережки',
    stakes: 'Общая вода или личный доход — деревня запомнит решение.',
  },
  'Почта не доходит': {
    person: 'lev',
    places: ['forest', 'mine', 'forest'],
    chapter: 'Дороги',
    stakes: 'Можно вернуть чужие письма или воспользоваться доверием Льва.',
  },
  'То, что осталось': {
    person: 'mikhail',
    places: ['village', 'sawmill', 'village'],
    chapter: 'Личная история',
    stakes: 'Компас связывает Михаила с памятью об отце.',
  },
  'Снимок на память': {
    person: 'nina',
    places: ['pushkino', 'dacha', 'pushkino'],
    chapter: 'Личная история',
    stakes: 'Совместный ужин сближает сильнее случайных подарков.',
  },
  'Лекарства на зиму': {
    person: 'tamara',
    places: ['clinic', 'depot', 'clinic'],
    chapter: 'Бережки',
    stakes: 'Пропавшие лекарства нужны медпункту до холодов.',
  },
  'Голос часовни': {
    person: 'stepan',
    places: ['guesthouse', 'reliquary', 'guesthouse'],
    chapter: 'За околицей',
    stakes: 'Колокол можно вернуть жителям или продать.',
  },
  'Последний груз': {
    person: 'constable',
    places: ['engine', 'smuggler', 'village'],
    chapter: 'За околицей',
    stakes: 'Закон или сделка: от вас зависит судьба поставок.',
  },
  'Первый урожай': {
    places: ['greenhouse', 'greenhouse', 'greenhouse'],
    chapter: 'Дачное лето',
    stakes: 'Полив в разные дни и терпение превратят семена в припасы.',
  },
  'Цена тишины': {
    person: 'anna',
    places: ['mine', 'library', 'village'],
    chapter: 'Главная история',
    stakes: 'Судьба книги, обещания и отношения определят концовку.',
  },
};
export function journalEntries(s: State) {
  return quests(s).map((q, index) => {
    const meta = guide[q.title];
    const next = q.steps.findIndex(([, done]) => !done);
    const outcome = q.failed
      ? q.description
      : q.title === 'Между строк' && has(s, 'secret')
        ? 'Письмо осталось семейной тайной. Анна оценила ваше доверие.'
        : q.title === 'Между строк' && has(s, 'archiveLetter')
          ? 'Письмо передано в архив: теперь оно часть истории деревни.'
          : q.title === 'Вода для всех' && has(s, 'communityWater')
            ? 'Насос стал общим. Жители получили доступ к воде.'
            : q.title === 'Вода для всех' && has(s, 'paidWater')
              ? 'Вы выбрали платную воду. Катя не одобрила это решение.'
              : q.title === 'Почта не доходит' && has(s, 'stolenMail')
                ? 'Вы воспользовались чужими письмами. Доверие Льва подорвано.'
                : q.title === 'Голос часовни' && has(s, 'bellSold')
                  ? 'Колокол продан. Деньги остались у вас; деревня лишилась реликвии.'
                  : q.title === 'Голос часовни' && has(s, 'bellReturned')
                    ? 'Колокол вернулся в деревню. Обещание Степану исполнено.'
                    : q.title === 'Последний груз' && has(s, 'smugglerDeal')
                      ? 'Вы заключили сделку с посредниками. Поставки остаются в их руках.'
                      : q.title === 'Цена тишины' && s.ending
                        ? s.ending
                        : q.done
                          ? 'История завершена. Ваши поступки остаются частью жизни Бережков.'
                          : null;
    const destination = meta.places[Math.max(0, next)] || meta.places.at(-1)!;
    const person = meta.person
      ? people[meta.person as keyof typeof people]
      : undefined;
    return {
      ...q,
      id: q.title,
      number: index + 1,
      ...meta,
      region:
        person &&
        destination === person.region &&
        partyAttendees(s).includes(meta.person!)
          ? ('dacha' as Region)
          : destination,
      status: q.failed
        ? ('failed' as const)
        : q.done
          ? ('complete' as const)
          : ('active' as const),
      next: next >= 0 ? q.steps[next][0] : null,
      outcome,
    };
  });
}
export function trackedObjective(s: State) {
  const entries = journalEntries(s);
  return (
    entries.find((q) => q.id === s.trackedQuest && !q.done) ||
    entries.find((q) => !q.done)
  );
}
