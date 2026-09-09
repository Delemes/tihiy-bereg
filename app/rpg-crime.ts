import { lineClear } from './rpg-geography';
import { socialPlaces } from './rpg-social';
import {
  people,
  regionPlaces,
  type State,
  type Citizen,
  type Person,
} from './rpg-model';
import { note } from './rpg-core';
import { unitScale } from './rpg-regions';
export const citizen = (s: State, id: string): Citizen =>
  s.citizens[id] || {
    hp: 90,
    hostile: false,
    dead: false,
    robbed: false,
    fear: 0,
  };
export function crime(
  s: State,
  id: string,
  kind: 'theft' | 'threat' | 'assault' | 'murder',
): State {
  const witnesses = socialPlaces(s, regionPlaces)
    .filter(
      (p) =>
        p.kind === 'npc' &&
        !citizen(s, p.id).dead &&
        !(kind === 'murder' && p.id === id) &&
        Math.hypot(s.x - p.x, s.y - p.y) < 360 * unitScale(s.region) &&
        lineClear(s.x, s.y, p.x, p.y, s.region),
    )
    .map((p) => p.id);
  const severity = { theft: 1, threat: 1, assault: 3, murder: 8 }[kind];
  let n = {
    ...s,
    wanted: Math.min(100, s.wanted + (witnesses.length ? severity : 0)),
    reputation: s.reputation - (witnesses.length ? severity : 0),
    witnesses: [...new Set([...s.witnesses, ...witnesses])],
    affection: { ...s.affection },
    flags: [...s.flags, `crime:${kind}:${id}:${s.day}`],
  };
  for (const p of ['anna', 'katya', 'nina'] as Person[])
    if (witnesses.includes(p) || p === id)
      n.affection[p] = Math.max(0, n.affection[p] - severity);
  if (n.partner && (n.partner === id || n.affection[n.partner] < 2))
    n.partner = null;
  if (kind === 'murder')
    n = {
      ...n,
      murders: [...new Set([...s.murders, id])],
      reputation: n.reputation - 4,
      flags: [...n.flags, 'dead:' + id],
    };
  const verb = {
    theft: 'Кража',
    threat: 'Угроза',
    assault: 'Нападение',
    murder: 'Убийство',
  }[kind];
  return note(
    n,
    witnesses.length
      ? `${verb}: свидетели — ${witnesses.map((w) => people[w as keyof typeof people]?.name || w).join(', ')}. Розыск +${severity}.`
      : `${verb}: рядом нет свидетелей. Пострадавшие и утраченные задания не восстановятся.`,
  );
}
export function provoke(s: State, id: string): State {
  const c = citizen(s, id);
  if (c.dead || c.hostile) return s;
  const n = crime(s, id, 'assault');
  return {
    ...n,
    hostileMode: true,
    citizens: { ...n.citizens, [id]: { ...c, hostile: true } },
  };
}
export function hurtCitizen(s: State, id: string, damage: number): State {
  let n = provoke(s, id);
  const c = citizen(n, id);
  if (c.dead) return n;
  const hp = Math.max(0, c.hp - damage),
    dead = hp === 0;
  n = {
    ...n,
    citizens: { ...n.citizens, [id]: { ...c, hp, dead, hostile: !dead } },
    foes: { ...n.foes },
  };
  if (dead) {
    n = crime(n, id, 'murder');
    delete n.foes['citizen:' + id];
    n = note(
      n,
      `${people[id as keyof typeof people]?.name || id} погиб. Его дела, торговля и личная история прекращены.`,
    );
  }
  return n;
}
export function threatenCitizen(s: State, id: string, rob = false): State {
  const c = citizen(s, id);
  if (
    c.dead ||
    (c.robbed && rob) ||
    (s.flags.includes('threatened:' + id) && !rob)
  )
    return s;
  let n = crime(s, id, 'threat');
  const strength = Math.floor(s.xp / 160) + (s.weapon !== 'fists' ? 2 : 0);
  if (strength < 3)
    return note(provoke(n, id), 'Угроза не сработала. Житель зовёт на помощь.');
  n = {
    ...n,
    coins: n.coins + (rob ? 24 : 0),
    citizens: {
      ...n.citizens,
      [id]: { ...c, robbed: c.robbed || rob, fear: 80 },
    },
    flags: [...n.flags, 'threatened:' + id],
  };
  if (rob) n = crime(n, id, 'theft');
  return note(
    n,
    rob
      ? 'Вы забрали 24 ₽. Житель больше не станет с вами торговать.'
      : 'Житель отступил и отказывается разговаривать.',
  );
}
export const fine = (s: State) =>
  Math.ceil(s.wanted * 18 + s.murders.length * 120);
export function payFine(s: State): State {
  const cost = fine(s);
  if (!cost || s.coins < cost) return s;
  return note(
    {
      ...s,
      coins: s.coins - cost,
      wanted: 0,
      citizens: Object.fromEntries(
        Object.entries(s.citizens).map(([id, c]) => [
          id,
          { ...c, hostile: false, fear: 0 },
        ]),
      ),
      foes: {},
      hostileMode: false,
    },
    `Уплачено ${cost} ₽. Патруль отозван. Репутация, погибшие и испорченные отношения не восстановлены.`,
  );
}
