// ============================================================
// SerkoGram — Telegram Bot Command Parser
// ============================================================

export interface ParsedCommand {
  isCommand: boolean;
  command: string;           // Normalized lowercase command without slash or @bot
  botUsername?: string;      // Target bot username if present (/cmd@BotUser)
  rawArguments: string;      // Everything after the command, trimmed
  arguments: string[];       // Arguments split by whitespace
  payload?: string;          // For /start <payload>, returns the payload string
}

/**
 * Parses an incoming text message to determine if it is a bot command.
 * Supports:
 * - /start
 * - /start payload_123
 * - /help@SerkoGram_bot
 * - /search text with multiple spaces
 * - Unicode commands like /гс
 */
export function parseBotCommand(text: string, currentBotUsername?: string): ParsedCommand {
  const notACommand: ParsedCommand = {
    isCommand: false,
    command: '',
    rawArguments: '',
    arguments: [],
  };

  if (!text || typeof text !== 'string') {
    return notACommand;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) {
    return notACommand;
  }

  // Extract first word (the command part) and the rest
  const spaceIndex = trimmed.indexOf(' ');
  const commandPart = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex);
  const rawArguments = spaceIndex === -1 ? '' : trimmed.substring(spaceIndex).trim();

  // Parse command part: /command or /command@BotUsername
  const match = commandPart.match(/^\/([^\s@]+)(?:@([^\s@]+))?$/i);
  if (!match) {
    return notACommand;
  }

  const rawCommand = match[1];
  const targetBot = match[2];

  // If a target bot username was specified, verify it matches our bot
  if (targetBot && currentBotUsername) {
    if (targetBot.toLowerCase() !== currentBotUsername.toLowerCase()) {
      // Directed to another bot in the group
      return notACommand;
    }
  }

  const command = rawCommand.toLowerCase();
  const args = rawArguments.length > 0 ? rawArguments.split(/\s+/).filter(Boolean) : [];

  return {
    isCommand: true,
    command,
    botUsername: targetBot,
    rawArguments,
    arguments: args,
    payload: command === 'start' && args.length > 0 ? args[0] : undefined,
  };
}