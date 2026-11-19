// Chat input rules: 1 to 500 characters after trimming. Pure, no React.

export const CHAT_MAX_LENGTH = 500;

export type ChatInputResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'too_long' };

/** Accept a message only when its trimmed length is from 1 to 500. */
export function validateChatInput(raw: string): ChatInputResult {
  const text = raw.trim();
  if (text.length === 0) return { ok: false, reason: 'empty' };
  if (text.length > CHAT_MAX_LENGTH) return { ok: false, reason: 'too_long' };
  return { ok: true, text };
}

/** Keep what was typed, but never more than 500 characters. */
export function clampChatInput(raw: string): string {
  return raw.length > CHAT_MAX_LENGTH ? raw.slice(0, CHAT_MAX_LENGTH) : raw;
}
