import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  LuArrowUp,
  LuCircleStop,
  LuMic,
  LuPaperclip,
  LuSquare,
} from 'react-icons/lu';
import { TbAdjustmentsHorizontal } from 'react-icons/tb';
import { useNavigate } from 'react-router';
import { AutoSizingTextArea, Button, Icon, Label } from '../../../components';
import LocalStorage from '../../../database/localStorage';
import { useFileUpload } from '../../../hooks/useFileUpload';
import { useSlashCommands } from '../../../hooks/useSlashCommands';
import SpeechToText, {
  IS_SPEECH_RECOGNITION_SUPPORTED,
  SpeechRecordCallback,
} from '../../../hooks/useSpeechToText';
import { useChatContext } from '../../../store/chat';
import { MessageExtra } from '../../../types';
import { usePrefilledMessage } from '../hooks/usePrefilledMessage';
import { DropzoneArea } from './DropzoneArea';
import SlashCommandPicker from './SlashCommandPicker';

type CallbackSendMessage = (
  content: string,
  extra: MessageExtra[] | undefined
) => Promise<boolean>;

export const ChatInput = memo(
  ({ convId, onSend }: { convId?: string; onSend: CallbackSendMessage }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { prefilledContent, isPrefilledSend } = usePrefilledMessage();
    const extraContext = useFileUpload();
    const { isGenerating, stopGenerating } = useChatContext();

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [textAreaValue, setTextAreaValue] = useState('');
    const [_slashCmd, setSlashCmd] = useState<string | null>(null);

    const isPending = useMemo(
      () => (!convId ? false : isGenerating(convId)),
      [convId, isGenerating]
    );

    // Draft persistence
    useEffect(() => {
      if (!convId) return;
      const draft = LocalStorage.getDraft(convId);
      if (draft && !prefilledContent) {
        setTextAreaValue(draft);
      }
      return () => {
        // Save draft on unmount
        if (textAreaValue.trim()) {
          LocalStorage.setDraft(convId, textAreaValue);
        } else {
          LocalStorage.setDraft(convId, '');
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [convId]);

    // Save draft on change
    useEffect(() => {
      if (!convId) return;
      if (textAreaValue.trim()) {
        LocalStorage.setDraft(convId, textAreaValue);
      } else {
        LocalStorage.setDraft(convId, '');
      }
    }, [textAreaValue, convId]);

    // Clear draft after successful send
    const handleSendWithDraftClear = useCallback(async () => {
      const lastInpMsg = textAreaValue;
      if (lastInpMsg.trim().length === 0) {
        toast.error(t('chatInput.errors.emptyMessage'));
        return false;
      }

      setTextAreaValue('');
      if (convId) LocalStorage.setDraft(convId, '');

      const result = await onSend(lastInpMsg, extraContext.items);
      if (!result) {
        setTextAreaValue(lastInpMsg);
        if (convId) LocalStorage.setDraft(convId, lastInpMsg);
      }
      extraContext.clearItems();
      return result;
    }, [textAreaValue, convId, onSend, extraContext, t]);

    // Slash commands
    const { filteredCommands, isSlashMode } = useSlashCommands(
      textAreaValue
    );

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        setTextAreaValue(event.target.value);
      },
      []
    );

    const handleStop = useCallback(() => {
      if (!convId) return;
      stopGenerating(convId);
    }, [convId, stopGenerating]);

    const handleRecord: SpeechRecordCallback = useCallback((text: string) => {
      setTextAreaValue(text);
    }, []);

    const handleSlashSelect = useCallback(
      (command: string) => {
        // Handle slash commands
        if (command === 'model') {
          setTextAreaValue('');
          navigate('/settings');
          return;
        }
        if (command === 'system') {
          setTextAreaValue('');
          navigate('/settings');
          return;
        }
        if (command === 'clear') {
          setTextAreaValue('');
          setSlashCmd(null);
          return;
        }
        if (command === 'help') {
          setTextAreaValue('');
          toast('Ctrl+N: New chat | Ctrl+B: Toggle sidebar | Ctrl+K: Search | Ctrl+,: Settings', { duration: 5000 });
          return;
        }
        setTextAreaValue('');
      },
      [navigate]
    );

    useEffect(() => {
      if (!textAreaRef.current) return;
      if (prefilledContent) {
        setTextAreaValue(prefilledContent);
      }
      if (isPrefilledSend) handleSendWithDraftClear();
      else textAreaRef.current.focus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPrefilledSend, prefilledContent]);

    // Intercept Enter for slash mode
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;

      // Handle slash command selection
      if (isSlashMode && e.key === 'Enter' && !e.shiftKey && filteredCommands.length > 0) {
        e.preventDefault();
        handleSlashSelect(filteredCommands[0].name);
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        if (isSlashMode) {
          e.preventDefault();
          handleSlashSelect(textAreaValue.trim().slice(1));
          return;
        }
        e.preventDefault();
        handleSendWithDraftClear();
      }

      // Escape closes slash picker
      if (e.key === 'Escape' && isSlashMode) {
        setTextAreaValue('');
      }
    };

    return (
      <div
        className="group shrink-0 w-full md:max-w-md focus-within:md:max-w-2xl lg:max-w-lg focus-within:lg:max-w-3xl xl:max-w-3xl focus-within:xl:max-w-4xl bg-base-100 mx-auto p-1 md:p-2"
        aria-label={t('chatInput.ariaLabels.chatInput')}
      >
        <DropzoneArea
          inputId="new-message-file-upload"
          extraContext={extraContext}
          disabled={isPending}
        >
          <div
            className="bg-base-200 flex flex-col outline-0 focus-within:outline-1 rounded-lg shadow-sm xl:shadow-md p-2"
            tabIndex={0}
          >
            <AutoSizingTextArea
              className="text-base p-0 px-2 max-md:min-h-12"
              variant="transparent"
              size="full"
              placeholder={t('chatInput.placeholder')}
              ref={textAreaRef}
              value={textAreaValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            {/* Slash command picker */}
            {isSlashMode && filteredCommands.length > 0 && (
              <SlashCommandPicker
                commands={filteredCommands}
                onSelect={handleSlashSelect}
              />
            )}

            {/* buttons area */}
            <div className="hidden group-focus-within:flex items-center justify-between mt-2">
              <div className="flex gap-2 items-center">
                <Label
                  className={isPending ? 'btn-disabled' : ''}
                  variant="btn-ghost"
                  size="icon-xl"
                  htmlFor="new-message-file-upload"
                  aria-label={t('chatInput.ariaLabels.uploadFile')}
                  tabIndex={0}
                  role="button"
                >
                  <Icon size="md">
                    <LuPaperclip />
                  </Icon>
                </Label>

                <Button
                  className="xl:hidden"
                  variant="ghost"
                  size="icon-xl"
                  title={t('header.title.settings')}
                  aria-label={t('header.ariaLabels.settings')}
                  onClick={() => navigate('/settings')}
                >
                  <TbAdjustmentsHorizontal className="lucide h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center">
                {IS_SPEECH_RECOGNITION_SUPPORTED && !isPending && (
                  <SpeechToText onRecord={handleRecord}>
                    {({ isRecording, startRecording, stopRecording }) => (
                      <>
                        {!isRecording && (
                          <Button
                            className="mr-2"
                            variant="ghost"
                            size="icon-xl"
                            onClick={startRecording}
                            title="Record"
                            aria-label="Start Recording"
                          >
                            <Icon size="md">
                              <LuMic />
                            </Icon>
                          </Button>
                        )}
                        {isRecording && (
                          <Button
                            className="mr-2"
                            variant="ghost"
                            size="icon-xl"
                            onClick={stopRecording}
                            title="Stop"
                            aria-label="Stop Recording"
                          >
                            <Icon size="md">
                              <LuCircleStop />
                            </Icon>
                          </Button>
                        )}
                      </>
                    )}
                  </SpeechToText>
                )}

                {isPending && (
                  <Button variant="neutral" size="icon-xl" onClick={handleStop}>
                    <Icon size="sm" variant="current">
                      <LuSquare />
                    </Icon>
                  </Button>
                )}

                {!isPending && (
                  <Button
                    variant="neutral"
                    size="icon-xl"
                    onClick={handleSendWithDraftClear}
                    aria-label={t('chatInput.ariaLabels.send')}
                  >
                    <Icon size="md">
                      <LuArrowUp />
                    </Icon>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DropzoneArea>
      </div>
    );
  }
);
