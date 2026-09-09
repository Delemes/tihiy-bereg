import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import ts from 'typescript';
const canvasModule = process.argv[2];
if (!canvasModule) throw Error('Pass the installed @napi-rs/canvas directory');
const { createCanvas, loadImage } = await import(
  pathToFileURL(join(canvasModule, 'index.js'))
);
const temp = fs.mkdtempSync(join(tmpdir(), 'bereg-render-'));
for (const file of fs
  .readdirSync('app')
  .filter((f) => /^rpg-.*\.ts$/.test(f))) {
  const js = ts
    .transpileModule(fs.readFileSync(join('app', file), 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/from ['"]\.\/(rpg-[\w-]+)['"]/g, "from './$1.mjs'");
  fs.writeFileSync(join(temp, file.replace('.ts', '.mjs')), js);
}
const { drawArmedHero } = await import(
  pathToFileURL(join(temp, 'rpg-combat-view.mjs'))
);
const { prepareWeaponAtlas } = await import(
  pathToFileURL(join(temp, 'rpg-sprites.mjs'))
);
const { initialState } = await import(
  pathToFileURL(join(temp, 'rpg-model.mjs'))
);
const hero = await loadImage('public/hero-walk.png'),
  atlas = await loadImage('public/weapons-v5.png');
// A Canvas-only document stub for testing the game renderer outside a browser.
globalThis.document = Object.fromEntries([
  ['createElement', () => createCanvas(1, 1)],
]);
const weapons = prepareWeaponAtlas(atlas);
const rgba = weapons
  .getContext('2d')
  .getImageData(0, 0, weapons.width, weapons.height).data;
for (const [x, y] of [
  [610, 620],
  [1000, 640],
  [1000, 740],
  [90, 726],
  [1320, 697],
])
  if (rgba[(y * weapons.width + x) * 4 + 3] !== 0)
    throw Error('Weapon matte remains at ' + x + ',' + y);
if (rgba[(690 * weapons.width + 668) * 4 + 3] === 0)
  throw Error('Bow grip was erased');
const items = [
  'stick',
  'knife',
  'axe',
  'spear',
  'saber',
  'bow',
  'crossbow',
  'sling',
];
const angles = [Math.PI / 2, Math.PI, 0, -Math.PI / 2];
const out = createCanvas(960, 1540),
  c = out.getContext('2d');
c.fillStyle = '#303b32';
c.fillRect(0, 0, out.width, out.height);
c.imageSmoothingEnabled = false;
for (let row = 0; row < items.length; row++)
  for (let col = 0; col < 4; col++) {
    const x = 120 + col * 240,
      y = 165 + row * 190;
    c.fillStyle = '#d7caaa';
    c.font = '15px Arial';
    c.fillText(
      items[row] + ' / ' + ['front', 'left', 'right', 'back'][col],
      x - 65,
      y + 21,
    );
    c.save();
    c.translate(x, y);
    c.scale(1.85, 1.85);
    drawArmedHero(
      c,
      hero,
      weapons,
      { ...initialState, weapon: items[row], facing: angles[col] },
      1,
    );
    c.restore();
  }
fs.mkdirSync('artifacts/qa', { recursive: true });
fs.writeFileSync('artifacts/qa/equipment-grips.png', out.toBuffer('image/png'));
const motion = createCanvas(1200, 1080),
  ctx = motion.getContext('2d');
ctx.fillStyle = '#303b32';
ctx.fillRect(0, 0, motion.width, motion.height);
ctx.imageSmoothingEnabled = false;
for (let row = 0; row < 4; row++)
  for (let col = 0; col < 6; col++) {
    const state = {
      ...initialState,
      weapon: 'axe',
      facing: angles[row],
      attackFacing: angles[row],
    };
    if (col === 3) state.attackDelay = 0.15;
    if (col === 4) state.swing = 0.15;
    if (col === 5) state.swing = 0.05;
    ctx.save();
    ctx.translate(100 + col * 200, 230 + row * 260);
    ctx.scale(2.5, 2.5);
    drawArmedHero(ctx, hero, weapons, state, col < 3 ? col : col === 3 ? 0 : 2);
    ctx.restore();
    ctx.fillStyle = '#d7caaa';
    ctx.font = '14px Arial';
    ctx.fillText(
      ['step 1', 'idle', 'step 2', 'windup', 'swing', 'follow-through'][col],
      50 + col * 200,
      253 + row * 260,
    );
  }
fs.writeFileSync('artifacts/qa/axe-motion.png', motion.toBuffer('image/png'));
console.log(
  'Rendered actual game equipment: artifacts/qa/equipment-grips.png, artifacts/qa/axe-motion.png',
);
