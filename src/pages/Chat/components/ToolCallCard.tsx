import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuChevronRight, LuWrench } from 'react-icons/lu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { Icon } from '../../../components';
import { ToolCall } from '../../../types';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export default memo(function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  let argsStr: string;
  try {
    argsStr = JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
  } catch {
    argsStr = toolCall.function.arguments;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="btn border-0 rounded-lg my-2 p-2 px-4 text-sm">
        <Icon size="md" variant="leftside">
          <LuWrench />
        </Icon>
        <span className="font-medium">
          {t('chatScreen.labels.toolCall')}: {toolCall.function.name}
        </span>
        {!open && (
          <Icon size="md" variant="rightside">
            <LuChevronRight />
          </Icon>
        )}
        {open && (
          <Icon size="md" variant="rightside">
            <LuChevronDown />
          </Icon>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-base-200 rounded-lg p-3 ml-2 text-sm">
          <div className="text-xs opacity-60 mb-1">
            {t('chatScreen.labels.toolCallArgs')}:
          </div>
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">{argsStr}</pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
