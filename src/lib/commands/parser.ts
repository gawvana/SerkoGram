// ============================================================
// SerkoGram — Full Command Parser (Dot . & Slash /)
// ============================================================

export interface ParsedCommandResult {
  isCommand: boolean;
  prefix?: '.' | '/';
  command: string;           // Normalized lowercase command without prefix or @bot
  botUsername?: string;      // Target bot username if present (/cmd@BotUser)
  rawArguments: string;      // Everything after the command, trimmed
  arguments: string[];       // Arguments split by whitespace
  payload?: string;          // For /start <payload>, returns the payload string
  chatId?: string | number;
  senderId?: string | number;
  replyToMessageId?: number;
}

export interface ParseOptions {
  currentBotUsername?: string;
  chatId?: string | number;
  senderId?: string | number;
  replyToMessageId?: number;
  allowedPrefixes?: Array<'.' | '/'>;
}

/**
 * Parses an incoming text message to determine if it is a valid dot command or slash command.
 *
 * Supported formats:
 * - .help
 * - .HELP
 * - .gpt  привет  мир
 * - .search test query
 * - .save
 * - /start
 * - /start payload_123
 * - /help@SerkoGram_bot
 * - .перевод en
 *
 * Rejects:
 * - hello.help (not at start of message)
 * - ... (only dots)
 * - . (single dot without command name)
 */
export function parseAnyCommand(
  text: string,
  options?: ParseOptions
): ParsedCommandResult {
  const notACommand: ParsedCommandResult = {
    isCommand: false,
    command: '',
    rawArguments: '',
    arguments: [],
    chatId: options?.chatId,
    senderId: options?.senderId,
    replyToMessageId: options?.replyToMessageId,
  };

  if (!text || typeof text !== 'string') {
    return notACommand;
  }

  const trimmed = text.trim();
  const allowedPrefixes = options?.allowedPrefixes || ['.', '/'];

  const firstChar = trimmed.charAt(0);
  if (!allowedPrefixes.includes(firstChar as '.' | '/')) {
    return notACommand;
  }

  const prefix = firstChar as '.' | '/';

  // Extract first word (the command part) and the rest
  const spaceIndex = trimmed.indexOf(' ');
  const commandPart = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex);
  const rawArguments = spaceIndex === -1 ? '' : trimmed.substring(spaceIndex).trim();

  // Match command name and optional @BotUsername suffix
  // e.g. .help or /help@SerkoGram_bot or .перевод
  const regex = new RegExp(`^\\${prefix}([^\\s@]+)(?:@([^\\s@]+))?$`, 'i');
  const match = commandPart.match(regex);

  if (!match) {
    return notACommand;
  }

  const rawCommandName = match[1];
  const targetBot = match[2];

  // Must not be empty or solely punctuation
  if (!rawCommandName || rawCommandName.replace(/[._-]/g, '').length === 0) {
    return notACommand;
  }

  // If a target bot username was specified, verify it matches our bot
  if (targetBot && options?.currentBotUsername) {
    if (targetBot.toLowerCase() !== options.currentBotUsername.toLowerCase()) {
      return notACommand;
    }
  }

  const command = rawCommandName.toLowerCase();
  const args = rawArguments.length > 0 ? rawArguments.split(/\s+/).filter(Boolean) : [];

  return {
    isCommand: true,
    prefix,
    command,
    botUsername: targetBot,
    rawArguments,
    arguments: args,
    payload: command === 'start' && args.length > 0 ? args[0] : undefined,
    chatId: options?.chatId,
    senderId: options?.senderId,
    replyToMessageId: options?.replyToMessageId,
  };
}