// ============================================================
// SerkoGram — Telegram Bot Commands Bridge
// Re-exports from single source of truth: @/lib/commands/registry
// ============================================================

import {
  UNIFIED_COMMANDS,
  UnifiedCommandDefinition,
  CommandCategory,
  COMMAND_CATEGORIES,
} from '@/lib/commands/registry';

export * from '@/lib/commands/registry';

export interface CommandDefinition extends UnifiedCommandDefinition {
  command: string; // Alias for .name
}

export const COMMANDS_REGISTRY: CommandDefinition[] = UNIFIED_COMMANDS.map((c) => ({
  ...c,
  command: c.name,
}));

export function getAllCommands(): CommandDefinition[] {
  return COMMANDS_REGISTRY;
}

export function getEnabledCommands(): CommandDefinition[] {
  return COMMANDS_REGISTRY.filter((c) => c.enabled);
}

export function getTelegramMenuCommands(): { command: string; description: string }[] {
  return COMMANDS_REGISTRY.filter((c) => c.telegramMenu && c.enabled).map((c) => ({
    command: c.command,
    description: c.description,
  }));
}

export function getCommand(name: string): CommandDefinition | undefined {
  const normalized = name.trim().toLowerCase().replace(/^[./]/, '');
  return COMMANDS_REGISTRY.find((c) => c.command.toLowerCase() === normalized);
}

export function getCommandsByCategory(category: CommandCategory): CommandDefinition[] {
  return COMMANDS_REGISTRY.filter((c) => c.category === category);
}