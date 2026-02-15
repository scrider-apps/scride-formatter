import { describe, expect, it } from 'vitest';
import type { Format } from '../../src/schema/Format';
import { Registry } from '../../src/schema/Registry';

// Test formats
const boldFormat: Format<boolean> = {
  name: 'bold',
  scope: 'inline',
  validate: (value) => typeof value === 'boolean',
};

const italicFormat: Format<boolean> = {
  name: 'italic',
  scope: 'inline',
  validate: (value) => typeof value === 'boolean',
};

const headerFormat: Format<number> = {
  name: 'header',
  scope: 'block',
  normalize: (value) => Math.max(1, Math.min(6, Math.floor(value))),
  validate: (value) => Number.isInteger(value) && value >= 1 && value <= 6,
};

const colorFormat: Format<string> = {
  name: 'color',
  scope: 'inline',
  normalize: (value) => value.toLowerCase(),
  validate: (value) => /^#[0-9a-f]{6}$/i.test(value),
};

const imageFormat: Format<string> = {
  name: 'image',
  scope: 'embed',
};

describe('Registry', () => {
  describe('register', () => {
    it('should register a single format', () => {
      const registry = new Registry();
      registry.register(boldFormat);

      expect(registry.has('bold')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should register multiple formats', () => {
      const registry = new Registry();
      registry.register([boldFormat, italicFormat, headerFormat]);

      expect(registry.has('bold')).toBe(true);
      expect(registry.has('italic')).toBe(true);
      expect(registry.has('header')).toBe(true);
      expect(registry.size).toBe(3);
    });

    it('should support chaining', () => {
      const registry = new Registry().register(boldFormat).register(italicFormat);

      expect(registry.size).toBe(2);
    });

    it('should throw on duplicate registration', () => {
      const registry = new Registry().register(boldFormat);

      expect(() => registry.register(boldFormat)).toThrow('already registered');
    });
  });

  describe('get', () => {
    it('should return format by name', () => {
      const registry = new Registry().register(boldFormat);

      expect(registry.get('bold')).toBe(boldFormat);
    });

    it('should return undefined for unknown format', () => {
      const registry = new Registry();

      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('getByScope', () => {
    it('should return formats by scope', () => {
      const registry = new Registry().register([
        boldFormat,
        italicFormat,
        colorFormat,
        headerFormat,
        imageFormat,
      ]);

      const inlineFormats = registry.getByScope('inline');
      const blockFormats = registry.getByScope('block');
      const embedFormats = registry.getByScope('embed');

      expect(inlineFormats).toHaveLength(3);
      expect(blockFormats).toHaveLength(1);
      expect(embedFormats).toHaveLength(1);
    });

    it('should return empty array for scope with no formats', () => {
      const registry = new Registry().register(boldFormat);

      expect(registry.getByScope('embed')).toEqual([]);
    });
  });

  describe('getNames', () => {
    it('should return all format names', () => {
      const registry = new Registry().register([boldFormat, italicFormat]);

      expect(registry.getNames()).toEqual(['bold', 'italic']);
    });
  });

  describe('normalize', () => {
    it('should normalize attributes', () => {
      const registry = new Registry().register(colorFormat).register(headerFormat);

      const result = registry.normalize({
        color: '#FF0000',
        header: 3.7,
      });

      expect(result).toEqual({
        color: '#ff0000',
        header: 3,
      });
    });

    it('should pass through unknown attributes', () => {
      const registry = new Registry().register(boldFormat);

      const result = registry.normalize({
        bold: true,
        unknown: 'value',
      });

      expect(result).toEqual({
        bold: true,
        unknown: 'value',
      });
    });

    it('should return undefined for undefined input', () => {
      const registry = new Registry();

      expect(registry.normalize(undefined)).toBeUndefined();
    });

    it('should return original if no changes', () => {
      const registry = new Registry().register(boldFormat);
      const attrs = { bold: true };

      const result = registry.normalize(attrs);

      expect(result).toBe(attrs);
    });
  });

  describe('validate', () => {
    it('should return true for valid attributes', () => {
      const registry = new Registry().register(boldFormat).register(headerFormat);

      expect(registry.validate({ bold: true, header: 3 })).toBe(true);
    });

    it('should return false for invalid attributes', () => {
      const registry = new Registry().register(headerFormat);

      expect(registry.validate({ header: 10 })).toBe(false);
    });

    it('should return true for unknown attributes', () => {
      const registry = new Registry();

      expect(registry.validate({ unknown: 'value' })).toBe(true);
    });

    it('should return true for undefined', () => {
      const registry = new Registry();

      expect(registry.validate(undefined)).toBe(true);
    });

    it('should return true for formats without validate', () => {
      const registry = new Registry().register(imageFormat);

      expect(registry.validate({ image: 'any-value' })).toBe(true);
    });
  });

  describe('sanitize', () => {
    it('should remove invalid attributes', () => {
      const registry = new Registry().register(headerFormat).register(boldFormat);

      const result = registry.sanitize({
        header: 10, // invalid
        bold: true, // valid
      });

      expect(result).toEqual({ bold: true });
    });

    it('should remove unknown attributes by default', () => {
      const registry = new Registry().register(boldFormat);

      const result = registry.sanitize({
        bold: true,
        unknown: 'value',
      });

      expect(result).toEqual({ bold: true });
    });

    it('should keep unknown attributes if removeUnknown is false', () => {
      const registry = new Registry().register(boldFormat);

      const result = registry.sanitize(
        {
          bold: true,
          unknown: 'value',
        },
        false,
      );

      expect(result).toEqual({
        bold: true,
        unknown: 'value',
      });
    });

    it('should normalize while sanitizing', () => {
      const registry = new Registry().register(colorFormat);

      const result = registry.sanitize({
        color: '#FF0000',
      });

      expect(result).toEqual({ color: '#ff0000' });
    });

    it('should return undefined for empty result', () => {
      const registry = new Registry().register(headerFormat);

      const result = registry.sanitize({ header: 10 });

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      const registry = new Registry();

      expect(registry.sanitize(undefined)).toBeUndefined();
    });
  });
});
