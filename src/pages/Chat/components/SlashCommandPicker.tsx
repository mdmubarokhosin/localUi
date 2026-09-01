import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlashCommand } from '../../../hooks/useSlashCommands';

interface SlashCommandPickerProps {
  commands: SlashCommand[];
  onSelect: (command: string) => void;
}

export default memo(function SlashCommandPicker({
  commands,
  onSelect,
}: SlashCommandPickerProps) {
  const { t } = useTranslation();

  if (commands.length === 0) return null;

  return (
    <div className="border-t border-base-content/10 mt-1 pt-1 max-h-40 overflow-y-auto">
      <div className="text-xs opacity-60 px-2 py-1">
        {t('chatInput.slashCommands.title')}
      </div>
      {commands.map((cmd) => (
        <button
          key={cmd.name}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
          onClick={() => onSelect(cmd.name)}
        >
          <span className="font-mono text-primary font-bold">/{cmd.name}</span>
          <span className="opacity-60 text-xs">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
});
