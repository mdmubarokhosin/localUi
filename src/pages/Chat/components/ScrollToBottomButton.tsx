import { memo } from 'react';
import { LuArrowDown } from 'react-icons/lu';
import { Button, Icon } from '../../../components';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

export default memo(function ScrollToBottomButton({ visible, onClick }: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
      <Button
        variant="neutral"
        size="small"
        className="rounded-full shadow-lg"
        onClick={onClick}
        aria-label="Scroll to bottom"
      >
        <Icon size="sm">
          <LuArrowDown />
        </Icon>
      </Button>
    </div>
  );
});
