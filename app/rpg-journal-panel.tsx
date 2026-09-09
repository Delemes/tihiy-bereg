'use client';
import { useState } from 'react';
import {
  BookOpen,
  Check,
  Compass,
  Feather,
  MapPin,
  Pin,
  X,
} from 'lucide-react';
import { people, regionNames, type State, type Region } from './rpg-model';
import { journalEntries, trackedObjective } from './rpg-quest-guide';
import { AnimeFace } from './rpg-message';

export function Journal({
  s,
  track,
  showMap,
}: {
  s: State;
  track: (id: string) => void;
  showMap: (region: Region) => void;
}) {
  const entries = journalEntries(s),
    tracked = trackedObjective(s);
  const [filter, setFilter] = useState<'active' | 'complete' | 'failed'>(
    'active',
  );
  const [selection, select] = useState(tracked?.id || entries[0].id);
  const visible = entries.filter((q) => q.status === filter);
  const q = visible.find((q) => q.id === selection) || visible[0];
  const who = q?.person ? people[q.person as keyof typeof people] : null;
  return (
    <div className="journal-book">
      <aside className="journal-index">
        <div className="book-heading">
          <Feather size={22} />
          <div>
            <span>ЗАПИСИ АЛЕКСЕЯ</span>
            <h3>Нити истории</h3>
          </div>
        </div>
        <div className="journal-filters" aria-label="Статус заданий">
          {(
            [
              ['active', 'В пути'],
              ['complete', 'Завершено'],
              ['failed', 'Прервано'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              className={filter === id ? 'selected' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
              <b>{entries.filter((q) => q.status === id).length}</b>
            </button>
          ))}
        </div>
        <div className="journal-chapters" aria-label="Истории">
          {visible.map((entry) => (
            <button
              key={entry.id}
              aria-pressed={q?.id === entry.id}
              className={q?.id === entry.id ? 'selected' : ''}
              onClick={() => select(entry.id)}
            >
              <span className="chapter-number">
                {entry.failed ? (
                  <X size={16} />
                ) : entry.done ? (
                  <Check size={16} />
                ) : (
                  String(entry.number).padStart(2, '0')
                )}
              </span>
              <span>
                <small>{entry.chapter}</small>
                <strong>{entry.title}</strong>
                <em>
                  {entry.steps.filter(([, done]) => done).length} /{' '}
                  {entry.steps.length} записей
                </em>
              </span>
              {tracked?.id === entry.id && (
                <Pin size={14} aria-label="Отслеживается" />
              )}
            </button>
          ))}
        </div>
        <p className="journal-index-note">
          День {s.day}
          <span>
            {entries.filter((q) => q.status === 'complete').length} историй
            позади
          </span>
        </p>
      </aside>
      {q ? (
        <article className="journal-page" key={q.id}>
          <div className="page-topline">
            <span>{q.chapter}</span>
            <span>ЗАПИСЬ {String(q.number).padStart(2, '0')}</span>
          </div>
          <header className="quest-heading">
            <div>
              <h3>{q.title}</h3>
              <span className={'quest-state ' + q.status}>
                {q.failed
                  ? 'История прервана'
                  : q.done
                    ? 'История завершена'
                    : 'Продолжается'}
              </span>
            </div>
            {who && (
              <div className="journal-person">
                <AnimeFace
                  person={who.portrait}
                  emotion={q.failed ? 2 : q.done ? 1 : 0}
                />
                <small>{who.name}</small>
              </div>
            )}
          </header>
          <p className="quest-prose">{q.description}</p>
          <ol className="quest-stages">
            {q.steps.map(([text, done], i) => (
              <li
                key={text}
                className={
                  done ? 'done' : !q.done && q.next === text ? 'current' : ''
                }
              >
                <span>
                  {done ? <Check size={14} /> : String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <small>
                    {done
                      ? 'Записано'
                      : !q.done && q.next === text
                        ? 'Следующий шаг'
                        : 'Впереди'}
                  </small>
                  {text}
                </div>
              </li>
            ))}
          </ol>
          <div className="quest-memo">
            <Feather size={19} />
            <div>
              <small>{q.outcome ? 'Что осталось после' : 'На кону'}</small>
              <p>{q.outcome || q.stakes}</p>
            </div>
          </div>
          {!q.done && (
            <footer className="quest-actions">
              <div className="quest-destination">
                <MapPin size={17} />
                <span>
                  <small>Продолжить историю</small>
                  {regionNames[q.region]}
                </span>
              </div>
              <div>
                <button
                  className="ink-command"
                  onClick={() => showMap(q.region)}
                >
                  <Compass size={17} />
                  На карте
                </button>
                <button
                  className="ink-command primary"
                  aria-pressed={tracked?.id === q.id}
                  onClick={() => track(q.id)}
                >
                  <Pin size={16} />
                  {tracked?.id === q.id ? 'Цель на экране' : 'Следить'}
                </button>
              </div>
            </footer>
          )}
          <div className="page-folio" aria-hidden="true">
            — {q.number} —
          </div>
        </article>
      ) : (
        <article className="journal-page journal-empty">
          <BookOpen size={40} />
          <h3>Здесь пока нет записей</h3>
          <p>
            {filter === 'active'
              ? 'Все записанные истории уже получили свой исход. Исследуйте мир и знакомьтесь с жителями.'
              : filter === 'failed'
                ? 'Ни одна из записанных историй не прервана.'
                : 'Завершённые истории появятся на этих страницах.'}
          </p>
        </article>
      )}
    </div>
  );
}
