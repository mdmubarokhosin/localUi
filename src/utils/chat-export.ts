/**
 * Utilities for exporting chat conversations in various formats.
 */

import { Message } from '../types';
import { dateFormatter } from './formatting';

/**
 * Formats a message timestamp for display in exported files.
 */
function formatTimestamp(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp));
}

/**
 * Converts an array of messages to a Markdown-formatted string.
 *
 * @param messages - The messages to export.
 * @param convName - The conversation name used as the document title.
 * @returns A Markdown string representing the conversation.
 */
export function exportAsMarkdown(
  messages: Readonly<Message[]>,
  convName: string
): string {
  const lines: string[] = [];
  lines.push(`# ${convName}`);
  lines.push('');
  lines.push(`_Exported: ${formatTimestamp(Date.now())}_`);
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    if (msg.type === 'root') continue;

    const label =
      msg.role === 'user'
        ? '**User**'
        : msg.role === 'assistant'
          ? `**Assistant${msg.model ? ` (${msg.model})` : ''}**`
          : '**System**';

    lines.push(`### ${label}`);
    lines.push(`_${formatTimestamp(msg.timestamp)}_`);
    lines.push('');
    lines.push(msg.content);

    if (msg.reasoning_content) {
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>Reasoning</summary>');
      lines.push('');
      lines.push(msg.reasoning_content);
      lines.push('');
      lines.push('</details>');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Converts an array of messages to a plain text string.
 *
 * @param messages - The messages to export.
 * @param convName - The conversation name used as the document title.
 * @returns A plain text string representing the conversation.
 */
export function exportAsText(
  messages: Readonly<Message[]>,
  convName: string
): string {
  const lines: string[] = [];
  lines.push(convName);
  lines.push('='.repeat(convName.length));
  lines.push(`Exported: ${formatTimestamp(Date.now())}`);
  lines.push('');

  for (const msg of messages) {
    if (msg.type === 'root') continue;

    const roleLabel =
      msg.role === 'user'
        ? 'User'
        : msg.role === 'assistant'
          ? `Assistant${msg.model ? ` (${msg.model})` : ''}`
          : 'System';

    lines.push(`[${formatTimestamp(msg.timestamp)}] ${roleLabel}:`);
    lines.push(msg.content);

    if (msg.reasoning_content) {
      lines.push('--- Reasoning ---');
      lines.push(msg.reasoning_content);
      lines.push('--- End Reasoning ---');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Converts an array of messages to a pretty-printed JSON string.
 *
 * @param messages - The messages to export.
 * @param convName - The conversation name included in the output structure.
 * @returns A JSON string representing the conversation.
 */
export function exportAsJSON(
  messages: Readonly<Message[]>,
  convName: string
): string {
  const exportData = {
    name: convName,
    exportedAt: new Date().toISOString(),
    messages: messages
      .filter((msg) => msg.type !== 'root')
      .map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model ?? null,
        timestamp: new Date(msg.timestamp).toISOString(),
        reasoning_content: msg.reasoning_content ?? null,
      })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Triggers a browser file download for the given content.
 *
 * @param content - The file content as a string.
 * @param filename - The desired file name for the download.
 * @param mimeType - The MIME type of the file.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
