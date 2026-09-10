'use client';
import { controlsHelp } from './rpg-controls';
import { Inventory } from './rpg-inventory';
import { Growth } from './rpg-growth';
import { Journal } from './rpg-journal-panel';
import { room, extraRoutes } from './rpg-regions';
import { useState } from 'react';
import {
  Backpack,
  BookOpen,
  Map,
  Heart,
  Shield,
  Save,
  Settings,
  ArrowLeft,
  Coins,
  Compass,
} from 'lucide-react';
import { AnimeFace } from './rpg-message';
import {
  people,
  regionNames,
  activePlaces,
  safeRegions,
  type State,
  type Region,
  type Weapon,
} from './rpg-model';
import { mapAsset } from './rpg-world';
import { worldBounds } from './rpg-geography';
import { wingSkins } from './rpg-wings';
import { partyAttendees } from './rpg-social';
const tabs = [
  ['bag', 'Снаряжение', Backpack],
  ['journal', 'Дневник', BookOpen],
  ['map', 'Карта', Map],
  ['people', 'Знакомые', Heart],
  ['growth', 'Развитие', Shield],
  ['help', 'Управление', Settings],
] as const;
export default function Panels({
  s,
  panel,
  setPanel,
  track,
  item,
  equip,
  save,
  reset,
  close,
}: {
  s: State;
  panel: string;
  setPanel: (p: string) => void;
  track: (id: string) => void;
  item: (k: string) => void;
  equip: (w: Weapon) => void;
  save: () => void;
  reset: () => void;
  close: () => void;
}) {
  const [region, setRegion] = useState<Region>(s.region),
    [person, setPerson] = useState<keyof typeof people>('anna'),
    [confirm, setConfirm] = useState(false),
    [pin, setPin] = useState('');
  const active = panel === 'menu' ? 'bag' : panel;
  const who = people[person],
    aff =
      person === 'anna' || person === 'katya' || person === 'nina'
        ? s.affection[person]
        : null;
  const art = mapAsset(region),
    bounds = worldBounds(region);
  const places = activePlaces({ ...s, region });
  return (
    <div className="menu-shell" data-page={active}>
      <aside className="menu-sidebar">
        <div className="menu-brand">
          <span>ТИХИЙ БЕРЕГ</span>
          <strong>Тихий берег</strong>
          <em>Записки путешественника</em>
        </div>
        <nav aria-label="Разделы меню">
          {tabs.map(([id, title, Icon]) => (
            <button
              aria-current={active === id ? 'page' : undefined}
              className={active === id ? 'selected' : ''}
              key={id}
              onClick={() => setPanel(id)}
            >
              <Icon size={19} />
              {title}
              <span>›</span>
            </button>
          ))}
        </nav>
        <div className="menu-purse">
          <Coins size={19} />
          <strong>{s.coins} ₽</strong>
          <small>День {s.day}</small>
        </div>
        <button className="save-command" onClick={save}>
          <Save size={17} />
          Сохранить
        </button>
        <button className="back-command" onClick={close}>
          <ArrowLeft size={17} />
          Вернуться в игру
        </button>
      </aside>
      <section className="menu-content">
        <header className="window-header">
          <div>
            <h2 className="window-title">
              {tabs.find((t) => t[0] === active)?.[1] || 'Путешествие'}
            </h2>
            <p className="window-subtitle">
              {regionNames[s.region]} · день {s.day} · игра на паузе
            </p>
          </div>
          <span className="ornament">◆</span>
        </header>
        {active === 'bag' && (
          <Inventory
            s={s}
            item={item}
            equip={equip}
            growth={() => setPanel('growth')}
          />
        )}
        {active === 'growth' && <Growth s={s} action={item} />}
        {active === 'journal' && (
          <Journal
            s={s}
            track={track}
            showMap={(r) => {
              setRegion(r);
              setPin('');
              setPanel('map');
            }}
          />
        )}
        {active === 'map' && (
          <>
            <div className="map-selector">
              <label htmlFor="region-select">Локация</label>
              <select
                id="region-select"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value as Region);
                  setPin('');
                }}
              >
                {Object.entries(regionNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                    {s.visited.includes(id) ? ' · открыто' : ''}
                  </option>
                ))}
              </select>
              <span>
                {s.visited.length} / {Object.keys(regionNames).length} открыто
              </span>
            </div>
            <div className="map-routes">
              {Object.entries(extraRoutes)
                .filter(([, r]) => r.from === region)
                .map(([id, r]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setRegion(r.to);
                      setPin('');
                    }}
                  >
                    {regionNames[r.to]} ↗
                  </button>
                ))}
            </div>
            <div
              className={'paper-map ' + (room(region) ? 'square-map' : '')}
              style={{
                backgroundImage: room(region) ? 'none' : `url(${art.src})`,
                backgroundSize: `${art.cols * 100}% ${art.rows * 100}%`,
                backgroundPosition: `${art.cols > 1 ? (art.x / (art.cols - 1)) * 100 : 0}% ${art.rows > 1 ? (art.y / (art.rows - 1)) * 100 : 0}%`,
              }}
            >
              {room(region) &&
                [room(region)[2], ...wingSkins[room(region)[2]]].map(
                  (skin, i) => (
                    <span
                      key={i}
                      className="map-room-tile"
                      style={{
                        left: 10 + (i % 2) * 40 + '%',
                        top: Math.floor(i / 2) * 50 + '%',
                        backgroundPosition: `${(skin % 3) * 50}% ${Math.floor(skin / 3) * 50}%`,
                      }}
                    />
                  ),
                )}
              {places
                .filter((p) => !['herb', 'wood', 'flower'].includes(p.kind))
                .map((p) => (
                  <button
                    key={p.id}
                    className={'map-pin ' + (pin === p.id ? 'selected' : '')}
                    style={{
                      left: (p.x / bounds.width) * 100 + '%',
                      top: (p.y / bounds.height) * 100 + '%',
                    }}
                    onClick={() => setPin(p.id)}
                    title={p.name}
                    aria-label={p.name}
                  >
                    {p.kind === 'npc'
                      ? '●'
                      : p.kind === 'door' || p.kind === 'exit'
                        ? '▴'
                        : '◆'}
                  </button>
                ))}
              {region === s.region && (
                <span
                  className="map-player"
                  style={{
                    left: (s.x / bounds.width) * 100 + '%',
                    top: (s.y / bounds.height) * 100 + '%',
                  }}
                  title="Вы здесь"
                >
                  ✦
                </span>
              )}
            </div>
            <div className="map-caption">
              <Compass size={19} />
              <div>
                <b>
                  {pin
                    ? places.find((p) => p.id === pin)?.name ||
                      regionNames[region]
                    : regionNames[region]}
                </b>
                <p>
                  {safeRegions.includes(region)
                    ? 'Безопасное место'
                    : 'Опасная территория · готовьте припасы'}{' '}
                  ·{' '}
                  {s.visited.includes(region)
                    ? 'Исследовано'
                    : 'Вы ещё здесь не были'}
                </p>
              </div>
            </div>
            <p className="quiet">
              Бережки → Сосновый бор → Лесопилка → Штольня. В Пушкино — от
              остановки в Бережках. △ — вход или переход, ● — житель. Выберите
              отметку, чтобы узнать место.
            </p>
          </>
        )}
        {active === 'people' && (
          <>
            <div className="people-tabs">
              {Object.entries(people).map(([k, p]) => (
                <button
                  key={k}
                  className={person === k ? 'selected' : ''}
                  onClick={() => setPerson(k as keyof typeof people)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="person-sheet">
              {who.portrait !== undefined && (
                <AnimeFace
                  person={who.portrait}
                  emotion={aff !== null && aff >= 4 ? 1 : 0}
                />
              )}
              <div>
                <small>
                  {who.role} · {who.age} лет
                </small>
                <h3>{who.name}</h3>
                <p className="citizen-status">
                  {s.citizens[person]?.dead
                    ? 'Погиб · история прервана'
                    : s.citizens[person]?.robbed
                      ? 'Ограблен · отказывается торговать'
                      : s.citizens[person]?.hostile
                        ? 'Враждебен'
                        : s.citizens[person]?.fear
                          ? 'Напуган'
                          : 'Готов к разговору'}
                </p>
                <p>{who.about}</p>
                <p className="quiet">{who.likes}</p>
                <span className="person-location">
                  {
                    regionNames[
                      partyAttendees(s).includes(person) ? 'dacha' : who.region
                    ]
                  }
                </span>
                {aff !== null ? (
                  <>
                    <div
                      className="trust-hearts"
                      aria-label={'Доверие ' + aff + ' из 6'}
                    >
                      {Array.from({ length: 6 }, (_, i) => (
                        <Heart
                          key={i}
                          size={21}
                          fill={i < aff ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    <strong>
                      {s.partner === person
                        ? 'Вы вместе'
                        : aff >= 4
                          ? 'Близость'
                          : aff >= 2
                            ? 'Доверие'
                            : 'Знакомство'}
                    </strong>
                    <p className="quiet">
                      Доверие растёт из разговоров и поступков. Для свидания
                      нужно завершить её историю. Михаил, Вера и Лев — друзья.
                    </p>
                  </>
                ) : (
                  <p>Дружеская линия</p>
                )}
              </div>
            </div>
          </>
        )}
        {active === 'help' && (
          <div className="help-scroll">
            <h3>На дороге</h3>
            <div className="control-list">
              {controlsHelp.map(([k, v]) => (
                <div key={k}>
                  <kbd>{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <h3>Перед вылазкой</h3>
            <p>
              В Бережках и Пушкино нет обычных врагов. При розыске туда приходит
              патруль. Следите за оружием и замахом врага: уходите с линии
              удара, уклоняйтесь или подставляйте блок. После удара противник
              открывается. Можно отступить за пределы его территории.
            </p>
            <p>
              Голод ниже 20 уменьшает урон и восстановление сил. После поражения
              вас доставят домой: травма снижает предел здоровья, часть денег
              теряется. Вера лечит за 45 ₽. Если совсем туго, у неё есть каша и
              работа; дорога в Пушкино пешком бесплатная.
            </p>
            <h3>Занятия и деньги</h3>
            <p>
              Рыбалка требует контроля лески; сбор — распознавания растений,
              ремонт — решения схемы, работа — памяти, замки — подбора штифтов.
              Для шашлыка важны маринад, жар и обе стороны мяса. Цены покупки
              выше продажи; лавка покупает 8 вещей за день, работа доступна один
              раз, рыбалка — 4 попытки.
            </p>
            <h3>Сохранение</h3>
            <p>
              Автоматически каждые 5 секунд и при важных действиях, в этом
              браузере. Старое сохранение переносится отдельно. Занятия
              сохраняются вместе с потраченными ингредиентами.
            </p>
            {confirm ? (
              <div className="reset-confirm">
                <p>
                  Начать заново? Текущий прогресс этой версии будет заменён.
                </p>
                <button onClick={reset}>Начать новое путешествие</button>
                <button onClick={() => setConfirm(false)}>Отмена</button>
              </div>
            ) : (
              <button
                className="abandon-activity"
                onClick={() => setConfirm(true)}
              >
                Новое путешествие…
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
