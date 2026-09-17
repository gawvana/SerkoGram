import { describe, it, expect } from 'vitest';
import {
  COMMANDS_REGISTRY,
  COMMAND_CATEGORIES,
  getAllCommands,
  getEnabledCommands,
  getTelegramMenuCommands,
  getCommand,
  getCommandsByCategory,
} from '@/lib/telegram/commands';
import { parseBotCommand } from '@/lib/telegram/parser';

describe('Command Registry (Single Source of Truth)', () => {
  it('should have all required commands registered', () => {
    const requiredCommands = [
      'start',
      'help',
      'commands',
      'settings',
      'info',
      'archive',
      'deleted',
      'media',
      'search',
      'coin',
      'ttt',
      'rps',
      'save',
      'гс',
      'fco',
      'spam',
      'troll',
      'a_troll',
    ];

    for (const cmd of requiredCommands) {
      const found = getCommand(cmd);
      expect(found, `Expected command /${cmd} to exist in registry`).toBeDefined();
    }
  });

  it('must NEVER include banned streak or dox commands', () => {
    const bannedPrefixes = ['streak', 'dox', 'deanon', 'osint'];
    const all = getAllCommands();

    for (const cmd of all) {
      for (const prefix of bannedPrefixes) {
        expect(cmd.command.toLowerCase().startsWith(prefix)).toBe(false);
      }
    }
  });

  it('must NEVER include AI or animation commands or categories', () => {
    const bannedCategories = ['ai', 'animations'];
    for (const cat of COMMAND_CATEGORIES) {
      expect(bannedCategories.includes(cat.id)).toBe(false);
    }

    const bannedCommands = ['gpt', 'a_gpt', 'a_gpt_off', 'image', 'love', 'love2', '-7', 'heart', 'plove'];
    for (const cmd of bannedCommands) {
      expect(getCommand(cmd), `Expected ${cmd} to not exist`).toBeUndefined();
    }
  });

  it('should retrieve commands for Telegram setMyCommands properly', () => {
    const menuCommands = getTelegramMenuCommands();
    expect(menuCommands.length).toBeGreaterThanOrEqual(8);
    for (const item of menuCommands) {
      expect(item.command).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.command).not.toContain('/');
    }
  });

  it('should verify all categories are populated', () => {
    for (const cat of COMMAND_CATEGORIES) {
      const items = getCommandsByCategory(cat.id);
      expect(items.length, `Expected category ${cat.id} to have commands`).toBeGreaterThan(0);
    }
  });
});

describe('Bot Command Parser', () => {
  const botUser = 'SerkoGram_bot';

  it('should parse simple command', () => {
    const res = parseBotCommand('/start');
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('start');
    expect(res.arguments).toEqual([]);
    expect(res.rawArguments).toBe('');
  });

  it('should parse command with payload / arguments', () => {
    const res = parseBotCommand('/start ref_123');
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('start');
    expect(res.payload).toBe('ref_123');
    expect(res.arguments).toEqual(['ref_123']);
  });

  it('should parse command with bot username mention for our bot', () => {
    const res = parseBotCommand('/help@SerkoGram_bot', botUser);
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('help');
    expect(res.botUsername).toBe('SerkoGram_bot');
  });

  it('should ignore command addressed to a different bot in a group', () => {
    const res = parseBotCommand('/help@Other_bot', botUser);
    expect(res.isCommand).toBe(false);
  });

  it('should parse search command with unicode and multiple arguments', () => {
    const res = parseBotCommand('/search   важный   договор   2026  ');
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('search');
    expect(res.arguments).toEqual(['важный', 'договор', '2026']);
    expect(res.rawArguments).toBe('важный   договор   2026');
  });

  it('should parse Cyrillic command /гс', () => {
    const res = parseBotCommand('/гс');
    expect(res.isCommand).toBe(true);
    expect(res.command).toBe('гс');
  });

  it('should reject non-command text', () => {
    expect(parseBotCommand('Привет, как дела?').isCommand).toBe(false);
    expect(parseBotCommand('https://t.me/example').isCommand).toBe(false);
    expect(parseBotCommand('').isCommand).toBe(false);
  });
});