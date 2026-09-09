import assert from 'node:assert/strict';
export async function checkExpansion({ m, sys, story, world, load }) {
  let count = 0;
  const check = (v, label) => {
    assert.ok(v, label);
    count++;
  };
  const fresh = (x = {}) => ({ ...structuredClone(m.initialState), ...x });
  const choose = (s, id, action, node = 'root') =>
    story.choose(s, id, action, node).state;
  const combat = await load('rpg-combat'),
    criminal = await load('rpg-crime'),
    regions = await load('rpg-regions');
  const idle = (s, frames = 1) => {
    for (let i = 0; i < frames; i++)
      s = sys.tickWorld(s, 0.05, { dx: 0, dy: 0 }, world.canWalk);
    return s;
  };
  const attack = (s, kind = 'attack') =>
    idle(
      sys.tickWorld(s, 0.05, { dx: 0, dy: 0, [kind]: true }, world.canWalk),
      6,
    );
  check(Object.keys(m.regionNames).length === 45, '45 connected zones');
  check(
    new Set(m.enemies.map((e) => e.style).filter(Boolean)).size >= 9,
    'distinct enemy tactics',
  );
  check(m.enemies.length >= 35, 'enemy population expanded fivefold');
  check(Object.keys(sys.weapons).length === 9, 'nine weapon options');
  check(
    regions.unitScale('shop') > 1.7 && regions.unitScale('village') === 1,
    'interior scale independent of outdoors',
  );
  check(world.mapAsset('attic').cols === 3, 'new room atlas used');
  let s = fresh({ region: 'shopcellar' });
  check(
    sys.travel(s, 'enter:refuge').region === 'shopcellar',
    'secret door initially locked',
  );
  s = { ...s, flags: ['refuge'] };
  s = sys.travel(s, 'enter:refuge');
  s = sys.travel(s, 'shortcut:drain');
  check(s.region === 'drain', 'secret passage is a real shortcut');
  check(
    sys.travel(fresh({ region: 'deepmine' }), 'enter:smuggler').region ===
      'deepmine',
    'boss route requires engine',
  );
  check(
    sys.travel(fresh({ region: 'cistern' }), 'enter:depot').region ===
      'cistern',
    'reservoir blocks depot before repair',
  );
  for (const id of ['tamara', 'stepan', 'boris', 'constable'])
    check(story.scene(fresh(), id).text.length > 30, 'new NPC dialogue ' + id);
  s = choose(
    fresh({ region: 'pantry', coins: 100 }),
    'find:pantry',
    'find:buy',
  );
  check(
    s.bread === 5 && s.coins === 58 && s.wanted === 0,
    'owned goods can be bought',
  );
  check(
    choose(s, 'find:pantry', 'find:buy').coins === s.coins,
    'display purchase paid only once',
  );
  s = choose(fresh({ region: 'pantry' }), 'find:pantry', 'find:steal');
  check(
    s.bread === 5 && s.wanted === 0,
    'unwitnessed theft does not magically summon guards',
  );
  s = criminal.crime(
    fresh({ region: 'shop', x: 920, y: 580 }),
    'vera',
    'theft',
  );
  check(
    s.wanted === 1 && s.witnesses.includes('vera'),
    'nearby witness reports theft',
  );
  s = criminal.provoke(fresh({ region: 'village', x: 792, y: 280 }), 'mikhail');
  check(
    s.citizens.mikhail.hostile && s.wanted >= 3,
    'assault triggers retaliation and wanted level',
  );
  check(
    m.activeEnemies(s).some((e) => e.citizen === 'mikhail'),
    'angry NPC joins real time combat',
  );
  check(
    m.activeEnemies(s).some((e) => e.id.startsWith('pursuit:')),
    'patrol responds to violent crime',
  );
  s = criminal.hurtCitizen(s, 'mikhail', 95);
  check(
    s.citizens.mikhail.dead && s.murders.includes('mikhail'),
    'NPC death persists',
  );
  check(
    !m.activePlaces(s).some((p) => p.id === 'mikhail'),
    'dead NPC no longer talks',
  );
  check(
    m.activePlaces(s).some((p) => p.id === 'memorial:mikhail'),
    'death leaves a world trace',
  );
  check(
    m
      .quests(s)
      .find((q) => q.title === 'То, что осталось')
      .description.includes('погиб'),
    'important NPC death changes quest',
  );
  const deathSave = m.migrateSave(JSON.parse(JSON.stringify(s)));
  check(
    deathSave.citizens.mikhail.dead && deathSave.wanted === s.wanted,
    'crime state survives save/load',
  );
  const fee = criminal.fine(s),
    paid = criminal.payFine({ ...s, coins: 1000 });
  check(
    paid.coins === 1000 - fee && paid.wanted === 0 && paid.murders.length === 1,
    'fine ends pursuit without erasing murder',
  );
  s = criminal.threatenCitizen(
    fresh({ xp: 320, weapon: 'axe', x: 950, y: 530 }),
    'katya',
    true,
  );
  check(
    s.coins === 134 && s.citizens.katya.robbed,
    'successful robbery paid once',
  );
  check(
    criminal.threatenCitizen(s, 'katya', true).coins === 134,
    'robbery cannot be farmed',
  );
  check(
    !story.scene(s, 'katya').choices.some((c) => c.id === 'go:shop'),
    'robbed merchant refuses trade',
  );
  s = criminal.hurtCitizen(
    fresh({ region: 'shop', x: 950, y: 580 }),
    'vera',
    95,
  );
  s = choose(s, 'memorial:vera', 'emergency-key');
  check(
    m.has(s, 'key'),
    'essential house access has a fallback after Vera dies',
  );
  s = choose(
    fresh({ murders: ['mikhail'], flags: ['truth'] }),
    'dock',
    'ending-stay',
    'final',
  );
  check(
    s.ending.startsWith('Берег страха') && s.ending.includes('Михаил'),
    'murders change the ending',
  );
  s = choose(
    fresh({ flags: ['medicine'], region: 'clinic' }),
    'tamara',
    'medicine:return',
  );
  check(
    s.coins === 190 && m.has(s, 'medicineReturned'),
    'medicine quest delivered',
  );
  check(
    choose(s, 'tamara', 'medicine:return').coins === 190,
    'medicine reward once',
  );
  s = choose(fresh({ flags: ['villageBell'] }), 'find:reliquary', 'bell:sell');
  check(
    !m.has(choose(s, 'stepan', 'bell:return'), 'bellReturned'),
    'selling excludes returning the bell',
  );
  s = choose(fresh({ flags: ['evidence'] }), 'notice:law', 'evidence:law');
  check(
    m.has(s, 'suppliesSafe') &&
      !m.has(choose(s, 'find:smuggler', 'evidence:deal'), 'smugglerDeal'),
    'proof has mutually exclusive outcomes',
  );
  s = choose(
    fresh({ region: 'greenhouse' }),
    'plot:greenhouse:0',
    'garden:plant',
  );
  check(
    s.seeds === 1 && s.garden['plot:greenhouse:0'],
    'planting consumes one seed',
  );
  s = choose(s, 'plot:greenhouse:0', 'garden:water');
  const energy = s.energy;
  check(
    choose(s, 'plot:greenhouse:0', 'garden:water').energy === energy,
    'one watering per day',
  );
  check(
    choose(s, 'plot:greenhouse:0', 'garden:harvest').crops === 0,
    'cannot harvest immediately',
  );
  s = choose({ ...s, day: 2 }, 'plot:greenhouse:0', 'garden:water');
  s = choose({ ...s, day: 3 }, 'plot:greenhouse:0', 'garden:harvest');
  check(
    s.crops === 2 && !s.garden['plot:greenhouse:0'] && m.has(s, 'harvested'),
    'crop requires elapsed days and watering',
  );
  check(
    choose(s, 'plot:greenhouse:0', 'garden:harvest').crops === 2,
    'crop cannot be harvested twice',
  );
  s = sys.startActivity(fresh(), 'lock', 'test');
  const target = [...s.activity.sequence];
  for (let pin = 0; pin < 3; pin++)
    for (let i = 0; i < target[pin]; i++)
      s = sys.activityInput(s, 'pin:' + pin);
  s = sys.activityInput(s, 'test');
  check(
    m.has(s, 'unlocked:test') && s.activity.done,
    'lock solution opens container',
  );
  s = sys.startActivity(fresh(), 'lock', 'jam');
  // Every pin is deliberately wrong, including repeated guesses.
  for (let pin = 0; pin < 3; pin++)
    for (let i = 0; i < (s.activity.sequence[pin] + 1) % 4; i++)
      s = sys.activityInput(s, 'pin:' + pin);
  for (let i = 0; i < 6; i++) s = sys.activityInput(s, 'test');
  check(
    s.activity.done && s.daily['jam:jam'] === s.day,
    'six failures jam a lock',
  );
  const restoredPuzzle = m.migrateSave(
    JSON.parse(JSON.stringify(sys.startActivity(fresh(), 'work', 'order'))),
  );
  check(
    restoredPuzzle.activity.kind === 'work' &&
      restoredPuzzle.activity.sequence.length === 5 &&
      restoredPuzzle.daily.work === 1,
    'memory puzzle saves without refunding work',
  );
  s = sys.startActivity(fresh({ x: 914, y: 717 }), 'gather', 'flower0');
  for (const [i, v] of s.activity.board.entries())
    if (v !== 1 && !s.activity.done) s = sys.activityInput(s, 'pick:' + i);
  check(
    s.flowers === 0 && s.activity.done,
    'bad gathering damages plants instead of granting bonus',
  );
  for (let seed = 1; seed < 20; seed++) {
    const a = sys.startActivity(fresh({ seed }), 'repair', 'engine').activity;
    check(
      a.board.length === 9 && !a.board.every(Boolean),
      'circuit starts unsolved ' + seed,
    );
  }
  s = combat.learn(fresh({ xp: 160 }), 'footwork');
  check(s.perks.includes('footwork'), 'level grants a combat perk');
  check(
    combat.learn(s, 'endurance').perks.length === 1,
    'cannot overspend perk points',
  );
  const targetEnemy = m.enemies.find((e) => e.id === 'drunk');
  const rangeState = () =>
    fresh({
      region: 'forest',
      x: 700,
      y: 817,
      facing: 0,
      weapon: 'bow',
      weapons: ['fists', 'stick', 'bow'],
    });
  s = attack(rangeState());
  check(
    s.arrows === 7 && s.projectiles.length > 0,
    'bow consumes ammunition and spawns projectile',
  );
  s = idle(s, 12);
  check(s.foes[targetEnemy.id].hp < targetEnemy.hp, 'flying arrow hits target');
  s = attack({ ...rangeState(), arrows: 0 });
  check(
    s.projectiles.length === 0 && s.arrows === 0,
    'no arrows means no free shot',
  );
  const blocking = (x, y, r) => world.canWalk(x, y, r) && !(x > 775 && x < 800);
  s = rangeState();
  for (let i = 0; i < 30; i++)
    s = sys.tickWorld(s, 0.05, { dx: 0, dy: 0, attack: i === 0 }, blocking);
  check(
    s.foes[targetEnemy.id].hp === targetEnemy.hp,
    'arrows cannot cross walls',
  );
  s = fresh({
    region: 'forest',
    x: targetEnemy.x - 50,
    y: targetEnemy.y,
    facing: 0,
    throwItem: 'throwing',
  });
  s = sys.tickWorld(s, 0.05, { dx: 0, dy: 0, throw: true }, world.canWalk);
  s = idle(s, 5);
  check(
    s.throwing === 1 &&
      s.foes[targetEnemy.id].statuses.some((x) => x.kind === 'bleed'),
    'throwing knife inflicts bleed',
  );
  s = sys.tickWorld(
    fresh(),
    0.05,
    { dx: 0, dy: 0, throw: true },
    world.canWalk,
  );
  check(
    s.stones === 5 && s.energy < 100,
    'stone throw consumes stock and stamina',
  );
  s = sys.tickWorld(
    fresh({ throwItem: 'smoke' }),
    0.05,
    { dx: 0, dy: 0, throw: true },
    world.canWalk,
  );
  check(s.smoke === 0 && s.smokeTime > 4, 'smoke grants temporary concealment');
  s = fresh({ statuses: [{ kind: 'poison', time: 5, power: 2 }] });
  s = idle(s, 20);
  check(s.hp < 99 && s.statuses[0].time < 5, 'poison deals damage over time');
  s = sys.tickWorld(
    fresh({ hp: 60, statuses: [{ kind: 'bleed', time: 5, power: 2 }] }),
    0.05,
    { dx: 0, dy: 0, heal: true },
    world.canWalk,
  );
  check(
    !s.statuses.some((v) => v.kind === 'bleed') && s.hp > 80,
    'bandage stops bleeding',
  );
  const archer = m.enemies.find((e) => e.style === 'ranged');
  s = fresh({ region: archer.region, x: archer.x, y: archer.y + 210 });
  s = idle(s, 40);
  check(
    s.projectiles.some((p) => p.owner === archer.id) || s.hp < 100,
    'ranged enemy fires at player',
  );
  const shield = m.enemies.find((e) => e.style === 'heavy');
  const shieldState = (facing) =>
    fresh({
      region: shield.region,
      x: shield.x,
      y: shield.y + 55,
      facing,
      weapon: 'spear',
      foes: {
        [shield.id]: {
          id: shield.id,
          x: shield.x,
          y: shield.y,
          hp: shield.hp,
          phase: 'windup',
          timer: 4,
          aim: Math.PI / 2,
          flash: 0,
        },
      },
    });
  const light = attack(shieldState(-Math.PI / 2)),
    heavy = attack(shieldState(-Math.PI / 2), 'heavy');
  check(
    heavy.foes[shield.id].hp < light.foes[shield.id].hp,
    'heavy attack breaks shield defense',
  );
  check(
    !combat.sight(700, 817, 895, 817, 'forest', blocking),
    'AI sight respects walls',
  );
  s = fresh({ region: 'village', x: 792, y: 295, facing: -Math.PI / 2 });
  const clean = attack(s);
  check(
    !clean.citizens.mikhail,
    'normal attack cannot accidentally kill a villager',
  );
  const assault = attack({ ...s, hostileMode: true });
  check(
    assault.citizens.mikhail?.hp < 90,
    'explicit aggression enables NPC melee damage',
  );
  for (const k of ['arrows', 'stones', 'throwing', 'smoke', 'seeds', 'ore']) {
    let n = fresh({ coins: 1000 });
    for (let i = 0; i < 12; i++) n = sys.trade(n, k);
    check(n[k] - m.initialState[k] === 5, 'daily shop stock limited ' + k);
  }
  check(
    m.migrateSave({ ...fresh(), version: 3 }).version === 4,
    'v3 migrates to v4',
  );
  check(
    m.migrateSave({ ...fresh(), arrows: -100, wanted: Infinity }).arrows === 0,
    'corrupt expansion stock clamped',
  );

  const explore = await load('rpg-exploration');
  const trap = fresh({ region: 'crypt', x: 825, y: 710 });
  const injured = explore.triggerHazards(trap);
  check(
    injured.hp === 82 && injured.statuses.some((v) => v.kind === 'bleed'),
    'trap hurts and applies status',
  );
  check(
    explore.triggerHazards(injured).hp === 82,
    'spent trap cannot repeatedly damage',
  );
  const disarmed = choose({ ...trap, x: 850 }, 'snare:crypt', 'disarm');
  check(
    disarmed.ore === 1 &&
      explore.triggerHazards({ ...disarmed, x: 825 }).hp === 100,
    'disarmed trap stays harmless',
  );
  const ore = choose(
    choose(fresh({ region: 'deepmine' }), 'ore-vein', 'ore:brace'),
    'ore-vein',
    'ore:mine',
  );
  check(
    ore.ore === 3 && ore.hp === 100 && ore.wood === 1,
    'bracing prevents mining injury',
  );
  check(
    choose(fresh({ region: 'deepmine' }), 'ore-vein', 'ore:mine').hp === 84,
    'unbraced mining has a cost',
  );
  check(
    story.scene(fresh(), 'tamara').portrait === 6,
    'new NPC uses individual expression atlas',
  );
  let distraction = fresh({
    region: 'forest',
    x: 750,
    y: 817,
    facing: -Math.PI / 2,
    lure: { x: 860, y: 880, time: 4 },
    sneaking: true,
  });
  distraction = sys.tickWorld(
    distraction,
    0.05,
    { dx: 0, dy: 0, sneak: true },
    world.canWalk,
  );
  check(
    distraction.foes.drunk.phase === 'idle' && distraction.foes.drunk.y > 817,
    'idle enemy investigates a stone without spotting hidden player',
  );
  console.log(
    `PASS: ${count} expansion checks. Crime, projectiles, AI, farming, secrets, progression, puzzle persistence.`,
  );
  return count;
}
