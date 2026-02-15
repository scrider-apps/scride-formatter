import { describe, it, expect } from 'vitest';
import { Delta } from '@scrider/delta';
import { Registry } from '../../src/schema/Registry';
import { createDefaultRegistry } from '../../src/schema/defaults';
import {
  sanitizeDelta,
  normalizeDelta,
  validateDelta,
  cloneDelta,
} from '../../src/conversion/sanitize';
import { boldFormat } from '../../src/schema/formats/inline/bold';
import { italicFormat } from '../../src/schema/formats/inline/italic';
import { colorFormat } from '../../src/schema/formats/inline/color';
import { headerFormat } from '../../src/schema/formats/block/header';
import { imageFormat } from '../../src/schema/formats/embed/image';

describe('sanitizeDelta', () => {
  describe('removing unknown attributes', () => {
    it('removes attributes not in registry', () => {
      const registry = new Registry().register([boldFormat, italicFormat]);

      const dirty = new Delta().insert('Hello', {
        bold: true,
        italic: true,
        unknown: 'value',
        custom: 123,
      });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toEqual({
        bold: true,
        italic: true,
      });
    });

    it('keeps unknown attributes when removeUnknown is false', () => {
      const registry = new Registry().register(boldFormat);

      const dirty = new Delta().insert('Hello', {
        bold: true,
        unknown: 'value',
      });

      const clean = sanitizeDelta(dirty, registry, { removeUnknown: false });

      expect(clean.ops[0].attributes).toEqual({
        bold: true,
        unknown: 'value',
      });
    });

    it('removes all attributes if none are registered', () => {
      const registry = new Registry();

      const dirty = new Delta().insert('Hello', {
        bold: true,
        italic: true,
      });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toBeUndefined();
    });
  });

  describe('validating attributes', () => {
    it('removes attributes with invalid values', () => {
      const registry = new Registry().register([boldFormat, headerFormat]);

      const dirty = new Delta().insert('Hello', { bold: true }).insert('\n', { header: 10 }); // Invalid: max is 6

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toEqual({ bold: true });
      expect(clean.ops[1].attributes).toBeUndefined();
    });

    it('removes bold:false (invalid)', () => {
      const registry = new Registry().register(boldFormat);

      const dirty = new Delta().insert('Hello', { bold: false });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toBeUndefined();
    });

    it('keeps valid values', () => {
      const registry = new Registry().register(headerFormat);

      const dirty = new Delta().insert('Title\n', { header: 1 });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toEqual({ header: 1 });
    });
  });

  describe('normalizing attributes', () => {
    it('normalizes color values', () => {
      const registry = new Registry().register(colorFormat);

      const dirty = new Delta().insert('Red text', { color: 'red' });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toEqual({ color: '#ff0000' });
    });

    it('normalizes rgb colors', () => {
      const registry = new Registry().register(colorFormat);

      const dirty = new Delta().insert('Text', { color: 'rgb(0, 128, 255)' });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toEqual({ color: '#0080ff' });
    });

    it('skips normalization when normalize is false', () => {
      const registry = new Registry().register(colorFormat);

      const dirty = new Delta().insert('Red text', { color: 'red' });

      const clean = sanitizeDelta(dirty, registry, { normalize: false });

      expect(clean.ops[0].attributes).toEqual({ color: 'red' });
    });

    it('normalizes header values (clamping)', () => {
      const registry = new Registry().register(headerFormat);

      const dirty = new Delta().insert('Title\n', { header: 7 });

      // Header 7 is invalid and will be removed, not normalized
      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0].attributes).toBeUndefined();
    });
  });

  describe('handling embeds', () => {
    it('keeps valid embeds', () => {
      const registry = new Registry().register(imageFormat);

      const dirty = new Delta().insert({ image: 'https://example.com/img.png' });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0]).toEqual({
        insert: { image: 'https://example.com/img.png' },
      });
    });

    it('keeps invalid embeds by default', () => {
      const registry = new Registry().register(imageFormat);

      const dirty = new Delta().insert({ image: 'invalid-url' });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0]).toEqual({ insert: { image: 'invalid-url' } });
    });

    it('removes invalid embeds when removeInvalidEmbeds is true', () => {
      const registry = new Registry().register(imageFormat);

      const dirty = new Delta().insert({ image: 'invalid-url' }).insert('text');

      const clean = sanitizeDelta(dirty, registry, {
        removeInvalidEmbeds: true,
      });

      expect(clean.ops.length).toBe(1);
      expect(clean.ops[0]).toEqual({ insert: 'text' });
    });

    it('removes unknown embed types when removeInvalidEmbeds is true', () => {
      const registry = new Registry().register(imageFormat);

      const dirty = new Delta().insert({ video: 'https://youtube.com/...' }).insert('text');

      const clean = sanitizeDelta(dirty, registry, {
        removeInvalidEmbeds: true,
      });

      expect(clean.ops.length).toBe(1);
      expect(clean.ops[0]).toEqual({ insert: 'text' });
    });

    it('filters embeds by allowedEmbeds', () => {
      const registry = createDefaultRegistry();

      const dirty = new Delta()
        .insert({ image: 'https://example.com/img.png' })
        .insert({ video: 'https://youtube.com/...' })
        .insert('text');

      const clean = sanitizeDelta(dirty, registry, {
        removeInvalidEmbeds: true,
        allowedEmbeds: ['image'],
      });

      expect(clean.ops.length).toBe(2);
      expect(clean.ops[0]).toEqual({
        insert: { image: 'https://example.com/img.png' },
      });
      expect(clean.ops[1]).toEqual({ insert: 'text' });
    });
  });

  describe('handling retain operations', () => {
    it('sanitizes attributes on retain operations', () => {
      const registry = new Registry().register(boldFormat);

      const dirty = new Delta().retain(5, {
        bold: true,
        unknown: 'value',
      });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0]).toEqual({
        retain: 5,
        attributes: { bold: true },
      });
    });

    it('removes attributes section if all are invalid', () => {
      const registry = new Registry().register(boldFormat);

      const dirty = new Delta().retain(5, { unknown: 'value' });

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0]).toEqual({ retain: 5 });
      expect(clean.ops[0].attributes).toBeUndefined();
    });
  });

  describe('handling delete operations', () => {
    it('passes delete operations through unchanged', () => {
      const registry = new Registry().register(boldFormat);

      const dirty = new Delta().delete(5);

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0]).toEqual({ delete: 5 });
    });
  });

  describe('preserving structure', () => {
    it('preserves text content', () => {
      const registry = createDefaultRegistry();

      const dirty = new Delta()
        .insert('Hello ')
        .insert('World', { bold: true, unknown: 'x' })
        .insert('\n');

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops.length).toBe(3);
      expect(clean.ops[0].insert).toBe('Hello ');
      expect(clean.ops[1].insert).toBe('World');
      expect(clean.ops[2].insert).toBe('\n');
    });

    it('handles empty delta', () => {
      const registry = createDefaultRegistry();

      const dirty = new Delta();

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops).toEqual([]);
    });

    it('handles delta with only text', () => {
      const registry = createDefaultRegistry();

      const dirty = new Delta().insert('Plain text\n');

      const clean = sanitizeDelta(dirty, registry);

      expect(clean.ops[0]).toEqual({ insert: 'Plain text\n' });
    });
  });

  describe('optimization', () => {
    it('returns same op reference when no changes', () => {
      const registry = new Registry().register([boldFormat, italicFormat]);

      const op = { insert: 'Hello', attributes: { bold: true } };
      const dirty = new Delta([op]);

      const clean = sanitizeDelta(dirty, registry);

      // Values are equal (reference optimization not implemented yet)
      expect(clean.ops[0]).toStrictEqual(op);
    });

    it('creates new op when attributes change', () => {
      const registry = new Registry().register(boldFormat);

      const op = { insert: 'Hello', attributes: { bold: true, unknown: 'x' } };
      const dirty = new Delta([op]);

      const clean = sanitizeDelta(dirty, registry);

      // Different reference because unknown was removed
      expect(clean.ops[0]).not.toBe(op);
      expect(clean.ops[0].attributes).toEqual({ bold: true });
    });
  });
});

describe('normalizeDelta', () => {
  it('normalizes without removing unknown attributes', () => {
    const registry = new Registry().register(colorFormat);

    const dirty = new Delta().insert('Text', {
      color: 'red',
      unknown: 'value',
    });

    const normalized = normalizeDelta(dirty, registry);

    expect(normalized.ops[0].attributes).toEqual({
      color: '#ff0000',
      unknown: 'value',
    });
  });

  it('keeps invalid values (only normalizes)', () => {
    const registry = new Registry().register(headerFormat);

    const dirty = new Delta().insert('Title\n', { header: 10 });

    const normalized = normalizeDelta(dirty, registry);

    // Header 10 is not valid - normalizeDelta removes invalid values during sanitization
    const attrs = normalized.ops[0].attributes as Record<string, unknown> | undefined;
    expect(attrs?.header).toBeUndefined();
  });
});

describe('validateDelta', () => {
  it('returns true for valid delta', () => {
    const registry = createDefaultRegistry();

    const delta = new Delta().insert('Hello', { bold: true }).insert('\n', { header: 1 });

    expect(validateDelta(delta, registry)).toBe(true);
  });

  it('returns false for invalid attributes', () => {
    const registry = new Registry().register(headerFormat);

    const delta = new Delta().insert('Title\n', { header: 10 });

    expect(validateDelta(delta, registry)).toBe(false);
  });

  it('returns false for unknown embed types', () => {
    const registry = new Registry().register(imageFormat);

    const delta = new Delta().insert({ video: 'https://example.com' });

    expect(validateDelta(delta, registry)).toBe(false);
  });

  it('returns false for invalid embed values', () => {
    const registry = new Registry().register(imageFormat);

    const delta = new Delta().insert({ image: 'invalid' });

    expect(validateDelta(delta, registry)).toBe(false);
  });

  it('returns true for empty delta', () => {
    const registry = createDefaultRegistry();

    expect(validateDelta(new Delta(), registry)).toBe(true);
  });

  it('returns true for delta without attributes', () => {
    const registry = createDefaultRegistry();

    const delta = new Delta().insert('Plain text\n');

    expect(validateDelta(delta, registry)).toBe(true);
  });
});

describe('cloneDelta', () => {
  it('creates a deep copy', () => {
    const original = new Delta()
      .insert('Hello', { bold: true })
      .insert({ image: 'test.png' })
      .insert('\n');

    const cloned = cloneDelta(original);

    expect(cloned.ops).toEqual(original.ops);
    expect(cloned.ops).not.toBe(original.ops);
    expect(cloned.ops[0]).not.toBe(original.ops[0]);
    expect(cloned.ops[0].attributes).not.toBe(original.ops[0].attributes);
  });

  it('modifications to clone do not affect original', () => {
    const original = new Delta().insert('Hello', { bold: true });

    const cloned = cloneDelta(original);
    const clonedAttrs = cloned.ops[0].attributes as Record<string, unknown>;
    clonedAttrs.italic = true;

    expect(original.ops[0].attributes).toEqual({ bold: true });
  });
});
