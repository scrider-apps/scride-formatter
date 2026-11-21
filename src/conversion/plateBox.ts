/**
 * Width and position of a Dialog or Voice plate. The keys live on the title
 * line, the same way `quiz-width` and `quiz-float` live on a quiz title.
 * The rest of the plate (id, role, view, language, model) stays outside the schema.
 */

import type { AttributeMap } from '@scrider/delta';

import { parseBlockBoxFloat, parseBlockBoxLength } from '../schema/formats/block/block-box';

export const DIALOG_WIDTH_ATTR = 'dialog-width';
export const DIALOG_FLOAT_ATTR = 'dialog-float';
export const VOICE_WIDTH_ATTR = 'voice-width';
export const VOICE_FLOAT_ATTR = 'voice-float';

const PLATES = [
  { width: DIALOG_WIDTH_ATTR, float: DIALOG_FLOAT_ATTR },
  { width: VOICE_WIDTH_ATTR, float: VOICE_FLOAT_ATTR },
] as const;

/** HTML data-attributes and the width style for one line. Empty when the line has no box. */
export function plateBoxMarkup(attrs: AttributeMap | undefined): {
  markers: string;
  styles: string[];
} {
  let markers = '';
  const styles: string[] = [];
  for (const plate of PLATES) {
    const width = parseBlockBoxLength(attrs?.[plate.width]);
    const float = parseBlockBoxFloat(attrs?.[plate.float]);
    if (width != null) {
      markers += ` data-${plate.width}="${width}"`;
      styles.push(`width: ${width}px`);
    }
    if (float) markers += ` data-${plate.float}="${float}"`;
  }
  return { markers, styles };
}

/** Box keys painted on this element. A wrapper does not lend them to the lines inside. */
export function readPlateBoxAttributes(element: {
  getAttribute(name: string): string | null;
}): AttributeMap {
  const result: AttributeMap = {};
  for (const plate of PLATES) {
    const width = parseBlockBoxLength(element.getAttribute(`data-${plate.width}`));
    const float = parseBlockBoxFloat(element.getAttribute(`data-${plate.float}`));
    if (width != null) result[plate.width] = String(width);
    if (float) result[plate.float] = float;
  }
  return result;
}
