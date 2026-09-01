/**
 * Builds the message hierarchy for display.
 * Returns a flat list of MessageDisplay objects from root to leaf.
 */
import { Message, MessageDisplay } from '../types';

export function getListMessageDisplay(
  allMessages: Readonly<Message[]>,
  currNodeId: number
): MessageDisplay[] {
  if (!allMessages || allMessages.length === 0) return [];

  const nodeMap = new Map<number, Message>();
  for (const msg of allMessages) {
    nodeMap.set(msg.id, msg);
  }

  // Find the leaf node to display
  let leafNode: Message | undefined = nodeMap.get(currNodeId);
  if (!leafNode) {
    // Fallback: find the latest message
    let latestTime = -1;
    for (const msg of allMessages) {
      if (msg.timestamp > latestTime && msg.type === 'text') {
        leafNode = msg;
        latestTime = msg.timestamp;
      }
    }
    if (!leafNode) return [];
  }

  // Build path from leaf to root
  const path: Message[] = [];
  let curr: Message | undefined = leafNode;
  while (curr) {
    if (curr.type === 'text') {
      path.push(curr);
    }
    curr = nodeMap.get(curr.parent);
  }
  path.reverse(); // Now ordered from root to leaf

  // Build display objects with sibling info
  return path.map((msg) => {
    const parent = nodeMap.get(msg.parent);
    const siblingIds = parent?.children || [msg.id];
    const currIdx = siblingIds.indexOf(msg.id);
    return {
      msg,
      siblingLeafNodeIds: siblingIds,
      siblingCurrIdx: currIdx >= 0 ? currIdx : 0,
      isPending: false,
    };
  });
}

/**
 * Check if a conversation has branches (multiple children on any node)
 */
export function conversationHasBranches(messages: Readonly<Message[]>): boolean {
  for (const msg of messages) {
    if (msg.children.length > 1) return true;
  }
  return false;
}

/**
 * Count total branches in a conversation
 */
export function countBranches(messages: Readonly<Message[]>): number {
  let count = 0;
  for (const msg of messages) {
    if (msg.children.length > 1) {
      count += msg.children.length - 1;
    }
  }
  return count;
}
