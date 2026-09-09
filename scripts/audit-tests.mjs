import assert from 'node:assert/strict';
export async function checkAudit({ m, sys, story, world, load }) {
  let count = 0;
  const check = (v, label) => {
    assert.ok(v, label);
    count++;
  };
  const fresh = (x = {}) => ({ ...structuredClone(m.initialState), ...x });
  const rules = await load('rpg-combat-rules'),
    projectiles = await load('rpg-projectiles'),
    guide = await load('rpg-quest-guide'),
    regions = await load('rpg-regions');
  const wall = (x) => x <= 10 || x >= 20;
  const enemy = { x: 0, y: 500 };
  rules.move(enemy, 0, 35, 'village', wall);
  check(
    enemy.x <= 10,
    'knockback and charges cannot tunnel through narrow walls',
  );
  let s = sys.tickWorld(
    fresh({ x: 1000, y: 850, region: 'shop', facing: 0 }),
    0.05,
    { dx: 1, dy: 0, dodge: true },
    (x) => x <= 1010 || x >= 1020,
  );
  check(s.x <= 1010, 'interior dodge checks full path through thin obstacles');
  s = fresh({
    region: 'dacha',
    minutes: 1090,
    daily: { party: 1, 'invite:anna': 1, 'invite:katya': 1 },
    x: 960,
    y: 670,
    hostileMode: true,
  });
  rules.spawn(s, 'hero', 980, 670, 0, 'arrow', 20, 150);
  s = projectiles.updateProjectiles(s, 0.05, world.canWalk);
  check(
    s.citizens.anna?.hp === 70,
    'projectile hits actual visiting guest position',
  );
  check(
    s.witnesses.includes('katya'),
    'ranged crime during gathering has witnesses',
  );
  s = fresh({
    minutes: 1090,
    daily: { party: 1, 'invite:anna': 1 },
    flags: ['letterQuest', 'letter'],
  });
  check(
    m
      .activePlaces({ ...s, region: 'library' })
      .some((p) => p.id === 'away:anna'),
    'absent NPC leaves a note',
  );
  check(
    guide.journalEntries(s).find((q) => q.title === 'Между строк').region ===
      'dacha',
    'quest points to actual guest destination',
  );
  const back = story.choose(
    { ...s, region: 'library' },
    'away:anna',
    'social:wait-return',
  );
  check(
    back.close && back.state.minutes === 1320 && back.state.hunger < s.hunger,
    'waiting for a resident advances time and hunger',
  );
  check(
    m.activePlaces(back.state).some((p) => p.id === 'anna'),
    'resident returns after wait',
  );
  s = fresh({ statuses: [{ kind: 'slow', time: 115, power: 1 }] });
  check(
    m.migrateSave(s).statuses[0].time === 115,
    'reload cannot erase most of drinking penalty',
  );
  s = {
    ...s,
    attackDelay: 0.1,
    attackBuffer: 0.15,
    bufferedAttack: 'heavy',
    combo: 3,
    comboWindow: 1,
  };
  const traveled = sys.travel(s, 'to-forest');
  check(
    traveled.attackDelay === 0 &&
      traveled.attackBuffer === 0 &&
      traveled.bufferedAttack === null &&
      traveled.combo === 0,
    'travel clears all pending attacks',
  );
  const slept = story.choose({ ...s, region: 'home' }, 'bed', 'sleep').state;
  check(
    slept.statuses.length === 0 &&
      slept.attackDelay === 0 &&
      slept.attackBuffer === 0,
    'overnight sleep removes temporary ailments and attacks',
  );
  const bought = sys.trade({ ...s, coins: 500 }, 'axe');
  check(
    bought.weapon === 'axe' &&
      bought.attackDelay === 0 &&
      bought.bufferedAttack === null,
    'purchasing a weapon cancels previous windup',
  );
  const core = await load('rpg-core');
  const defeated = core.defeat(s);
  check(
    defeated.statuses.length === 0 &&
      defeated.attackBuffer === 0 &&
      !defeated.guarding,
    'defeat resets transient battle state',
  );
  for (const [id, info] of Object.entries(sys.stockInfo)) {
    if (info.price > 0) {
      const before = fresh({ coins: 1000 }),
        b = sys.trade(before, id),
        sold = sys.trade(b, id, true);
      check(
        sold.coins <= before.coins,
        'buy-sell loop cannot print money: ' + id,
      );
    }
  }
  for (const r of Object.keys(regions.rooms)) {
    const id = 'wing-puzzle:' + r,
      before = fresh({ region: r });
    let result = before;
    for (const choice of story.scene(before, id).choices) {
      const n = story.choose(before, id, choice.id).state;
      if (n.flags.includes('wing-solved:' + r)) result = n;
    }
    check(
      result.flags.includes('wing-solved:' + r),
      'every riddle has reachable solution: ' + r,
    );
    for (const choice of story.scene(before, id).choices)
      check(
        story.choose(result, id, choice.id).state.coins === result.coins,
        'riddle reward remains one-time: ' + r,
      );
    const empty = { ...before, energy: 0 };
    check(
      story
        .scene(empty, id)
        .choices.filter((c) => c.id.startsWith('wing:answer'))
        .every((c) => c.disabled),
      'exhaustion blocks free brute force: ' + r,
    );
  }
  // Deterministic mixed combat input: resources must remain finite and bounded.
  for (const weapon of Object.keys(sys.weapons)) {
    let n = fresh({
      region: 'forest',
      x: 850,
      y: 660,
      weapon,
      weapons: [weapon],
      arrows: 10,
      stones: 10,
      throwing: 2,
      smoke: 1,
    });
    for (let i = 0; i < 500; i++)
      n = sys.tickWorld(
        n,
        0.05,
        {
          dx: i % 80 < 40 ? 1 : -1,
          dy: 0,
          attack: i % 9 === 0,
          heavy: i % 31 === 0,
          special: i % 73 === 0,
          dodge: i % 37 === 0,
          guard: i % 50 > 40,
          throw: i % 101 === 0,
        },
        world.canWalk,
      );
    check(
      [n.hp, n.energy, n.hunger, n.coins, n.x, n.y].every(Number.isFinite),
      'mixed combat remains finite: ' + weapon,
    );
    check(
      n.energy >= 0 && n.energy <= 100 && n.hp > 0 && n.hp <= 100,
      'combat vital bounds: ' + weapon,
    );
    check(
      n.arrows >= 0 && n.stones >= 0 && n.throwing >= 0,
      'ammunition never negative: ' + weapon,
    );
  }
  console.log(
    'PASS: ' +
      count +
      ' audit checks. Movement, guests, saves, economy, all riddles, mixed combat.',
  );
  return count;
}
