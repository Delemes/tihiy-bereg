import type { Place, State } from './rpg-model';
const hosts = ['anna', 'katya', 'nina', 'mikhail', 'vera', 'lev'];
export function partyAttendees(s: State) {
  if (s.daily.party !== s.day || s.minutes < 1080 || s.minutes >= 1320)
    return [];
  return hosts.filter(
    (id) => s.daily['invite:' + id] === s.day && !s.citizens[id]?.dead,
  );
}
export const partyGuests = (s: State) =>
  partyAttendees(s).filter(
    (id) =>
      !s.citizens[id]?.hostile &&
      !s.citizens[id]?.robbed &&
      !s.citizens[id]?.fear,
  );
export function socialPlaces(s: State, places: Record<string, Place[]>) {
  const guests = partyAttendees(s);
  const base = places[s.region].map(
    (p): Place =>
      p.kind === 'npc' && guests.includes(p.id)
        ? { ...p, id: 'away:' + p.id, name: 'Записка: ' + p.name, kind: 'clue' }
        : p,
  );
  if (s.region !== 'dacha') return base;
  const positions = [
    [1000, 670],
    [1280, 670],
    [1410, 660],
    [1120, 800],
    [1280, 830],
    [1410, 810],
  ];
  return [
    ...base,
    ...guests.map((id) => {
      const i = hosts.indexOf(id),
        p = Object.values(places)
          .flat()
          .find((p) => p.id === id)!;
      return { ...p, x: positions[i][0], y: positions[i][1] };
    }),
  ];
}
