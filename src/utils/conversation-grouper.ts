import { Conversation } from '../types';
import LocalStorage from '../database/localStorage';

export interface GroupedConversations {
  title: string;
  conversations: Conversation[];
}

/**
 * Returns conversations grouped by date, with pinned conversations at the top.
 */
export function groupConversationsByDate(
  conversations: Conversation[],
  _language?: string
): GroupedConversations[] {
  const pinnedIds = new Set(LocalStorage.getPinnedConversations());
  const now = new Date();

  const pinned = conversations.filter((c) => pinnedIds.has(c.id));
  const unpinned = conversations.filter((c) => !pinnedIds.has(c.id));

  const groups: GroupedConversations[] = [];

  // Pinned group
  if (pinned.length > 0) {
    groups.push({ title: 'Pinned', conversations: pinned });
  }

  // Date groups for unpinned
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const week: Conversation[] = [];
  const month: Conversation[] = [];
  const older: Conversation[] = [];

  for (const conv of unpinned) {
    const t = conv.lastModified;
    if (t >= todayStart) today.push(conv);
    else if (t >= yesterdayStart) yesterday.push(conv);
    else if (t >= weekStart) week.push(conv);
    else if (t >= monthStart) month.push(conv);
    else older.push(conv);
  }

  if (today.length) groups.push({ title: 'Today', conversations: today });
  if (yesterday.length) groups.push({ title: 'Yesterday', conversations: yesterday });
  if (week.length) groups.push({ title: 'Previous 7 Days', conversations: week });
  if (month.length) groups.push({ title: 'Previous 30 Days', conversations: month });
  if (older.length) groups.push({ title: 'Older', conversations: older });

  return groups;
}
