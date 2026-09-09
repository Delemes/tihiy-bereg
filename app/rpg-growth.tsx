'use client';
import { useState } from 'react';
import {
  Footprints,
  ShieldCheck,
  Target,
  Wind,
  Leaf,
  Swords,
  Check,
  LockKeyhole,
} from 'lucide-react';
import { combatBindings as binds } from './rpg-controls';
import { perks } from './rpg-progression';
import type { State } from './rpg-model';
const symbols = {
  footwork: Footprints,
  parry: ShieldCheck,
  archery: Target,
  endurance: Wind,
  survival: Leaf,
  riposte: Swords,
};
const lessons = {
  footwork: [
    'Подвижность',
    binds.dodge.label,
    'Уходите с линии удара перед выпадом врага. Сберегайте силы для следующего уклонения.',
  ],
  parry: [
    'Защита',
    binds.guard.label,
    'Начинайте блок перед самым попаданием. Ранний блок защищает, но не даёт парирования.',
  ],
  archery: [
    'Стрельба',
    binds.attack.label,
    'Держите дистанцию и выбирайте свободную линию выстрела: стены задерживают стрелы.',
  ],
  endurance: [
    'Выносливость',
    'Пауза между атаками',
    'Отступите после серии ударов. Восстановление начинается, когда закончится задержка атаки.',
  ],
  survival: [
    'Осторожность',
    'C',
    'Обходите врагов в скрытности. Шумные атаки выдают положение даже опытного следопыта.',
  ],
  riposte: [
    'Мастерство',
    binds.special.label,
    'Используйте особый приём после чужого промаха. Сначала откройте противника, затем атакуйте.',
  ],
};
export function Growth({
  s,
  action,
}: {
  s: State;
  action: (id: string) => void;
}) {
  const [selected, select] = useState<keyof typeof perks>('footwork');
  const level = 1 + Math.floor(s.xp / 160),
    points = Math.max(0, level - 1 - s.perks.length),
    p = perks[selected],
    owned = s.perks.includes(selected),
    Icon = symbols[selected];
  return (
    <div className="growth-layout">
      <aside className="growth-hero">
        <span className="section-eyebrow">ПУТЬ АЛЕКСЕЯ</span>
        <h3>Опыт дороги</h3>
        <div className="paperdoll">
          <i className="paperdoll-shadow" />
          <i className="paperdoll-hero" />
        </div>
        <div className="growth-level">
          <span>Уровень</span>
          <strong>{level}</strong>
        </div>
        <progress
          aria-label="Опыт до следующего уровня"
          value={s.xp % 160}
          max={160}
        />
        <small>{s.xp % 160} / 160 опыта</small>
        <div className="growth-points">
          <b>{points}</b>
          <span>
            очков
            <br />
            для обучения
          </span>
        </div>
        <p>
          Каждый новый уровень даёт одно очко. Выберите навык под свой стиль
          боя.
        </p>
      </aside>
      <section className="growth-lessons">
        <div className="section-heading">
          <h3>Боевые привычки</h3>
          <span>
            {s.perks.length} / {Object.keys(perks).length} освоено
          </span>
        </div>
        <div className="lesson-list">
          {(Object.entries(perks) as [keyof typeof perks, typeof p][]).map(
            ([id, perk]) => {
              const Symbol = symbols[id];
              return (
                <button
                  key={id}
                  className={selected === id ? 'selected' : ''}
                  aria-pressed={selected === id}
                  onClick={() => select(id)}
                >
                  <span className="lesson-symbol">
                    <Symbol size={24} />
                  </span>
                  <span>
                    <small>{lessons[id][0]}</small>
                    <strong>{perk.name}</strong>
                  </span>
                  <span className="lesson-requirement">
                    {s.perks.includes(id) ? (
                      <Check size={18} />
                    ) : level < perk.level ? (
                      <>
                        <LockKeyhole size={14} />
                        {perk.level} ур.
                      </>
                    ) : (
                      '1 очко'
                    )}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>
      <article className="lesson-detail">
        <div className="lesson-emblem">
          <Icon size={54} strokeWidth={1} />
        </div>
        <span className="section-eyebrow">{lessons[selected][0]}</span>
        <h3>{p.name}</h3>
        <p>{p.description}</p>
        <div className="lesson-practice">
          <kbd>{lessons[selected][1]}</kbd>
          <p>{lessons[selected][2]}</p>
        </div>
        <button
          className="primary-command"
          disabled={owned || points < 1 || level < p.level}
          onClick={() => action('learn:' + selected)}
        >
          {owned
            ? 'Навык освоен'
            : level < p.level
              ? `Доступно с ${p.level} уровня`
              : points < 1
                ? 'Нужно очко обучения'
                : 'Освоить · 1 очко'}
        </button>
      </article>
    </div>
  );
}
