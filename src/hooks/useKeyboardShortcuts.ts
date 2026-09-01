/**
 * React hook that registers global keyboard shortcuts for common actions.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router';

interface KeyboardShortcutActions {
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onCloseModals?: () => void;
  onToggleShortcutsHelp?: () => void;
  onFocusSearch?: () => void;
  onRenameConversation?: () => void;
  onDeleteConversation?: () => void;
  onNavigateConversationUp?: () => void;
  onNavigateConversationDown?: () => void;
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
}

export function useKeyboardShortcuts(actions: KeyboardShortcutActions): void {
  const {
    onNewChat,
    onToggleSidebar,
    onOpenSettings,
    onCloseModals,
    onToggleShortcutsHelp,
    onFocusSearch,
    onRenameConversation,
    onDeleteConversation,
    onNavigateConversationUp,
    onNavigateConversationDown,
  } = actions;

  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = isMac() ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + N — New conversation
      if (meta && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        if (onNewChat) {
          onNewChat();
        } else {
          navigate('/');
        }
        return;
      }

      // Ctrl/Cmd + / — Toggle shortcuts help
      if (meta && e.key === '/') {
        e.preventDefault();
        onToggleShortcutsHelp?.();
        return;
      }

      // Ctrl/Cmd + B — Toggle sidebar
      if (meta && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        if (onToggleSidebar) {
          onToggleSidebar();
        } else {
          // Try to click the drawer toggle
          const drawerToggle = document.getElementById('toggle-drawer') as HTMLInputElement;
          if (drawerToggle) drawerToggle.click();
        }
        return;
      }

      // Ctrl/Cmd + , — Open settings
      if (meta && e.key === ',') {
        e.preventDefault();
        if (onOpenSettings) {
          onOpenSettings();
        } else {
          navigate('/settings');
        }
        return;
      }

      // Ctrl/Cmd + K — Focus search in sidebar
      if (meta && !e.shiftKey && e.key === 'k') {
        e.preventDefault();
        onFocusSearch?.();
        // Fallback: try to find the search input directly
        if (!onFocusSearch) {
          const searchInput = document.querySelector(
            'input[name="Search"]'
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            // Also open sidebar if closed
            const drawerToggle = document.getElementById('toggle-drawer') as HTMLInputElement;
            if (drawerToggle && !drawerToggle.checked) drawerToggle.click();
          }
        }
        return;
      }

      // Ctrl/Cmd + Shift + O — New chat
      if (meta && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        if (onNewChat) onNewChat();
        else navigate('/');
        return;
      }

      // Ctrl/Cmd + Shift + E — Rename active conversation
      if (meta && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        onRenameConversation?.();
        return;
      }

      // Ctrl/Cmd + Shift + D — Delete active conversation
      if (meta && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        onDeleteConversation?.();
        return;
      }

      // Ctrl/Cmd + Shift + Arrow Up — Navigate conversations up
      if (meta && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigateConversationUp?.();
        return;
      }

      // Ctrl/Cmd + Shift + Arrow Down — Navigate conversations down
      if (meta && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigateConversationDown?.();
        return;
      }

      // Escape — Close modals / settings
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseModals?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    navigate,
    onNewChat,
    onToggleSidebar,
    onOpenSettings,
    onCloseModals,
    onToggleShortcutsHelp,
    onFocusSearch,
    onRenameConversation,
    onDeleteConversation,
    onNavigateConversationUp,
    onNavigateConversationDown,
  ]);
}
