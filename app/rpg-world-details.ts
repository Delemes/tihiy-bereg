import type { Place, Region } from './rpg-model';
export const hazards = [
  {
    id: 'snare:grove',
    region: 'grove',
    x: 800,
    y: 670,
    name: 'Петля в траве',
    damage: 12,
    kind: 'slow',
  },
  {
    id: 'snare:marsh',
    region: 'marsh',
    x: 775,
    y: 720,
    name: 'Ядовитый шип',
    damage: 6,
    kind: 'poison',
  },
  {
    id: 'snare:crypt',
    region: 'crypt',
    x: 825,
    y: 710,
    name: 'Натянутая проволока',
    damage: 18,
    kind: 'bleed',
  },
  {
    id: 'snare:millstore',
    region: 'millstore',
    x: 780,
    y: 725,
    name: 'Растяжка у ящиков',
    damage: 18,
    kind: 'slow',
  },
  {
    id: 'snare:galleries',
    region: 'galleries',
    x: 610,
    y: 665,
    name: 'Шаткая опора',
    damage: 16,
    kind: 'stun',
  },
  {
    id: 'snare:deepmine',
    region: 'deepmine',
    x: 800,
    y: 680,
    name: 'Острая арматура',
    damage: 14,
    kind: 'bleed',
  },
] as const;
export const detailPlaces: Partial<Record<Region, Place[]>> = {};
const add = (
  region: Region,
  id: string,
  name: string,
  x: number,
  y: number,
  kind: Place['kind'] = 'clue',
) => (detailPlaces[region] ||= []).push({ id, name, x, y, kind });
for (const h of hazards) add(h.region, h.id, h.name, h.x, h.y, 'clue');
add('boathouse', 'activity:lake', 'Окно к тихой заводи', 680, 425, 'dock');
add('grove', 'rest:grove', 'Укрытие у берёзы', 430, 800, 'camp');
add('refuge', 'rest:refuge', 'Походная койка', 600, 400, 'bed');
add('chapel', 'shrine', 'Лампада в часовне', 768, 345, 'clue');
add('deepmine', 'ore-vein', 'Рудная жила', 1100, 440, 'clue');
add('cellar', 'preserves', 'Полка с соленьями', 640, 390, 'chest');
add('guestattic', 'hidden-drawer', 'Двойное дно комода', 690, 430, 'chest');
add('dachacellar', 'herb-dryer', 'Сушилка для трав', 600, 410, 'workbench');
add('greenhouse', 'compost', 'Компостная яма', 440, 490, 'workbench');
