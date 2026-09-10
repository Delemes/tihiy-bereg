'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Scene } from './rpg-story';

/**
 * Окно разговора — часть игры, а не модальное окно браузера (§7):
 * портрет, имя, реплика, индикатор продолжения и ответы одной колонкой.
 * Клавиатуру окно не слушает: весь ввод идёт через единый слой ввода
 * страницы, а она управляет окном через эту ручку.
 */
export type DialogueHandle = { skip: () => void; done: boolean };

export function AnimeFace({
  person = 0,
  emotion = 0,
}: {
  person?: number;
  emotion?: number;
}) {
  return (
    <div className={'face-crop ' + (person >= 4 ? 'extra-face' : '')}>
      <Image
        src={person < 4 ? '/portraits-v3.png' : '/faces-v4.png'}
        alt={
          [
            'Анна',
            'Катя',
            'Нина',
            'Михаил',
            'Вера',
            'Лев',
            'Тамара',
            'Степан',
            'Борис',
            'Сергей',
          ][person] +
          ' · ' +
          ['спокойствие', 'улыбка', 'серьёзность'][emotion]
        }
        width={1448}
        height={1086}
        unoptimized
        style={{
          left: `-${(person < 4 ? person : person - 4) * 100}%`,
          top: `-${emotion * 100}%`,
        }}
      />
    </div>
  );
}
export default function MessageWindow({
  data,
  choose,
  handle,
}: {
  data: Scene;
  choose: (id: string) => void;
  handle?: { current: DialogueHandle | null };
}) {
  const [letters, setLetters] = useState(0);
  const done = letters >= data.text.length;
  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const t = setInterval(
      () =>
        setLetters((v) => {
          const n = Math.min(data.text.length, v + (reduced ? 10000 : 3));
          if (n >= data.text.length) clearInterval(t);
          return n;
        }),
      18,
    );
    return () => clearInterval(t);
  }, [data.text]);
  useEffect(() => {
    if (!handle) return;
    handle.current = { skip: () => setLetters(data.text.length), done };
    return () => {
      handle.current = null;
    };
  }, [handle, data.text.length, done]);
  return (
    <section
      className={'ui-panel ui-dialogue' + (done ? '' : ' ui-dialogue--typing')}
      aria-label={'Разговор: ' + data.title}
      onClick={done ? undefined : () => setLetters(data.text.length)}
    >
      <div className="ui-dialogue__portrait">
        {data.portrait !== undefined ? (
          <AnimeFace person={data.portrait} emotion={data.emotion || 0} />
        ) : (
          <span className="ui-dialogue__letter">{data.title[0]}</span>
        )}
      </div>
      <div className="ui-dialogue__body">
        <div className="ui-dialogue__name">
          {data.title}
          {data.role && <span className="ui-dialogue__role">{data.role}</span>}
        </div>
        <p className="ui-dialogue__text">
          {data.text.slice(0, letters)}
          {!done && <span className="ui-dialogue__caret">▐</span>}
        </p>
        {done && data.choices.length > 0 && (
          <ul className="ui-choices" aria-label="Варианты разговора">
            {data.choices.map((ch, i) => (
              <li key={ch.id}>
                <button
                  className="ui-btn"
                  disabled={ch.disabled}
                  onClick={() => choose(ch.id)}
                >
                  <span>
                    {ch.label}
                    {ch.hint && (
                      <span className="ui-choices__hint"> · {ch.hint}</span>
                    )}
                  </span>
                  <kbd className="ui-btn__key">{i < 9 ? i + 1 : ''}</kbd>
                </button>
              </li>
            ))}
          </ul>
        )}
        {done && !data.choices.length && (
          <span className="ui-dialogue__more">▼</span>
        )}
      </div>
    </section>
  );
}
