// Sprite primitives — match the .dc.html data layout exactly.

import type { CSSProperties } from 'react';

export type ActionName =
  | 'walk'
  | 'fall'
  | 'float'
  | 'dig'
  | 'bash'
  | 'build'
  | 'block'
  | 'idle'
  | 'exit'
  | 'splat';

// [left, top, width, height, color, optional style overrides]
export type Block =
  | [number, number, number, number, string]
  | [number, number, number, number, string, CSSProperties];

export type Frame = {
  rot: number;
  b: Block[];
};

export type Action = {
  fps: number;
  frames: Frame[];
};
