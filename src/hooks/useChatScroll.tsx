import { useCallback, useEffect, useState } from 'react';

/**
 * Distance from bottom (in pixels) to trigger automatic scroll when near the bottom.
 * @default 100
 */
const TO_BOTTOM = 100;

/**
 * Delay (in milliseconds) before scrolling when using `scrollImmediate`.
 * @default 80
 */
const DELAY = 80;

/**
 * Custom hook for managing chat scroll behavior in a message container.
 */
export function useChatScroll(
  elementRef: React.RefObject<HTMLElement>
) {
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = element;
      const spaceToBottom = scrollHeight - scrollTop - clientHeight;
      setIsNearBottom(spaceToBottom < TO_BOTTOM);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [elementRef]);

  const scrollImmediate = useCallback(
    (behavior: ScrollBehavior = 'auto', delay: number = DELAY) => {
      const element = elementRef?.current;
      if (!element) return;
      setTimeout(
        () => element.scrollTo({ top: element.scrollHeight, behavior }),
        delay
      );
    },
    [elementRef]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const element = elementRef?.current;
      if (!element) return;

      const { scrollHeight, scrollTop, clientHeight } = element;
      const spaceToBottom = scrollHeight - scrollTop - clientHeight;
      if (spaceToBottom < TO_BOTTOM) {
        element.scrollTo({ top: element.scrollHeight, behavior });
      }
    },
    [elementRef]
  );

  return { scrollImmediate, scrollToBottom, isNearBottom };
}
