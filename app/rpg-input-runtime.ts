// Состояние ввода в одном месте: физические клавиши, кнопки мыши и экранные
// кнопки сводятся в единый кадр ввода. Игровые системы не слушают клавиатуру
// сами — они читают готовый кадр у этого рантайма.

import {
  defaultBindings,
  readInput,
  type Bindings,
  type GameAction,
  type InputFrame,
} from './rpg-input';

export type InputRuntime = {
  /** Физическая клавиша или кнопка мыши: 'KeyW', 'Space', 'Mouse0'. */
  key: (code: string, down: boolean) => void;
  /** Экранная кнопка с удержанием: направление, удар, блок. */
  hold: (action: GameAction, down: boolean) => void;
  /** Экранная кнопка одного нажатия: бросок, приём, бинт. */
  tap: (action: GameAction) => void;
  /** Кадр ввода для игрового тика. */
  frame: () => InputFrame;
  /** Гасит нажатия текущего кадра; удержания сохраняются. */
  endFrame: () => void;
  /** Полный сброс: пауза, потеря фокуса, смена сцены. */
  clear: () => void;
  down: (code: string) => boolean;
  bindings: () => Bindings;
  setBindings: (next: Bindings) => void;
};

export function createInput(initial: Bindings = defaultBindings): InputRuntime {
  let bindings = initial;
  const held = new Set<string>(),
    pressed = new Set<string>(),
    virtualHeld = new Set<GameAction>(),
    virtualTap = new Set<GameAction>();
  const codeOf = (action: GameAction) => bindings[action]?.[0];
  return {
    key: (code, down) => {
      if (!down) {
        held.delete(code);
        return;
      }
      // Фронт нажатия отмечается один раз, удержание его не повторяет.
      if (!held.has(code)) pressed.add(code);
      held.add(code);
    },
    hold: (action, down) => {
      if (!down) {
        virtualHeld.delete(action);
        return;
      }
      if (!virtualHeld.has(action)) virtualTap.add(action);
      virtualHeld.add(action);
    },
    tap: (action) => {
      virtualTap.add(action);
    },
    frame: () => {
      let source: ReadonlySet<string> = held,
        edges: ReadonlySet<string> = pressed;
      if (virtualHeld.size || virtualTap.size) {
        const mixedHeld = new Set(held),
          mixedEdges = new Set(pressed);
        for (const action of virtualHeld) {
          const code = codeOf(action);
          if (code) mixedHeld.add(code);
        }
        for (const action of virtualTap) {
          const code = codeOf(action);
          if (code) mixedEdges.add(code);
        }
        source = mixedHeld;
        edges = mixedEdges;
      }
      const frame = readInput(source, edges, bindings);
      // Shift остаётся привычным блоком, когда персонаж стоит на месте,
      // и работает как бег, когда игрок задал направление.
      if (frame.run && !frame.dx && !frame.dy) {
        frame.run = false;
        frame.guard = true;
      }
      return frame;
    },
    endFrame: () => {
      pressed.clear();
      virtualTap.clear();
    },
    clear: () => {
      held.clear();
      pressed.clear();
      virtualHeld.clear();
      virtualTap.clear();
    },
    down: (code) => held.has(code),
    bindings: () => bindings,
    setBindings: (next) => {
      bindings = next;
    },
  };
}
