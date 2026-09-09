import { activeEnemies, type State } from './rpg-model';
import { citizen, hurtCitizen } from './rpg-crime';
import { unitScale } from './rpg-regions';
import {
  statusTick,
  damageOverTime,
  reward,
  move,
  sight,
  spawn,
  hurt,
  angleDiff,
  type Walk,
} from './rpg-combat-rules';

/**
 * Поведение врага описано одной таблицей, а не цифрами по всему файлу.
 * Состояния: IDLE / PATROL / SUSPICIOUS / CHASE / ATTACK (windup) / RECOVER /
 * HURT (вспышка после попадания) / FLEE / DEAD.
 * В сохранение пишутся те же четыре фазы, что и раньше, поэтому старые
 * сейвы остаются валидными.
 */
const ai = {
  /** Доля дистанции атаки, на которой враг держится. */
  ring: 0.82,
  /** Ближе этой доли от боевой дистанции — отступает. */
  press: 0.55,
  /** Радиус патруля вокруг поста. */
  patrol: 34,
  /** Пауза между атаками. */
  cooldown: 0.45,
  /** Пока вспышка выше порога, враг сбит с шага. */
  stagger: 0.12,
  /** Доля здоровья, при которой обычный враг отступает. */
  flee: 0.2,
  /** Дистанция расталкивания врагов между собой. */
  separation: 26,
  /** Дальше этого враг теряет интерес