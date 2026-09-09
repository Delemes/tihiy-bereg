import assert from 'node:assert/strict';

export async function checkEquipmentControls({ load, m, sys, world }) {
  let checks = 0;
  const check = (condition, label) => {
    assert.ok(condition, label);
    checks++;
  };
  const { combatInput, combatBindings, menuShortcuts } =
    await load('rpg-controls');
  const { drawArmedHero } = await load('rpg-combat-view');
  const { heldWeaponArt, walkFrames } = await load('rpg-hand-pose');
  const { equipWeapon } = await load('rpg-equipment');
  const fresh = (extra = {}) => ({
    ...structuredClone(m.initialState),
    x: 1000,
    y: 850,
    ...extra,
  });
  const empty = new Set();
  const claimed = new Set();
  for (const [action, binding] of Object.entries(combatBindings)) {
    for (const key of binding.keys) {
      check(
        !claimed.has(key),
        'a key never invokes two combat actions: ' + key,
      );
      claimed.add(key);
      const input = combatInput(new Set([key]), new Set([key]));
      check(input[action], key + ' invokes ' + action);
      check(
        Object.keys(combatBindings).every(
          (other) => other === action || !input[other],
        ),
        'no unintended action from ' + key,
      );
    }
  }
  for (const key of [
    'Mouse0',
    'Mouse2',
    'KeyJ',
    'KeyK',
    'ShiftLeft',
    'ShiftRight',
  ])
    check(
      Object.values(combatInput(new Set([key]), empty)).some((v) => v === true),
      'hold repeats/guards ' + key,
    );
  for (const key of ['Space', 'KeyQ', 'KeyF', 'Digit1', 'KeyT', 'KeyV'])
    check(
      Object.values(combatInput(new Set([key]), empty)).every((v) => !v),
      'one-shot requires fresh press ' + key,
    );
  check(
    menuShortcuts.Tab === 'bag' && menuShortcuts.KeyI === 'bag',
    'Tab and I open bag',
  );
  const move = combatInput(new Set(['KeyW', 'KeyD']), empty);
  check(
    move.dx === 1 && move.dy === -1 && !move.attack,
    'movement never attacks',
  );
  const dodge = sys.tickWorld(
    fresh(),
    0.02,
    { ...combatInput(new Set(['Space']), new Set(['Space'])), dx: 1, dy: 0 },
    world.canWalk,
  );
  check(
    dodge.dash > 0 && dodge.attackDelay === 0 && dodge.x > 1000,
    'Space evades instead of attacking',
  );
  const dash = sys.tickWorld(
    dodge,
    0.02,
    { dx: 0, dy: 0, aim: Math.PI },
    world.canWalk,
  );
  check(
    dash.x > dodge.x && dash.facing === 0,
    'cursor cannot turn a dodge halfway through',
  );
  const attack = sys.tickWorld(
    fresh(),
    0.02,
    combatInput(empty, new Set(['Mouse2'])),
    world.canWalk,
  );
  check(
    attack.attackKind === 'heavy' && attack.attackDelay > 0,
    'RMB starts strong attack',
  );
  const guard = sys.tickWorld(
    attack,
    0.02,
    combatInput(new Set(['ShiftLeft']), empty),
    world.canWalk,
  );
  check(
    guard.guarding && guard.attackDelay === 0 && guard.swing === 0,
    'block cancels windup without a simultaneous hit',
  );
  const stunned = sys.tickWorld(
    fresh({ statuses: [{ kind: 'stun', time: 1, power: 1 }] }),
    0.02,
    { dx: 0, dy: 0, guard: true },
    world.canWalk,
  );
  check(
    !stunned.guarding && stunned.guardTime === 0,
    'stunned hero cannot block or accumulate parry time',
  );
  const special = sys.tickWorld(
    fresh(),
    0.02,
    combatInput(empty, new Set(['KeyQ'])),
    world.canWalk,
  );
  check(
    special.attackKind === 'special' && !special.guarding,
    'Q invokes special, not old block',
  );
  const healed = sys.tickWorld(
    fresh({ hp: 45, bandages: 2 }),
    0.02,
    combatInput(empty, new Set(['Digit1'])),
    world.canWalk,
  );
  check(healed.hp > 45 && healed.bandages === 1, '1 consumes one bandage');
  const switched = equipWeapon(
    fresh({
      weapons: ['stick', 'axe'],
      attackDelay: 0.2,
      attackBuffer: 0.1,
      bufferedAttack: 'heavy',
      combo: 3,
      comboWindow: 1,
      swing: 0.2,
    }),
    'axe',
  );
  check(
    switched.weapon === 'axe' &&
      !switched.attackDelay &&
      !switched.attackBuffer &&
      !switched.bufferedAttack &&
      !switched.combo &&
      !switched.swing,
    'equipment change clears the complete old attack',
  );
  check(
    sys.tickWorld(switched, 0.05, { dx: 0, dy: 0 }, world.canWalk)
      .attackDelay === 0,
    'equipping never queues a free attack',
  );
  const unowned = fresh();
  check(equipWeapon(unowned, 'saber') === unowned, 'cannot equip unowned gear');

  // Record real renderer transforms, then measure where the source grip lands.
  const stack = [];
  let matrix = [1, 0, 0, 1, 0, 0],
    draws = [];
  const multiply = (b) => {
    const [a, c, d, e, x, y] = matrix;
    matrix = [
      a * b[0] + d * b[1],
      c * b[0] + e * b[1],
      a * b[2] + d * b[3],
      c * b[2] + e * b[3],
      a * b[4] + d * b[5] + x,
      c * b[4] + e * b[5] + y,
    ];
  };
  const ctx = {
    save: () => stack.push([...matrix]),
    restore: () => {
      matrix = stack.pop();
    },
    translate: (x, y) => multiply([1, 0, 0, 1, x, y]),
    scale: (x, y) => multiply([x, 0, 0, y, 0, 0]),
    rotate: (a) =>
      multiply([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
    drawImage: (...args) => draws.push({ args, transform: [...matrix] }),
  };
  const hero = {},
    atlas = {};
  const angles = [Math.PI / 2, Math.PI, 0, -Math.PI / 2];
  // Independently measured fist pixels from the supplied hero artwork.
  const fists = [
    [
      [138, 216],
      [489, 237],
      [839, 215],
    ],
    [
      [224, 570],
      [547, 578],
      [947, 571],
    ],
    [
      [146, 929],
      [541, 933],
      [830, 935],
    ],
    [
      [258, 1275],
      [598, 1281],
      [948, 1280],
    ],
  ];
  for (const weapon of Object.keys(heldWeaponArt))
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++)
        for (const phase of ['idle', 'windup', 'swing', 'guard']) {
          draws = [];
          matrix = [1, 0, 0, 1, 0, 0];
          const state = fresh({
            weapon,
            facing: angles[row],
            attackFacing: angles[row],
            attackDelay: phase === 'windup' ? 0.14 : 0,
            swing: phase === 'swing' ? 0.1 : 0,
            guarding: phase === 'guard',
          });
          drawArmedHero(ctx, hero, atlas, state, col);
          const art = heldWeaponArt[weapon],
            call = draws.find((v) => v.args[0] === atlas);
          const [, , , sw, sh, dx, dy, dw, dh] = call.args;
          const px = dx + (art.grip[0] * dw) / sw,
            py = dy + (art.grip[1] * dh) / sh;
          const [a, b, c, d, x, y] = call.transform;
          const actual = [a * px + c * py + x, b * px + d * py + y];
          const [sx, sy, w, h] = walkFrames[row][col],
            [fx, fy] = fists[row][col];
          check(
            Math.hypot(
              actual[0] - (fx - sx - w / 2) * 0.22,
              actual[1] - (fy - sy - h) * 0.22,
            ) < 0.0001,
            'weapon grip stays inside fist ' + [weapon, row, col, phase],
          );
          check(
            draws.at(-1).args[0] === hero && draws.at(-1).args[3] === 20,
            'fingers occlude the handle ' + [weapon, row, col, phase],
          );
          check(
            (draws[0].args[0] === atlas) === (row === 3),
            'rear-facing weapon has correct depth ' + [weapon, row, col, phase],
          );
          check(
            stack.length === 0 &&
              matrix.every((v, i) => v === [1, 0, 0, 1, 0, 0][i]),
            'renderer leaves no transform drift',
          );
        }
  draws = [];
  drawArmedHero(ctx, hero, atlas, fresh({ weapon: 'fists' }), 1);
  check(
    draws.length === 1 && draws[0].args[0] === hero,
    'unarmed hero has no phantom equipment',
  );
  console.log(
    'PASS: ' +
      checks +
      ' equipment/control checks. Grip, layering, bindings, dodge, block, equipment changes.',
  );
  return checks;
}
