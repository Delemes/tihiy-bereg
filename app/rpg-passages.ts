import { extraRoutes, indoors, room, unlocked } from './rpg-regions';
import type { Place, State } from './rpg-model';

// The interaction point is at the threshold, in front of the visible architecture.
export function passageKind(p: Place, s: State) {
  if (!['door', 'exit', 'board'].includes(p.kind)) return null;
  if (p.id.startsWith('return:') || p.id.startsWith('leave-'))
    return 'threshold';
  if (p.kind === 'board' || (!indoors(s.region) && p.kind === 'exit')) return 5;
  const route = extraRoutes[p.id],
    to = route?.to || p.id.replace('enter-', '');
  if (route?.gate === 'refuge') return 2;
  if (/attic|loft/.test(to)) return 3;
  if (/cellar|crypt|mine|drain|galleries/.test(to)) return 4;
  if (!indoors(s.region) && room(to)?.[2] === 6) return 5;
  return [1, 4, 5].includes(room(s.region)?.[2] ?? -1) ? 1 : 0;
}
export function drawPassage(
  c: CanvasRenderingContext2D,
  atlas: HTMLCanvasElement | null,
  p: Place,
  s: State,
  selected: boolean,
) {
  const kind = passageKind(p, s);
  if (kind === null || kind === 'threshold') return;
  const height = indoors(s.region) ? 190 : 118;
  const width = kind === 2 ? height * 1.06 : height * 0.86;
  if (atlas) {
    const cw = atlas.width / 3,
      split = atlas.height * 0.46875,
      sy = kind < 3 ? 0 : split,
      ch = kind < 3 ? split : atlas.height - split;
    c.drawImage(
      atlas,
      (kind % 3) * cw,
      sy,
      cw,
      ch,
      p.x - width / 2,
      p.y - height - 20,
      width,
      height,
    );
  }
  if (!unlocked(s, extraRoutes[p.id]?.gate)) {
    c.fillStyle = '#d9c699';
    c.font = 'bold 15px Georgia';
    c.textAlign = 'center';
    c.fillText('Заперто', p.x, p.y - 35);
  } else if (selected) {
    c.fillStyle = '#fff0c5';
    c.font = 'bold 17px Georgia';
    c.textAlign = 'center';
    c.fillText('E · Войти', p.x, p.y - 16);
  }
}

// Some generated atlases carry a smooth matte. Remove only low-contrast pixels
// connected to cell edges at render time; enclosed black doorways remain opaque.
export function preparePassageAtlas(im: HTMLImageElement) {
  const off = document.createElement('canvas');
  off.width = im.naturalWidth;
  off.height = im.naturalHeight;
  const c = off.getContext('2d')!;
  c.drawImage(im, 0, 0);
  const data = c.getImageData(0, 0, off.width, off.height),
    p = data.data,
    w = off.width,
    h = off.height;
  const seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++) {
      const x0 = Math.round((col * w) / 3),
        x1 = Math.round(((col + 1) * w) / 3),
        y0 = row === 0 ? 0 : Math.round(h * 0.46875),
        y1 = row === 0 ? Math.round(h * 0.46875) : h;
      let head = 0,
        tail = 0;
      const seed = (x: number, y: number) => {
        const id = y * w + x;
        if (!seen[id]) {
          seen[id] = 1;
          queue[tail++] = id;
        }
      };
      for (let x = x0; x < x1; x++) {
        seed(x, y0);
        seed(x, y1 - 1);
      }
      for (let y = y0; y < y1; y++) {
        seed(x0, y);
        seed(x1 - 1, y);
      }
      while (head < tail) {
        const id = queue[head++],
          x = id % w,
          y = Math.floor(id / w),
          i = id * 4;
        p[i + 3] = 0;
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
          const j = ny * w + nx,
            k = j * 4;
          if (
            !seen[j] &&
            Math.max(
              Math.abs(p[k] - p[i]),
              Math.abs(p[k + 1] - p[i + 1]),
              Math.abs(p[k + 2] - p[i + 2]),
            ) < 9
          ) {
            seen[j] = 1;
            queue[tail++] = j;
          }
        }
      }
    }
  c.putImageData(data, 0, 0);
  return off;
}
