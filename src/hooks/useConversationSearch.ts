/**
 * React hook for searching through conversations by name and message content.
 * Results are debounced (300ms) to avoid excessive IndexedDB reads.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import IndexedDB from '../database/indexedDB';

/**
 * A single search result entry.
 */
export interface SearchResult {
  convId: string;
  convName: string;
  matchedMessage?: string;
  matchedRole?: string;
  timestamp: number;
}

/**
 * Debounce delay in milliseconds for the search operation.
 */
const DEBOUNCE_MS = 300;

/**
 * Hook that provides conversation search functionality with debouncing.
 *
 * Searches both conversation names and the content of their messages.
 *
 * @returns An object containing the query, results, search state, and control functions.
 */
export function useConversationSearch(): {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  search: (q: string) => void;
  clearSearch: () => void;
} {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const abortRef = useRef(false);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortRef.current = true;
    };
  }, []);

  /**
   * Internal search implementation.
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const lowerQuery = trimmed.toLowerCase();
    const localAbort = abortRef;

    setIsSearching(true);

    try {
      const conversations = await IndexedDB.getAllConversations();
      const allResults: SearchResult[] = [];

      for (const conv of conversations) {
        // Early abort if the hook has unmounted or a new search was triggered
        if (localAbort.current) return;

        // Check conversation name
        const nameMatch = conv.name.toLowerCase().includes(lowerQuery);

        // Search messages if name didn't match
        let matchedMessage: string | undefined;
        let matchedRole: string | undefined;

        if (!nameMatch) {
          const messages = await IndexedDB.getMessages(conv.id);
          if (localAbort.current) return;

          for (const msg of messages) {
            if (msg.type === 'root') continue;
            if (msg.content.toLowerCase().includes(lowerQuery)) {
              matchedMessage = msg.content;
              matchedRole = msg.role;
              break;
            }
          }
        }

        if (nameMatch || matchedMessage !== undefined) {
          allResults.push({
            convId: conv.id,
            convName: conv.name,
            matchedMessage: nameMatch ? undefined : matchedMessage,
            matchedRole: nameMatch ? undefined : matchedRole,
            timestamp: conv.lastModified,
          });
        }
      }

      if (!localAbort.current) {
        // Sort results: name matches first, then by recency
        allResults.sort((a, b) => {
          const aName = a.matchedMessage === undefined ? 0 : 1;
          const bName = b.matchedMessage === undefined ? 0 : 1;
          if (aName !== bName) return aName - bName;
          return b.timestamp - a.timestamp;
        });
        setResults(allResults);
      }
    } catch (error) {
      console.error('Conversation search failed:', error);
    } finally {
      if (!localAbort.current) {
        setIsSearching(false);
      }
    }
  }, []);

  /**
   * Initiates a debounced search.
   */
  const search = useCallback(
    (q: string) => {
      setQuery(q);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(q);
      }, DEBOUNCE_MS);
    },
    [performSearch]
  );

  /**
   * Clears the current search query and results.
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  return { query, setQuery, results, isSearching, search, clearSearch };
}
