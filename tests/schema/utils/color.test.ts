import { describe, expect, it } from 'vitest';
import {
  getNamedColors,
  isValidColor,
  isValidHexColor,
  toHexColor,
} from '../../../src/schema/utils/color';

describe('toHexColor', () => {
  describe('hex colors', () => {
    it('should pass through valid 6-digit hex', () => {
      expect(toHexColor('#ff0000')).toBe('#ff0000');
      expect(toHexColor('#00ff00')).toBe('#00ff00');
      expect(toHexColor('#0000ff')).toBe('#0000ff');
    });

    it('should lowercase hex colors', () => {
      expect(toHexColor('#FF0000')).toBe('#ff0000');
      expect(toHexColor('#AbCdEf')).toBe('#abcdef');
    });

    it('should expand 3-digit hex', () => {
      expect(toHexColor('#f00')).toBe('#ff0000');
      expect(toHexColor('#0f0')).toBe('#00ff00');
      expect(toHexColor('#00f')).toBe('#0000ff');
      expect(toHexColor('#abc')).toBe('#aabbcc');
    });

    it('should strip alpha from 8-digit hex', () => {
      expect(toHexColor('#ff0000ff')).toBe('#ff0000');
      expect(toHexColor('#00ff0080')).toBe('#00ff00');
    });

    it('should handle 4-digit hex (rgba shorthand)', () => {
      expect(toHexColor('#f00f')).toBe('#ff0000');
    });
  });

  describe('named colors', () => {
    it('should convert basic named colors', () => {
      expect(toHexColor('red')).toBe('#ff0000');
      expect(toHexColor('green')).toBe('#008000');
      expect(toHexColor('blue')).toBe('#0000ff');
      expect(toHexColor('white')).toBe('#ffffff');
      expect(toHexColor('black')).toBe('#000000');
    });

    it('should convert extended named colors', () => {
      expect(toHexColor('coral')).toBe('#ff7f50');
      expect(toHexColor('crimson')).toBe('#dc143c');
      expect(toHexColor('rebeccapurple')).toBe('#663399');
    });

    it('should be case-insensitive', () => {
      expect(toHexColor('RED')).toBe('#ff0000');
      expect(toHexColor('Red')).toBe('#ff0000');
      expect(toHexColor('ReD')).toBe('#ff0000');
    });

    it('should trim whitespace', () => {
      expect(toHexColor('  red  ')).toBe('#ff0000');
    });
  });

  describe('rgb colors', () => {
    it('should convert rgb with commas', () => {
      expect(toHexColor('rgb(255, 0, 0)')).toBe('#ff0000');
      expect(toHexColor('rgb(0, 255, 0)')).toBe('#00ff00');
      expect(toHexColor('rgb(0, 0, 255)')).toBe('#0000ff');
    });

    it('should convert rgb with spaces', () => {
      expect(toHexColor('rgb(255 0 0)')).toBe('#ff0000');
    });

    it('should convert rgba', () => {
      expect(toHexColor('rgba(255, 0, 0, 1)')).toBe('#ff0000');
      expect(toHexColor('rgba(255, 0, 0, 0.5)')).toBe('#ff0000');
    });

    it('should convert rgba with slash syntax', () => {
      expect(toHexColor('rgba(255 0 0 / 0.5)')).toBe('#ff0000');
    });

    it('should clamp values', () => {
      expect(toHexColor('rgb(300, 0, 0)')).toBe('#ff0000');
      expect(toHexColor('rgb(-10, 0, 0)')).toBe('#000000');
    });

    it('should handle mixed values', () => {
      expect(toHexColor('rgb(128, 64, 32)')).toBe('#804020');
    });
  });

  describe('invalid colors', () => {
    it('should return as-is for unknown formats', () => {
      expect(toHexColor('hsl(0, 100%, 50%)')).toBe('hsl(0, 100%, 50%)');
      expect(toHexColor('not-a-color')).toBe('not-a-color');
    });
  });
});

describe('isValidHexColor', () => {
  it('should accept valid 6-digit hex', () => {
    expect(isValidHexColor('#ff0000')).toBe(true);
    expect(isValidHexColor('#FF0000')).toBe(true);
    expect(isValidHexColor('#abcdef')).toBe(true);
  });

  it('should accept valid 3-digit hex', () => {
    expect(isValidHexColor('#f00')).toBe(true);
    expect(isValidHexColor('#abc')).toBe(true);
  });

  it('should reject invalid hex', () => {
    expect(isValidHexColor('#ff000')).toBe(false);
    expect(isValidHexColor('#ff00000')).toBe(false);
    expect(isValidHexColor('ff0000')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
  });
});

describe('isValidColor', () => {
  it('should accept hex colors', () => {
    expect(isValidColor('#ff0000')).toBe(true);
    expect(isValidColor('#f00')).toBe(true);
    expect(isValidColor('#ff0000ff')).toBe(true);
  });

  it('should accept named colors', () => {
    expect(isValidColor('red')).toBe(true);
    expect(isValidColor('cornflowerblue')).toBe(true);
    expect(isValidColor('RED')).toBe(true);
  });

  it('should accept rgb/rgba', () => {
    expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
    expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
    expect(isValidColor('rgb(255 0 0)')).toBe(true);
  });

  it('should reject invalid colors', () => {
    expect(isValidColor('not-a-color')).toBe(false);
    expect(isValidColor('#gggggg')).toBe(false);
  });
});

describe('getNamedColors', () => {
  it('should return array of named colors', () => {
    const colors = getNamedColors();

    expect(Array.isArray(colors)).toBe(true);
    expect(colors.length).toBeGreaterThan(100);
    expect(colors).toContain('red');
    expect(colors).toContain('rebeccapurple');
  });
});
