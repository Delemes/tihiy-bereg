import assert from 'node:assert/strict';
export async function checkJourney({ m, sys, story, world, load }) {
  let count = 0;
  const check = (v, label) => {
    assert.ok(v, label);
    count++;
  };
  const fresh = (x = {}) => ({ ...structuredClone(m.initialState), ...x });
  const guide = await load('rpg-quest-guide'),
    geography = await load('rpg-geography'),
    regions = await load('rpg-regions'),
    social = await load('rpg-social'),
    crime = await load('rpg-crime');
  const choose = (s, id, a, node = 'root') =>
    story.choose(s, id, a, node).state;
  let s = fresh({ trackedQuest: 'Вода для всех' });
  check(
    guide.trackedObjective(s).title === 'Вода для всех',
    'selected journal objective',
  );
  check(
    m.migrateSave(s).trackedQuest === s.trackedQuest,
    'tracked objective survives save',
  );
  check(
    m.migrateSave({ ...s, trackedQuest: 'not-a-quest' }).trackedQuest === null,
    'unknown objective rejected',
  );
  s = fresh({
    citizens: {
      anna: { hp: 0, dead: true, hostile: false, robbed: false, fear: 0 },
    },
  });
  check(
    guide.journalEntries(s).find((q) => q.title === 'Между строк').status ===
      'failed',
    'dead owner is a failed quest, not green completion',
  );
  s = fresh({
    flags: ['medicineReturned'],
    citizens: {
      tamara: { hp: 0, dead: true, hostile: false, robbed: false, fear: 0 },
    },
  });
  check(
    guide.journalEntries(s).find((q) => q.title === 'Лекарства на зиму')
      .status === 'complete',
    'completed quest stays complete after later death',
  );
  for (const region of Object.keys(regions.rooms)) {
    check(
      geography.worldBounds(region).height === 2048,
      'four-chamber bounds ' + region,
    );
    for (const [x, y] of [
      [1760, 500],
      [760, 1620],
      [1740, 1640],
    ])
      check(
        world.findPath(768, 825, x, y, region).length > 0,
        'continuous corridor ' + region + ' ' + x + ',' + y,
      );
  }
  s = fresh({ region: 'pantry', x: 1740, y: 1640 });
  const question = story.scene(s, 'wing-puzzle:pantry');
  for (const c of question.choices.filter((c) =>
    c.id.startsWith('wing:answer:'),
  )) {
    const tried = choose(s, 'wing-puzzle:pantry', c.id);
    if (tried.flags.includes('wing-solved:pantry')) {
      check(tried.coins === s.coins + 12, 'riddle reward');
      check(
        choose(tried, 'wing-puzzle:pantry', c.id).coins === tried.coins,
        'riddle reward cannot be farmed',
      );
    } else check(tried.energy < s.energy, 'wrong riddle costs stamina');
  }
  check(
    m.migrateSave(s).x === 1740 && m.migrateSave(s).y === 1640,
    'save in remote chamber retains position',
  );
  const pantry = m.regionPlaces.shop.find((p) => p.id === 'enter:pantry');
  check(
    pantry.y < 350 && world.canWalk(pantry.x, pantry.y, 'shop'),
    'pantry threshold relocated against back wall',
  );
  s = fresh({ flags: ['key'], minutes: 1000, meals: 2, coins: 100 });
  s = choose(s, 'anna', 'social:invite', 'social');
  s = choose(s, 'katya', 'social:invite', 'social');
  check(social.partyGuests(s).length === 0, 'guests wait for evening');
  s = { ...s, region: 'dacha', minutes: 1090, x: 1100, y: 650 };
  check(social.partyGuests(s).length === 2, 'invited guests arrive');
  check(
    m.activePlaces(s).some((p) => p.id === 'anna'),
    'Anna appears on dacha',
  );
  check(
    !m.activePlaces({ ...s, region: 'library' }).some((p) => p.id === 'anna'),
    'Anna not duplicated in library',
  );
  const dinner = choose(s, 'gather:table', 'social:meal');
  check(
    dinner.meals === s.meals - 1 &&
      dinner.affection.anna === s.affection.anna + 1,
    'meal consumes stock and bonds with attendees',
  );
  check(
    choose(dinner, 'gather:table', 'social:meal').meals === dinner.meals,
    'one dinner reward per day',
  );
  const beer = choose(s, 'gather:table', 'social:beer');
  check(
    beer.coins === s.coins - 18 && beer.statuses.some((v) => v.kind === 'slow'),
    'voluntary drinks have cost and drawback',
  );
  const attacked = crime.provoke(s, 'anna');
  check(
    attacked.witnesses.includes('katya') && attacked.wanted > 0,
    'party witnesses report assault',
  );
  check(
    m.activeEnemies(attacked).some((e) => e.citizen === 'anna'),
    'attacked guest remains for combat',
  );
  check(
    social.partyGuests({ ...s, minutes: 1320 }).length === 0,
    'party ends at ten',
  );
  check(m.migrateSave(s).daily['invite:anna'] === s.day, 'invitations persist');
  const idle = (state, frames) => {
    for (let i = 0; i < frames; i++)
      state = sys.tickWorld(state, 0.05, { dx: 0, dy: 0 }, world.canWalk);
    return state;
  };
  s = fresh({ weapon: 'knife', weapons: ['fists', 'knife'], energy: 100 });
  for (let i = 1; i <= 3; i++) {
    s = sys.tickWorld(s, 0.05, { dx: 0, dy: 0, attack: true }, world.canWalk);
    check(s.combo === i, 'three-hit sequence ' + i);
    s = idle(s, 7);
  }
  s = sys.tickWorld(
    fresh(),
    0.05,
    { dx: 0, dy: 0, heavy: true },
    world.canWalk,
  );
  check(s.attackDelay > 0, 'heavy attack has readable preparation');
  s = sys.tickWorld(s, 0.05, { dx: 1, dy: 0, dodge: true }, world.canWalk);
  check(s.dash > 0 && s.attackDelay === 0, 'dodge cancels windup');
  s = fresh({ cooldown: 0.1 });
  s = sys.tickWorld(s, 0.05, { dx: 0, dy: 0, attack: true }, world.canWalk);
  s = idle(s, 2);
  check(
    s.cooldown > 0 && s.energy < 100,
    'late press is buffered into next attack',
  );
  console.log(
    'PASS: ' +
      count +
      ' journey checks. Journal, physical rooms, riddles, gatherings, combat input.',
  );
  return count;
}
