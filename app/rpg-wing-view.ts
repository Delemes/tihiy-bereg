import { room } from './rpg-regions';
import { wingSkins, wingOffsets, wingNames } from './rpg-wings';
import type { Region } from './rpg-model';
export function drawWings(
  c: CanvasRenderingContext2D,
  im: HTMLImageElement,
  r: Region,
) {
  const data = room(r);
  if (!data || !im.complete || !im.naturalWidth) return;
  const tile = im.naturalWidth / 3;
  const skins = [data[2], ...wingSkins[data[2]]];
  for (let i = 0; i < 3; i++) {
    const [dx, dy] = wingOffsets[i],
      skin = skins[i + 1];
    c.drawImage(
      im,
      (skin % 3) * tile,
      Math.floor(skin / 3) * tile,
      tile,
      tile,
      256 + dx,
      dy,
      1024,
      1024,
    );
  }
  // Use actual painted floor from the atlas for corridor spans, not teleport dots.
  const floor = (x: number, y: number, w: number, h: number) =>
    c.drawImage(
      im,
      (data[2] % 3) * tile + tile * 0.44,
      Math.floor(data[2] / 3) * tile + tile * 0.55,
      tile * 0.12,
      tile * 0.12,
      x,
      y,
      w,
      h,
    );
  floor(1170, 460, 230, 90);
  floor(1170, 1484, 230, 90);
  floor(730, 920, 80, 360);
  floor(1754, 920, 80, 360);
}
export function chamberName(r: Region, x: number, y: number) {
  const data = room(r);
  if (!data) return '';
  const col = x >= 1280 ? 1 : 0,
    row = y >= 1024 ? 1 : 0;
  return col || row
    ? wingNames[data[2]][row === 0 ? 0 : col === 0 ? 1 : 2]
    : 'Входной зал';
}
