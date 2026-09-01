import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { LuX } from 'react-icons/lu';
import LocalStorage from '../database/localStorage';
import { useConversations } from '../hooks/useConversations';
import { Icon } from './Icon';

export default function ConversationTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const conversations = useConversations();
  const convMap = useMemo(
    () => new Map(conversations.map((c) => [c.id, c])),
    [conversations]
  );

  const [openTabs, setOpenTabs] = useOpenTabs();

  // Add current conv to tabs when navigating to a chat
  const convId = pathname.match(/^\/chat\/(.+)$/)?.[1];
  useEffect(() => {
    if (convId && !openTabs.includes(convId)) {
      LocalStorage.addOpenTab(convId);
      setOpenTabs((prev) => [...prev, convId]);
    }
  }, [convId]);

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      LocalStorage.removeOpenTab(tabId);
      setOpenTabs((prev) => prev.filter((id) => id !== tabId));
      if (pathname === `/chat/${tabId}`) {
        const remaining = openTabs.filter((id) => id !== tabId);
        if (remaining.length > 0) {
          navigate(`/chat/${remaining[remaining.length - 1]}`);
        } else {
          navigate('/');
        }
      }
    },
    [openTabs, pathname, navigate]
  );

  if (openTabs.length < 2) return null;

  return (
    <div className="flex items-center bg-base-200 border-b border-base-content/10 overflow-x-auto">
      {openTabs.map((tabId) => {
        const conv = convMap.get(tabId);
        const isActive = pathname === `/chat/${tabId}`;
        return (
          <div
            key={tabId}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer border-r border-base-content/10 min-w-0 max-w-48 shrink-0 ${
              isActive ? 'bg-base-100 border-b-2 border-b-primary' : 'opacity-70 hover:opacity-100'
            }`}
            onClick={() => navigate(`/chat/${tabId}`)}
          >
            <span className="truncate">{conv?.name || tabId}</span>
            <button
              className="shrink-0 p-0.5 hover:bg-base-content/10 rounded"
              onClick={(e) => handleCloseTab(e, tabId)}
              title={tabId === convId ? '' : 'Close tab'}
            >
              <Icon size="sm">
                <LuX />
              </Icon>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useOpenTabs() {
  const [tabs, setTabs] = usePersistedTabs();
  return [tabs, setTabs] as const;
}

function usePersistedTabs() {
  const initial = LocalStorage.getOpenTabs();
  const [tabs, setTabs] = useState<string[]>(initial);

  useEffect(() => {
    LocalStorage.setOpenTabs(tabs);
  }, [tabs]);

  return [tabs, setTabs] as const;
}
