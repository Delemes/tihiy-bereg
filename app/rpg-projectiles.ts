import {
  activeEnemies,
  activePlaces,
  type State,
  type Projectile,
} from './rpg-model';
import { citizen, hurtCitizen } from './rpg-crime';
import { unitScale } from './rpg-regions';
import { hitFoe, hurt, type Walk } from './rpg-combat-rules';
export function updateProjectiles(n: State, dt: number, walk: Walk): State {
  const u = unitScale(n.region);
  const flying: Projectile[] = [];
  for (const p of n.projectiles) {
    let alive = true;
    const steps = Math.max(1, Math.ceil((Math.hypot(p.vx, p.vy) * dt) / 10));
    for (let i = 0; i < steps && alive; i++) {
      const before = { x: p.x, y: p.y };
      p.x += (p.vx * dt) / steps;
      p.y += (p.vy * dt) / steps;
      p.life -= dt / steps;
      if (p.life <= 0 || !walk(p.x, p.y, n.region)) {
        if (p.owner === 'hero' && p.kind === 'stone')
          n.lure = { ...before, time: 4 };
        alive = false;
        break;
      }
      if (p.owner === 'hero') {
        for (const e of activeEnemies(n)) {
          const f = n.foes[e.id];
          if (f && Math.hypot(p.x - f.x, p.y - f.y) < 23 * u) {
            n = hitFoe(n, e, p.damage, !!p.pierce, p.status);
            alive = false;
            break;
          }
        }
        if (alive && n.hostileMode)
          for (const q of activePlaces(n).filter(
            (q) => q.kind === 'npc' && !citizen(n, q.id).dead,
          ))
            if (Math.hypot(p.x - q.x, p.y - q.y) < 23 * u) {
              n = hurtCitizen(n, q.id, p.damage);
              alive = false;
              break;
            }
      } else if (Math.hypot(p.x - n.x, p.y - n.y) < 20 * u) {
        n = hurt(n, p.damage, Math.atan2(-p.vy, -p.vx), p.status);
        alive = false;
      }
    }
    if (alive) flying.push(p);
  }
  n.projectiles = flying;
  return n;
}
