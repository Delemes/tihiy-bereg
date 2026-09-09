'use client';
import { PuzzleWindow } from './rpg-puzzle-window';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Flame, Fish, Leaf, Wrench, PackageCheck } from 'lucide-react';
import type { State } from './rpg-model';
export default function ActivityWindow({
  s,
  action,
  pull,
}: {
  s: State;
  action: (id: string) => void;
  pull: (v: boolean) => void;
}) {
  const a = s.activity;
  if (!a) return null;
  const Icon =
    a.kind === 'grill'
      ? Flame
      : a.kind === 'fish'
        ? Fish
        : a.kind === 'gather'
          ? Leaf
          : a.kind === 'work'
            ? PackageCheck
            : Wrench;
  const title = {
    lock: 'Старый замок',
    grill: 'Ужин на углях',
    fish: 'Тихая вода',
    gather: 'Собрать аккуратно',
    repair: a.source === 'valve' ? 'Старая заслонка' : 'Работа с механизмом',
    work: 'Заказы для соседей',
  }[a.kind];
  return (
    <>
      <header className="window-header">
        <Icon />
        <div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {a.done
              ? 'Результат'
              : a.kind === 'grill'
                ? 'Подготовка → угли → две стороны → подача'
                : a.kind === 'fish'
                  ? 'Тяните леску, но уступайте рыбе на рывках'
                  : 'Каждое действие влияет на результат'}
          </DialogDescription>
        </div>
      </header>
      {a.done ? (
        <div className="activity-result">
          <span className="ornament">◆</span>
          <p>{a.result}</p>
          <button className="primary-command" onClick={() => action('close')}>
            Вернуться в мир
          </button>
        </div>
      ) : (
        <>
          {a.kind === 'grill' ? (
            <div className="grill-workspace">
              <div className="phase-tabs">
                {['Маринад', 'Угли', 'Обжарка'].map((t, i) => (
                  <span key={t} className={a.stage === i ? 'active' : ''}>
                    {i + 1}. {t}
                  </span>
                ))}
              </div>
              {a.stage === 0 ? (
                <>
                  <p>
                    Лук даёт сладость, травы — лесной аромат. Без маринада можно
                    приготовить обычный ужин; для удачного совместного вечера
                    стоит постараться.
                  </p>
                  <div className="recipe-choices">
                    <button
                      disabled={s.spice < 1}
                      onClick={() => action('onion')}
                    >
                      Лук и специи<small>У вас {s.spice}</small>
                    </button>
                    <button
                      disabled={s.herbs < 1}
                      onClick={() => action('herbs')}
                    >
                      Лесные травы<small>У вас {s.herbs}</small>
                    </button>
                    <button onClick={() => action('plain')}>
                      Только соль<small>Без дополнительных трат</small>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="heat-readout">
                    <span>Жар углей</span>
                    <b>{Math.round(a.heat)}°</b>
                  </div>
                  <div className="skill-meter heat">
                    <div
                      className="sweet-zone"
                      style={{ left: '42%', width: '26%' }}
                    />
                    <i style={{ left: a.heat + '%' }} />
                  </div>
                  <div className="dual-actions">
                    <button onClick={() => action('fan')}>Раздуть +13°</button>
                    <button onClick={() => action('cool')}>
                      Разгрести −12°
                    </button>
                  </div>
                  {a.stage === 1 ? (
                    <>
                      <p>
                        Рабочий жар — 42–68°. На сильном огне мясо приготовится
                        быстрее, но запас на ошибку меньше.
                      </p>
                      <button
                        className="primary-command"
                        onClick={() => action('start')}
                      >
                        Разложить шампуры
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="skewer-board">
                        {a.sides.map((v, i) => (
                          <div
                            key={i}
                            className={
                              'side-card ' + (a.side === i ? 'on-fire' : '')
                            }
                          >
                            <span>
                              Сторона {i + 1}{' '}
                              {a.side === i ? '· над углями' : ''}
                            </span>
                            <strong>{Math.round(v)}%</strong>
                            <div className="skill-meter">
                              <div
                                className="sweet-zone"
                                style={{ left: '61.5%', width: '13.9%' }}
                              />
                              <i
                                style={{ left: Math.min(100, v / 1.3) + '%' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p>
                        Готовность каждой стороны: 70–108%. Сочный шашлык: обе
                        стороны 80–98% и маринад. Свыше 108% — подгорит.
                      </p>
                      <div className="dual-actions">
                        <button onClick={() => action('turn')}>
                          Перевернуть шампуры
                        </button>
                        <button
                          className="primary-command"
                          onClick={() => action('serve')}
                        >
                          Снять и подать
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : a.kind === 'fish' ? (
            <div className="fishing-workspace">
              <div className="fish-score">
                <Fish size={46} />
                <strong>{Math.round(a.progress)}%</strong>
                <span>Рыба у берега</span>
              </div>
              <label>
                Натяжение лески <b>{Math.round(a.meter)}%</b>
              </label>
              <div className="skill-meter">
                <div
                  className="sweet-zone"
                  style={{ left: '35%', width: '41%' }}
                />
                <i style={{ left: a.meter + '%' }} />
              </div>
              <p>
                Держите натяжение в зелёной зоне, 35–76%. Отпускайте кнопку,
                чтобы ослабить леску. На 99% она лопнет.
              </p>
              <button
                className="primary-command reel-button"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  pull(true);
                }}
                onPointerUp={() => pull(false)}
                onPointerCancel={() => pull(false)}
                onKeyDown={(e) => {
                  if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    pull(true);
                  }
                }}
                onKeyUp={() => pull(false)}
                onBlur={() => pull(false)}
              >
                Удерживать · подтянуть леску
              </button>
            </div>
          ) : (
            <PuzzleWindow a={a} action={action} />
          )}
          <button
            className="abandon-activity"
            onClick={() => action('abandon')}
          >
            Прервать · потраченные припасы не вернутся
          </button>
        </>
      )}
    </>
  );
}
