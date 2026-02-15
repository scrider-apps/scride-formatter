/**
 * Alerts / Admonitions Conversion Tests
 *
 * Tests for alert block embed (GitHub-style alerts):
 * - Schema validation (5 types, content validation)
 * - Delta → HTML (<div class="markdown-alert markdown-alert-{type}">)
 * - HTML → Delta (parsing markdown-alert divs)
 * - Delta → Markdown (> [!TYPE]\n> content)
 * - Markdown → Delta (blockquote [!TYPE] detection)
 * - Roundtrip tests
 */

import { describe, expect, it } from 'vitest';
import { Delta } from '@scrider/delta';
import type { InsertOp } from '@scrider/delta';
import { deltaToHtml } from '../../src/conversion/html/delta-to-html';
import { htmlToDelta } from '../../src/conversion/html/html-to-delta';
import { deltaToMarkdown } from '../../src/conversion/markdown/delta-to-markdown';
import {
  isRemarkAvailable,
  markdownToDelta,
} from '../../src/conversion/markdown/markdown-to-delta';
import { createDefaultBlockHandlers } from '../../src/schema/defaults';
import { alertBlockHandler } from '../../src/schema/blocks/alert';
import { ALERT_TYPES } from '../../src/schema/blocks/alert';
import type { AlertBlockData } from '../../src/schema/blocks/alert';

const blockHandlers = createDefaultBlockHandlers();
const runTests = isRemarkAvailable();

// ============================================================================
// Helper: create Delta with an alert block
// ============================================================================

function alertDelta(
  alertType: string,
  contentOps: Array<{ insert: unknown; attributes?: Record<string, unknown> }>,
): Delta {
  return new Delta([
    {
      insert: {
        block: {
          type: 'alert',
          alertType,
          content: { ops: contentOps },
        },
      },
    },
    { insert: '\n' },
  ]);
}

// ============================================================================
// Schema Validation
// ============================================================================

describe('AlertBlockHandler: validate', () => {
  it('validates all 5 standard types', () => {
    for (const t of ALERT_TYPES) {
      const data: AlertBlockData = {
        type: 'alert',
        alertType: t,
        content: { ops: [{ insert: 'text\n' }] },
      };
      expect(alertBlockHandler.validate(data)).toBe(true);
    }
  });

  it('rejects unknown alert type', () => {
    const data = {
      type: 'alert',
      alertType: 'danger',
      content: { ops: [{ insert: 'text\n' }] },
    } as unknown as AlertBlockData;
    expect(alertBlockHandler.validate(data)).toBe(false);
  });

  it('rejects missing content', () => {
    const data = {
      type: 'alert',
      alertType: 'note',
    } as unknown as AlertBlockData;
    expect(alertBlockHandler.validate(data)).toBe(false);
  });

  it('rejects empty ops', () => {
    const data: AlertBlockData = {
      type: 'alert',
      alertType: 'note',
      content: { ops: [] },
    };
    expect(alertBlockHandler.validate(data)).toBe(false);
  });

  it('rejects wrong block type', () => {
    const data = {
      type: 'not-alert',
      alertType: 'note',
      content: { ops: [{ insert: '\n' }] },
    } as unknown as AlertBlockData;
    expect(alertBlockHandler.validate(data)).toBe(false);
  });
});

// ============================================================================
// Nested Deltas
// ============================================================================

describe('AlertBlockHandler: getNestedDeltas / setNestedDeltas', () => {
  it('returns content ops via getNestedDeltas', () => {
    const data: AlertBlockData = {
      type: 'alert',
      alertType: 'note',
      content: { ops: [{ insert: 'hello\n' }] },
    };
    const deltas = alertBlockHandler.getNestedDeltas!(data);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toEqual([{ insert: 'hello\n' }]);
  });

  it('replaces content via setNestedDeltas', () => {
    const data: AlertBlockData = {
      type: 'alert',
      alertType: 'warning',
      content: { ops: [{ insert: 'old\n' }] },
    };
    const updated = alertBlockHandler.setNestedDeltas!(data, [[{ insert: 'new\n' }]]);
    expect(updated.content.ops).toEqual([{ insert: 'new\n' }]);
    expect(updated.alertType).toBe('warning');
  });
});

// ============================================================================
// Delta → HTML
// ============================================================================

describe('Alerts: Delta → HTML', () => {
  it('renders note alert as <div class="markdown-alert">', () => {
    const delta = alertDelta('note', [{ insert: 'Useful info.\n' }]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('class="markdown-alert markdown-alert-note"');
    expect(html).toContain('class="markdown-alert-title"');
    expect(html).toContain('>Note<');
    expect(html).toContain('Useful info.');
  });

  it('renders all 5 types with correct titles', () => {
    const expectedTitles: Record<string, string> = {
      note: 'Note',
      tip: 'Tip',
      important: 'Important',
      warning: 'Warning',
      caution: 'Caution',
    };

    for (const t of ALERT_TYPES) {
      const delta = alertDelta(t, [{ insert: 'Content.\n' }]);
      const html = deltaToHtml(delta, { blockHandlers });
      expect(html).toContain(`markdown-alert-${t}`);
      expect(html).toContain(`>${expectedTitles[t]}<`);
    }
  });

  it('renders rich content (bold, italic) inside alert', () => {
    const delta = alertDelta('tip', [
      { insert: 'Use ' },
      { insert: 'bold', attributes: { bold: true } },
      { insert: ' and ' },
      { insert: 'italic', attributes: { italic: true } },
      { insert: ' text.\n' },
    ]);
    const html = deltaToHtml(delta, { blockHandlers });
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });
});

// ============================================================================
// HTML → Delta
// ============================================================================

describe('Alerts: HTML → Delta', () => {
  it('parses <div class="markdown-alert markdown-alert-note"> to block embed', () => {
    const html = `
      <div class="markdown-alert markdown-alert-note">
        <p class="markdown-alert-title">Note</p>
        <p>Important information here.</p>
      </div>
    `;
    const delta = htmlToDelta(html, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    expect(block.type).toBe('alert');
    expect(block.alertType).toBe('note');
  });

  it('parses all 5 alert types correctly', () => {
    for (const t of ALERT_TYPES) {
      const html = `
        <div class="markdown-alert markdown-alert-${t}">
          <p class="markdown-alert-title">${t.charAt(0).toUpperCase() + t.slice(1)}</p>
          <p>Content for ${t}.</p>
        </div>
      `;
      const delta = htmlToDelta(html, { blockHandlers });
      const blockOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'object' &&
          op.insert !== null &&
          'block' in (op.insert),
      );
      expect(blockOp).toBeDefined();
      const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
      expect(block.alertType).toBe(t);
    }
  });

  it('skips title paragraph in parsed content', () => {
    const html = `
      <div class="markdown-alert markdown-alert-warning">
        <p class="markdown-alert-title">Warning</p>
        <p>Watch out!</p>
      </div>
    `;
    const delta = htmlToDelta(html, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    // Content should contain "Watch out!" but NOT "Warning" (the title)
    const textContent = block.content.ops
      .filter((op) => 'insert' in op && typeof op.insert === 'string')
      .map((op) => (op as InsertOp).insert as string)
      .join('');
    expect(textContent).toContain('Watch out!');
    expect(textContent).not.toContain('Warning');
  });
});

// ============================================================================
// Delta → Markdown
// ============================================================================

describe('Alerts: Delta → Markdown', () => {
  it('renders note alert as > [!NOTE] block', () => {
    const delta = alertDelta('note', [{ insert: 'Useful info.\n' }]);
    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('> [!NOTE]');
    expect(md).toContain('> Useful info.');
  });

  it('renders all 5 types with correct tags', () => {
    for (const t of ALERT_TYPES) {
      const delta = alertDelta(t, [{ insert: 'Content.\n' }]);
      const md = deltaToMarkdown(delta, { blockHandlers });
      expect(md).toContain(`> [!${t.toUpperCase()}]`);
    }
  });

  it('prefixes multi-line content with >', () => {
    const delta = alertDelta('important', [{ insert: 'Line one.\nLine two.\n' }]);
    const md = deltaToMarkdown(delta, { blockHandlers });
    const lines = md.split('\n').filter((l) => l.startsWith('> '));
    expect(lines.length).toBeGreaterThanOrEqual(3); // [!IMPORTANT] + 2 content lines
  });
});

// ============================================================================
// Markdown → Delta (requires remark)
// ============================================================================

describe('Alerts: Markdown → Delta', () => {
  (runTests ? it : it.skip)('parses > [!NOTE] as alert block embed', async () => {
    const md = '> [!NOTE]\n> This is a note.\n';
    const delta = await markdownToDelta(md, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    expect(block.type).toBe('alert');
    expect(block.alertType).toBe('note');
  });

  (runTests ? it : it.skip)('parses all 5 alert types from Markdown', async () => {
    for (const t of ALERT_TYPES) {
      const md = `> [!${t.toUpperCase()}]\n> Content for ${t}.\n`;
      const delta = await markdownToDelta(md, { blockHandlers });
      const blockOp = delta.ops.find(
        (op) =>
          'insert' in op && typeof op.insert === 'object' &&
          op.insert !== null &&
          'block' in (op.insert),
      );
      expect(blockOp).toBeDefined();
      const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
      expect(block.alertType).toBe(t);
    }
  });

  (runTests ? it : it.skip)('preserves rich content in alert from Markdown', async () => {
    const md = '> [!TIP]\n> Use **bold** and _italic_ text.\n';
    const delta = await markdownToDelta(md, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    // Check that bold attribute exists in nested ops
    const hasBold = block.content.ops.some(
      (op) => 'attributes' in op && op.attributes && (op.attributes as Record<string, unknown>).bold === true,
    );
    expect(hasBold).toBe(true);
  });

  (runTests ? it : it.skip)('regular blockquote is NOT treated as alert', async () => {
    const md = '> Just a regular quote.\n';
    const delta = await markdownToDelta(md, { blockHandlers });
    // Should NOT produce a block embed
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeUndefined();
    // Should have blockquote attribute
    const bqOp = delta.ops.find(
      (op) => 'attributes' in op && op.attributes && (op.attributes as Record<string, unknown>).blockquote === true,
    );
    expect(bqOp).toBeDefined();
  });

  (runTests ? it : it.skip)('parses multi-paragraph alert', async () => {
    const md = '> [!WARNING]\n> First paragraph.\n>\n> Second paragraph.\n';
    const delta = await markdownToDelta(md, { blockHandlers });
    const blockOp = delta.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    expect(block.alertType).toBe('warning');
    const text = block.content.ops
      .filter((op) => 'insert' in op && typeof op.insert === 'string')
      .map((op) => (op as InsertOp).insert as string)
      .join('');
    expect(text).toContain('First paragraph.');
    expect(text).toContain('Second paragraph.');
  });
});

// ============================================================================
// Roundtrip Tests
// ============================================================================

describe('Alerts: Roundtrip', () => {
  it('Delta → HTML → Delta preserves alert structure', () => {
    const original = alertDelta('caution', [{ insert: 'Be careful!\n' }]);
    const html = deltaToHtml(original, { blockHandlers });
    const restored = htmlToDelta(html, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    expect(block.type).toBe('alert');
    expect(block.alertType).toBe('caution');
  });

  (runTests ? it : it.skip)('Delta → Markdown → Delta preserves alert structure', async () => {
    const original = alertDelta('tip', [{ insert: 'Pro tip here.\n' }]);
    const md = deltaToMarkdown(original, { blockHandlers });
    const restored = await markdownToDelta(md, { blockHandlers });

    const blockOp = restored.ops.find(
      (op) =>
        'insert' in op && typeof op.insert === 'object' &&
        op.insert !== null &&
        'block' in (op.insert),
    );
    expect(blockOp).toBeDefined();
    const block = ((blockOp as InsertOp).insert as Record<string, unknown>).block as AlertBlockData;
    expect(block.type).toBe('alert');
    expect(block.alertType).toBe('tip');
  });

  (runTests ? it : it.skip)('Markdown → Delta → Markdown preserves alert format', async () => {
    const original = '> [!IMPORTANT]\n> Key information.\n';
    const delta = await markdownToDelta(original, { blockHandlers });
    const md = deltaToMarkdown(delta, { blockHandlers });
    expect(md).toContain('> [!IMPORTANT]');
    expect(md).toContain('> Key information.');
  });
});
