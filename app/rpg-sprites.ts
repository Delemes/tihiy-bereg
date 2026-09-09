// Removes only the edge-connected matte in each generated atlas cell. Dark
// details enclosed by the sprite silhouette stay intact.
export function prepareEnemyAtlas(
  im: HTMLImageElement,
  cols = 4,
  rows = 2,
  interiorSeeds: readonly (readonly [number, number])[] = [],
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = im.naturalWidth;
  off.height = im.naturalHeight;
  const ctx = off.getContext('2d')!;
  ctx.drawImage(im, 0, 0);
  const data = ctx.getImageData(0, 0, off.width, off.height),
    px = data.data,
    w = off.width,
    h = off.height;
  const seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round((col * w) / cols),
        x1 = Math.round(((col + 1) * w) / cols),
        y0 = Math.round((row * h) / rows),
        y1 = Math.round(((row + 1) * h) / rows);
      let head = 0,
        tail = 0;
      const push = (x: number, y: number) => {
        if (x < x0 || x >= x1 || y < y0 || y >= y1) return;
        const id = y * w + x,
          i = id * 4;
        if (seen[id]) return;
        seen[id] = 1;
        if (
          Math.max(px[i], px[i + 1], px[i + 2]) < 65 &&
          px[i + 2] >= px[i] &&
          px[i + 2] >= px[i + 1]
        ) {
          queue[tail++] = id;
          px[i + 3] = 0;
        }
      };
      for (let x = x0; x < x1; x++) {
        push(x, y0);
        push(x, y1 - 1);
      }
      for (let y = y0; y < y1; y++) {
        push(x0, y);
        push(x1 - 1, y);
      }
      for (const [x, y] of interiorSeeds) push(x, y);
      while (head < tail) {
        const id = queue[head++],
          x = id % w,
          y = Math.floor(id / w);
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }
    }
  ctx.putImageData(data, 0, 0);
  return off;
}

export function prepareWeaponAtlas(im: HTMLImageElement): HTMLCanvasElement {
  // The bowstring, crossbow limbs and saber guard enclose empty background.
  // Flood only those known empty pockets; preserve dark wood and metal details.
  return prepareEnemyAtlas(im, 1, 1, [
    [610, 620],
    [1000, 640],
    [1000, 740],
    [90, 726],
    [1320, 697],
  ]);
}
export const enemyCrops = [
  [145, 66, 240, 330],
  [497, 60, 340, 340],
  [995, 65, 235, 335],
  [1388, 20, 229, 380],
  [155, 469, 200, 341],
  [542, 520, 241, 290],
  [964, 460, 287, 345],
  [1412, 472, 200, 339],
];
