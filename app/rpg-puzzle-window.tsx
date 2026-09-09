import type { Activity } from './rpg-model';
export function PuzzleWindow({
  a,
  action,
}: {
  a: Activity;
  action: (s: string) => void;
}) {
  const wood = a.source.includes('wood') || a.source === 'mill-scrap';
  const labels = wood
    ? ['Собрано', 'Крепкая сухая ветка', 'Живая ветка', 'Трухлявая ветка']
    : ['Собрано', 'Зрелый побег', 'Молодой побег', 'Сухой побег'];
  const glyphs = wood ? ['·', '╱', '♧', '☒'] : ['·', '❀', '♧', '╱'];
  if (a.kind === 'gather')
    return (
      <div className="puzzle-workspace">
        <p>
          {wood
            ? 'Отберите три крепкие сухие ветки. Живые и трухлявые оставьте.'
            : 'Возьмите три зрелых побега. Молодые ростки оставьте расти, сухие не годятся.'}
        </p>
        <div className="specimen-key">
          {labels.slice(1).map((text, i) => (
            <span key={text}>
              {glyphs[i + 1]} {text}
            </span>
          ))}
        </div>
        <div className="puzzle-grid">
          {a.board?.map((v, i) => (
            <button
              key={i}
              disabled={!v}
              className={'specimen specimen-' + v}
              onClick={() => action('pick:' + i)}
              aria-label={labels[v]}
            >
              {glyphs[v]}
            </button>
          ))}
        </div>
        <p>
          Собрано {a.stage} / 3 · повреждено {a.misses}
        </p>
      </div>
    );
  if (a.kind === 'repair')
    return (
      <div className="puzzle-workspace">
        <p>
          Подайте питание на все девять узлов. Переключатель меняет свой узел и
          соседние по кресту.
        </p>
        <div className="puzzle-grid circuit">
          {a.board?.map((v, i) => (
            <button
              key={i}
              className={v ? 'lit' : ''}
              onClick={() => action('switch:' + i)}
              aria-label={'Узел ' + (i + 1) + (v ? ' включён' : ' выключен')}
            >
              {v ? '◉' : '○'}
            </button>
          ))}
        </div>
        <p>
          Включено {a.board?.filter(Boolean).length} / 9 · переключения{' '}
          {a.stage} / 24
        </p>
      </div>
    );
  if (a.kind === 'work')
    return (
      <div className="puzzle-workspace">
        <p>
          {a.stage === 0
            ? 'Запомните порядок пяти заказов. Затем накладную заберут.'
            : 'Соберите заказы в том же порядке.'}
        </p>
        <div className="order-sequence">
          {(a.stage === 0 ? a.sequence : [0, 1, 2, 3, 4])?.map((v, i) => (
            <span key={i}>
              {a.stage === 0
                ? ['🍞', '☕', '✚'][v]
                : i < (a.board?.length || 0)
                  ? '◆'
                  : '?'}
            </span>
          ))}
        </div>
        {a.stage === 0 ? (
          <button
            className="primary-command"
            onClick={() => action('memorized')}
          >
            Накладную запомнил
          </button>
        ) : (
          <div className="recipe-choices">
            {['Хлеб', 'Чай', 'Бинты'].map((t, i) => (
              <button key={t} onClick={() => action('sort:' + i)}>
                {t}
              </button>
            ))}
          </div>
        )}
        <p>Собрано {a.board?.length || 0} / 5</p>
      </div>
    );
  return (
    <div className="puzzle-workspace">
      <p>
        Подберите три положения. Проверка сообщает, сколько штифтов стоят верно
        и сколько нужно переставить. Повторы возможны.
      </p>
      <div className="lock-pins">
        {a.board?.map((v, i) => (
          <button
            key={i}
            onClick={() => action('pin:' + i)}
            aria-label={'Повернуть штифт ' + (i + 1)}
          >
            <small>Штифт {i + 1}</small>
            <b>{v + 1}</b>
            <span>↻</span>
          </button>
        ))}
      </div>
      <button className="primary-command" onClick={() => action('test')}>
        Проверить · {6 - a.stage} попыток
      </button>
      <pre className="lock-history">
        {a.result || 'Прислушайтесь к щелчкам механизма.'}
      </pre>
    </div>
  );
}
