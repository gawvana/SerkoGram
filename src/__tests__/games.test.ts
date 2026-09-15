import { describe, it, expect } from 'vitest';
import {
  checkTttWinner,
  isTttFull,
  getTttBotMove,
  handleTttStep,
  handleRpsGame,
  renderTttKeyboard,
} from '@/lib/telegram/games';

describe('Tic-Tac-Toe Engine', () => {
  it('should detect horizontal win for X', () => {
    const board = ['X', 'X', 'X', '-', 'O', '-', 'O', '-', '-'];
    expect(checkTttWinner(board)).toBe('X');
  });

  it('should detect vertical win for O', () => {
    const board = ['O', 'X', '-', 'O', 'X', '-', 'O', '-', '-'];
    expect(checkTttWinner(board)).toBe('O');
  });

  it('should detect diagonal win', () => {
    const board = ['X', 'O', '-', 'O', 'X', '-', '-', '-', 'X'];
    expect(checkTttWinner(board)).toBe('X');
  });

  it('should return null when no winner', () => {
    const board = ['X', 'O', 'X', 'X', 'O', '-', 'O', 'X', '-'];
    expect(checkTttWinner(board)).toBeNull();
  });

  it('should detect when board is full', () => {
    const full = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    expect(isTttFull(full)).toBe(true);
    const notFull = ['X', 'O', 'X', 'X', 'O', '-', 'O', 'X', 'X'];
    expect(isTttFull(notFull)).toBe(false);
  });

  it('bot should block winning move from player', () => {
    // Player has 0, 1 -> Bot must block 2
    const board = ['X', 'X', '-', '-', 'O', '-', '-', '-', '-'];
    const botMove = getTttBotMove(board);
    expect(botMove).toBe(2);
  });

  it('should progress game step correctly', () => {
    const initialBoard = '---------';
    const step = handleTttStep(initialBoard, 0);

    expect(step.text).toContain('Крестики-нолики');
    expect(step.keyboard.length).toBe(3);
    expect(step.gameOver).toBe(false);
  });

  it('should render game over restart button when someone wins', () => {
    const winningBoard = 'XXXOO----';
    const keyboard = renderTttKeyboard(winningBoard, true);
    // 3 rows of cells + 1 restart button row
    expect(keyboard.length).toBe(4);
    expect((keyboard[3][0] as any).callback_data).toBe('ttt:reset');
  });
});

describe('Rock-Paper-Scissors Engine', () => {
  it('should produce a valid game outcome and keyboard', () => {
    const res = handleRpsGame('камень');
    expect(res.text).toContain('Камень, Ножницы, Бумага');
    expect(res.text).toContain('Ваш выбор: <b>🪨 Камень</b>');
    expect(res.keyboard.length).toBe(2);
    expect((res.keyboard[1][0] as any).callback_data).toBe('rps:reset');
  });
});
