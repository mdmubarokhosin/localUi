/**
 * React hook that provides slash command detection and completion for the chat input.
 */

import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Represents a single slash command available in the chat input.
 */
export interface SlashCommand {
  name: string;
  description: string;
  icon?: string;
}

/**
 * Callback invoked when a slash command is executed.
 * Return `true` if the command was handled, `false` otherwise.
 */
type CommandExecutor = (command: string, args: string) => boolean;

/**
 * The full list of built-in slash commands.
 * Descriptions are i18n keys resolved at render time.
 */
const BUILT_IN_COMMANDS: Omit<SlashCommand, 'description'>[] = [
  { name: 'model', icon: 'LuBoxes' },
  { name: 'system', icon: 'LuMessageSquare' },
  { name: 'clear', icon: 'LuTrash2' },
  { name: 'export', icon: 'LuDownload' },
  { name: 'help', icon: 'LuHelpCircle' },
  { name: 'theme', icon: 'LuSun' },
  { name: 'new', icon: 'LuPlus' },
];

/**
 * Hook for slash command detection and filtering in the chat input.
 *
 * @param inputValue - The current text in the chat input field.
 * @returns An object with the command list, filtered results, slash mode flag, and executor.
 */
export function useSlashCommands(inputValue: string): {
  commands: SlashCommand[];
  filteredCommands: SlashCommand[];
  isSlashMode: boolean;
  executeCommand: (command: string, args: string) => boolean;
} {
  const { t } = useTranslation();

  /**
   * All available commands with translated descriptions.
   */
  const commands: SlashCommand[] = useMemo(
    () =>
      BUILT_IN_COMMANDS.map((cmd) => ({
        ...cmd,
        description: t(`slashCommands.${cmd.name}.description`, {
          defaultValue: cmd.name,
        }),
      })),
    [t]
  );

  /**
   * Whether the user is currently typing a slash command.
   */
  const isSlashMode = inputValue.startsWith('/') && !inputValue.includes('\n');

  /**
   * The portion of the input after the leading '/' (lowercased for matching).
   */
  const query = useMemo(() => {
    if (!isSlashMode) return '';
    // Extract text after '/' up to the first space
    const match = inputValue.match(/^\/([^\s]*)/);
    return match ? match[1].toLowerCase() : '';
  }, [inputValue, isSlashMode]);

  /**
   * Commands filtered by the current query.
   */
  const filteredCommands = useMemo(() => {
    if (!isSlashMode) return [];
    if (!query) return commands;
    return commands.filter((cmd) => cmd.name.toLowerCase().includes(query));
  }, [commands, query, isSlashMode]);

  /**
   * Execute a slash command by name.
   *
   * @param command - The slash command name (without the leading '/').
   * @param args - Any arguments provided after the command.
   * @returns `true` if the command was recognized, `false` otherwise.
   */
  const executeCommand = useCallback<CommandExecutor>((command, _args) => {
    const knownNames = BUILT_IN_COMMANDS.map((c) => c.name);
    return knownNames.includes(command);
  }, []);

  return { commands, filteredCommands, isSlashMode, executeCommand };
}
