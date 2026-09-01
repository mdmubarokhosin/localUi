import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { normalizeMsgsForAPI } from '../api/message-normalization';
import { isDev } from '../config';
import LocalStorage from '../database/localStorage';
import IndexedDB from '../database/indexedDB';
import { generateChatStream } from '../services/inference-service';
import { useAppContext } from '../store/app';
import { useInferenceContext } from '../store/inference';
import { InferenceApiMessage, LiveTokenStats, Message, PendingMessage } from '../types';

export type CallbackGeneratedChunk = (currLeafNodeId?: Message['id']) => void;

export interface SendMessageProps {
  convId: Message['convId'];
  type: Message['type'];
  role: Message['role'];
  parent: Message['parent'];
  content: string | null;
  extra: Message['extra'];
  system?: string;
  modelOverride?: string;
  onChunk: CallbackGeneratedChunk;
}

export interface ReplaceMessageProps {
  msg: Message;
  newContent: string;
  onChunk: CallbackGeneratedChunk;
}

/** Check if an error message is related to context length */
function isContextLengthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('context length') ||
    lower.includes('context_length') ||
    lower.includes('context window') ||
    lower.includes('too long') ||
    lower.includes('token limit') ||
    lower.includes('n_ctx') ||
    lower.includes('exceeds the model')
  );
}

/** Extract token counts from context error messages */
function extractContextErrorDetail(message: string): string {
  // Try to match patterns like "...1234 tokens..." or "...1234/2048..."
  const tokenMatch = message.match(/(\d+)\s*tokens?/g);
  if (tokenMatch && tokenMatch.length >= 2) {
    return `${tokenMatch[0]} used vs ${tokenMatch[1]} limit.`;
  }
  return '';
}

export function useInference({
  pendingMessages,
  aborts,
  setPending,
  setAbort,
  setLiveTokenStats,
}: {
  pendingMessages: Record<string, PendingMessage>;
  aborts: Record<string, AbortController>;
  setPending: (convId: string, pendingMsg: PendingMessage | null) => void;
  setAbort: (convId: string, controller: AbortController | null) => void;
  setLiveTokenStats: (convId: string, stats: LiveTokenStats | null) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config } = useAppContext();
  const { provider, selectedModel } = useInferenceContext();

  const isGenerating = useCallback(
    (convId: string) => convId in pendingMessages,
    [pendingMessages]
  );

  const generateMessage = useCallback(
    async ({
      convId,
      leafNodeId,
      systemMessage,
      onChunk,
      modelOverride,
      appendToExisting,
    }: {
      convId: string;
      leafNodeId: Message['id'];
      systemMessage?: string;
      onChunk: CallbackGeneratedChunk;
      modelOverride?: string;
      appendToExisting?: string;
    }) => {
      if (isGenerating(convId) || !provider) return;

      const currConversation = await IndexedDB.getOneConversation(convId);
      if (!currConversation) {
        throw new Error(t('state.chat.errors.conversationNotFound'));
      }

      const rawMessages = await IndexedDB.getMessages(convId);
      const currMessages = IndexedDB.filterByLeafNodeId(
        rawMessages,
        leafNodeId,
        false
      ).filter((m) => m.role !== 'system');

      const abortController = new AbortController();
      setAbort(convId, abortController);

      if (!currMessages) {
        throw new Error(t('state.chat.errors.messagesNotFound'));
      }

      const messages: InferenceApiMessage[] = normalizeMsgsForAPI(currMessages);
      if (systemMessage) {
        messages.unshift({ role: 'system', content: systemMessage });
      }

      const effectiveModel = modelOverride || config.model;

      const pendingId = Date.now() + 1;
      const streamStartTime = Date.now();
      let pendingMsg: PendingMessage = {
        id: pendingId,
        convId,
        type: 'text',
        timestamp: pendingId,
        model: selectedModel ? selectedModel.name : effectiveModel,
        role: 'assistant',
        content: appendToExisting || null,
        reasoning_content: null,
        parent: leafNodeId,
        children: [],
      };
      setPending(convId, pendingMsg);

      // Save stream state for resumable streaming
      LocalStorage.setStreamState({
        convId,
        lastMsgIndex: currMessages.length,
      });

      let tokenCount = 0;

      try {
        await generateChatStream({
          provider,
          config: { ...config, model: effectiveModel },
          model: effectiveModel,
          messages,
          signal: abortController.signal,
          onUpdate: (update) => {
            pendingMsg = { ...pendingMsg, ...update };
            setPending(convId, pendingMsg);

            // Calculate live token stats
            const currentContent = pendingMsg.content || '';
            const newTokenCount = currentContent.length;
            const newTokens = newTokenCount - tokenCount;
            tokenCount = newTokenCount;

            const elapsed = Date.now() - streamStartTime;
            const tokensPerSecond =
              elapsed > 0 ? (newTokens / elapsed) * 1000 : 0;

            // Use server timings if available
            let totalTokens = tokenCount;
            let tps = tokensPerSecond;
            if (pendingMsg.timings?.predicted_n) {
              totalTokens = pendingMsg.timings.predicted_n;
              tps =
                pendingMsg.timings.predicted_ms && pendingMsg.timings.predicted_ms > 0
                  ? (totalTokens / pendingMsg.timings.predicted_ms) * 1000
                  : tokensPerSecond;
            }

            setLiveTokenStats(convId, {
              tokensPerSecond: tps,
              totalTokens,
              elapsedMs: elapsed,
            });
          },
        });
      } catch (err) {
        setPending(convId, null);
        setLiveTokenStats(convId, null);
        LocalStorage.setStreamState(null);

        if ((err as Error).name === 'AbortError') {
          if (isDev) console.debug('Generation aborted by user.');
        } else {
          const errMsg = (err as Error)?.message || '';
          console.error('Error during message generation:', err);

          // Context length error handling
          if (isContextLengthError(errMsg)) {
            const detail = extractContextErrorDetail(errMsg);
            toast.error(
              t('state.chat.errors.contextLengthExceeded') +
                (detail ? ' ' + detail : ''),
              { duration: 8000 }
            );
          } else {
            toast.error(
              errMsg
                ? errMsg
                : t('state.chat.errors.unknownErrorDuringGeneration')
            );
          }
          throw err;
        }
      }

      // Clear stream state
      LocalStorage.setStreamState(null);
      setLiveTokenStats(convId, null);

      if (pendingMsg.content !== null) {
        await IndexedDB.appendMsg(pendingMsg as Message, leafNodeId);
      }
      setPending(convId, null);
      onChunk(pendingId);
    },
    [config, isGenerating, provider, selectedModel, setAbort, setPending, setLiveTokenStats, t]
  );

  const sendMessage = useCallback(
    async ({
      convId,
      type,
      role,
      parent,
      content,
      extra,
      system,
      modelOverride,
      onChunk,
    }: SendMessageProps): Promise<boolean> => {
      if (isGenerating(convId ?? '') || !convId || !type || !role || !parent)
        return false;

      let currMsgId;
      if (content === null) {
        currMsgId = parent;
      } else {
        currMsgId = Date.now();
        try {
          await IndexedDB.appendMsg(
            {
              id: currMsgId,
              convId,
              type,
              role,
              content,
              extra,
              parent,
              children: [],
              timestamp: currMsgId,
            },
            parent
          );
        } catch (err) {
          toast.error(t('state.chat.errors.cannotSaveMessage'));
          return false;
        }
      }

      onChunk(currMsgId);

      try {
        await generateMessage({
          convId,
          leafNodeId: currMsgId,
          systemMessage: system,
          onChunk,
          modelOverride,
        });
        return true;
      } catch (error) {
        console.error('Message sending failed, consider rollback:', error);
        toast.error(t('state.chat.errors.failedToGetResponse'));
      }
      return false;
    },
    [generateMessage, isGenerating, t]
  );

  const stopGenerating = useCallback(
    (convId: string) => {
      setPending(convId, null);
      setLiveTokenStats(convId, null);
      LocalStorage.setStreamState(null);
      aborts[convId]?.abort();
    },
    [aborts, setPending, setLiveTokenStats]
  );

  const replaceMessage = useCallback(
    async ({ msg, newContent, onChunk }: ReplaceMessageProps) => {
      if (isGenerating(msg.convId)) return;

      const now = Date.now();
      const currMsgId = now;
      await IndexedDB.appendMsg(
        {
          ...msg,
          id: currMsgId,
          timestamp: now,
          content: newContent,
        },
        msg.parent
      );
      onChunk(currMsgId);
    },
    [isGenerating]
  );

  const branchMessage = useCallback(
    async (msg: Message) => {
      if (isGenerating(msg.convId)) return;

      try {
        const conv = await IndexedDB.branchConversation(msg.convId, msg.id);
        navigate(`/chat/${conv.id}`);
      } catch (error) {
        console.error('Conversation branch failed:', error);
        toast.error(t('state.chat.errors.failedToBranchConversation'));
      }
    },
    [isGenerating, navigate, t]
  );

  /** Continue an incomplete assistant message */
  const continueMessage = useCallback(
    async (msg: Message, onChunk: CallbackGeneratedChunk) => {
      if (isGenerating(msg.convId)) return;

      await generateMessage({
        convId: msg.convId,
        leafNodeId: msg.parent,
        systemMessage: undefined,
        onChunk,
        appendToExisting: msg.content || undefined,
      });
    },
    [generateMessage, isGenerating]
  );

  /** Regenerate with a different model */
  const regenerateWithModel = useCallback(
    async (msg: Message, model: string, onChunk: CallbackGeneratedChunk) => {
      if (isGenerating(msg.convId)) return;

      await generateMessage({
        convId: msg.convId,
        leafNodeId: msg.parent,
        systemMessage: undefined,
        onChunk,
        modelOverride: model,
      });
    },
    [generateMessage, isGenerating]
  );

  return {
    isGenerating,
    generateMessage,
    sendMessage,
    stopGenerating,
    replaceMessage,
    branchMessage,
    continueMessage,
    regenerateWithModel,
  };
}
