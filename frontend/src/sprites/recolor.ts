// Port of recolor() from docs/design-concept/SupaTroppers.dc.html:455.
// Replaces the two hardcoded body colors in the sprite data with the
// player's palette values; everything else (skin, eyes, accents) is shared.

import { SPRITE_BODY_SRC, SPRITE_DARK_SRC } from '@supatroppers/shared';
import type { Block } from './types';

export function recolor(blocks: Block[], main: string, dark: string): Block[] {
  return blocks.map((bl) => {
    const c = bl[4];
    const next: string = c === SPRITE_BODY_SRC ? main : c === SPRITE_DARK_SRC ? dark : c;
    const style = bl[5];
    return style
      ? [bl[0], bl[1], bl[2], bl[3], next, style]
      : [bl[0], bl[1], bl[2], bl[3], next];
  });
}
