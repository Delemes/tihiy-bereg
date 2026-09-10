'use client';
import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Компактное контекстное меню объекта (§8–§9).
 *
 * Отличия от разговорного окна: нет портрета, нет печатающегося текста,
 * нет модального затемнения и нет кнопки «Закончить разговор». Меню всплывает
 * над HUD, мир под ним остаётся виден, а клавиатуру обрабатывает страница —
 * здесь только отрисовка и мышь.
 */
export type ContextRow = {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

// Слой раскладки держим здесь: ui-context в CSS описывает только вид панели,
// чтобы одна и та же панель годилась и для мира, и для будущих меню.
const layer: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 104,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 30,
};
const panel: CSSProperties = {
  position: 'relative',
  pointerEvents: 'auto',
  maxHeight: '46vh',
  overflowY: 'auto',
};
const grow: CSSProperties = { flex: 1 };

export default function ContextMenu({
  name,
  description,
  rows,
  active,
  closeLabel,
  onPick,
  onHover,
  onClose,
}: {
  name: string;
  description?: string;
  rows: ContextRow[];
  active: number;
  closeLabel: string;
  onPick: (id: string) => void;
  onHover: (index: number) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  // Длинный список не должен уводить выбранную строку за край панели.
  useEffect(() => {
    box.current
      ?.querySelector<HTMLElement>('.ui-context__item.is-active')
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  const text =
    description && description.length > 190
      ? description.slice(0, 187) + '…'
      : description;
  return (
    <div style={layer}>
      <div
        ref={box}
        className="ui-panel ui-context"
        style={panel}
        role="menu"
        aria-label={'Действия: ' + name}
      >
        <div className="ui-context__name">{name}</div>
        {text && <div className="ui-context__desc">{text}</div>}
        <ul className="ui-context__list">
          {rows.map((row, i) => (
            <li key={row.id}>
              <button
                type="button"
                role="menuitem"
                className={
                  'ui-context__item' + (i === active ? ' is-active' : '')
                }
                aria-disabled={row.disabled ? 'true' : undefined}
                disabled={row.disabled}
                onPointerEnter={() => onHover(i)}
                onClick={() => onPick(row.id)}
              >
                <span style={grow}>{row.label}</span>
                {row.hint && (
                  <span className="ui-context__reason">{row.hint}</span>
                )}
                <kbd className="ui-btn__key">{i < 9 ? i + 1 : ''}</kbd>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              role="menuitem"
              className="ui-context__item"
              onClick={onClose}
            >
              <span style={grow}>Оставить</span>
              <kbd className="ui-btn__key">{closeLabel}</kbd>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
