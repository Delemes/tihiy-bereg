import type { State, Weapon } from './rpg-model';
import { unitScale } from './rpg-regions';
import { handPose, weaponPose, facingRow, walkFrames } from './rpg-hand-pose';

export function drawHeldWeapon(
  c: CanvasRenderingContext2D,
  im: HTMLCanvasElement | null,
  weapon: Weapon,
  x: number,
  y: number,
  angle: number,
  u: number,
  windup: number,
  swing: number,
  heavy = false,
  guard = false,
  combo = 1,
  grip = handPose(facingRow(angle), 1),
) {
  if (!im || weapon === 'fists') return;
  const p = weaponPose(weapon, angle, windup, swing, heavy, guard, combo);
  const [sx, sy, sw, sh] = p.crop;
  c.save();
  c.translate(x + grip.x * u, y + grip.y * u);
  c.rotate(p.rotation);
  c.scale(p.scale * u, p.scale * u);
  c.drawImage(im, sx, sy, sw, sh, -p.grip[0], -p.grip[1], sw, sh);
  c.restore();
}

// The body, weapon and foreground fingers share exactly the same transform.
export function drawArmedHero(
  c: CanvasRenderingContext2D,
  hero: HTMLImageElement,
  equipment: HTMLCanvasElement | null,
  s: State,
  col: number,
) {
  const active = s.attackDelay > 0 || s.swing > 0;
  const angle = active ? s.attackFacing : s.facing;
  const face = facingRow(angle),
    grip = handPose(face, col);
  const [sx, sy, w, h] = walkFrames[face][col];
  const held = () =>
    drawHeldWeapon(
      c,
      equipment,
      s.weapon,
      0,
      0,
      angle,
      1,
      s.attackDelay,
      s.swing,
      s.swingHeavy,
      s.guarding,
      s.combo,
      grip,
    );
  if (grip.behind) held();
  c.drawImage(hero, sx, sy, w, h, -w * 0.11, -h * 0.22, w * 0.22, h * 0.22);
  if (!grip.behind) held();
  if (equipment && s.weapon !== 'fists') {
    const [fx, fy, fw, fh] = grip.crop;
    c.drawImage(
      hero,
      fx,
      fy,
      fw,
      fh,
      grip.x - fw * 0.11,
      grip.y - fh * 0.11,
      fw * 0.22,
      fh * 0.22,
    );
  }
}

type Impact = {
  x: number;
  y: number;
  life: number;
  text: string;
  hero: boolean;
};
export function combatFeedback() {
  let impacts: Impact[] = [];
  return {
    clear() {
      impacts = [];
    },
    observe(before: State, after: State) {
      let hit = false;
      const u = unitScale(after.region);
      if (before.hp > after.hp + 0.5) {
        impacts.push({
          x: after.x,
          y: after.y - 80 * u,
          life: 0.65,
          text: '−' + Math.ceil(before.hp - after.hp),
          hero: true,
        });
        hit = true;
      }
      for (const [id, f] of Object.entries(after.foes)) {
        const old = before.foes[id];
        if (old && old.hp > f.hp + 0.5) {
          impacts.push({
            x: f.x,
            y: f.y - 70 * u,
            life: 0.65,
            text: String(Math.ceil(old.hp - Math.max(0, f.hp))),
            hero: false,
          });
          hit = true;
        }
      }
      impacts = impacts.slice(-18);
      return hit;
    },
    draw(c: CanvasRenderingContext2D, dt: number) {
      for (const p of impacts) {
        p.life -= dt;
        const age = 0.65 - p.life;
        c.save();
        c.globalAlpha = Math.min(1, p.life * 5);
        c.textAlign = 'center';
        c.font = 'bold 21px Georgia';
        c.lineWidth = 3;
        c.strokeStyle = '#132219';
        c.strokeText(p.text, p.x, p.y - age * 38);
        c.fillStyle = p.hero ? '#ffa28b' : '#fff0c2';
        c.fillText(p.text, p.x, p.y - age * 38);
        if (age < 0.12) {
          c.strokeStyle = p.hero ? '#f29b70' : '#ffe8a7';
          c.lineWidth = 3;
          for (const [dx, dy] of [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ]) {
            c.beginPath();
            c.moveTo(p.x + dx * 5, p.y + 35 + dy * 5);
            c.lineTo(p.x + dx * 15, p.y + 35 + dy * 13);
            c.stroke();
          }
        }
        c.restore();
      }
      impacts = impacts.filter((p) => p.life > 0);
    },
  };
}
