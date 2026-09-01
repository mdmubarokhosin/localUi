import toast from 'react-hot-toast';
import { CONFIG_DEFAULT } from '../config';
import { Configuration } from '../types';

// --- Configuration Management (localStorage) ---
export default class LocalStorage {
  /**
   * Retrieves the current application configuration.
   * Merges saved values with defaults to handle missing keys.
   * @returns The current Configuration object.
   */
  static getConfig(): Configuration {
    const savedConfigString = localStorage.getItem('config');
    let savedVal: Partial<Configuration> = {};
    if (savedConfigString) {
      try {
        savedVal = JSON.parse(savedConfigString);
      } catch (e) {
        console.error('Failed to parse saved config from localStorage:', e);
        toast.error('Failed to parse saved config.');
      }
    }
    // Provide default values for any missing keys
    return {
      ...CONFIG_DEFAULT,
      ...savedVal,
    };
  }

  /**
   * Saves the application configuration to localStorage.
   * @param config The Configuration object to save.
   */
  static setConfig(config: Configuration) {
    localStorage.setItem('config', JSON.stringify(config));
  }

  /**
   * Retrieves the currently selected UI theme.
   * @returns The theme string ('auto', 'light', 'dark', etc.) or 'auto' if not set.
   */
  static getTheme(): string {
    return localStorage.getItem('theme') || 'auto';
  }

  /**
   * Saves the selected UI theme to localStorage.
   * If 'auto' is selected, the theme item is removed.
   * @param theme The theme string to save.
   */
  static setTheme(theme: string) {
    if (theme === 'auto') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }

  /**
   * Retrieves the currently selected syntax theme.
   * @returns The theme string ('auto', etc.) or 'auto' if not set.
   */
  static getSyntaxTheme(): string {
    return localStorage.getItem('syntaxTheme') || 'auto';
  }

  /**
   * Saves the selected syntax theme to localStorage.
   * If 'auto' is selected, the theme item is removed.
   * @param theme The theme string to save.
   */
  static setSyntaxTheme(theme: string) {
    if (theme === 'auto') {
      localStorage.removeItem('syntaxTheme');
    } else {
      localStorage.setItem('syntaxTheme', theme);
    }
  }

  // --- Draft Message Persistence ---

  static getDraft(convId: string): string {
    return localStorage.getItem(`draft-${convId}`) || '';
  }

  static setDraft(convId: string, content: string) {
    if (!content) {
      localStorage.removeItem(`draft-${convId}`);
    } else {
      localStorage.setItem(`draft-${convId}`, content);
    }
  }

  // --- Model Favorites ---

  static getModelFavorites(): string[] {
    try {
      const raw = localStorage.getItem('modelFavorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static setModelFavorites(favorites: string[]) {
    localStorage.setItem('modelFavorites', JSON.stringify(favorites));
  }

  static toggleModelFavorite(modelId: string): boolean {
    const favs = this.getModelFavorites();
    const idx = favs.indexOf(modelId);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(modelId);
    }
    this.setModelFavorites(favs);
    return idx < 0; // returns true if newly added
  }

  static isModelFavorite(modelId: string): boolean {
    return this.getModelFavorites().includes(modelId);
  }

  // --- Pinned Conversations ---

  static getPinnedConversations(): string[] {
    try {
      const raw = localStorage.getItem('pinnedConversations');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static setPinnedConversations(pinned: string[]) {
    localStorage.setItem('pinnedConversations', JSON.stringify(pinned));
  }

  static togglePinnedConversation(convId: string): boolean {
    const pinned = this.getPinnedConversations();
    const idx = pinned.indexOf(convId);
    if (idx >= 0) {
      pinned.splice(idx, 1);
    } else {
      pinned.push(convId);
    }
    this.setPinnedConversations(pinned);
    return idx < 0; // returns true if newly pinned
  }

  static isConversationPinned(convId: string): boolean {
    return this.getPinnedConversations().includes(convId);
  }

  // --- Open Conversation Tabs ---

  static getOpenTabs(): string[] {
    try {
      const raw = localStorage.getItem('openTabs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static setOpenTabs(tabs: string[]) {
    localStorage.setItem('openTabs', JSON.stringify(tabs));
  }

  static addOpenTab(convId: string) {
    const tabs = this.getOpenTabs();
    if (!tabs.includes(convId)) {
      tabs.push(convId);
      this.setOpenTabs(tabs);
    }
  }

  static removeOpenTab(convId: string) {
    const tabs = this.getOpenTabs().filter((id) => id !== convId);
    this.setOpenTabs(tabs);
  }

  // --- MCP Server Configuration ---

  static getMcpServers(): { name: string; url: string }[] {
    try {
      const raw = localStorage.getItem('mcpServers');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static setMcpServers(servers: { name: string; url: string }[]) {
    localStorage.setItem('mcpServers', JSON.stringify(servers));
  }

  // --- Resumable Stream State ---

  static getStreamState(): {
    convId: string;
    lastMsgIndex: number;
  } | null {
    try {
      const raw = sessionStorage.getItem('streamState');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static setStreamState(state: {
    convId: string;
    lastMsgIndex: number;
  } | null) {
    if (state) {
      sessionStorage.setItem('streamState', JSON.stringify(state));
    } else {
      sessionStorage.removeItem('streamState');
    }
  }
}