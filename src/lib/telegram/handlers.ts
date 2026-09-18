// ============================================================
// SerkoGram — Bot Command Handlers (Deprecated Compatibility Shim)
// Conforming to §14: Exactly ONE execution pipeline.
// All executions are routed through the canonical executeDotCommand engine.
// ============================================================

import type { ParsedCommand } from './parser';
import type { Message as TgMessage } from 'grammy/types';
import { resolveCommandContext } from '@/lib/commands/context';
import { executeDotCommand } from '@/lib/commands/executor';
import { prisma } from '@/lib/db';

/**
 * @deprecated Legacy runner superseded by unified executeDotCommand (§14).
 */
export async function executeCommand(msg: TgMessage, _parsed: ParsedCommand): Promise<void> {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SerkoGram_bot';
  let ownerUserId = '';

  if (msg.from) {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(msg.from.id) },
      create: {
        telegramId: BigInt(msg.from.id),
        firstName: msg.from.first_name,
        lastName: msg.from.last_name ?? null,
        username: msg.from.username ?? null,
      },
      update: {
        firstName: msg.from.first_name,
        lastName: msg.from.last_name ?? null,
        username: msg.from.username ?? null,
      },
    }).catch(() => null);
    if (user) ownerUserId = user.id;
  }

  const cmdContext = resolveCommandContext({
    msg,
    chatId: `bot_${msg.chat.id}`,
    telegramChatId: BigInt(msg.chat.id),
    ownerTelegramId: msg.from ? BigInt(msg.from.id) : BigInt(0),
    ownerUserId,
    isDirectBotChat: true,
    botUsername,
  });

  if (cmdContext.isCommand) {
    await executeDotCommand(cmdContext);
  }
}