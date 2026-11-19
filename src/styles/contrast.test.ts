import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

const tokens: Record<string, string> = {};
for (const m of css.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) tokens[m[1] as string] = m[2] as string;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const c = (v: string): string => (v.startsWith('#') ? v : (tokens[v] as string));

// Body text pairs per mode skin: [foreground, background].
const TEXT: Record<string, Array<[string, string]>> = {
  shell: [['ink', 'paper'], ['ink-soft', 'paper'], ['plum', 'paper'], ['ink', '#fff3e6'], ['#8a1c1c', 'surface'], ['surface', 'plum']],
  chat: [['ink', 'chat-bg'], ['ink', 'surface'], ['ink-soft', 'surface'], ['ink', '#e3d4f0'], ['plum', 'surface'], ['plum', 'chat-bg'], ['ember', 'chat-bg']],
  exam: [['ink', 'paper'], ['ink-soft', 'paper'], ['ink', 'surface'], ['moss', 'paper'], ['ember', 'paper'], ['paper', 'ink']],
  board: [['ink', 'board-bg'], ['ink-soft', 'board-bg'], ['plum', 'board-bg'], ['moss', 'surface'], ['ember', 'surface'], ['ink-soft', 'surface'], ['ink', '#fff8e6']],
};
// Borders and focus rings need 3:1.
const NON_TEXT: Array<[string, string]> = [['stitch', 'paper'], ['stitch', 'chat-bg'], ['stitch', 'board-bg'], ['focus', 'paper'], ['focus', 'chat-bg'], ['focus', 'board-bg'], ['focus', 'surface']];

describe('contrast', () => {
  for (const [mode, pairs] of Object.entries(TEXT)) {
    for (const [fg, bg] of pairs) {
      it(`${mode}: ${fg} on ${bg} is at least 4.5:1`, () => {
        expect(ratio(c(fg), c(bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  for (const [fg, bg] of NON_TEXT) {
    it(`non-text: ${fg} on ${bg} is at least 3:1`, () => {
      expect(ratio(c(fg), c(bg))).toBeGreaterThanOrEqual(3);
    });
  }
});
