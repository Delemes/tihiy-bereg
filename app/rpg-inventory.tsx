'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  Backpack,
  Shield,
  Swords,
  Target,
  Sprout,
  Coins,
} from 'lucide-react';
import { has, type State, type Stock, type Weapon } from './rpg-model';
import { stockInfo, weapons } from './rpg-equipment';
import { maxHealth } from './rpg-core';

const icons: Record<string, number> = {
  bread: 0,
  tea: 1,
  bandages: 2,
  meals: 3,
  meat: 4,
  fish: 5,
  herbs: 6,
  wood: 7,
  flowers: 8,
  spice: 9,
  stick: 10,
  knife: 11,
  axe: 12,
  key: 13,
  letter: 14,
  heirloom: 15,
  pumpPart: 16,
  ledger: 17,
  mailbag: 18,
  album: 19,
};
export function ItemIcon({ id }: { id: string }) {
  const i = icons[id];
  if (i !== undefined)
    return (
      <span
        className="item-art"
        aria-hidden="true"
        style={{
          backgroundPosition: `${((i % 4) / 3) * 100}% ${(Math.floor(i / 4) / 4) * 100}%`,
        }}
      />
    );
  const Icon = [
    'bow',
    'crossbow',
    'sling',
    'arrows',
    'stones',
    'throwing',
  ].includes(id)
    ? Target
    : ['seeds', 'crops'].includes(id)
      ? Sprout
      : id in weapons
        ? Swords
        : Backpack;
  return (
    <span className="item-art item-symbol">
      <Icon strokeWidth={1.2} />
    </span>
  );
}
/** Разница характеристики с оружием в руках: знак, цвет, короткая подпись. */
function Delta({
  value,
  better,
  suffix = '',
}: {
  value: number;
  better: 'more' | 'less';
  suffix?: string;
}) {
  if (Math.abs(value) < 0.005) return <em>—</em>;
  const good = better === 'more' ? value > 0 : value < 0;
  return (
    <em className={good ? 'better' : 'worse'}>
      {value > 0 ? '+' : '−'}
      {Math.round(Math.abs(value) * 100) / 100}
      {suffix}
    </em>
  );
}
type Entry = {
  id: string;
  name: string;
  description: string;
  count: number;
  group: string;
};
const questItems = [
  ['key', 'Ключи', 'От дома в Бережках и дачи в Пушкино.'],
  ['letter', 'Бабушкино письмо', 'Его судьбу можно решить с Анной.'],
  ['heirloom', 'Медный компас', 'Семейная реликвия Михаила.'],
  ['pumpPart', 'Ротор насоса', 'Катя знает, как его установить.'],
  ['ledger', 'Книга сделок', 'Правда о лесопилке.'],
  ['mailbag', 'Почтовая сумка', 'Письма, которых ждут люди.'],
  ['album', 'Семейный альбом', 'История дачного лета.'],
  ['medicine', 'Аптечный груз', 'Нужен фельдшеру Тамаре.'],
  ['villageBell', 'Малый колокол', 'Можно вернуть Степану или продать.'],
  ['evidence', 'Тетрадь Смотрителя', 'Доказательства незаконных поставок.'],
];
export function Inventory({
  s,
  item,
  equip,
  growth,
}: {
  s: State;
  item: (id: string) => void;
  equip: (w: Weapon) => void;
  growth: () => void;
}) {
  const [selected, setSelected] = useState('bread'),
    [filter, setFilter] = useState('all');
  const entries: Entry[] = [
    ...Object.entries(stockInfo).map(([id, v]) => ({
      id,
      name: v.name,
      description: v.description,
      count: s[id as Stock],
      group: ['bread', 'tea', 'bandages', 'meals'].includes(id)
        ? 'supplies'
        : 'materials',
    })),
    ...s.weapons.map((id) => ({
      id,
      ...weapons[id],
      count: 1,
      group: 'weapons',
    })),
    ...questItems
      .filter(([id]) => has(s, id))
      .map(([id, name, description]) => ({
        id,
        name,
        description,
        count: 1,
        group: 'keys',
      })),
  ];
  const visible = entries.filter((e) => filter === 'all' || e.group === filter),
    chosen = visible.find((e) => e.id === selected) || visible[0];
  const weapon =
    chosen?.group === 'weapons' ? weapons[chosen.id as Weapon] : null;
  const held = weapons[s.weapon],
    compare = weapon && chosen?.id !== s.weapon;
  const capacity = entries.filter((e) => e.count > 0).length;
  return (
    <div className="inventory-v4">
      <aside className="equipment-sheet">
        <div className="hero-sheet-title">
          <div>
            <small>ПУТЕШЕСТВЕННИК</small>
            <h3>Алексей</h3>
          </div>
          <b>
            {1 + Math.floor(s.xp / 160)}
            <small>УР.</small>
          </b>
        </div>
        <div className="paperdoll">
          <span className="paperdoll-hero" />
          <span className="paperdoll-shadow" />
          <span className="paperdoll-caption">Бережки · начало пути</span>
        </div>
        <div className="sheet-vital">
          <span>
            Здоровье{' '}
            <b>
              {Math.ceil(s.hp)} / {maxHealth(s)}
            </b>
          </span>
          <i>
            <em style={{ width: (s.hp / maxHealth(s)) * 100 + '%' }} />
          </i>
        </div>
        <div className="sheet-vital stamina">
          <span>
            Выносливость <b>{Math.floor(s.energy)} / 100</b>
          </span>
          <i>
            <em style={{ width: s.energy + '%' }} />
          </i>
        </div>
        <div className="equipped-weapon">
          <ItemIcon id={s.weapon} />
          <div>
            <small>В РУКАХ</small>
            <b>{held.name}</b>
            <span>
              {held.damage} урона · замах {held.speed} с
            </span>
          </div>
        </div>
        <button className="growth-link" onClick={growth}>
          Развитие{' '}
          <span>
            {Math.max(0, Math.floor(s.xp / 160) - s.perks.length)} очк.
          </span>
          <ArrowUpRight size={16} />
        </button>
      </aside>
      <section className="pack-sheet">
        <div className="pack-title">
          <h3>Походный рюкзак</h3>
          <span>{capacity} видов вещей</span>
        </div>
        <div className="item-filters" aria-label="Категории предметов">
          {[
            ['all', 'Все'],
            ['supplies', 'Еда и лечение'],
            ['materials', 'Материалы'],
            ['weapons', 'Оружие'],
            ['keys', 'Важное'],
          ].map(([id, name]) => (
            <button
              key={id}
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id)}
            >
              {name}
            </button>
          ))}
        </div>
        <div
          className="item-slots"
          role="group"
          aria-label="Предметы в рюкзаке"
          onKeyDown={(e) => {
            if (!visible.length) return;
            const delta = (
              {
                ArrowRight: 1,
                ArrowLeft: -1,
                ArrowDown: 4,
                ArrowUp: -4,
              } as Record<string, number>
            )[e.key];
            if (delta === undefined) return;
            e.preventDefault();
            const index = visible.findIndex((v) => v.id === chosen?.id),
              next = Math.max(0, Math.min(visible.length - 1, index + delta));
            setSelected(visible[next].id);
            e.currentTarget
              .querySelectorAll<HTMLButtonElement>('button')
              [next]?.focus();
          }}
        >
          {visible.map((e) => (
            <button
              key={e.id}
              className={`item-slot ${chosen?.id === e.id ? 'selected' : ''} ${e.count === 0 ? 'empty' : ''} ${e.id === s.weapon ? 'equipped' : ''}`}
              onClick={() => setSelected(e.id)}
              aria-label={`${e.name}, ${e.count}`}
              aria-pressed={chosen?.id === e.id}
            >
              <ItemIcon id={e.id} />
              <span className="slot-name">{e.name}</span>
              {e.group === 'weapons' ? (
                e.id === s.weapon && <i>◆</i>
              ) : (
                <b>×{e.count}</b>
              )}
            </button>
          ))}
        </div>
        <div className="pack-footer">
          <Coins size={17} />
          <strong>{s.coins} ₽</strong>
          <span>Выберите вещь · стрелки перемещают выбор</span>
        </div>
      </section>
      <aside className="item-inspector">
        {chosen ? (
          <>
            <span className="item-kind">
              {
                (
                  {
                    supplies: 'Припасы',
                    materials: 'Материалы',
                    weapons: 'Снаряжение',
                    keys: 'Сюжетный предмет',
                  } as Record<string, string>
                )[chosen.group]
              }
            </span>
            <div className="item-showcase">
              <ItemIcon id={chosen.id} />
            </div>
            <h3>{chosen.name}</h3>
            <p>{chosen.description}</p>
            {weapon ? (
              <>
                {compare && (
                  <p className="compare-note">
                    Сравнение с оружием в руках: {held.name}
                  </p>
                )}
                <div className="weapon-stats">
                  <span>
                    <Swords size={15} /> Урон <b>{weapon.damage}</b>
                    {compare && (
                      <Delta
                        value={weapon.damage - held.damage}
                        better="more"
                      />
                    )}
                  </span>
                  <span>
                    <Target size={15} /> Дистанция <b>{weapon.reach}</b>
                    {compare && (
                      <Delta value={weapon.reach - held.reach} better="more" />
                    )}
                  </span>
                  <span>
                    <Shield size={15} /> Замах <b>{weapon.speed} с</b>
                    {compare && (
                      <Delta
                        value={weapon.speed - held.speed}
                        better="less"
                        suffix=" с"
                      />
                    )}
                  </span>
                </div>
              </>
            ) : (
              chosen.group !== 'keys' && (
                <div className="item-sell-value">
                  Продажа <b>{stockInfo[chosen.id as Stock].sell} ₽</b>
                </div>
              )
            )}
            {weapon ? (
              <button
                className="primary-command"
                disabled={s.weapon === chosen.id}
                onClick={() => equip(chosen.id as Weapon)}
              >
                {s.weapon === chosen.id ? 'Экипировано' : 'Взять в руки'}
              </button>
            ) : chosen.group === 'supplies' ? (
              <button
                className="primary-command"
                disabled={!chosen.count || s.healCooldown > 0}
                onClick={() => item(chosen.id)}
              >
                Использовать
              </button>
            ) : ['stones', 'throwing', 'smoke'].includes(chosen.id) ? (
              <button
                className="primary-command"
                onClick={() => item('throw:' + chosen.id)}
              >
                {s.throwItem === chosen.id
                  ? 'На быстром броске F'
                  : 'Назначить на F'}
              </button>
            ) : (
              <div className="item-purpose">
                {chosen.group === 'keys'
                  ? 'Хранится среди важных вещей.'
                  : 'Используется в мире, ремесле и торговле.'}
              </div>
            )}
            <div className="inspector-note">
              {s.wounds
                ? `Травмы: ${s.wounds}. Лечение доступно в медпункте.`
                : s.hunger < 20
                  ? 'Вы голодны. Урон и восстановление сил снижены.'
                  : 'Припасы помогут вернуться из дальней вылазки.'}
            </div>
          </>
        ) : (
          <p>В этой категории пока пусто.</p>
        )}
      </aside>
    </div>
  );
}
