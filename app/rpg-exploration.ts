import type { State } from './rpg-model';
import type { Scene, Outcome } from './rpg-story';
import { advance, flag, note, clamp, maxHealth } from './rpg-core';
import { startActivity } from './rpg-activities';
import { unitScale } from './rpg-regions';
import { hazards } from './rpg-world-details';
export function explorationScene(s: State, id: string): Scene | null {
  const choices: Scene['choices'] = [];
  let title = '',
    text = '';
  const c = (id: string, label: string, hint?: string, disabled = false) =>
    choices.push({ id, label, hint, disabled });
  const h = hazards.find((h) => h.id === id);
  if (h) {
    title = h.name;
    text = s.flags.includes('spent:' + id)
      ? 'Ловушка больше не опасна.'
      : 'Если наступить сюда, сработает ловушка. Двигайтесь в обход или снимите её.';
    c(
      'disarm',
      'Осторожно обезвредить',
      '8 сил, 15 минут; получите 1 деталь',
      s.energy < 8 || s.flags.includes('spent:' + id),
    );
  } else if (id === 'activity:lake') {
    title = 'Тихая заводь';
    text =
      'Сюда не доходит шум дороги. Уприте удилище в подоконник и следите за леской.';
    c(
      'lake:fish',
      'Начать рыбалку',
      'Общий дневной лимит — 4 попытки',
      s.energy < 12,
    );
  } else if (id.startsWith('rest:')) {
    title = 'Укрытие';
    text =
      'Можно съесть припасы и переждать усталость. Долгий отдых расходует время и сытость.';
    c(
      'rest:short',
      'Отдохнуть час',
      '+30 сил, +5 здоровья; один раз в день',
      s.daily[id] === s.day,
    );
    c(
      'rest:long',
      'Проспать шесть часов',
      '+70 сил, +15 здоровья',
      s.hunger < 35,
    );
  } else if (id === 'shrine') {
    title = 'Старая лампада';
    text = 'Жители оставляют масло и монеты. Тихий час помогает прийти в себя.';
    c(
      'shrine:offer',
      'Оставить масло и привести часовню в порядок',
      '12 ₽, 30 минут; +20 здоровья; один раз в день',
      s.coins < 12 || s.daily.shrine === s.day,
    );
  } else if (id === 'ore-vein') {
    title = 'Рудная жила';
    text = s.flags.includes('oreMined')
      ? 'Жила выработана.'
      : s.flags.includes('oreBraced')
        ? 'Опора держит потолок. Можно добывать.'
        : 'Потолок треснул. Прежде чем ударить киркой, лучше укрепить опору.';
    c(
      'ore:brace',
      'Укрепить потолок',
      '1 дрова и 5 сил',
      s.wood < 1 ||
        s.energy < 5 ||
        s.flags.includes('oreBraced') ||
        s.flags.includes('oreMined'),
    );
    c(
      'ore:mine',
      'Добыть металл',
      s.flags.includes('oreBraced')
        ? '3 детали, 18 сил'
        : '2 детали, 18 сил; обвал нанесёт 16 урона',
      s.energy < 18 || s.flags.includes('oreMined'),
    );
  } else if (id === 'preserves') {
    title = 'Бабушкины соленья';
    text =
      'На крышке написано: «Открыть, когда приедешь». Это небольшой запас для первых дней.';
    c(
      'preserves:open',
      'Открыть запасы',
      '2 порции еды · один раз',
      s.flags.includes('preservesTaken'),
    );
  } else if (id === 'hidden-drawer') {
    title = 'Двойное дно';
    text =
      'У комода одна стенка толще другой. Если сдвинуть ящик и вытащить штифт, станет видно тайник.';
    c(
      'drawer:move',
      'Сдвинуть ящик',
      '10 сил',
      s.energy < 10 || s.flags.includes('drawerMoved'),
    );
    c(
      'drawer:take',
      'Вытащить тайник',
      '2 метательных ножа и записка о часовне',
      !s.flags.includes('drawerMoved') || s.flags.includes('drawerTaken'),
    );
  } else if (id === 'herb-dryer') {
    title = 'Сушилка';
    text = 'Из чистой ткани и сухого зверобоя получится перевязочный набор.';
    c(
      'dryer:bandage',
      'Подготовить перевязочный набор',
      '3 травы, 20 минут',
      s.herbs < 3,
    );
  } else if (id === 'compost') {
    title = 'Семена из урожая';
    text =
      'Часть репы можно оставить на семена. Это медленнее покупки, зато теплица постепенно прокормит себя.';
    c(
      'compost:seeds',
      'Перебрать урожай на семена',
      '1 репа → 2 семени, 30 минут',
      s.crops < 1,
    );
  } else return null;
  return {
    title,
    text,
    role: 'Окружающий мир',
    menu: true,
    choices: [...choices, { id: 'leave', label: 'Закончить' }],
  };
}
export function explorationChoice(
  s: State,
  id: string,
  action: string,
): Outcome | null {
  if (!explorationScene(s, id)) return null;
  let n = s;
  const has = (f: string) => s.flags.includes(f);
  if (action === 'disarm')
    n = flag(
      advance({ ...s, energy: s.energy - 8, ore: s.ore + 1, xp: s.xp + 8 }, 15),
      'spent:' + id,
    );
  else if (action === 'lake:fish') n = startActivity(s, 'fish', id);
  else if (action === 'rest:short' || action === 'rest:long') {
    const long = action === 'rest:long';
    n = advance(
      {
        ...s,
        energy: clamp(s.energy + (long ? 70 : 30)),
        hp: clamp(s.hp + (long ? 15 : 5), 0, maxHealth(s)),
        daily: { ...s.daily, [id]: s.day },
      },
      long ? 360 : 60,
    );
  } else if (action === 'shrine:offer')
    n = advance(
      {
        ...s,
        coins: s.coins - 12,
        hp: clamp(s.hp + 20, 0, maxHealth(s)),
        daily: { ...s.daily, shrine: s.day },
      },
      30,
    );
  else if (action === 'ore:brace')
    n = flag(
      advance({ ...s, wood: s.wood - 1, energy: s.energy - 5 }, 15),
      'oreBraced',
    );
  else if (action === 'ore:mine')
    n = flag(
      advance(
        {
          ...s,
          energy: s.energy - 18,
          ore: s.ore + (has('oreBraced') ? 3 : 2),
          hp: Math.max(1, s.hp - (has('oreBraced') ? 0 : 16)),
        },
        40,
      ),
      'oreMined',
    );
  else if (action === 'preserves:open')
    n = flag({ ...s, meals: s.meals + 2 }, 'preservesTaken');
  else if (action === 'drawer:move')
    n = flag({ ...s, energy: s.energy - 10 }, 'drawerMoved');
  else if (action === 'drawer:take')
    n = flag(flag({ ...s, throwing: s.throwing + 2 }, 'drawerTaken'), 'bell');
  else if (action === 'dryer:bandage')
    n = advance({ ...s, herbs: s.herbs - 3, bandages: s.bandages + 1 }, 20);
  else if (action === 'compost:seeds')
    n = advance({ ...s, crops: s.crops - 1, seeds: s.seeds + 2 }, 30);
  else return null;
  return {
    state: note(
      n,
      n.activity ? 'Начато занятие.' : 'Готово. Изменения записаны в дневник.',
    ),
    node: 'root',
    close: !!n.activity,
  };
}
export function triggerHazards(s: State): State {
  for (const h of hazards)
    if (
      h.region === s.region &&
      !s.flags.includes('spent:' + h.id) &&
      Math.hypot(s.x - h.x, s.y - h.y) < 24 * unitScale(s.region) &&
      s.dash <= 0
    ) {
      return note(
        flag(
          {
            ...s,
            hp: s.hp - h.damage,
            statuses: [
              ...s.statuses.filter((v) => v.kind !== h.kind),
              { kind: h.kind, time: 4, power: 1.5 },
            ],
          },
          'spent:' + h.id,
        ),
        `${h.name}: −${h.damage} здоровья. Ловушки можно заметить и обезвредить заранее.`,
      );
    }
  return s;
}
