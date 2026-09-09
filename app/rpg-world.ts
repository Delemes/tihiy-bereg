import { drawPassage, passageKind, preparePassageAtlas } from './rpg-passages';
import { drawArmedHero, combatFeedback } from './rpg-combat-view';
import { combatInput } from './rpg-controls';
import { drawWings } from './rpg-wing-view';
import { room, indoors, unitScale, finds } from './rpg-regions';
import {
  prepareEnemyAtlas,
  prepareWeaponAtlas,
  enemyCrops,
} from './rpg-sprites';
import {
  activePlaces,
  activeEnemies,
  nearest,
  people,
  type State,
  type Region,
} from './rpg-model';
import { tickWorld, weapons } from './rpg-systems';
export type WorldAPI = {
  key: (k: string, down: boolean) => void;
  destroy: () => void;
};
export { WORLD_W, WORLD_H, canWalk, findPath, isWater } from './rpg-geography';
import { WORLD_W, WORLD_H, worldBounds, canWalk } from './rpg-geography';
export { walkFrames } from './rpg-hand-pose';
export const mapAsset = (r: Region) =>
  room(r)
    ? {
        src: '/rooms-v4.png',
        cols: 3,
        rows: 3,
        x: room(r)[2] % 3,
        y: Math.floor(room(r)[2] / 3),
      }
    : r === 'village'
      ? { src: '/village-map.png', cols: 1, rows: 1, x: 0, y: 0 }
      : r === 'forest' || r === 'sawmill'
        ? {
            src: '/regions.png',
            cols: 2,
            rows: 1,
            x: r === 'forest' ? 0 : 1,
            y: 0,
          }
        : {
            src: '/places-v3.png',
            cols: 2,
            rows: 2,
            x: r === 'home' || r === 'dacha' || r === 'mine' ? 1 : 0,
            y: r === 'mine' || r === 'shop' || r === 'library' ? 1 : 0,
          };
export function createWorld(
  canvas: HTMLCanvasElement,
  getState: () => State,
  isPaused: () => boolean,
  update: (s: State) => void,
  _act?: () => void,
): WorldAPI {
  const c = canvas.getContext('2d')!;
  let frame = 0,
    last = 0,
    time = 0,
    zoom = 1,
    camX = 0,
    camY = 0,
    walkDistance = 0,
    walking = false,
    lastRegion = getState().region,
    transition = 0,
    hitPause = 0,
    drawDelta = 0;
  const feedback = combatFeedback();
  const keys = new Set<string>(),
    pressed = new Set<string>();
  let cursor: { x: number; y: number } | null = null;
  let mouseActive = false;
  const images: Record<string, HTMLImageElement> = {};
  for (const src of [
    '/village-map.png',
    '/regions.png',
    '/places-v3.png',
    '/characters.png',
    '/hero-walk.png',
    '/enemies.png',
    '/people-v3.png',
    '/rooms-v4.png',
    '/enemies-v4.png',
    '/passages-v5.png',
    '/weapons-v5.png',
  ]) {
    const im = new Image();
    im.src = src;
    images[src] = im;
  }
  // Runtime sprite color key for the supplied light matte; original source remains intact.
  let passageSprite: HTMLCanvasElement | null = null,
    weaponSprite: HTMLCanvasElement | null = null;
  images['/passages-v5.png'].onload = () => {
    passageSprite = preparePassageAtlas(images['/passages-v5.png']);
  };
  images['/weapons-v5.png'].onload = () => {
    weaponSprite = prepareWeaponAtlas(images['/weapons-v5.png']);
  };
  let enemySprite: HTMLCanvasElement | null = null;
  images['/enemies-v4.png'].onload = () => {
    enemySprite = prepareEnemyAtlas(images['/enemies-v4.png']);
  };
  let peopleSprite: HTMLCanvasElement | null = null;
  images['/people-v3.png'].onload = () => {
    const im = images['/people-v3.png'],
      off = document.createElement('canvas');
    off.width = im.naturalWidth;
    off.height = im.naturalHeight;
    const ctx = off.getContext('2d')!;
    ctx.drawImage(im, 0, 0);
    const data = ctx.getImageData(0, 0, off.width, off.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i],
        g = data.data[i + 1],
        b = data.data[i + 2];
      if (Math.min(r, g, b) > 228 && Math.max(r, g, b) - Math.min(r, g, b) < 12)
        data.data[i + 3] = 0;
    }
    ctx.putImageData(data, 0, 0);
    peopleSprite = off;
  };
  const resize = () => {
    canvas.width = Math.round(canvas.clientWidth);
    canvas.height = Math.round(canvas.clientHeight);
    zoom = Math.max(
      0.9,
      Math.min(1.22, canvas.clientWidth / 1280),
      canvas.clientWidth / 1536,
      canvas.clientHeight / 1024,
    );
  };
  const obs = new ResizeObserver(resize);
  obs.observe(canvas);
  resize();
  function label(x: number, y: number, t: string, active = false) {
    const font = indoors(getState().region) ? 20 : 14;
    c.font = font + 'px Georgia';
    c.textAlign = 'center';
    const w = c.measureText(t).width + 20;
    c.fillStyle = active ? '#362a20ef' : '#161d22dd';
    c.fillRect(x - w / 2, y - font, w, font + 10);
    c.strokeStyle = active ? '#d3b77d' : '#686259';
    c.strokeRect(x - w / 2, y - font, w, font + 10);
    c.fillStyle = '#f1e6ce';
    c.fillText(t, x, y + 2);
  }
  function hero(s: State) {
    c.save();
    c.translate(s.x, s.y);
    c.scale(unitScale(s.region), unitScale(s.region));
    if (s.attackDelay > 0 || s.swing > 0) {
      const lean = s.attackDelay > 0 ? -3 : 5;
      c.translate(
        Math.cos(s.attackFacing) * lean,
        Math.sin(s.attackFacing) * lean,
      );
    }
    if (s.invulnerable > 0 && s.dash <= 0)
      c.globalAlpha = Math.sin(time * 40) > 0 ? 0.45 : 1;
    const im = images['/hero-walk.png'];
    const pose = s.attackDelay > 0 ? 0 : s.swing > 0 ? 2 : null;
    const col =
      pose ?? (walking ? [0, 1, 2, 1][Math.floor(walkDistance / 12) % 4] : 1);
    c.fillStyle = '#111b2366';
    c.beginPath();
    c.ellipse(0, 2, 16, 6, 0, 0, 7);
    c.fill();
    if (im.complete && im.naturalWidth)
      drawArmedHero(c, im, weaponSprite, s, col);
    c.restore();
  }
  function npc(x: number, y: number, id: string) {
    c.save();
    c.translate(x, y);
    c.scale(unitScale(getState().region), unitScale(getState().region));
    x = 0;
    y = 0;
    const sprite = ({ stepan: 0, constable: 7 } as Record<string, number>)[id];
    if (sprite !== undefined && enemySprite) {
      const [sx, sy, w, h] = enemyCrops[sprite];
      c.drawImage(
        enemySprite,
        sx,
        sy,
        w,
        h,
        (-w / h) * 35,
        -70,
        (w / h) * 70,
        70,
      );
      c.restore();
      return;
    }
    if (id === 'boris') id = 'mikhail';
    const row = { anna: 0, katya: 1, nina: 2, mikhail: 3 }[id as 'anna'];
    const bounds = [
      [233, 87, 250, 550],
      [726, 93, 241, 544],
      [1214, 87, 234, 550],
      [1684, 64, 268, 573],
    ];
    if (row !== undefined && peopleSprite) {
      const [sx, sy, w, h] = bounds[row],
        scale = 70 / h;
      c.drawImage(
        peopleSprite,
        sx,
        sy,
        w,
        h,
        x - (w * scale) / 2,
        y - 70,
        w * scale,
        70,
      );
    } else {
      const im = images['/characters.png'];
      if (im.complete && im.naturalWidth)
        c.drawImage(im, 3 * 418, 0, 418, 930, x - 17, y - 68, 34, 68);
    }
    c.restore();
  }
  function enemy(s: State, id: string) {
    const e = activeEnemies(s).find((e) => e.id === id);
    if (!e) return;
    const f = s.foes[id] || {
      x: e.x,
      y: e.y,
      hp: e.hp,
      phase: 'idle',
      timer: 0,
      aim: 0,
      flash: 0,
    };
    if (e.citizen) {
      npc(f.x, f.y, e.citizen);
      label(f.x, f.y - 90 * unitScale(s.region), e.name);
      c.fillStyle = '#b65747';
      c.fillRect(
        f.x - 35,
        f.y - 78 * unitScale(s.region),
        (70 * f.hp) / e.hp,
        5,
      );
      return;
    }
    const [sx, sy, w, h] =
      e.sprite !== undefined
        ? enemyCrops[e.sprite]
        : e.kind === 'drunk'
          ? [24, 213, 400, 625]
          : e.kind === 'bandit'
            ? [533, 177, 390, 667]
            : [1009, 372, 502, 477];
    const scale =
      ((e.kind === 'boar' ? 55 : 77) / h) *
      unitScale(s.region) *
      (e.style === 'boss' ? 1.18 : 1);
    const winding = f.phase === 'windup';
    if (winding)
      label(
        f.x,
        f.y - h * scale - 35,
        e.style === 'ranged'
          ? 'Готовит выстрел'
          : e.style === 'fast' || e.style === 'miniboss'
            ? 'Готовит рывок'
            : 'Замах',
        true,
      );
    const im = e.sprite !== undefined ? enemySprite : images['/enemies.png'];
    if (
      im &&
      (im instanceof HTMLCanvasElement || (im.complete && im.naturalWidth))
    ) {
      c.save();
      c.translate(f.x, f.y);
      c.rotate(winding ? -Math.cos(f.aim) * 0.12 : f.flash > 0 ? 0.12 : 0);
      c.scale(Math.cos(f.aim) < 0 ? -1 : 1, 1);
      if (f.flash > 0) c.globalAlpha = 0.65;
      c.drawImage(
        im,
        sx,
        sy,
        w,
        h,
        -(w * scale) / 2,
        -h * scale,
        w * scale,
        h * scale,
      );
      c.restore();
    }
    // Enemy artwork already includes its held weapon. Do not overlay a second one.
    if (
      (!winding && f.phase !== 'idle') ||
      Math.hypot(f.x - s.x, f.y - s.y) < 160
    ) {
      label(f.x, f.y - h * scale - 24, e.name);
      c.fillStyle = '#191614';
      c.fillRect(f.x - 27, f.y - h * scale - 13, 54, 5);
      c.fillStyle = '#c66246';
      c.fillRect(f.x - 27, f.y - h * scale - 13, (54 * f.hp) / e.hp, 5);
    }
  }
  function draw() {
    const s = getState();
    if (room(s.region))
      zoom = Math.max(0.8, Math.min(1.2, canvas.width / 1280));
    else if (indoors(s.region))
      zoom = Math.min(
        canvas.width / (room(s.region) ? 1120 : 1600),
        canvas.height / 1130,
      );
    else
      zoom = Math.max(
        0.9,
        Math.min(1.22, canvas.width / 1280),
        canvas.width / 1536,
        canvas.height / 1024,
      );
    const w = canvas.width,
      h = canvas.height,
      vw = w / zoom,
      vh = h / zoom;
    const bounds = worldBounds(s.region);
    camX =
      indoors(s.region) && !room(s.region)
        ? (WORLD_W - vw) / 2
        : Math.max(0, Math.min(bounds.width - vw, s.x - vw / 2));
    camY =
      indoors(s.region) && !room(s.region)
        ? (WORLD_H - vh) / 2
        : Math.max(0, Math.min(bounds.height - vh, s.y - vh * 0.56));
    c.fillStyle = '#15201c';
    c.fillRect(0, 0, w, h);
    c.save();
    c.scale(zoom, zoom);
    c.translate(-camX, -camY);
    c.imageSmoothingEnabled = false;
    const a = mapAsset(s.region),
      im = images[a.src];
    if (im.complete && im.naturalWidth) {
      const sw = im.naturalWidth / a.cols,
        sh = im.naturalHeight / a.rows;
      c.drawImage(
        im,
        a.x * sw,
        a.y * sh,
        sw,
        sh,
        room(s.region) ? 256 : 0,
        0,
        room(s.region) ? 1024 : WORLD_W,
        WORLD_H,
      );
    }
    drawWings(c, images['/rooms-v4.png'], s.region);
    const near = nearest(s);
    for (const p of activePlaces(s)) {
      if (p.kind === 'npc') continue;
      if (finds[p.id] && !s.flags.includes('taken:' + p.id)) {
        c.fillStyle = '#201915';
        c.fillRect(p.x - 24, p.y - 30, 48, 33);
        c.fillStyle = finds[p.id].owner ? '#786a48' : '#93623e';
        c.fillRect(p.x - 22, p.y - 28, 44, 24);
        c.fillStyle = '#d8b477';
        c.fillRect(p.x - 25, p.y - 20, 50, 4);
        c.fillRect(p.x - 3, p.y - 23, 6, 12);
      }
      if (p.id.startsWith('plot:')) {
        c.fillStyle = '#513323';
        c.fillRect(p.x - 48, p.y - 17, 96, 40);
        c.strokeStyle = '#9b734b';
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(p.x - 40 + i * 22, p.y - 10);
          c.lineTo(p.x - 40 + i * 22, p.y + 18);
          c.stroke();
        }
        if (s.garden[p.id]) {
          c.fillStyle = s.garden[p.id].watered.includes(s.day)
            ? '#95b668'
            : '#698745';
          c.font = '32px Georgia';
          c.fillText('♧ ♧', p.x - 30, p.y + 10);
        }
      }
      const nearBy =
        Math.hypot(p.x - s.x, p.y - s.y) < 230 * unitScale(s.region);
      if (
        p.id.startsWith('snare:') &&
        !s.flags.includes('spent:' + p.id) &&
        nearBy
      ) {
        c.strokeStyle = '#dcb57b';
        c.lineWidth = 2;
        c.strokeRect(p.x - 19, p.y - 8, 38, 18);
      }
      if (['exit', 'door', 'board'].includes(p.kind)) {
        drawPassage(c, passageSprite, p, s, near?.id === p.id);
        if (nearBy)
          label(
            p.x,
            p.y -
              (passageKind(p, s) === 'threshold'
                ? 45
                : indoors(s.region)
                  ? 225
                  : 150),
            p.name,
            near?.id === p.id,
          );
      } else if (nearBy) {
        c.fillStyle = p.kind === 'encounter' ? '#efba5a' : '#e6d4a9';
        c.font = 'bold 22px Georgia';
        c.textAlign = 'center';
        c.fillText(
          p.kind === 'encounter'
            ? '!'
            : ['herb', 'wood', 'flower'].includes(p.kind)
              ? '✦'
              : '◇',
          p.x,
          p.y - 9 - Math.sin(time * 2) * 2,
        );
        if (near?.id === p.id) label(p.x, p.y - 40, p.name, true);
      }
    }
    const actors = [
      ...activePlaces(s)
        .filter((p) => p.kind === 'npc')
        .map((p) => ({ x: p.x, y: p.y, id: p.id, kind: 'npc' })),
      ...activeEnemies(s).map((e) => ({
        x: s.foes[e.id]?.x || e.x,
        y: s.foes[e.id]?.y || e.y,
        id: e.id,
        kind: 'enemy',
      })),
      { x: s.x, y: s.y, id: 'hero', kind: 'hero' },
    ];
    for (const a of actors.sort((a, b) => a.y - b.y)) {
      if (a.kind === 'hero') hero(s);
      else if (a.kind === 'enemy') enemy(s, a.id);
      else {
        npc(a.x, a.y, a.id);
        label(
          a.x,
          a.y - 85 * unitScale(s.region),
          people[a.id as keyof typeof people]?.name || a.id,
          near?.id === a.id,
        );
      }
    }
    if (s.region === 'mine' && !s.flags.includes('valveOpen')) {
      c.fillStyle = '#488eaa54';
      c.fillRect(92, 280, 1354, 250);
      label(770, 520, 'Сначала откройте заслонку');
    }
    if (s.region === 'village' && s.flags.includes('dock')) {
      c.fillStyle = '#d8b780';
      for (let i = 0; i < 3; i++) c.fillRect(1180 + i * 15, 562, 12, 42);
    }
    if ((s.minutes >= 1140 || s.minutes < 360) && !indoors(s.region)) {
      c.fillStyle = '#14234155';
      c.fillRect(camX, camY, vw, vh);
    }
    if (s.region === 'mine' || room(s.region)?.[2] === 5) {
      const light = c.createRadialGradient(s.x, s.y - 20, 100, s.x, s.y, 610);
      light.addColorStop(0, '#070c1400');
      light.addColorStop(1, '#03060cbf');
      c.fillStyle = light;
      c.fillRect(camX, camY, vw, vh);
    }
    for (const p of s.projectiles) {
      c.save();
      const projectileScale = unitScale(s.region);
      c.translate(p.x, p.y - 26 * projectileScale);
      c.scale(projectileScale, projectileScale);
      c.rotate(Math.atan2(p.vy, p.vx));
      c.strokeStyle = p.owner === 'hero' ? '#f4daa0' : '#ed8065';
      c.lineWidth = p.kind === 'stone' ? 6 : 3;
      c.beginPath();
      c.moveTo(-14, 0);
      c.lineTo(12, 0);
      c.stroke();
      c.restore();
    }
    if (s.smokeTime > 0) {
      c.fillStyle = '#c0c7c266';
      c.beginPath();
      c.ellipse(s.x, s.y - 30, 110, 80, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (s.hostileMode) label(s.x, s.y + 32, 'АГРЕССИЯ · V выключить', true);
    if (s.statuses.length)
      label(
        s.x,
        s.y - 105 * unitScale(s.region),
        s.statuses
          .map(
            (v) =>
              ({
                bleed: 'Кровотечение',
                poison: 'Яд',
                slow: 'Замедление',
                stun: 'Оглушение',
              })[v.kind],
          )
          .join(' · '),
      );
    feedback.draw(c, drawDelta);
    c.restore();
    if (transition > 0) {
      c.fillStyle = 'rgba(8,13,10,' + Math.min(1, transition / 0.28) + ')';
      c.fillRect(0, 0, w, h);
    }
  }
  function tick(t: number) {
    const dt = Math.max(0, Math.min((t - last) / 1000, 0.05)) || 0;
    last = t;
    drawDelta = dt;
    transition = Math.max(0, transition - dt);
    hitPause = Math.max(0, hitPause - dt);
    time = t / 1000;
    walking = false;
    if (lastRegion !== getState().region) {
      lastRegion = getState().region;
      transition = 0.35;
      feedback.clear();
      clear();
    }
    let simulated = false;
    if (!isPaused() && transition < 0.2 && hitPause <= 0) {
      simulated = true;
      const s = getState();
      const input = combatInput(keys, pressed);
      if (cursor) {
        const x = cursor.x / zoom + camX,
          y = cursor.y / zoom + camY;
        const u = unitScale(s.region);
        // Aim at an actor's logical position when the pointer is on its visible body.
        const target = [
          ...activeEnemies(s).map((e) => s.foes[e.id] || e),
          ...(s.hostileMode
            ? activePlaces(s).filter((p) => p.kind === 'npc')
            : []),
        ]
          .filter(
            (f) =>
              Math.abs(x - f.x) < 24 * u && y > f.y - 78 * u && y < f.y + 8 * u,
          )
          .sort(
            (a, b) =>
              Math.hypot(x - a.x, y - a.y + 35 * u) -
              Math.hypot(x - b.x, y - b.y + 35 * u),
          )[0];
        input.aim = Math.atan2(
          (target?.y ?? y + 26 * u) - s.y,
          (target?.x ?? x) - s.x,
        );
      }
      const n = tickWorld(
        s,
        dt,
        input,
        (x, y, r) =>
          canWalk(x, y, r) &&
          !(r === 'mine' && !s.flags.includes('valveOpen') && y < 545),
      );
      walking = Math.hypot(n.x - s.x, n.y - s.y) > 0.05;

      walkDistance += Math.hypot(n.x - s.x, n.y - s.y) / unitScale(s.region);
      if (feedback.observe(s, n)) hitPause = 0.035;
      update(n);
    } else if (isPaused()) {
      clear();
    }
    if (simulated || isPaused()) pressed.clear();
    draw();
    frame = requestAnimationFrame(tick);
  }
  const aim = (e: PointerEvent) => {
    if (isPaused() || e.pointerType === 'touch') return;
    const b = canvas.getBoundingClientRect();
    cursor = { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const syncButtons = (e: PointerEvent) => {
    for (const [button, mask] of [
      [0, 1],
      [2, 2],
    ]) {
      const key = 'Mouse' + button;
      if (mouseActive && e.buttons & mask) {
        if (!keys.has(key)) pressed.add(key);
        keys.add(key);
      } else keys.delete(key);
    }
    if (!(e.buttons & 3)) mouseActive = false;
  };
  const pointerMove = (e: PointerEvent) => {
    aim(e);
    // Pointer Events report a second mouse button through pointermove, not pointerdown.
    syncButtons(e);
  };
  const pointer = (e: PointerEvent) => {
    if (isPaused() || transition > 0.1 || ![0, 2].includes(e.button)) return;
    e.preventDefault();
    aim(e);
    mouseActive = true;
    syncButtons(e);
  };
  const release = (e: PointerEvent) => {
    syncButtons(e);
  };
  const leave = () => {
    cursor = null;
    mouseActive = false;
    keys.delete('Mouse0');
    keys.delete('Mouse2');
  };
  const clear = () => {
    keys.clear();
    pressed.clear();
    cursor = null;
    mouseActive = false;
  };
  const context = (e: Event) => e.preventDefault();
  canvas.addEventListener('contextmenu', context);
  canvas.addEventListener('pointerdown', pointer);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerleave', leave);
  // Window release prevents a held attack from sticking after the pointer leaves the canvas.
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', clear);
  window.addEventListener('blur', clear);
  frame = requestAnimationFrame(tick);
  return {
    key: (k, down) => {
      if (down) {
        if (!keys.has(k)) pressed.add(k);
        keys.add(k);
      } else keys.delete(k);
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
      canvas.removeEventListener('contextmenu', context);
      canvas.removeEventListener('pointerdown', pointer);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', clear);
      window.removeEventListener('blur', clear);
    },
  };
}
