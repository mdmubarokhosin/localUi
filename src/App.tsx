import { FC, useCallback, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
  useNavigate,
} from 'react-router';
import toast, { Toast } from 'react-hot-toast';
import { Footer } from './components/Footer';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
// ConversationTabs removed — single chat view
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProviderSetup } from './hooks/useProviderSetup';
import { usePWAUpdateToast } from './hooks/usePWAUpdatePrompt';
import ChatPage from './pages/Chat';
import DashboardPage from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import { TemplatesPage } from './pages/Templates';
import WelcomePage from './pages/Welcome';
import { AppContextProvider, useAppContext } from './store/app';
import { ChatContextProvider, useChatContext } from './store/chat';
import { InferenceContextProvider } from './store/inference';
import { ModalProvider, useModals } from './store/modal';
import { TemplateContextProvider } from './store/templates';
import IndexedDB from './database/indexedDB';
import LocalStorage from './database/localStorage';
import { useConversations } from './hooks/useConversations';
import { useTranslation } from 'react-i18next';

const App: FC = () => {
  return (
    <ModalProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="flex flex-row drawer xl:drawer-open">
          <AppContextProvider>
            <InferenceContextProvider>
              <ChatContextProvider>
                <TemplateContextProvider>
                  <Routes>
                    <Route element={<AppLayout />}>
                      <Route path="/chat/:convId" element={<Chat />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/templates" element={<TemplatesPage />} />
                      <Route path="*" element={<WelcomePage />} />
                    </Route>
                  </Routes>
                </TemplateContextProvider>
              </ChatContextProvider>
            </InferenceContextProvider>
          </AppContextProvider>
        </div>
      </BrowserRouter>
    </ModalProvider>
  );
};

const AppLayout: FC = () => {
  usePWAUpdateToast();
  useProviderSetup();

  // Inner component that can access contexts
  return <AppLayoutInner />;
};

const AppLayoutInner: FC = () => {
  const { t } = useTranslation();
  const { showSettings } = useAppContext();
  const conversations = useConversations();
  const { viewingChat } = useChatContext();
  const { showPrompt, showConfirm } = useModals();
  const navigate = useNavigate();

  const handleToggleSidebar = useCallback(() => {
    const drawerToggle = document.getElementById('toggle-drawer') as HTMLInputElement;
    if (drawerToggle) drawerToggle.click();
  }, []);

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector('input[name="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      const drawerToggle = document.getElementById('toggle-drawer') as HTMLInputElement;
      if (drawerToggle && !drawerToggle.checked) drawerToggle.click();
    }
  }, []);

  const handleRenameConversation = useCallback(async () => {
    const convId = viewingChat?.conv?.id;
    if (!convId) return;
    const newName = await showPrompt('Enter new name', viewingChat.conv.name);
    if (newName && newName.trim()) {
      await IndexedDB.updateConversationName(convId, newName);
    }
  }, [viewingChat, showPrompt]);

  const handleDeleteConversation = useCallback(async () => {
    const convId = viewingChat?.conv?.id;
    if (!convId) return;
    const confirmed = await showConfirm('Delete this conversation?');
    if (confirmed) {
      await IndexedDB.deleteConversation(convId);
      navigate('/');
    }
  }, [viewingChat, showConfirm, navigate]);

  const handleNavigateUp = useCallback(() => {
    if (conversations.length < 2) return;
    const currId = viewingChat?.conv?.id;
    const idx = conversations.findIndex((c) => c.id === currId);
    if (idx > 0) navigate(`/chat/${conversations[idx - 1].id}`);
  }, [conversations, viewingChat, navigate]);

  const handleNavigateDown = useCallback(() => {
    if (conversations.length < 2) return;
    const currId = viewingChat?.conv?.id;
    const idx = conversations.findIndex((c) => c.id === currId);
    if (idx < conversations.length - 1) navigate(`/chat/${conversations[idx + 1].id}`);
  }, [conversations, viewingChat, navigate]);

  // Resumable streaming check
  useEffect(() => {
    const streamState = LocalStorage.getStreamState();
    if (!streamState) return;
    const convId = streamState.convId;
    toast.custom((toastInstance: Toast) => (
      <div className="bg-base-100 rounded-lg p-4 shadow-lg border border-base-content/10 max-w-sm">
        <div className="font-bold mb-1">{t('toast.resumeStream.title')}</div>
        <div className="text-sm opacity-70 mb-3">{t('toast.resumeStream.description')}</div>
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              LocalStorage.setStreamState(null);
              toast.dismiss(toastInstance.id);
            }}
          >{t('toast.resumeStream.cancelBtnLabel')}</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              LocalStorage.setStreamState(null);
              toast.dismiss(toastInstance.id);
              navigate(`/chat/${convId}`);
            }}
          >{t('toast.resumeStream.submitBtnLabel')}</button>
        </div>
      </div>
    ), { duration: 15000 });
  }, []);

  useKeyboardShortcuts({
    onNewChat: () => navigate('/'),
    onToggleSidebar: handleToggleSidebar,
    onOpenSettings: () => navigate('/settings'),
    onCloseModals: () => {
      if (showSettings) navigate(-1);
    },
    onFocusSearch: handleFocusSearch,
    onRenameConversation: handleRenameConversation,
    onDeleteConversation: handleDeleteConversation,
    onNavigateConversationUp: handleNavigateUp,
    onNavigateConversationDown: handleNavigateDown,
  });

  return (
    <>
      <Sidebar />
      <div className="drawer-content flex flex-col w-full h-screen px-1 md:px-2 bg-base-300">
        <Header />
        <main
          className="grow flex flex-col overflow-auto bg-base-100 rounded-xl border-1 border-base-content/20 dark:border-base-content/10 border-input inset-shadow-sm"
          id="main-scroll"
        >
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

const Chat: FC = () => {
  const { convId } = useParams();
  if (!convId) return <Navigate to="/" replace />;
  return <ChatPage currConvId={convId} />;
};

export default App;
