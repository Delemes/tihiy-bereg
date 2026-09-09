import {
  activeEnemies,
  quests,
  type State,
  type Citizen,
  type Status,
  type Activity,
} from './rpg-model';
import { worldBounds } from './rpg-geography';
const number = (v: unknown, max = 99999) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(0, Math.min(max, v))
    : 0;
const strings = (v: unknown) =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === 'string'))]
    : [];
export function restoreExpansion(
  s: State,
  raw: Record<string, unknown>,
): State {
  for (const k of [
    'arrows',
    'stones',
    'throwing',
    'smoke',
    'seeds',
    'crops',
    'ore',
  ] as const)
    if (raw[k] !== undefined) s[k] = Math.floor(number(raw[k], 999));
  s.wanted = number(raw.wanted, 100);
  s.murders = strings(raw.murders);
  s.witnesses = strings(raw.witnesses);
  s.perks = strings(raw.perks).filter((x) =>
    [
      'footwork',
      'parry',
      'archery',
      'endurance',
      'survival',
      'riposte',
    ].includes(x),
  );
  if (raw.citizens && typeof raw.citizens === 'object')
    for (const [id, value] of Object.entries(raw.citizens)) {
      if (!value || typeof value !== 'object') continue;
      const c = value as Citizen;
      s.citizens[id] = {
        hp: number(c.hp, 90),
        dead: c.dead === true,
        hostile: c.hostile === true,
        robbed: c.robbed === true,
        fear: number(c.fear, 100),
      };
      if (s.citizens[id].dead) {
        s.citizens[id].hp = 0;
        s.citizens[id].hostile = false;
      }
    }
  if (raw.garden && typeof raw.garden === 'object')
    for (const [id, v] of Object.entries(raw.garden)) {
      const g = v as { planted: number; watered: number[] };
      if (g && Number.isFinite(g.planted) && Array.isArray(g.watered))
        s.garden[id] = {
          planted: Math.min(s.day, number(g.planted)),
          watered: [
            ...new Set(
              g.watered.filter(
                (d) => Number.isInteger(d) && d >= g.planted && d <= s.day,
              ),
            ),
          ],
        };
    }
  if (Array.isArray(raw.statuses))
    s.statuses = raw.statuses
      .filter(
        (v) =>
          v &&
          ['bleed', 'poison', 'slow', 'stun'].includes(v.kind) &&
          Number.isFinite(v.time) &&
          Number.isFinite(v.power),
      )
      .map((v: Status) => ({
        ...v,
        time: number(v.time, v.kind === 'slow' ? 120 : 30),
        power: number(v.power, 5),
      }));
  s.lure = null;
  s.projectiles = [];
  s.attackDelay = 0;
  s.smokeTime = 0;
  s.noise = 0;
  s.hostileMode = false;
  s.sneaking = false;
  if (['stones', 'throwing', 'smoke'].includes(raw.throwItem as string))
    s.throwItem = raw.throwItem as State['throwItem'];
  // Old timing activities are upgraded by their kind when they next receive input.
  if (s.activity && !['grill', 'fish'].includes(s.activity.kind))
    s.activity = null;
  const a = raw.activity as Activity | null;
  if (
    raw.version === 4 &&
    a &&
    ['gather', 'repair', 'work', 'lock'].includes(a.kind) &&
    typeof a.source === 'string' &&
    typeof a.result === 'string' &&
    typeof a.done === 'boolean' &&
    [
      a.elapsed,
      a.stage,
      a.quality,
      a.misses,
      a.meter,
      a.progress,
      a.heat,
      a.side,
    ].every(Number.isFinite) &&
    Array.isArray(a.board) &&
    a.board.every((x) => Number.isInteger(x) && x >= 0 && x <= 3) &&
    Array.isArray(a.sides) &&
    a.sides.length === 2 &&
    a.sides.every(Number.isFinite)
  ) {
    const valid =
      a.kind === 'gather' || a.kind === 'repair'
        ? a.board.length === 9
        : a.kind === 'lock'
          ? a.board.length === 3 && a.sequence?.length === 3
          : a.board.length <= 5 && a.sequence?.length === 5;
    if (
      valid &&
      (!a.sequence ||
        a.sequence.every((x) => Number.isInteger(x) && x >= 0 && x <= 3))
    )
      s.activity = structuredClone(a);
  }
  for (const e of activeEnemies(s)) {
    const f = (raw.foes as State['foes'] | undefined)?.[e.id];
    if (
      f &&
      [f.hp, f.x, f.y, f.timer, f.aim, f.flash].every(Number.isFinite) &&
      f.hp > 0 &&
      f.hp <= e.hp &&
      f.x > 90 &&
      f.x < worldBounds(s.region).width - 86 &&
      f.y > 85 &&
      f.y < worldBounds(s.region).height - 59 &&
      ['idle', 'chase', 'windup', 'recover'].includes(f.phase)
    )
      s.foes[e.id] = { ...f, statuses: [], attacks: number(f.attacks) };
  }
  if (s.partner && s.citizens[s.partner]?.dead) s.partner = null;
  s.trackedQuest =
    typeof raw.trackedQuest === 'string' &&
    quests(s).some((q) => q.title === raw.trackedQuest)
      ? raw.trackedQuest
      : null;
  s.guardTime = 0;
  s.combo = 0;
  s.comboWindow = 0;
  s.attackBuffer = 0;
  s.bufferedAttack = null;
  return s;
}
