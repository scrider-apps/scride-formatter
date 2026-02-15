/**
 * CSS Named Colors (full list)
 * https://www.w3.org/TR/css-color-4/#named-colors
 */
const NAMED_COLORS: Record<string, string> = {
  // Basic colors
  black: '#000000',
  silver: '#c0c0c0',
  gray: '#808080',
  white: '#ffffff',
  maroon: '#800000',
  red: '#ff0000',
  purple: '#800080',
  fuchsia: '#ff00ff',
  green: '#008000',
  lime: '#00ff00',
  olive: '#808000',
  yellow: '#ffff00',
  navy: '#000080',
  blue: '#0000ff',
  teal: '#008080',
  aqua: '#00ffff',

  // Extended colors
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  blanchedalmond: '#ffebcd',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  oldlace: '#fdf5e6',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  whitesmoke: '#f5f5f5',
  yellowgreen: '#9acd32',

  // CSS4 colors
  rebeccapurple: '#663399',
};

/**
 * Convert any color format to lowercase hex (#rrggbb)
 *
 * Supports:
 * - Hex: #rgb, #rrggbb, #rrggbbaa
 * - RGB: rgb(r, g, b), rgb(r g b)
 * - RGBA: rgba(r, g, b, a), rgba(r g b / a)
 * - Named colors: red, blue, etc.
 *
 * @param value - Color value to convert
 * @returns Lowercase hex color (#rrggbb) or original value if not recognized
 */
export function toHexColor(value: string): string {
  const trimmed = value.trim().toLowerCase();

  // Already hex
  if (trimmed.startsWith('#')) {
    return normalizeHex(trimmed);
  }

  // Named color
  if (NAMED_COLORS[trimmed]) {
    return NAMED_COLORS[trimmed];
  }

  // RGB/RGBA
  if (trimmed.startsWith('rgb')) {
    return parseRgb(trimmed);
  }

  // HSL (basic support - convert to RGB first would be complex)
  // For now, return as-is if not recognized
  return value;
}

/**
 * Normalize hex color to #rrggbb format
 */
function normalizeHex(hex: string): string {
  // Remove # prefix
  let color = hex.slice(1);

  // Expand shorthand (#rgb → #rrggbb)
  if (color.length === 3) {
    color =
      color.charAt(0) +
      color.charAt(0) +
      color.charAt(1) +
      color.charAt(1) +
      color.charAt(2) +
      color.charAt(2);
  }

  // Handle #rgba shorthand
  if (color.length === 4) {
    color =
      color.charAt(0) +
      color.charAt(0) +
      color.charAt(1) +
      color.charAt(1) +
      color.charAt(2) +
      color.charAt(2);
    // Ignore alpha
  }

  // Handle #rrggbbaa (ignore alpha)
  if (color.length === 8) {
    color = color.slice(0, 6);
  }

  // Validate
  if (!/^[0-9a-f]{6}$/.test(color)) {
    return '#' + color; // Return as-is if invalid
  }

  return '#' + color;
}

/**
 * Parse rgb/rgba to hex
 */
function parseRgb(value: string): string {
  // Match rgb(r, g, b) or rgba(r, g, b, a) or rgb(r g b) or rgb(r g b / a)
  // Supports negative numbers for clamping
  const match = value.match(
    /rgba?\s*\(\s*(-?\d+)\s*[,\s]\s*(-?\d+)\s*[,\s]\s*(-?\d+)(?:\s*[,/]\s*[\d.]+)?\s*\)/,
  );

  if (!match) {
    return value; // Return as-is if not parseable
  }

  const [, rStr, gStr, bStr] = match;
  if (!rStr || !gStr || !bStr) return value;

  const r = Math.max(0, Math.min(255, parseInt(rStr, 10)));
  const g = Math.max(0, Math.min(255, parseInt(gStr, 10)));
  const b = Math.max(0, Math.min(255, parseInt(bStr, 10)));

  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Convert number to 2-digit hex
 */
function toHex(n: number): string {
  const hex = n.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Check if a value is a valid hex color
 *
 * @param value - Value to check
 * @returns true if valid hex color (#rrggbb or #rgb)
 */
export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

/**
 * Check if a value is a valid color (hex, rgb, rgba, or named)
 *
 * @param value - Value to check
 * @returns true if valid color
 */
export function isValidColor(value: string): boolean {
  const trimmed = value.trim().toLowerCase();

  // Hex
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return true;
  }

  // Named
  if (NAMED_COLORS[trimmed]) {
    return true;
  }

  // RGB/RGBA
  if (/^rgba?\s*\(\s*\d+\s*[,\s]\s*\d+\s*[,\s]\s*\d+(?:\s*[,/]\s*[\d.]+)?\s*\)$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Get list of all named colors
 */
export function getNamedColors(): string[] {
  return Object.keys(NAMED_COLORS);
}
