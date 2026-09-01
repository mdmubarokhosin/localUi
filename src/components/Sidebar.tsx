import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  LuCheck,
  LuLayoutDashboard,
  LuFileText,
  LuPin,
  LuPinOff,
  LuSearch,
  LuSquarePen,
  LuX,
} from 'react-icons/lu';
import { useNavigate } from 'react-router';
import IndexedDB from '../database/indexedDB';
import LocalStorage from '../database/localStorage';
import { useConversations } from '../hooks/useConversations';
import useFilter from '../hooks/useFilter';
import { groupConversationsByDate } from '../utils/conversation-grouper';
import { conversationHasBranches } from '../utils/message-hierarchy';
import { Button } from './Button';
import { ConversationGroup } from './ConversationGroup';
import { ConversationItem } from './ConversationItem';
import { Icon } from './Icon';
import { Input } from './Input';
import { Label } from './Label';

export default function Sidebar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const toggleDrawerRef = useRef<HTMLInputElement>(null);

  const conversations = useConversations();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    filteredData: filteredConversations,
    setFilter,
    resetFilter,
    searchTerm,
    isFiltered,
  } = useFilter(conversations);

  const groupedConv = useMemo(
    () => groupConversationsByDate(conversations, i18n.language),
    [i18n.language, conversations]
  );

  // Build branch info map
  const branchInfoMap = useMemo(() => {
    const map = new Map<string, boolean>();
    conversations.forEach((c) => {
      IndexedDB.getMessages(c.id).then((msgs) => {
        map.set(c.id, conversationHasBranches(msgs));
      });
    });
    return map;
  }, [conversations]);

  const handleSelect = useCallback(() => {
    const toggle = toggleDrawerRef.current;
    if (toggle != null) {
      toggle.click();
    }
  }, []);

  const handleToggleSelect = useCallback(
    (convId: string, shiftKey?: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastSelectedId) {
          const convIds = conversations.map((c) => c.id);
          const startIdx = convIds.indexOf(lastSelectedId);
          const endIdx = convIds.indexOf(convId);
          if (startIdx >= 0 && endIdx >= 0) {
            const [from, to] =
              startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
            for (let i = from; i <= to; i++) {
              next.add(convIds[i]);
            }
          }
        } else {
          if (next.has(convId)) {
            next.delete(convId);
          } else {
            next.add(convId);
          }
        }

        setLastSelectedId(convId);
        return next;
      });
    },
    [conversations, lastSelectedId]
  );

  const handleSelectAll = useCallback(() => {
    const targetConvs = isFiltered ? filteredConversations : conversations;
    setSelectedIds(new Set(targetConvs.map((c) => c.id)));
  }, [conversations, filteredConversations, isFiltered]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
    setLastSelectedId(null);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      t('sidebar.actions.deleteSelectedConfirm', { count: selectedIds.size })
    );
    if (!confirmed) return;

    for (const id of selectedIds) {
      await IndexedDB.deleteConversation(id);
    }
    toast.success(
      t('sidebar.actions.deleteSelectedSuccess', { count: selectedIds.size })
    );
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, t]);

  const handleBulkExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const allData = [];
    for (const id of selectedIds) {
      const data = await IndexedDB.exportDB(id);
      allData.push(...data);
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  }, [selectedIds]);

  const handleBulkPin = useCallback(() => {
    const pinned = LocalStorage.getPinnedConversations();
    const newPinned = [...new Set([...pinned, ...selectedIds])];
    LocalStorage.setPinnedConversations(newPinned);
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleBulkUnpin = useCallback(() => {
    const pinned = LocalStorage.getPinnedConversations().filter(
      (id) => !selectedIds.has(id)
    );
    LocalStorage.setPinnedConversations(pinned);
    setSelectedIds(new Set());
  }, [selectedIds]);

  return (
    <>
      <Input
        id="toggle-drawer"
        type="checkbox"
        className="drawer-toggle"
        ref={toggleDrawerRef}
        aria-label="Toggle sidebar"
      />

      <div
        className="drawer-side fixed inset-0 w-full z-50"
        role="complementary"
        aria-label="Sidebar"
        tabIndex={0}
      >
        <div className="flex flex-col bg-base-300 h-full min-h-0 max-w-full w-96 xl:w-72 pb-4 px-4 xl:pl-2 xl:pr-0 shadow-xl/50">
          <div className="flex flex-row items-center justify-between xl:py-2">
            <Label size="icon" className="max-xl:hidden" />
            <Label
              className="xl:hidden"
              variant="btn-ghost"
              size="icon-xl"
              htmlFor="toggle-drawer"
              role="button"
              title={t('sidebar.buttons.closeSideBar')}
              aria-label={t('sidebar.buttons.closeSideBar')}
              tabIndex={0}
            >
              <Icon size="md">
                <LuX />
              </Icon>
            </Label>

            <Label
              variant="fake-btn"
              className="font-bold tracking-wider leading-8"
              aria-label={import.meta.env.VITE_APP_NAME}
              role="button"
              onClick={() => navigate('/')}
            >
              {import.meta.env.VITE_APP_NAME}
            </Label>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-xl"
                onClick={() => selectionMode ? handleClearSelection() : setSelectionMode(true)}
                title={
                  selectionMode
                    ? t('sidebar.buttons.cancelSelection')
                    : t('sidebar.buttons.enterSelectionMode')
                }
              >
                <Icon size="md">
                  {selectionMode ? <LuX /> : <LuCheck />}
                </Icon>
              </Button>
              <Button
                variant="ghost"
                size="icon-xl"
                onClick={() => navigate('/')}
                title={t('header.buttons.newConv')}
                aria-label={t('header.ariaLabels.newConv')}
              >
                <Icon size="md">
                  <LuSquarePen />
                </Icon>
              </Button>
            </div>
          </div>

          {/* Selection mode action bar */}
          {selectionMode && selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 px-1">
              <span className="text-xs opacity-60 self-center mr-1">
                {selectedIds.size} selected
              </span>
              <Button variant="ghost" size="small" onClick={handleSelectAll}>
                {t('sidebar.buttons.selectAll')}
              </Button>
              <Button
                variant="ghost"
                size="small"
                className="text-error"
                onClick={handleBulkDelete}
              >
                {t('sidebar.buttons.deleteSelected')}
              </Button>
              <Button variant="ghost" size="small" onClick={handleBulkExport}>
                {t('sidebar.buttons.exportSelected')}
              </Button>
              <Button variant="ghost" size="small" onClick={handleBulkPin}>
                <Icon size="sm" variant="leftside">
                  <LuPin />
                </Icon>
                {t('sidebar.buttons.pinSelected')}
              </Button>
              <Button variant="ghost" size="small" onClick={handleBulkUnpin}>
                <Icon size="sm" variant="leftside">
                  <LuPinOff />
                </Icon>
                {t('sidebar.buttons.unpinSelected')}
              </Button>
            </div>
          )}

          {/* search conversation */}
          <div className="flex max-xl:mt-2 xl:px-2">
            <Label
              variant="input-bordered"
              className="h-8 inset-shadow-sm my-1.5 px-1.5"
            >
              <Icon size="md">
                <LuSearch />
              </Icon>
              <Input
                className="input-sm grow"
                name="Search"
                placeholder={t('sidebar.searchPlaceHolder')}
                value={searchTerm}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.key === 'Escape' && !e.shiftKey) {
                    e.preventDefault();
                    resetFilter();
                  }
                }}
                ref={searchInputRef}
                autoFocus
              />
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="icon-md"
                  onClick={resetFilter}
                  title={t('header.buttons.clear')}
                  aria-label={t('header.ariaLabels.clear')}
                >
                  <Icon size="md">
                    <LuX />
                  </Icon>
                </Button>
              )}
            </Label>
          </div>

          {/* scrollable conversation list */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {!isFiltered &&
              groupedConv.map((group, idx) => (
                <ConversationGroup
                  className={idx > 0 ? 'mt-6' : 'mt-3'}
                  key={group.title}
                  group={group}
                  onItemSelect={handleSelect}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  branchInfoMap={branchInfoMap}
                />
              ))}

            {isFiltered &&
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  onSelect={handleSelect}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(conv.id)}
                  onToggleSelect={handleToggleSelect}
                  hasBranches={branchInfoMap.get(conv.id)}
                />
              ))}
          </div>

          {/* Footer always at the bottom */}
          <div className="flex flex-row gap-1 mx-2 pt-2 border-t border-base-content/10">
            <Button
              variant="ghost"
              size="icon-xl"
              className="flex-1"
              onClick={() => {
                navigate('/dashboard');
                handleSelect();
              }}
              title="Dashboard"
            >
              <Icon size="sm" variant="leftside">
                <LuLayoutDashboard />
              </Icon>
              <span className="text-xs">Dashboard</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-xl"
              className="flex-1"
              onClick={() => {
                navigate('/templates');
                handleSelect();
              }}
              title="Templates"
            >
              <Icon size="sm" variant="leftside">
                <LuFileText />
              </Icon>
              <span className="text-xs">Templates</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Exported function for keyboard shortcuts to focus search
let _searchInputRef: React.RefObject<HTMLInputElement> | null = null;
export function focusSidebarSearch() {
  _searchInputRef?.current?.focus();
}
