import type { Activity } from './rpg-model';
const flip = (board: number[], i: number) =>
  board.map((n, j) =>
    j === i ||
    Math.abs(j - i) === 3 ||
    (Math.floor(j / 3) === Math.floor(i / 3) && Math.abs(j - i) === 1)
      ? 1 - n
      : n,
  );
export function preparePuzzle(a: Activity, seed: number): Activity {
  let rng = seed >>> 0;
  const next = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng;
  };
  if (a.kind === 'gather') {
    const board = [1, 1, 1, 2, 2, 2, 3, 3, 3];
    for (let i = 8; i > 0; i--) {
      const j = next() % (i + 1);
      [board[i], board[j]] = [board[j], board[i]];
    }
    return { ...a, board };
  }
  if (a.kind === 'repair') {
    let board = Array(9).fill(1);
    for (const i of [next() % 9, next() % 9, 4]) board = flip(board, i);
    if (board.every((v) => v === 1)) board = flip(board, 4);
    return { ...a, board };
  }
  if (a.kind === 'work')
    return {
      ...a,
      sequence: Array.from({ length: 5 }, () => next() % 3),
      board: [],
    };
  if (a.kind === 'lock')
    return {
      ...a,
      sequence: [next() % 4, next() % 4, next() % 4],
      board: [0, 0, 0],
    };
  return a;
}
export type PuzzleResult = { a: Activity; success?: boolean; text?: string };
export function puzzleInput(a: Activity, action: string): PuzzleResult {
  const b = {
    ...a,
    board: [...(a.board || [])],
    sequence: [...(a.sequence || [])],
  };
  if (action.startsWith('pick:') && a.kind === 'gather') {
    const i = Number(action.slice(5));
    if (!Number.isInteger(i) || i < 0 || i > 8 || b.board[i] === 0)
      return { a };
    const good = b.board[i] === 1;
    b.board[i] = 0;
    b.stage++;
    b.quality += good ? 1 : 0;
    b.misses += good ? 0 : 1;
    if (b.stage === 3)
      return {
        a: b,
        success: b.quality >= 2,
        text:
          b.quality >= 2
            ? 'Собраны зрелые побеги. Припасы в рюкзаке.'
            : 'Слишком много молодых и повреждённых побегов. Заросли восстановятся завтра.',
      };
  } else if (action.startsWith('switch:') && a.kind === 'repair') {
    const i = Number(action.slice(7));
    if (!Number.isInteger(i) || i < 0 || i > 8) return { a };
    b.board = flip(b.board, i);
    b.stage++;
    if (b.board.every((v) => v === 1))
      return {
        a: b,
        success: true,
        text: 'Все узлы соединены. Механизм заработал.',
      };
    if (b.stage >= 24)
      return {
        a: b,
        success: false,
        text: 'Контакты перегрелись. Пересоберите схему с начала.',
      };
  } else if (a.kind === 'work') {
    if (action === 'memorized' && a.stage === 0) {
      b.stage = 1;
      b.elapsed = 0;
    } else if (action.startsWith('sort:') && a.stage === 1) {
      const i = Number(action.slice(5));
      if (![0, 1, 2].includes(i)) return { a };
      const good = i === b.sequence[b.board.length];
      b.board.push(i);
      b.quality += good ? 1 : 0;
      b.misses += good ? 0 : 1;
      if (b.board.length === 5)
        return {
          a: b,
          success: b.quality >= 4,
          text:
            b.quality >= 4
              ? 'Заказы собраны в нужном порядке. Оплата 42 ₽.'
              : 'Заказ перепутан. Оплата за помощь — 12 ₽.',
        };
    }
  } else if (a.kind === 'lock') {
    if (action.startsWith('pin:')) {
      const i = Number(action.slice(4));
      if ([0, 1, 2].includes(i)) b.board[i] = (b.board[i] + 1) % 4;
    }
    if (action === 'test') {
      b.stage++;
      const exact = b.board.filter((v, i) => v === b.sequence[i]).length;
      const total = [0, 1, 2, 3].reduce(
        (n, v) =>
          n +
          Math.min(
            b.board.filter((x) => x === v).length,
            b.sequence.filter((x) => x === v).length,
          ),
        0,
      );
      b.result = `${a.result}${b.board.map((v) => v + 1).join(' · ')} — на месте: ${exact}, не на месте: ${total - exact}\n`;
      if (exact === 3)
        return {
          a: b,
          success: true,
          text: 'Замок открыт. Вернитесь к контейнеру, чтобы забрать содержимое.',
        };
      if (b.stage === 6)
        return {
          a: b,
          success: false,
          text: 'Отмычка сорвалась. Замок заклинил до завтра.',
        };
    }
  }
  return { a: b };
}
