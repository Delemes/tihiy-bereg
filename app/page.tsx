'use client';
import { trackedObjective } from './rpg-quest-guide';
import { chamberName } from './rpg-wing-view';
import { learn } from './rpg-combat';
import {
  defaultBindings,
  keyLabel,
  loadBindings,
  menuAction,
  type Bindings,
  type GameAction,
} from './rpg-input';
import { createInput } from './rpg-input-runtime';
import { equipWeapon } from './rpg-equipment';
import { stockInfo } from './rpg-equipment';
import { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BookOpen,
  Map,
  Heart,
  Menu,
  Swords,
  Shield,
  Footprints,
  Plus,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Coins,
  Utensils,
  ChevronsUp,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  initialState,
  migrateSave,
  nearest,
  regionNames,
  safeRegions,
  threatened,
  type State,
} from './rpg-model';
import { createWorld, canWalk } from './rpg-world';
import {
  advance,
  applyConsumable,
  startActivity,
  activityInput,
  tickActivity,
  travel,
  maxHealth,
  weapons,
} from './rpg-systems';
import { scene, choose, finalScene, type Scene } from './rpg-story';
import MessageWindow, { type DialogueHandle } from './rpg-message';
import Panels from './rpg-panels';
import ActivityWindow from './rpg-activity';
export default function Page() {
  const [s, setS] = useState<State>(() => structuredClone(initialState)),
    [panel, setPanel] = useState(''),
    [speaker, setSpeaker] = useState(''),
    [node, setNode] = useState('root'),
    [reply, setReply] = useState<Scene | null>(null),
    [toast, setToast] = useState(
      'Вера хранит ключи. Зайдите в магазин у площади.',
    ),
    [muted, setMuted] = useState(true);
  // Ввод живёт в одном рантайме: клавиатура, мышь и экранные кнопки
  // дают один кадр действий, который читает игровой цикл.
  const [input] = useState(() => createInput());
  const [bindings, setBindings] = useState<Bindings>(defaultBindings);
  const current = useRef(s),
    hydrated = useRef(false),
    panelRef = useRef(''),
    canvas = useRef<HTMLCanvasElement | null>(null),
    dialogue = useRef<DialogueHandle | null>(null),
    lastUI = useRef(0),
    pulling = useRef(false),
    actions = useRef({ interact: () => {}, answer: (_index: number) => {} });
  const keyOf = (action: GameAction) => keyLabel(bindings[action][0] || '');
  const commit = (n: State, force = true) => {
    current.current = n;
    if (force || performance.now() - lastUI.current > 80) {
      lastUI.current = performance.now();
      setS(n);
    }
  };
  const open = (p: string) => {
    panelRef.current = p;
    setPanel(p);
    pulling.current = false;
  };
  const save = (notify = false) => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(
        'tihiy-bereg-save-v4',
        JSON.stringify(current.current),
      );
      if (notify) setToast('Путешествие сохранено.');
    } catch {
      setToast(
        'Не удалось записать сохранение: браузер запретил локальное хранилище.',
      );
    }
  };
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      const stored = loadBindings();
      input.setBindings(stored);
      setBindings(stored);
      try {
        const raw =
          localStorage.getItem('tihiy-bereg-save-v4') ||
          localStorage.getItem('tihiy-bereg-save-v3') ||
          localStorage.getItem('tihiy-bereg-save-v2') ||
          localStorage.getItem('tihiy-bereg-save-v1');
        const restored = raw ? migrateSave(JSON.parse(raw)) : null;
        if (restored) {
          if (!canWalk(restored.x, restored.y, restored.region)) {
            restored.x = 768;
            restored.y = 825;
            restored.region = 'home';
          }
          commit(restored);
          setToast('Продолжение путешествия. I — снаряжение, L — дневник.');
        }
      } catch {
        setToast(
          'Сохранение не прочиталось. Прежняя запись оставлена в браузере.',
        );
      } finally {
        hydrated.current = true;
      }
    });
    return () => cancelAnimationFrame(f);
  }, [input]);
  useEffect(() => {
    actions.current.interact = () => {
      const st = current.current;
      if (!hydrated.current || panelRef.current || st.activity) return;
      const p = nearest(st);
      if (!p) {
        setToast('Подойдите ближе к человеку, двери или предмету.');
        return;
      }
      if (p.kind === 'door' || p.kind === 'exit') {
        const n = travel(st, p.id);
        commit(n);
        save();
        return;
      }
      if (threatened(st) && !['constable', 'notice:law'].includes(p.id)) {
        setToast('Сначала отойдите от противников.');
        return;
      }
      if (['herb', 'wood', 'flower'].includes(p.kind)) {
        const n = startActivity(st, 'gather', p.id);
        commit(n);
        save();
        return;
      }
      setSpeaker(p.id);
      setNode('root');
      setReply(null);
      open('talk');
    };
  });
  useEffect(() => {
    if (!canvas.current) return;
    const api = createWorld(
      canvas.current,
      () => current.current,
      () =>
        !hydrated.current ||
        !!panelRef.current ||
        !!current.current.activity ||
        document.hidden,
      (n) => commit(n, false),
      () => actions.current.interact(),
      input,
    );
    // Единственный слушатель клавиатуры в игре: меню, разговор и мир
    // разбираются по схеме действий, а не по разбросанным кодам клавиш.
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        [
          'Space',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Tab',
        ].includes(e.code) &&
        !panelRef.current
      )
        e.preventDefault();
      if (e.repeat) return;
      const binds = input.bindings();
      const menu = menuAction(e.code, binds);
      if (menu === 'pause') {
        e.preventDefault();
        if (current.current.activity) return;
        open(panelRef.current ? '' : 'menu');
        return;
      }
      if (panelRef.current === 'talk') {
        const line = dialogue.current;
        if ((e.code === 'Space' || e.code === 'Enter') && line && !line.done) {
          e.preventDefault();
          line.skip();
          return;
        }
        if (line?.done && /^Digit[1-9]$/.test(e.code)) {
          e.preventDefault();
          actions.current.answer(Number(e.code.slice(-1)) - 1);
        }
        return;
      }
      if (panelRef.current || current.current.activity) return;
      if (menu) {
        open(menu);
        return;
      }
      if (binds.interact.includes(e.code)) {
        e.preventDefault();
        actions.current.interact();
        return;
      }
      input.key(e.code, true);
    };
    const up = (e: KeyboardEvent) => input.key(e.code, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      api.destroy();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [input]);
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      if (!hydrated.current || document.hidden) return;
      const st = current.current;
      if (st.activity) {
        commit(tickActivity(st, 0.05, pulling.current), false);
      } else if (!panelRef.current) {
        commit(advance(st, 0.025), false);
      }
      count++;
      if (count % 100 === 0) save();
    }, 50);
    const hide = () => {
      pulling.current = false;
      input.clear();
      save();
    };
    window.addEventListener('pagehide', hide);
    window.addEventListener('blur', hide);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('blur', hide);
      save();
    };
  }, [input]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (muted) return;
    const Audio = window.AudioContext;
    const ctx = new Audio(),
      buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate),
      channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++)
      channel[i] = (Math.random() * 2 - 1) * 0.08;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    gain.gain.value = 0.3;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    void ctx.resume();
    return () => {
      source.stop();
      void ctx.close();
    };
  }, [muted]);
  const handleChoice = (id: string) => {
    if (reply) {
      if (id === 'continue') {
        setReply(null);
        return;
      }
      if (id === 'leave') {
        setReply(null);
        open('');
        return;
      }
    }
    const result = choose(current.current, speaker, id, node);
    commit(result.state);
    setNode(result.node);
    if (result.close) {
      open('');
      setReply(null);
    } else if (result.text) {
      const data = scene(result.state, speaker);
      setReply({
        ...data,
        text: result.text,
        emotion: result.emotion,
        menu: false,
        choices: [
          { id: 'continue', label: 'Продолжить разговор' },
          { id: 'leave', label: 'Попрощаться' },
        ],
      });
    }
    save();
  };
  const nearby = nearest(s),
    danger = threatened(s),
    q = trackedObjective(s),
    time = `${String(Math.floor(s.minutes / 60)).padStart(2, '0')}:${String(Math.floor(s.minutes % 60)).padStart(2, '0')}`;
  const talk =
    reply || (node === 'final' ? finalScene(s) : scene(s, speaker, node));
  useEffect(() => {
    actions.current.answer = (index: number) => {
      const ch = talk.choices[index];
      if (ch && !ch.disabled) handleChoice(ch.id);
    };
  });
  const log = s.log.at(-1) || '',
    notice = toast || log;
  return (
    <main className="game-screen">
      <canvas
        ref={canvas}
        className="world-canvas"
        aria-label={`Мир Тихого берега. WASD — идти, ${keyOf('run')} — бег, ${keyOf('interact')} — взаимодействовать, ЛКМ и ПКМ — атаки, ${keyOf('dodge')} — уклонение.`}
      />
      <div className="hud-top">
        <section className="hero-hud">
          <div className="hero-sigil">
            <i className="hud-hero-face" />
            <span>{1 + Math.floor(s.xp / 160)}</span>
          </div>
          <div className="hero-vitals">
            <div className="hero-name">
              Алексей <span>{weapons[s.weapon].name}</span>
            </div>
            <div className="vital-row">
              <small>ЗДР</small>
              <div className="vital-track health">
                <i style={{ width: (s.hp / maxHealth(s)) * 100 + '%' }} />
              </div>
              <b>{Math.ceil(s.hp)}</b>
            </div>
            <div className="vital-row">
              <small>СИЛ</small>
              <div className="vital-track stamina">
                <i style={{ width: s.energy + '%' }} />
              </div>
              <b>{Math.floor(s.energy)}</b>
            </div>
            <div className="vital-extras">
              <span className={s.hunger < 20 ? 'danger-text' : ''}>
                <Utensils size={12} />
                {Math.floor(s.hunger)}
              </span>
              <span>
                <Coins size={12} />
                {s.coins} ₽
              </span>
              {s.wounds > 0 && (
                <span className="danger-text">Травмы {s.wounds}</span>
              )}
            </div>
          </div>
        </section>
        <div className="location-plaque">
          <small>
            {safeRegions.includes(s.region) ? 'У ДОМА' : 'ЗА ОКОЛИЦЕЙ'}
          </small>
          <strong>{regionNames[s.region]}</strong>
          <span>{chamberName(s.region, s.x, s.y) || '— ◆ —'}</span>
        </div>
        <div className="time-hud">
          <div>
            {s.minutes >= 1140 || s.minutes < 360 ? (
              <Moon size={17} />
            ) : (
              <Sun size={17} />
            )}
            <span>
              День {s.day} <b>{time}</b>
            </span>
          </div>
          <div className="top-controls">
            <button
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              title="Звуки природы"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button aria-label="Открыть меню" onClick={() => open('menu')}>
              <Menu size={21} />
              <kbd>{keyOf('pause')}</kbd>
            </button>
          </div>
        </div>
      </div>
      {!panel && !s.activity && (
        <>
          <div className="objective-note">
            <BookOpen size={17} />
            <div>
              <strong>{q?.title || 'Новый день'}</strong>
              <span>
                {q?.steps.find(([, done]) => !done)?.[0] ||
                  'Продолжайте жить в Бережках'}
              </span>
            </div>
            <button
              title="Дневник"
              aria-label="Открыть дневник"
              onClick={() => open('journal')}
            >
              {keyOf('journal')}
            </button>
          </div>
          {danger && (
            <div className="danger-banner">
              <Swords size={17} />
              Следите за оружием · уходите с линии удара
            </div>
          )}
          {nearby &&
            (!danger || ['constable', 'notice:law'].includes(nearby.id)) && (
              <button
                className="interact-prompt"
                onClick={() => actions.current.interact()}
              >
                <kbd>{keyOf('interact')}</kbd>
                <span>
                  {nearby.kind === 'npc'
                    ? 'Поговорить · '
                    : nearby.kind === 'door'
                      ? 'Войти · '
                      : ''}
                  {nearby.name}
                </span>
              </button>
            )}
          <div className="combat-state-strip">
            <span>
              {weapons[s.weapon].name}
              {weapons[s.weapon].ammo ? ' · ' + s[weapons[s.weapon].ammo!] : ''}
            </span>
            <span>
              {stockInfo[s.throwItem].name}: {s[s.throwItem]} ·{' '}
              {keyOf('cycle')} сменить
            </span>
            {s.wanted > 0 && (
              <strong>
                Розыск {s.wanted} · патруль{' '}
                {s.wanted >= 3 ? 'в пути' : 'предупреждᄅн'}
              </strong>
            )}
          </div>
          <div className="action-dock">
            {(
              [
                [Backpack, 'bag', 'Рюкзак'],
                [Map, 'map', 'Карта'],
                [Heart, 'people', 'Знакомые'],
              ] as const
            ).map(([Icon, id, label]) => (
              <button
                key={id}
                onClick={() => open(id)}
                title={label}
                aria-label={label}
              >
                <Icon size={21} />
                <kbd>{keyOf(id)}</kbd>
              </button>
            ))}
            <span className="dock-divider" />
            <button
              title={`${keyOf('throw')} — метнуть предмет`}
              onClick={() => input.tap('throw')}
            >
              <span className="throw-glyph">↗</span>
              <kbd>
                {keyOf('throw')} · {s[s.throwItem]}
              </kbd>
            </button>
            <button
              title={`${keyOf('special')} — особый приём оружия`}
              onClick={() => input.tap('special')}
            >
              <span className="throw-glyph">✧</span>
              <kbd>{keyOf('special')}</kbd>
            </button>
            <button
              title="ЛКМ — удар или выстрел, удерживайте для серии"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                input.hold('attack', true);
              }}
              onPointerUp={() => input.hold('attack', false)}
              onPointerCancel={() => input.hold('attack', false)}
              onLostPointerCapture={() => input.hold('attack', false)}
            >
              <Swords size={22} />
              <kbd>{keyOf('attack')}</kbd>
            </button>
            <button
              title="ПКМ — сильная атака"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                input.hold('heavy', true);
              }}
              onPointerUp={() => input.hold('heavy', false)}
              onPointerCancel={() => input.hold('heavy', false)}
              onLostPointerCapture={() => input.hold('heavy', false)}
            >
              <ChevronsUp size={22} />
              <kbd>{keyOf('heavy')}</kbd>
            </button>
            <button
              title={`${keyOf('guard')} — держать блок; ${keyOf('run')} на месте тоже блокирует`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                input.hold('guard', true);
              }}
              onPointerUp={() => input.hold('guard', false)}
              onPointerCancel={() => input.hold('guard', false)}
              onLostPointerCapture={() => input.hold('guard', false)}
            >
              <Shield size={21} />
              <kbd>{keyOf('guard')}</kbd>
            </button>
            <button
              title={`${keyOf('run')} — бег в сторону движения`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                input.hold('run', true);
              }}
              onPointerUp={() => input.hold('run', false)}
              onPointerCancel={() => input.hold('run', false)}
              onLostPointerCapture={() => input.hold('run', false)}
            >
              <Footprints size={21} />
              <kbd>{keyOf('run')}</kbd>
            </button>
            <button
              title={`${keyOf('dodge')} — уклониться в сторону движения`}
              onPointerDown={() => input.tap('dodge')}
            >
              <span className="throw-glyph">↷</span>
              <kbd>{keyOf('dodge')}</kbd>
            </button>
            <button
              title={`${keyOf('heal')} — бинт · ${s.bandages}`}
              disabled={s.bandages === 0 || s.healCooldown > 0}
              onClick={() =>
                commit(applyConsumable(current.current, 'bandages'))
              }
            >
              <Plus size={21} />
              <kbd>
                {keyOf('heal')} · {s.bandages}
              </kbd>
            </button>
          </div>
          <div className="touch-move" aria-label="Направление движения">
            {(
              [
                ['↑', 'moveUp'],
                ['←', 'moveLeft'],
                ['↓', 'moveDown'],
                ['→', 'moveRight'],
              ] as const
            ).map(([label, action]) => (
              <button
                key={action}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  input.hold(action, true);
                }}
                onPointerUp={() => input.hold(action, false)}
                onPointerCancel={() => input.hold(action, false)}
                onLostPointerCapture={() => input.hold(action, false)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {notice && !panel && !s.activity && (
        <output className="world-notice">
          {notice.length > 145 ? notice.slice(0, 142) + '…' : notice}
        </output>
      )}
      <Dialog
        open={!!panel || !!s.activity}
        onOpenChange={(value) => {
          if (!value && !current.current.activity) {
            open('');
            setReply(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={
            s.activity
              ? 'activity-window'
              : panel === 'talk'
                ? 'message-window'
                : 'rpg-menu'
          }
        >
          {s.activity ? (
            <ActivityWindow
              s={s}
              action={(id) => {
                commit(activityInput(current.current, id));
                pulling.current = false;
                save();
              }}
              pull={(v) => {
                pulling.current = v;
              }}
            />
          ) : panel === 'talk' ? (
            <MessageWindow
              key={speaker + node + talk.text}
              data={talk}
              choose={handleChoice}
              handle={dialogue}
            />
          ) : (
            <Panels
              s={s}
              panel={panel}
              setPanel={open}
              track={(id) => commit({ ...current.current, trackedQuest: id })}
              close={() => open('')}
              save={() => save(true)}
              item={(id) =>
                commit(
                  id.startsWith('learn:')
                    ? learn(current.current, id.slice(6))
                    : id.startsWith('throw:')
                      ? {
                          ...current.current,
                          throwItem: id.slice(6) as State['throwItem'],
                        }
                      : applyConsumable(current.current, id),
                )
              }
              equip={(w) => commit(equipWeapon(current.current, w))}
              reset={() => {
                commit(structuredClone(initialState));
                save();
                setReply(null);
                open('');
                setToast('Новое путешествие. За ключами — к Вере.');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
