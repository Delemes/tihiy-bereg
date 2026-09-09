import { has, type State } from './rpg-model';
export function expansionQuests(s: State) {
  return [
    {
      title: 'Лекарства на зиму',
      description:
        s.citizens.tamara?.dead && !has(s, 'medicineReturned')
          ? 'Тамара погибла. Некому принять груз; награда утрачена.'
          : 'Найдите аптечный ящик в подземном перевалочном пункте и верните Тамаре.',
      done: has(s, 'medicineReturned') || !!s.citizens.tamara?.dead,
      failed: !!s.citizens.tamara?.dead && !has(s, 'medicineReturned'),
      steps: [
        ['Узнать о пропаже', has(s, 'medicineQuest')],
        ['Найти лекарства', has(s, 'medicine')],
        ['Вернуть Тамаре', has(s, 'medicineReturned')],
      ] as [string, boolean][],
    },
    {
      title: 'Голос часовни',
      description:
        s.citizens.stepan?.dead &&
        !has(s, 'bellReturned') &&
        !has(s, 'bellSold')
          ? 'Степан погиб. Колокол можно сохранить, но обещание уже не исполнить.'
          : 'В глубине склепа Звонарь охраняет украденный колокол. Вернуть деревне или продать?',
      done:
        has(s, 'bellReturned') ||
        has(s, 'bellSold') ||
        !!s.citizens.stepan?.dead,
      failed:
        !!s.citizens.stepan?.dead &&
        !has(s, 'bellReturned') &&
        !has(s, 'bellSold'),
      steps: [
        ['Выслушать рыбака', has(s, 'bellQuest')],
        ['Победить Звонаря и забрать колокол', has(s, 'villageBell')],
        [
          'Решить судьбу колокола',
          has(s, 'bellReturned') || has(s, 'bellSold'),
        ],
      ] as [string, boolean][],
    },
    {
      title: 'Последний груз',
      description:
        'Восстановите привод лесопилки, найдите убежище Смотрителя. Доказательства решат судьбу будущих поставок.',
      done: has(s, 'evidenceDone'),
      failed: false,
      steps: [
        ['Запустить привод', has(s, 'engine')],
        ['Забрать тетрадь Смотрителя', has(s, 'evidence')],
        ['Выбрать закон или сделку', has(s, 'evidenceDone')],
      ] as [string, boolean][],
    },
    {
      title: 'Первый урожай',
      description:
        'Найдите теплицу в Пушкино. Посейте репу, поливайте в разные дни и соберите урожай через два дня.',
      done: s.crops > 0 || has(s, 'harvested'),
      failed: false,
      steps: [
        ['Открыть теплицу', s.visited.includes('greenhouse')],
        [
          'Посадить грядку',
          Object.keys(s.garden).length > 0 || has(s, 'harvested'),
        ],
        ['Собрать урожай', s.crops > 0 || has(s, 'harvested')],
      ] as [string, boolean][],
    },
  ];
}
