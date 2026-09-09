'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Scene } from './rpg-story';
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
}: {
  data: Scene;
  choose: (id: string) => void;
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
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if ((e.code === 'Space' || e.code === 'Enter') && !done) {
        e.preventDefault();
        setLetters(data.text.length);
      }
      if (done && /^Digit[1-9]$/.test(e.code)) {
        const ch = data.choices[Number(e.code.slice(-1)) - 1];
        if (ch && !ch.disabled) {
          e.preventDefault();
          choose(ch.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data, done, choose]);
  return (
    <>
      <div className="portrait-wing">
        {data.portrait !== undefined ? (
          <AnimeFace person={data.portrait} emotion={data.emotion || 0} />
        ) : (
          <div className="speaker-monogram">{data.title[0]}</div>
        )}
      </div>
      <div className="dialogue-paper">
        <div className="speaker-line">
          <DialogTitle>{data.title}</DialogTitle>
          <DialogDescription>{data.role}</DialogDescription>
          <span>◆</span>
        </div>
        <p className="spoken-text">
          {data.text.slice(0, letters)}
          {!done && <span className="type-caret">▌</span>}
        </p>
        {!done ? (
          <button
            className="skip-line"
            onClick={() => setLetters(data.text.length)}
          >
            Показать реплику <kbd>Enter</kbd>
          </button>
        ) : (
          <span className="dialogue-prompt">
            {data.menu ? 'Выберите тему' : 'Ваш ответ'} <span>↓</span>
          </span>
        )}
      </div>
      {done && (
        <div
          className={'answer-window ' + (data.menu ? 'command-menu' : '')}
          aria-label="Варианты разговора"
        >
          {data.choices.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => choose(ch.id)}
              disabled={ch.disabled}
            >
              <span className="selection-arrow">▸</span>
              <span>
                {ch.label}
                {ch.hint && <small>{ch.hint}</small>}
              </span>
              <kbd>{i < 9 ? i + 1 : ''}</kbd>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
