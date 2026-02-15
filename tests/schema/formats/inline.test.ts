import { describe, expect, it } from 'vitest';
import {
  backgroundFormat,
  boldFormat,
  codeFormat,
  colorFormat,
  italicFormat,
  linkFormat,
  markFormat,
  strikeFormat,
  subscriptFormat,
  superscriptFormat,
  underlineFormat,
} from '../../../src/schema/formats/inline';

describe('Inline Formats', () => {
  describe('boldFormat', () => {
    it('should have correct name and scope', () => {
      expect(boldFormat.name).toBe('bold');
      expect(boldFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(boldFormat.validate!(true)).toBe(true);
      expect(boldFormat.validate!(false)).toBe(false);
    });
  });

  describe('italicFormat', () => {
    it('should have correct name and scope', () => {
      expect(italicFormat.name).toBe('italic');
      expect(italicFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(italicFormat.validate!(true)).toBe(true);
      expect(italicFormat.validate!(false)).toBe(false);
    });
  });

  describe('underlineFormat', () => {
    it('should have correct name and scope', () => {
      expect(underlineFormat.name).toBe('underline');
      expect(underlineFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(underlineFormat.validate!(true)).toBe(true);
      expect(underlineFormat.validate!(false)).toBe(false);
    });
  });

  describe('strikeFormat', () => {
    it('should have correct name and scope', () => {
      expect(strikeFormat.name).toBe('strike');
      expect(strikeFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(strikeFormat.validate!(true)).toBe(true);
      expect(strikeFormat.validate!(false)).toBe(false);
    });
  });

  describe('codeFormat', () => {
    it('should have correct name and scope', () => {
      expect(codeFormat.name).toBe('code');
      expect(codeFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(codeFormat.validate!(true)).toBe(true);
      expect(codeFormat.validate!(false)).toBe(false);
    });
  });

  describe('linkFormat', () => {
    it('should have correct name and scope', () => {
      expect(linkFormat.name).toBe('link');
      expect(linkFormat.scope).toBe('inline');
    });

    it('should normalize by trimming', () => {
      expect(linkFormat.normalize!('  https://example.com  ')).toBe('https://example.com');
    });

    it('should validate absolute URLs', () => {
      expect(linkFormat.validate!('https://example.com')).toBe(true);
      expect(linkFormat.validate!('http://example.com')).toBe(true);
    });

    it('should validate relative URLs', () => {
      expect(linkFormat.validate!('/path/to/page')).toBe(true);
      expect(linkFormat.validate!('./relative')).toBe(true);
      expect(linkFormat.validate!('../parent')).toBe(true);
    });

    it('should validate protocol-relative URLs', () => {
      expect(linkFormat.validate!('//example.com')).toBe(true);
    });

    it('should validate mailto and tel', () => {
      expect(linkFormat.validate!('mailto:test@example.com')).toBe(true);
      expect(linkFormat.validate!('tel:+1234567890')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(linkFormat.validate!('')).toBe(false);
      expect(linkFormat.validate!('not a url')).toBe(false);
      expect(linkFormat.validate!('ftp://example.com')).toBe(false);
    });
  });

  describe('colorFormat', () => {
    it('should have correct name and scope', () => {
      expect(colorFormat.name).toBe('color');
      expect(colorFormat.scope).toBe('inline');
    });

    it('should normalize colors to hex', () => {
      expect(colorFormat.normalize!('red')).toBe('#ff0000');
      expect(colorFormat.normalize!('#FF0000')).toBe('#ff0000');
      expect(colorFormat.normalize!('rgb(255, 0, 0)')).toBe('#ff0000');
    });

    it('should validate valid colors', () => {
      expect(colorFormat.validate!('#ff0000')).toBe(true);
      expect(colorFormat.validate!('red')).toBe(true);
      expect(colorFormat.validate!('rgb(255, 0, 0)')).toBe(true);
    });

    it('should reject invalid colors', () => {
      expect(colorFormat.validate!('not-a-color')).toBe(false);
      expect(colorFormat.validate!('')).toBe(false);
    });
  });

  describe('backgroundFormat', () => {
    it('should have correct name and scope', () => {
      expect(backgroundFormat.name).toBe('background');
      expect(backgroundFormat.scope).toBe('inline');
    });

    it('should normalize colors to hex', () => {
      expect(backgroundFormat.normalize!('blue')).toBe('#0000ff');
    });

    it('should validate valid colors', () => {
      expect(backgroundFormat.validate!('#0000ff')).toBe(true);
      expect(backgroundFormat.validate!('blue')).toBe(true);
    });
  });

  describe('subscriptFormat', () => {
    it('should have correct name and scope', () => {
      expect(subscriptFormat.name).toBe('subscript');
      expect(subscriptFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(subscriptFormat.validate!(true)).toBe(true);
      expect(subscriptFormat.validate!(false)).toBe(false);
    });
  });

  describe('superscriptFormat', () => {
    it('should have correct name and scope', () => {
      expect(superscriptFormat.name).toBe('superscript');
      expect(superscriptFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(superscriptFormat.validate!(true)).toBe(true);
      expect(superscriptFormat.validate!(false)).toBe(false);
    });
  });

  describe('markFormat', () => {
    it('should have correct name and scope', () => {
      expect(markFormat.name).toBe('mark');
      expect(markFormat.scope).toBe('inline');
    });

    it('should validate true only', () => {
      expect(markFormat.validate!(true)).toBe(true);
      expect(markFormat.validate!(false)).toBe(false);
    });
  });
});
