import { preparePuzzle, puzzleInput } from './rpg-puzzles';
import {
  has,
  nearest,
  threatened,
  type State,
  type Activity,
} from './rpg-model';
import { clamp, note, flag, advance } from './rpg-core';
export function startActivity(
  s: State,
  kind: Activity['kind'],
  source: string,
): State {
  if (s.activity || threatened(s)) return s;
  let n = s;
  if (kind === 'lock' && s.daily['jam:' + source] === s.day)
    return note(s, 'Замок заклинил до завтра.');
  const cost =
    kind === 'fish' ? 12 : kind === 'grill' ? 5 : kind === 'work' ? 16 : 5;
  if (s.energy < cost) return note(s, 'Сначала нужно восстановить силы.');
  if (kind === 'grill') {
    if (s.meat + s.fish < 1 || s.wood < 1)
      return note(s, 'Нужны мясо или рыба и 1 дрова.');
    n = {
      ...s,
      meat: s.meat - (s.meat > 0 ? 1 : 0),
      fish: s.fish - (s.meat > 0 ? 0 : 1),
      wood: s.wood - 1,
    };
  }
  if (kind === 'repair' && source === 'pump' && !has(s, 'pumpPart')) return s;
  if (kind === 'repair' && source === 'dock') {
    if (s.wood < 3 || has(s, 'dock')) return s;
    n = { ...s, wood: s.wood - 3 };
  }
  if (kind === 'work') {
    if (s.daily.work === s.day) return s;
    n = { ...s, daily: { ...s.daily, work: s.day } };
  }
  if (kind === 'fish') {
    const count = s.daily['fish:' + s.day] || 0;
    if (count >= 4)
      return note(s, 'Сегодня клёв закончился. Возвращайтесь завтра.');
    n = { ...s, daily: { ...s.daily, ['fish:' + s.day]: count + 1 } };
  }
  if (kind === 'gather') {
    const p = nearest(s);
    if (!p || p.id !== source || !['herb', 'wood', 'flower'].includes(p.kind))
      return s;
    n = { ...s, daily: { ...s.daily, ['gather:' + source]: s.day } };
  }
  return {
    ...advance(
      n,
      kind === 'fish' ? 25 : kind === 'grill' ? 35 : kind === 'work' ? 60 : 8,
    ),
    energy: n.energy - cost,
    activity: preparePuzzle(
      {
        kind,
        source,
        stage: 0,
        elapsed: 0,
        meter: 0,
        progress: 0,
        quality: 0,
        heat: 48,
        sides: [0, 0],
        side: 0,
        seasoning: '',
        misses: 0,
        done: false,
        result: '',
      },
      s.seed +
        s.day * 31 +
        source.split('').reduce((n, c) => n + c.charCodeAt(0), 0),
    ),
  };
}
function finishActivity(
  s: State,
  a: Activity,
  success: boolean,
  text: string,
): State {
  let n: State = { ...s, activity: { ...a, done: true, result: text } };
  if (a.kind === 'lock') {
    if (success) n = flag(n, 'unlocked:' + a.source);
    else n.daily = { ...n.daily, ['jam:' + a.source]: n.day };
  }
  if (a.kind === 'grill' && success) {
    n.meals += a.quality >= 2 ? 2 : 1;
    if (a.quality >= 2) n = flag(n, 'goodGrill');
  }
  if (a.kind === 'fish' && success) n.fish++;
  if (a.kind === 'work') n.coins += success ? 42 : 12;
  if (a.kind === 'repair' && success) {
    n = flag(
      n,
      ['engine', 'cistern', 'seal'].includes(a.source)
        ? a.source
        : a.source === 'pump'
          ? 'pumpFixed'
          : a.source === 'valve'
            ? 'valveOpen'
            : 'dock',
    );
  }
  if (a.kind === 'gather' && success) {
    const k =
      a.source.includes('wood') || a.source === 'mill-scrap'
        ? 'wood'
        : a.source.includes('herb')
          ? 'herbs'
          : 'flowers';
    n[k] += a.quality >= 2 ? 2 : 1;
    if (!n.collected.includes(a.source)) {
      n.xp += 4;
      n.collected = [...n.collected, a.source];
    }
  }
  return note(n, text);
}
export function activityInput(s: State, action: string): State {
  const a = s.activity;
  if (!a) return s;
  if (action === 'close' && a.done) return { ...s, activity: null };
  if (action === 'abandon' && !a.done)
    return note(
      { ...s, activity: null },
      'Занятие прервано. Потраченные припасы и время не возвращаются.',
    );
  if (a.done) return s;
  const b = { ...a, sides: [...a.sides] as [number, number] };
  if (a.kind === 'grill') {
    if (a.stage === 0 && ['onion', 'herbs', 'plain'].includes(action)) {
      if (
        (action === 'onion' && s.spice < 1) ||
        (action === 'herbs' && s.herbs < 1)
      )
        return s;
      b.seasoning = action;
      b.stage = 1;
      return {
        ...s,
        spice: s.spice - (action === 'onion' ? 1 : 0),
        herbs: s.herbs - (action === 'herbs' ? 1 : 0),
        activity: b,
      };
    }
    if (a.stage === 1 && action === 'start') {
      b.stage = 2;
      return { ...s, activity: b };
    }
    if (a.stage === 2 && action === 'turn') {
      b.side = 1 - b.side;
      return { ...s, activity: b };
    }
    if (action === 'fan') b.heat = clamp(b.heat + 13);
    if (action === 'cool') b.heat = clamp(b.heat - 12);
    if (a.stage === 2 && action === 'serve') {
      const ok = b.sides.every((v) => v >= 70 && v <= 108),
        perfect =
          b.sides.every((v) => v >= 80 && v <= 98) && b.seasoning !== 'plain';
      b.quality = perfect ? 2 : ok ? 1 : 0;
      return finishActivity(
        s,
        b,
        ok,
        perfect
          ? 'Сочный шашлык! 2 порции. Такой ужин можно разделить с Ниной.'
          : ok
            ? 'Ужин готов. 1 порция в рюкзаке.'
            : b.sides.some((v) => v > 108)
              ? 'Мясо подгорело. Следите за обеими сторонами.'
              : 'Середина сырая. В следующий раз держите каждую сторону дольше.',
      );
    }
    return { ...s, activity: b };
  }
  if (['gather', 'repair', 'work', 'lock'].includes(a.kind)) {
    const result = puzzleInput(a.board ? a : preparePuzzle(a, s.seed), action);
    if (result.success !== undefined)
      return finishActivity(
        s,
        result.a,
        result.success,
        result.text || 'Готово.',
      );
    return { ...s, activity: result.a };
  }
  return s;
}
export function tickActivity(s: State, dt: number, pull = false): State {
  const a = s.activity;
  if (!a || a.done) return s;
  dt = clamp(dt, 0, 0.1);
  const b = {
    ...a,
    sides: [...a.sides] as [number, number],
    elapsed: a.elapsed + dt,
  };
  if (a.kind === 'grill') {
    if (a.stage === 2) {
      b.heat = clamp(b.heat - dt * 1.5);
      b.sides[a.side] += dt * (a.heat / 17);
      if (b.sides.some((v) => v > 125))
        return finishActivity(
          s,
          b,
          false,
          'Шашлык сгорел. Жар был слишком сильным.',
        );
    }
    if (b.elapsed > 150)
      return finishActivity(
        s,
        b,
        false,
        'Угли остыли. Приготовление окончено.',
      );
  } else if (a.kind === 'fish') {
    b.stage = 1;
    b.meter = clamp(
      a.meter + (pull ? 24 : -17) * dt + Math.sin(a.elapsed * 2.3) * 8 * dt,
    );
    b.progress = clamp(
      a.progress +
        (pull && b.meter >= 35 && b.meter <= 76 ? 12 : pull ? 2 : -2) * dt,
    );
    if (b.meter >= 99)
      return finishActivity(
        s,
        b,
        false,
        'Леска лопнула: слишком сильное натяжение.',
      );
    if (b.progress >= 100)
      return finishActivity(s, b, true, 'Карась пойман. +1 рыба.');
    if (b.elapsed > 45)
      return finishActivity(
        s,
        b,
        false,
        'Рыба ушла. В следующий раз чередуйте натяжение и отпускание.',
      );
  } else if (a.kind === 'work' && a.stage === 0 && b.elapsed > 8) {
    b.stage = 1;
    b.elapsed = 0;
  }
  return { ...s, activity: b };
}
