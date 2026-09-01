import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPlus, LuTrash2, LuServer } from 'react-icons/lu';
import LocalStorage from '../../../database/localStorage';
import { Icon } from '../../../components';
import { Button } from '../../../components/Button';
import { SettingsTabViewProps } from '../types';

export function MCPSettingsView({}: SettingsTabViewProps) {
  const { t } = useTranslation();
  const [servers, setServers] = useState(LocalStorage.getMcpServers());
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');

  const save = useCallback((updated: { name: string; url: string }[]) => {
    setServers(updated);
    LocalStorage.setMcpServers(updated);
  }, []);

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const name = newName.trim() || new URL(newUrl).hostname;
    save([...servers, { name, url: newUrl.trim() }]);
    setNewUrl('');
    setNewName('');
  };

  const handleRemove = (idx: number) => {
    save(servers.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div className="text-sm opacity-70 mb-2" dangerouslySetInnerHTML={{ __html: t('settings.mcp.note') }} />
      <div className="space-y-2">
        {servers.length === 0 && (
          <div className="text-sm opacity-50 py-2">{t('settings.mcp.noServers')}</div>
        )}
        {servers.map((server, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2">
            <Icon size="sm" className="opacity-60">
              <LuServer />
            </Icon>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{server.name}</div>
              <div className="text-xs opacity-60 truncate">{server.url}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(idx)}
              title={t('settings.mcp.removeServer')}
            >
              <Icon size="sm">
                <LuTrash2 />
              </Icon>
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          className="input input-sm input-bordered flex-1"
          placeholder={t('settings.mcp.serverName')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="input input-sm input-bordered flex-[2]"
          placeholder={t('settings.mcp.serverUrl')}
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button variant="neutral" size="small" onClick={handleAdd}>
          <Icon size="sm" variant="leftside">
            <LuPlus />
          </Icon>
          {t('settings.mcp.addServer')}
        </Button>
      </div>
    </>
  );
}
