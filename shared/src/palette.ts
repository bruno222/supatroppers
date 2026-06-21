// The 6 player colors from the design mockup PAL() table
// (docs/design-concept/SupaTroppers.dc.html:454). Indexes are stable; the Brain
// assigns one on player_hello_ack.
//
// `main` is the body fill, `dark` the outline/pants tone. Mira's pair is
// the canonical sprite source — recolor() rewrites every other player's
// sprites from Mira's hard-coded values to these.

export type PlayerColor = {
  name: string;
  main: string;
  dark: string;
};

export const PALETTE: PlayerColor[] = [
  { name: 'Mira', main: 'oklch(0.78 0.15 155)', dark: 'oklch(0.62 0.13 155)' },
  { name: 'Juno', main: 'oklch(0.80 0.14 85)',  dark: 'oklch(0.64 0.13 85)'  },
  { name: 'Kato', main: 'oklch(0.72 0.13 210)', dark: 'oklch(0.56 0.12 210)' },
  { name: 'Lin',  main: 'oklch(0.62 0.16 268)', dark: 'oklch(0.48 0.14 268)' },
  { name: 'Bex',  main: 'oklch(0.66 0.18 330)', dark: 'oklch(0.52 0.16 330)' },
  { name: 'Tup',  main: 'oklch(0.68 0.17 30)',  dark: 'oklch(0.54 0.15 30)'  },
];

// The two colors hardcoded into the sprite data that recolor() rewrites.
export const SPRITE_BODY_SRC = 'oklch(0.78 0.15 155)';
export const SPRITE_DARK_SRC = 'oklch(0.58 0.13 155)';

export const PALETTE_SIZE = PALETTE.length;
