import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
const directory = mkdtempSync(join(tmpdir(), 'bereg-check-'));
for (const name of fs
  .readdirSync(new URL('../app/', import.meta.url))
  .filter((n) => /^rpg-.*\.ts$/.test(n))
  .map((n) => n.slice(0, -3))) {
  const source = fs.readFileSync(
    new URL('../app/' + name + '.ts', import.meta.url),
    'utf8',
  );
  let js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  js = js.replace(/from ['"]\.\/(rpg-[\w-]+)['"]/g, "from './$1.mjs'");
  fs.writeFileSync(join(directory, name + '.mjs'), js);
}
const m = await import(pathToFileURL(join(directory, 'rpg-model.mjs'))),
  sys = await import(pathToFileURL(join(directory, 'rpg-systems.mjs'))),
  story = await import(pathToFileURL(join(directory, 'rpg-story.mjs'))),
  world = await import(pathToFileURL(join(directory, 'rpg-world.mjs')));
let checks = 0;
const check = (v, label) => {
  assert.ok(v, label);
  checks++;
};
const fresh = (extra = {}) => ({
  ...structuredClone(m.initialState),
  ...extra,
});
const step = (s, id, action, node = 'root') =>
  story.choose(s, id, action, node).state;
for (const [region, places] of Object.entries(m.regionPlaces)) {
  const start =
    region === 'village'
      ? [710, 858]
      : region === 'forest'
        ? [720, 880]
        : region === 'sawmill'
          ? [740, 870]
          : [768, 825];
  check(world.canWalk(...start, region), region + ' spawn');
  for (const p of places) {
    check(world.canWalk(p.x, p.y, region), region + ' walkable ' + p.id);
    const path = world.findPath(...start, p.x, p.y, region);
    check(path.length > 0, region + ' reachable ' + p.id);
    check(
      path.every((pt) => world.canWalk(pt.x, pt.y, region)),
      region + ' path collision ' + p.id,
    );
  }
}
for (const e of m.enemies) {
  check(!m.safeRegions.includes(e.region), 'no hostile hub ' + e.id);
  check(world.canWalk(e.x, e.y, e.region), 'enemy anchor ' + e.id);
}
for (const r of m.safeRegions)
  check(m.activeEnemies(fresh({ region: r })).length === 0, 'hub safety ' + r);
for (const [id, r] of Object.entries(sys.routes)) {
  const s = fresh({
    region: r.from,
    flags: ['key', 'seal', 'refuge', 'bell', 'engine', 'cistern'],
  });
  const n = sys.travel(s, id);
  check(n.region === r.to, 'travel ' + id);
  check(world.canWalk(n.x, n.y, n.region), 'travel arrival ' + id);
  check(n.coins >= 0, 'travel affordability ' + id);
}
check(
  sys.travel(fresh({ coins: 0 }), 'bus').region === 'village',
  'bus cannot overdraft',
);
check(
  sys.travel(fresh({ coins: 0 }), 'walk-pushkino').region === 'pushkino',
  'free alternate route',
);
check(sys.travel(fresh(), 'enter-home').region === 'village', 'locked house');
let s = fresh();
s = step(s, 'vera', 'meet');
check(m.has(s, 'key'), 'keys from conversation');
s = sys.travel(s, 'enter-home');
check(s.region === 'home' && m.has(s, 'home'), 'home entered');
check(
  story.scene(fresh(), 'anna').choices.some((c) => c.id === 'meet'),
  'first greeting',
);
check(
  story
    .scene(fresh({ met: ['anna'] }), 'anna')
    .choices.some((c) => c.id === 'go:topics'),
  'normal dialogue menu',
);
check(
  story
    .scene(fresh({ met: ['vera'] }), 'vera')
    .choices.some((c) => c.id === 'go:shop'),
  'trade menu separate',
);
for (const who of ['anna', 'katya', 'nina']) {
  let a = fresh({ flowers: 1 });
  a = step(a, who, 'meet');
  a = step(
    a,
    who,
    { anna: 'anna-stay', katya: 'katya-respect', nina: 'nina-honest' }[who],
    'topics',
  );
  a = step(a, who, 'heart-honest', 'personal');
  a = step(a, who, 'gift', 'personal');
  check(a.affection[who] === 4, 'trust earned ' + who);
  const before = a.affection[who];
  a = step(a, who, 'gift', 'personal');
  check(a.affection[who] === before && a.flowers === 0, 'no gift farm ' + who);
  a = step(a, who, 'go:commit', 'personal');
  check(a.partner === null, 'quest gate ' + who);
  a.flags.push(
    { anna: 'annaQuest', katya: 'pumpDone', nina: 'ninaQuest' }[who],
  );
  a = step(a, who, 'commit', 'commit');
  check(a.partner === who, 'female romance ' + who);
  const other = who === 'anna' ? 'katya' : 'anna';
  a.affection[other] = 6;
  a.flags.push({ anna: 'annaQuest', katya: 'pumpDone' }[other]);
  a = step(a, other, 'commit', 'commit');
  check(a.partner === who, 'exclusive commitment ' + who);
  a.flags.push('truth', 'communityWater');
  a.reputation = 4;
  const end = step(a, 'dock', 'ending-stay', 'final');
  check(end.ending.includes(m.people[who].name), 'romance epilogue ' + who);
}
for (const who of ['mikhail', 'vera', 'lev'])
  check(
    !story
      .scene(fresh({ met: [who] }), who)
      .choices.some((c) => c.id === 'go:personal'),
    'friendship only ' + who,
  );
s = fresh({ met: ['anna'], affection: { anna: 2, katya: 0, nina: 0 } });
s = step(s, 'anna', 'anna-dismiss', 'topics');
check(s.affection.anna === 1, 'hurtful answer consequence');
const unchanged = step(s, 'anna', 'anna-dismiss', 'topics');
check(unchanged.affection.anna === 1, 'no repeated penalty exploit');
s = fresh({
  met: ['anna'],
  flags: ['ledger', 'communityWater'],
  reputation: 2,
});
const honest = step(s, 'anna', 'ledger-truth', 'ledger'),
  deal = step(s, 'anna', 'ledger-deal', 'ledger');
check(honest.coins === 110 && deal.coins === 290, 'consequential payout');
check(
  honest.affection.anna > deal.affection.anna,
  'truth affects relationship',
);
const hEnd = step(honest, 'dock', 'ending-stay', 'final'),
  dEnd = step(deal, 'dock', 'ending-stay', 'final');
check(hEnd.ending.startsWith('Общий берег'), 'community ending');
check(dEnd.ending.startsWith('Цена молчания'), 'compromise ending');
check(
  step(deal, 'anna', 'ledger-deal', 'ledger').coins === deal.coins,
  'ledger reward once',
);
s = fresh({ flags: ['pumpFixed', 'pumpPart', 'pumpQuest'], met: ['katya'] });
const community = step(s, 'katya', 'pump-common', 'quest'),
  paid = step(s, 'katya', 'pump-paid', 'quest');
check(
  community.reputation > paid.reputation && community.coins < paid.coins,
  'pump economy tradeoff',
);
check(
  step(community, 'katya', 'pump-common', 'quest').coins === community.coins,
  'quest reward once',
);
s = fresh({ region: 'mine', flags: ['valveOpen'], defeated: ['mine-chief'] });
s = step(s, 'ledger', 'loot');
check(m.has(s, 'ledger'), 'dungeon ledger loot');
check(step(s, 'ledger', 'loot').xp === s.xp, 'no repeat chest');
check(
  !m.has(step(fresh({ region: 'mine' }), 'ledger', 'loot'), 'ledger'),
  'boss guards ledger',
);
check(
  !m.has(step(fresh({ region: 'mine' }), 'pump', 'loot'), 'pumpPart'),
  'valve guards pump',
);
s = step(fresh({ region: 'mine', flags: ['valveOpen'] }), 'pump', 'loot');
check(m.has(s, 'pumpPart'), 'pump quest item');
s = fresh({ met: ['mikhail'], flags: ['millQuest', 'heirloom'] });
s = step(s, 'mikhail', 'return-compass', 'quest');
check(m.has(s, 'heirloomDone') && s.coins === 175, 'compass quest');
check(
  step(s, 'mikhail', 'return-compass', 'quest').coins === 175,
  'compass once',
);
s = fresh({
  met: ['lev'],
  encounter: 'courier',
  flags: ['courierQuest', 'mailbag'],
});
const courier = step(s, 'road-event', 'return-mail', 'quest'),
  stolen = step(s, 'road-event', 'keep-mail-money', 'quest');
check(
  courier.coins < stolen.coins && courier.reputation > stolen.reputation,
  'mail dilemma',
);
check(
  step(courier, 'lev', 'return-mail', 'quest').coins === courier.coins,
  'mail reward once',
);
const encounters = new Set();
for (let seed = 1; seed < 15; seed++)
  encounters.add(sys.travel(fresh({ seed, day: 2 }), 'to-forest').encounter);
check(encounters.size === 3, 'three encounter kinds');
const encounter = sys.travel(fresh(), 'to-forest');
check(
  encounter.encounter === 'courier',
  'quest encounter accessible first visit',
);
check(
  sys.travel({ ...encounter, region: 'village' }, 'to-forest').encounter ===
    'courier',
  'encounter not rerolled within day',
);
for (const k of Object.keys(sys.stockInfo)) {
  const info = sys.stockInfo[k];
  if (!info.price) continue;
  let n = fresh({ coins: 1000 });
  n = sys.trade(n, k);
  check(n.coins === 1000 - info.price, 'buy cost ' + k);
  n = sys.trade(n, k, true);
  check(n.coins < 1000, 'no arbitrage ' + k);
}
s = fresh({ coins: 500 });
s = sys.trade(s, 'knife');
check(s.weapon === 'knife' && s.coins === 355, 'weapon equip');
check(sys.trade(s, 'knife').coins === 355, 'unique weapon');
s = fresh({ fish: 30 });
for (let i = 0; i < 20; i++) s = sys.trade(s, 'fish', true);
check(s.coins === 110 + 8 * 14 && s.fish === 22, 'daily demand limit');
s = fresh({ coins: 1000 });
for (let i = 0; i < 10; i++) s = sys.trade(s, 'bread');
check(s.bread === 7, 'daily stock limit');
check(sys.trade(fresh({ coins: 0 }), 'bread').coins === 0, 'no negative money');
let defeated = sys.defeat(fresh({ coins: 200 }));
check(
  defeated.region === 'home' && defeated.wounds === 1 && defeated.coins === 170,
  'defeat consequences',
);
check(
  sys.maxHealth(defeated) === 90 && defeated.lostCoins === 15,
  'partial money recovery',
);
defeated = step(defeated, 'lost-bag', 'loot');
check(
  defeated.coins === 185 && defeated.lostCoins === 0,
  'wallet recovery limited',
);
defeated = step(defeated, 'vera', 'clinic', 'quest');
check(
  defeated.wounds === 0 && defeated.hp === 100 && defeated.coins === 140,
  'clinic sink',
);
function timed(s) {
  let n = s;
  const a = n.activity;
  if (a.kind === 'work') {
    n = sys.activityInput(n, 'memorized');
    for (const i of a.sequence) n = sys.activityInput(n, 'sort:' + i);
  } else if (a.kind === 'gather') {
    for (const [i, v] of a.board.entries())
      if (v === 1) n = sys.activityInput(n, 'pick:' + i);
  } else if (a.kind === 'repair') {
    let solution = -1;
    for (let mask = 0; mask < 512; mask++) {
      const board = [...a.board];
      for (let i = 0; i < 9; i++)
        if (mask & (1 << i))
          for (let j = 0; j < 9; j++)
            if (
              j === i ||
              Math.abs(j - i) === 3 ||
              (Math.floor(j / 3) === Math.floor(i / 3) && Math.abs(i - j) === 1)
            )
              board[j] = 1 - board[j];
      if (board.every((v) => v === 1)) {
        solution = mask;
        break;
      }
    }
    assert.ok(solution >= 0, 'circuit must be solvable');
    for (let i = 0; i < 9; i++)
      if (solution & (1 << i)) n = sys.activityInput(n, 'switch:' + i);
  }
  assert.ok(n.activity.done, 'bounded puzzle completes');
  return n;
}
s = sys.startActivity(fresh(), 'work', 'order');
s = timed(s);
check(s.coins === 152, 'skilled work pays');
s = sys.activityInput(s, 'close');
check(sys.startActivity(s, 'work', 'order').activity === null, 'work once/day');
s = sys.startActivity(fresh({ x: 914, y: 717 }), 'gather', 'flower0');
s = timed(s);
check(s.flowers === 2, 'careful gathering');
s = sys.activityInput(s, 'close');
check(
  sys.startActivity(s, 'gather', 'flower0').activity === null,
  'same day gathering limit',
);
s = timed(sys.startActivity(fresh({ flags: ['pumpPart'] }), 'repair', 'pump'));
check(m.has(s, 'pumpFixed'), 'repair multiple stages');
s = timed(sys.startActivity(fresh({ region: 'mine' }), 'repair', 'valve'));
check(m.has(s, 'valveOpen'), 'valve puzzle unlock');
s = sys.startActivity(fresh(), 'grill', 'grill');
check(s.meat === 0 && s.wood === 1, 'grill prep costs upfront');
s = sys.activityInput(s, 'onion');
check(s.spice === 0 && s.activity.stage === 1, 'marinade choice');
s = sys.activityInput(s, 'start');
for (let side = 0; side < 2; side++) {
  for (let i = 0; i < 1000 && s.activity.sides[side] < 88; i++) {
    if (s.activity.heat < 47) s = sys.activityInput(s, 'fan');
    s = sys.tickActivity(s, 0.05);
  }
  if (side === 0) s = sys.activityInput(s, 'turn');
}
s = sys.activityInput(s, 'serve');
check(
  s.activity.done && s.meals === 2 && m.has(s, 'goodGrill'),
  'grill heat and turning success',
);
const count = s.meals;
s = sys.activityInput(s, 'serve');
check(s.meals === count, 'grill result awarded once');
s = step(
  {
    ...s,
    activity: null,
    flags: [...s.flags, 'album', 'albumShared'],
    met: ['nina'],
  },
  'nina',
  'dinner',
  'quest',
);
check(m.has(s, 'ninaQuest') && s.meals === 1, 'dinner uses cooked meal');
s = sys.startActivity(fresh(), 'grill', 'grill');
s = sys.activityInput(s, 'plain');
s = sys.activityInput(s, 'start');
s = sys.activityInput(s, 'serve');
check(s.activity.done && s.meals === 0, 'raw food fails');
s = sys.startActivity(fresh(), 'grill', 'grill');
s = sys.activityInput(s, 'abandon');
check(
  s.activity === null && s.meat === 0,
  'cannot refund abandoned ingredients',
);
s = sys.startActivity(fresh(), 'fish', 'dock');
for (let i = 0; i < 1200 && !s.activity.done; i++)
  s = sys.tickActivity(s, 0.05, s.activity.meter < 65);
check(s.activity.done && s.fish === 1, 'fishing tension success');
s = sys.startActivity(fresh(), 'fish', 'dock');
for (let i = 0; i < 1200 && !s.activity.done; i++)
  s = sys.tickActivity(s, 0.05, true);
check(
  s.fish === 0 && s.activity.result.includes('лопнула'),
  'overpull breaks line',
);
const e = m.enemies.find((e) => e.id === 'drunk');
const combatState = () =>
  fresh({ region: e.region, x: e.x - 55, y: e.y, facing: 0 });
s = combatState();
let n = sys.tickWorld(s, 0.016, { dx: 0, dy: 0, attack: true }, world.canWalk);
check(n.attackDelay > 0 && n.foes[e.id].hp === e.hp, 'strike has preparation');
for (let i = 0; i < 5; i++)
  n = sys.tickWorld(n, 0.02, { dx: 0, dy: 0 }, world.canWalk);
check(n.foes[e.id].hp === e.hp - 18, 'realtime directional hit');
check(n.energy < s.energy, 'attack stamina cost');
const hp = n.foes[e.id].hp;
n = sys.tickWorld(n, 0.016, { dx: 0, dy: 0, attack: true }, world.canWalk);
check(n.foes[e.id].hp === hp, 'cooldown prevents spam');
s = combatState();
s.facing = Math.PI;
n = sys.tickWorld(s, 0.016, { dx: 0, dy: 0, attack: true }, world.canWalk);
check(n.foes[e.id].hp === e.hp, 'wrong direction misses');
s = combatState();
s.energy = 0;
n = sys.tickWorld(s, 0.016, { dx: 0, dy: 0, attack: true }, world.canWalk);
check(n.foes[e.id].hp === e.hp, 'exhaustion prevents hit');
function incoming(extra = {}) {
  return combatStateWith({
    foes: {
      [e.id]: {
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        phase: 'windup',
        timer: 0.01,
        aim: Math.PI,
        flash: 0,
      },
    },
    ...extra,
  });
}
function combatStateWith(extra) {
  return { ...combatState(), ...extra };
}
s = incoming();
n = sys.tickWorld(s, 0.02, { dx: 0, dy: 0 }, world.canWalk);
check(n.hp === 100 - e.attack, 'windup resolves in real time');
s = incoming();
n = sys.tickWorld(s, 0.02, { dx: 0, dy: 0, guard: true }, world.canWalk);
check(
  n.hp > 100 - e.attack && n.energy < 100,
  'front block mitigates and costs',
);
s = incoming({ facing: Math.PI });
n = sys.tickWorld(s, 0.02, { dx: 0, dy: 0, guard: true }, world.canWalk);
check(n.hp === 100 - e.attack, 'back attack bypasses block');
s = incoming();
n = sys.tickWorld(s, 0.02, { dx: 0, dy: 1, dodge: true }, world.canWalk);
check(
  n.hp === 100 && n.invulnerable > 0 && n.energy < 100,
  'dodge invulnerability',
);
s = incoming();
s.foes[e.id].timer = 0.5;
n = sys.tickWorld(s, 0.02, { dx: 0, dy: 0, heavy: true }, world.canWalk);
for (let i = 0; i < 12; i++)
  n = sys.tickWorld(n, 0.02, { dx: 0, dy: 0 }, world.canWalk);
check(
  n.foes[e.id].phase === 'recover' && n.hp === 100,
  'prepared heavy interrupts',
);
s = combatState();
s.foes[e.id] = {
  id: e.id,
  x: e.x,
  y: e.y,
  hp: 1,
  phase: 'windup',
  timer: 0.4,
  aim: Math.PI,
  flash: 0,
};
n = sys.tickWorld(s, 0.02, { dx: 0, dy: 0, attack: true }, world.canWalk);
for (let i = 0; i < 5; i++)
  n = sys.tickWorld(n, 0.02, { dx: 0, dy: 0 }, world.canWalk);
check(
  n.defeated.includes(e.id) && n.hp === 100,
  'defeated enemy cannot retaliate',
);
const coins = n.coins;
for (let i = 0; i < 80; i++)
  n = sys.tickWorld(n, 0.05, { dx: 0, dy: 0, attack: true }, world.canWalk);
check(n.coins === coins, 'enemy reward once');
const hungry = sys.tickWorld(
  combatStateWith({ hunger: 0 }),
  0.01,
  { dx: 0, dy: 0, attack: true },
  world.canWalk,
);
check(hungry.foes[e.id].hp > e.hp - 18, 'hunger lowers damage');
const old = {
  ...fresh(),
  version: undefined,
  partner: 'mikhail',
  affection: { anna: 3, mikhail: 5 },
  flags: ['home', 'annaQuest', 'ending'],
  battle: { enemyId: 'drunk', hp: 20 },
};
const migrated = m.migrateSave(old);
check(
  migrated.partner === null &&
    migrated.affection.anna === 3 &&
    m.has(migrated, 'annaQuest'),
  'old save migration and romance policy',
);
check(!m.has(migrated, 'ending'), 'old ending opened for new chapter');
check(m.migrateSave({ hp: NaN }) === null, 'invalid save rejected');
const savedActivity = sys.startActivity(fresh(), 'grill', 'grill');
const restored = m.migrateSave(JSON.parse(JSON.stringify(savedActivity)));
check(
  restored.activity?.kind === 'grill' && restored.meat === 0,
  'activity restored without refund',
);
const savedCombat = sys.tickWorld(
  combatState(),
  0.02,
  { dx: 0, dy: 0, attack: true },
  world.canWalk,
);
check(
  m.migrateSave(JSON.parse(JSON.stringify(savedCombat))).foes[e.id].hp ===
    savedCombat.foes[e.id].hp,
  'combat state persisted',
);
checks += await (
  await import('./expansion-tests.mjs')
).checkExpansion({
  m,
  sys,
  story,
  world,
  load: (name) => import(pathToFileURL(join(directory, name + '.mjs'))),
});
checks += await (
  await import('./journey-tests.mjs')
).checkJourney({
  m,
  sys,
  story,
  world,
  load: (name) => import(pathToFileURL(join(directory, name + '.mjs'))),
});
checks += await (
  await import('./audit-tests.mjs')
).checkAudit({
  m,
  sys,
  story,
  world,
  load: (name) => import(pathToFileURL(join(directory, name + '.mjs'))),
});
checks += await (
  await import('./equipment-controls-tests.mjs')
).checkEquipmentControls({
  m,
  sys,
  world,
  load: (name) => import(pathToFileURL(join(directory, name + '.mjs'))),
});
for (const entry of ['rpg-combat', 'rpg-story', 'rpg-systems', 'rpg-crime']) {
  const uri = pathToFileURL(join(directory, entry + '.mjs')).href;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', 'await import(' + JSON.stringify(uri) + ');'],
    { encoding: 'utf8', timeout: 10000 },
  );
  check(result.status === 0, 'cold import ' + entry + ' ' + result.stderr);
}
console.log(
  'Content: ' +
    Object.keys(m.regionNames).length +
    ' zones, ' +
    m.enemies.length +
    ' enemies, ' +
    Object.values(m.regionPlaces).reduce((n, p) => n + p.length, 0) +
    ' landmarks, ' +
    Object.keys(m.people).length +
    ' NPCs.',
);
// Exercise the real canvas loop with a deterministic renderer, without a browser.
let callback;
const draws = [];
const context = new Proxy(
  {
    measureText: (t) => ({ width: t.length * 7 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage: (...a) => draws.push(a),
  },
  { get: (o, k) => (k in o ? o[k] : () => {}) },
);
globalThis.Image = class {
  complete = true;
  naturalWidth = 1536;
  naturalHeight = 1024;
  set src(v) {
    this.source = v;
    if (v.includes('rooms-v4')) {
      this.naturalWidth = 1254;
      this.naturalHeight = 1254;
    }
    if (v.includes('hero-walk')) {
      this.naturalWidth = 1086;
      this.naturalHeight = 1448;
    }
  }
};
globalThis.HTMLCanvasElement = class {};
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = (fn) => {
  callback = fn;
  return 1;
};
globalThis.cancelAnimationFrame = () => {};
const windowHandlers = {};
globalThis.window = {
  addEventListener: (k, v) => (windowHandlers[k] = v),
  removeEventListener: (k) => delete windowHandlers[k],
};
const handlers = {};
const canvas = {
  clientWidth: 1200,
  clientHeight: 800,
  getContext: () => context,
  addEventListener: (k, v) => (handlers[k] = v),
  removeEventListener(k) {
    delete handlers[k];
  },
  getBoundingClientRect: () => ({ left: 0, top: 0 }),
};
let rendered = fresh();
let paused = false;
const api = world.createWorld(
  canvas,
  () => rendered,
  () => paused,
  (n) => (rendered = n),
  () => {},
);
for (const [key, axis, dir] of [
  ['KeyD', 'x', 1],
  ['KeyA', 'x', -1],
  ['KeyW', 'y', -1],
  ['KeyS', 'y', 1],
]) {
  rendered = fresh({ x: 1000, y: 850 });
  api.key(key, true);
  const before = rendered[axis];
  for (let i = 1; i < 18; i++) callback(performance.now() + i * 16);
  check((rendered[axis] - before) * dir > 0, 'canvas movement ' + key);
  api.key(key, false);
}
check(
  draws.some((a) => a[0]?.source === '/hero-walk.png' && a.length === 9),
  'actual hero frame drawn',
);
// Actual DOM pointer handlers exercise browser button chording and release semantics.
let clock = performance.now() + 5000;
const pointerStep = (count = 1) => {
  for (let i = 0; i < count; i++) callback((clock += 50));
};
const mouse = (button, buttons) => ({
  button,
  buttons,
  clientX: 1020,
  clientY: 370,
  pointerType: 'mouse',
  preventDefault() {},
});
const resetInput = () => {
  windowHandlers.blur();
  rendered = fresh({ x: 1000, y: 850 });
  pointerStep();
};
resetInput();
handlers.pointerdown(mouse(0, 1));
windowHandlers.pointerup(mouse(0, 0));
pointerStep();
check(
  rendered.attackDelay > 0 && rendered.attackKind === 'light',
  'quick LMB click survives release before next frame',
);
check(
  rendered.x === 1000 && rendered.y === 850,
  'LMB never starts an automatic walk',
);
resetInput();
handlers.pointerdown(mouse(2, 2));
pointerStep();
check(
  rendered.attackKind === 'heavy' && rendered.energy < 90,
  'canvas RMB invokes a heavy attack',
);
pointerStep(18);
check(
  rendered.energy < 60,
  'holding RMB repeats subject to cooldown and stamina',
);
windowHandlers.pointerup(mouse(2, 0));
pointerStep(40);
check(
  rendered.cooldown === 0 && rendered.attackBuffer === 0,
  'window release stops auto-attacking',
);
resetInput();
handlers.pointerdown(mouse(0, 1));
handlers.pointermove(mouse(2, 3));
pointerStep();
check(
  rendered.attackKind === 'heavy',
  'second mouse button arriving as pointermove takes priority',
);
handlers.pointermove(mouse(0, 2));
rendered = fresh({ x: 1000, y: 850 });
pointerStep();
check(rendered.attackKind === 'heavy', 'releasing LMB leaves held RMB working');
windowHandlers.pointerup(mouse(2, 0));
rendered = fresh({ x: 1000, y: 850 });
pointerStep();
check(
  rendered.attackDelay === 0 && rendered.cooldown === 0,
  'releasing final button clears the entire chord',
);
resetInput();
handlers.pointerdown(mouse(0, 1));
pointerStep();
handlers.pointerleave();
pointerStep(40);
check(rendered.cooldown === 0, 'leaving the canvas stops mouse attacks');
resetInput();
handlers.pointerdown(mouse(0, 1));
windowHandlers.blur();
pointerStep();
check(rendered.cooldown === 0, 'focus loss discards pending clicks');
handlers.pointerdown(mouse(2, 2));
windowHandlers.pointercancel();
pointerStep();
check(rendered.cooldown === 0, 'pointer cancellation discards pending clicks');
paused = true;
handlers.pointerdown(mouse(0, 1));
api.key('KeyJ', true);
pointerStep();
paused = false;
pointerStep();
check(rendered.cooldown === 0, 'closing a menu does not resume held input');
resetInput();
handlers.pointerdown(mouse(0, 1));
rendered = fresh({ region: 'shop', x: 768, y: 825 });
pointerStep(12);
check(
  rendered.cooldown === 0,
  'entering another location clears held mouse input',
);
paused = true;
const before = { x: rendered.x, y: rendered.y };
api.key('KeyD', true);
callback(performance.now() + 1000);
check(
  rendered.x === before.x && rendered.y === before.y,
  'menus pause simulation',
);
for (const region of ['shop', 'attic', 'grove', 'smuggler']) {
  rendered = fresh({ region, x: 768, y: 825 });
  draws.length = 0;
  callback(performance.now() + 2000);
  const asset = world.mapAsset(region),
    map = draws.find((a) => a[0]?.source === asset.src);
  check(!!map, 'canvas draws room ' + region);
  check(
    map[7] === (region === 'shop' ? 1536 : 1024) && map[8] === 1024,
    'canvas preserves room aspect ' + region,
  );
  check(
    draws.some((a) => a[0]?.source === '/hero-walk.png'),
    'hero remains visible in ' + region,
  );
}
api.destroy();
check(
  Object.keys(windowHandlers).length === 0 &&
    Object.keys(handlers).length === 0,
  'world destruction removes every input listener',
);
console.log(
  `PASS: ${checks} checks. Navigation, choices, romance, endings, realtime combat, economy, activities, saves, canvas loop.`,
);
