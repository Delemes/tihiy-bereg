'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  Backpack,
  Swords,
  Target,
  Sprout,
  Coins,
} from 'lucide-react';
import { has, type State, type Stock, type Weapon } from './rpg-model';
import { stockInfo, weapons } from './rpg-equipment';
import { attackFrames, weaponClassNames } from './rpg-weapon-profiles';
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
  digits = 0,
}: {
  value: number;
  better: 'more' | 'less';
  suffix?: string;
  digits?: number;
}) {
  if (Math.abs(value) < 0.005) return <em className="ui-tooltip__delta">—</em>;
  const good = better === 'more' ? value > 0 : value < 0;
  return (
    <em
      className={`ui-tooltip__delta ui-tooltip__delta--${good ? 'up' : 'down'}`}
    >
      {value > 0 ? '+' : '−'}
      {Math.abs(value).toFixed(digits)}
      {suffix}
    </em>
  );
}
/**
 * У дальнего боя дистанция — это полёт снаряда из данных предмета,
 * у ближнего — реальная зона удара из кадров атаки (профиль её масштабирует).
 */
const reachOf = (
  item: { reach: number; mode?: 'ranged' },
  frames: { reach: number },
) => (item.mode === 'ranged' ? item.reach : Math.round(frames.reach));
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
  const weaponId = chosen?.group === 'weapons' ? (chosen.id as Weapon) : null;
  const weapon = weaponId ? weapons[weaponId] : null;
  const held = weapons[s.weapon];
  // Сравнение считается теми же кадрами атаки, что и бой (§5, §11): сырые
  // damage и speed из данных предмета ничего не говорят об ощущении удара —
  // профиль класса меняет и тайминги, и дистанцию, и цену выносливости.
  const combat =
    weaponId && weapon
      ? {
          item: weapon,
          light: attackFrames(weaponId, weapon),
          heavy: attackFrames(weaponId, weapon, 'heavy'),
        }
      : null;
  const heldCombat = {
    light: attackFrames(s.weapon, held),
    heavy: attackFrames(s.weapon, held, 'heavy'),
  };
  const compare = !!weaponId && weaponId !== s.weapon;
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
              {held.damage} урона · замах{' '}
              {heldCombat.light.startup.toFixed(2)} с
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
            {combat ? (
              <div className="ui-panel ui-panel--sunken ui-tooltip ui-tooltip--inline weapon-compare">
                <div className="ui-label">
                  {compare ? `Против ${held.name}` : 'Сейчас в руках'}
                </div>
                <dl className="ui-tooltip__stats">
                  <dt>Класс</dt>
                  <dd>{weaponClassNames[combat.light.weaponClass]}</dd>
                  <dt>Урон</dt>
                  <dd>
                    <b>{combat.light.damage}</b>
                    {compare && (
                      <Delta
                        value={combat.light.damage - heldCombat.light.damage}
                        better="more"
                      />
                    )}
                  </dd>
                  <dt>Сильный удар</dt>
                  <dd>
                    <b>{combat.heavy.damage}</b>
                    {compare && (
                      <Delta
                        value={combat.heavy.damage - heldCombat.heavy.damage}
                        better="more"
                      />
                    )}
                  </dd>
                  <dt>Дистанция</dt>
                  <dd>
                    <b>{reachOf(combat.item, combat.light)}</b>
                    {compare && (
                      <Delta
                        value={
                          reachOf(combat.item, combat.light) -
                          reachOf(held, heldCombat.light)
                        }
                        better="more"
                      />
                    )}
                  </dd>
                  <dt>Замах</dt>
                  <dd>
                    <b>{combat.light.startup.toFixed(2)} с</b>
                    {compare && (
                      <Delta
                        value={combat.light.startup - heldCombat.light.startup}
                        better="less"
                        digits={2}
                        suffix=" с"
                      />
                    )}
                  </dd>
                  <dt>Восстановление</dt>
                  <dd>
                    <b>{combat.light.recovery.toFixed(2)} с</b>
                    {compare && (
                      <Delta
                        value={
                          combat.light.recovery - heldCombat.light.recovery
                        }
                        better="less"
                        digits={2}
                        suffix=" с"
                      />
                    )}
                  </dd>
                  <dt>Расход сил</dt>
                  <dd>
                    <b>{combat.light.staminaCost}</b>
                    {compare && (
                      <Delta
                        value={
                          combat.light.staminaCost -
                          heldCombat.light.staminaCost
                        }
                        better="less"
                      />
                    )}
                  </dd>
                  <dt>Критический удар</dt>
                  <dd>
                    <b>{Math.round(combat.light.criticalChance * 100)}%</b>
                    {compare && (
                      <Delta
                        value={
                          Math.round(combat.light.criticalChance * 100) -
                          Math.round(heldCombat.light.criticalChance * 100)
                        }
                        better="more"
                        suffix="%"
                      />
                    )}
                  </dd>
                  {combat.item.ammo && (
                    <>
                      <dt>Боеприпас</dt>
                      <dd>
                        <b>{stockInfo[combat.item.ammo].name}</b> ×
                        {s[combat.item.ammo]}
                      </dd>
                    </>
                  )}
                  {combat.item.status && (
                    <>
                      <dt>Эффект</dt>
                      <dd>
                        <b>
                          {combat.item.status === 'bleed'
                            ? 'кровотечение'
                            : 'замедление'}
                        </b>
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            ) : (
              chosen.group !== 'keys' && (
                <div className="item-sell-value">
                  Продажа <b>{stockInfo[chosen.id as Stock].sell} ₽</b>
                </div>
              )
            )}
            {weaponId ? (
              <button
                className="primary-command"
                disabled={s.weapon === weaponId}
                onClick={() => equip(weaponId)}
              >
                {s.weapon === weaponId ? 'Экипировано' : 'Взять в руки'}
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
