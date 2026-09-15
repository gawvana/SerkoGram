// ============================================================
// SerkoGram — Interactive Games Engine (Tic-Tac-Toe & RPS)
// ============================================================

import type { InlineKeyboardButton } from 'grammy/types';

// ============================================================
// Tic-Tac-Toe (Крестики-нолики)
// ============================================================

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6],             // Diagonals
];

export function checkTttWinner(board: string[]): 'X' | 'O' | null {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'X' | 'O';
    }
  }
  return null;
}

export function isTttFull(board: string[]): boolean {
  return !board.includes('-');
}

export function getTttBotMove(board: string[]): number {
  const freeIndices = board.map((c, i) => (c === '-' ? i : -1)).filter((i) => i !== -1);
  if (freeIndices.length === 0) return -1;

  // 1. Check if bot can win in 1 move
  for (const idx of freeIndices) {
    const copy = [...board];
    copy[idx] = 'O';
    if (checkTttWinner(copy) === 'O') return idx;
  }

  // 2. Check if bot must block player from winning in 1 move
  for (const idx of freeIndices) {
    const copy = [...board];
    copy[idx] = 'X';
    if (checkTttWinner(copy) === 'X') return idx;
  }

  // 3. Take center if available
  if (board[4] === '-') return 4;

  // 4. Take random available corner (0, 2, 6, 8)
  const corners = [0, 2, 6, 8].filter((i) => board[i] === '-');
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Pick random free
  return freeIndices[Math.floor(Math.random() * freeIndices.length)];
}

export function renderTttKeyboard(boardStr: string, gameOver: boolean): InlineKeyboardButton[][] {
  const board = boardStr.split('');
  const rows: InlineKeyboardButton[][] = [];

  for (let r = 0; r < 3; r++) {
    const row: InlineKeyboardButton[] = [];
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const val = board[idx];
      let text = '⬜';
      let callback_data = 'ttt:noop';

      if (val === 'X') {
        text = '❌';
      } else if (val === 'O') {
        text = '⭕';
      } else if (!gameOver) {
        text = '⬜';
        callback_data = `ttt:play:${boardStr}:${idx}`;
      }

      row.push({ text, callback_data });
    }
    rows.push(row);
  }

  if (gameOver) {
    rows.push([{ text: '🔄 Сыграть снова', callback_data: 'ttt:reset' }]);
  }

  return rows;
}

export function handleTttStep(boardStr: string, moveIndex: number): {
  text: string;
  keyboard: InlineKeyboardButton[][];
  gameOver: boolean;
} {
  const board = boardStr.split('');

  // Invalid move or cell occupied
  if (moveIndex < 0 || moveIndex > 8 || board[moveIndex] !== '-') {
    return {
      text: '❌⭕ <b>Крестики-нолики</b>\n\nКлетка уже занята! Сделайте другой ход:',
      keyboard: renderTttKeyboard(boardStr, false),
      gameOver: false,
    };
  }

  // Player move
  board[moveIndex] = 'X';

  // Check if player won
  if (checkTttWinner(board) === 'X') {
    const finalStr = board.join('');
    return {
      text: '❌⭕ <b>Крестики-нолики</b>\n\n🎉 <b>Поздравляем! Вы победили!</b> 🏆',
      keyboard: renderTttKeyboard(finalStr, true),
      gameOver: true,
    };
  }

  // Check if full
  if (isTttFull(board)) {
    const finalStr = board.join('');
    return {
      text: '❌⭕ <b>Крестики-нолики</b>\n\n🤝 <b>Ничья! Отличная игра.</b>',
      keyboard: renderTttKeyboard(finalStr, true),
      gameOver: true,
    };
  }

  // Bot move
  const botIdx = getTttBotMove(board);
  if (botIdx !== -1) {
    board[botIdx] = 'O';
  }

  // Check if bot won
  if (checkTttWinner(board) === 'O') {
    const finalStr = board.join('');
    return {
      text: '❌⭕ <b>Крестики-нолики</b>\n\n🤖 <b>Победил бот! Попробуйте ещё раз.</b>',
      keyboard: renderTttKeyboard(finalStr, true),
      gameOver: true,
    };
  }

  // Check if full after bot move
  if (isTttFull(board)) {
    const finalStr = board.join('');
    return {
      text: '❌⭕ <b>Крестики-нолики</b>\n\n🤝 <b>Ничья! Никто не уступил.</b>',
      keyboard: renderTttKeyboard(finalStr, true),
      gameOver: true,
    };
  }

  // Game continues
  const nextBoardStr = board.join('');
  return {
    text: '❌⭕ <b>Крестики-нолики</b>\n\nВаш ход: ❌ (Бот сходил: ⭕)',
    keyboard: renderTttKeyboard(nextBoardStr, false),
    gameOver: false,
  };
}

// ============================================================
// Rock-Paper-Scissors (Камень, ножницы, бумага)
// ============================================================

export function handleRpsGame(userChoice: string): {
  text: string;
  keyboard: InlineKeyboardButton[][];
} {
  const choices = ['камень', 'ножницы', 'бумага'];
  const emojis: Record<string, string> = {
    камень: '🪨 Камень',
    ножницы: '✂️ Ножницы',
    бумага: '📄 Бумага',
  };

  const botChoice = choices[Math.floor(Math.random() * choices.length)];
  let outcome = 'Ничья! 🤝';

  if (
    (userChoice === 'камень' && botChoice === 'ножницы') ||
    (userChoice === 'ножницы' && botChoice === 'бумага') ||
    (userChoice === 'бумага' && botChoice === 'камень')
  ) {
    outcome = 'Вы победили! 🎉';
  } else if (userChoice !== botChoice) {
    outcome = 'Бот победил! 🤖';
  }

  const text =
    `🎮 <b>Камень, Ножницы, Бумага</b>\n\n` +
    `Ваш выбор: <b>${emojis[userChoice] || userChoice}</b>\n` +
    `Выбор бота: <b>${emojis[botChoice]}</b>\n\n` +
    `Результат: <b>${outcome}</b>`;

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '🪨 Камень', callback_data: 'rps:камень' },
      { text: '✂️ Ножницы', callback_data: 'rps:ножницы' },
      { text: '📄 Бумага', callback_data: 'rps:бумага' },
    ],
    [{ text: '🔄 Сыграть ещё раз', callback_data: 'rps:reset' }],
  ];

  return { text, keyboard };
}
