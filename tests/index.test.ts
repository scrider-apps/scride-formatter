import { describe, expect, it } from 'vitest';
import type {
  AlertBlockData,
  AlertType,
  BlockContext,
  BlockHandler,
  BlockRenderOptions,
  CellAlign,
  CellData,
  Format,
  TableBlockData,
} from '../src/index';
import {
  ALERT_TYPES,
  alertBlockHandler,
  BlockHandlerRegistry,
  boldFormat,
  createDefaultBlockHandlers,
  createDefaultRegistry,
  defaultFormats,
  Registry,
  tableBlockHandler,
  toHexColor,
} from '../src/index';

describe('Public API exports (@scrider/formatting)', () => {
  it('exports Registry class', () => {
    expect(Registry).toBeDefined();
    const registry = new Registry();
    expect(registry).toBeInstanceOf(Registry);
  });

  it('exports createDefaultRegistry', () => {
    expect(createDefaultRegistry).toBeDefined();
    const registry = createDefaultRegistry();
    expect(registry.has('bold')).toBe(true);
    expect(registry.has('header')).toBe(true);
    expect(registry.has('image')).toBe(true);
  });

  it('exports defaultFormats', () => {
    expect(defaultFormats).toBeDefined();
    expect(Array.isArray(defaultFormats)).toBe(true);
    expect(defaultFormats.length).toBe(29); // 12 inline + 11 block + 6 embed
  });

  it('exports individual formats', () => {
    expect(boldFormat).toBeDefined();
    expect(boldFormat.name).toBe('bold');
  });

  it('exports color utilities', () => {
    expect(toHexColor).toBeDefined();
    expect(toHexColor('red')).toBe('#ff0000');
  });

  it('exports BlockHandlerRegistry', () => {
    expect(BlockHandlerRegistry).toBeDefined();
    const registry = new BlockHandlerRegistry();
    expect(registry).toBeInstanceOf(BlockHandlerRegistry);
    expect(registry.has('table')).toBe(false);
  });

  it('exports createDefaultBlockHandlers', () => {
    expect(createDefaultBlockHandlers).toBeDefined();
    const handlers = createDefaultBlockHandlers();
    expect(handlers).toBeInstanceOf(BlockHandlerRegistry);
    expect(handlers.has('table')).toBe(true);
    expect(handlers.has('footnotes')).toBe(true);
    expect(handlers.has('alert')).toBe(true);
  });

  it('exports tableBlockHandler', () => {
    expect(tableBlockHandler).toBeDefined();
    expect(tableBlockHandler.type).toBe('table');
    expect(typeof tableBlockHandler.validate).toBe('function');
    expect(typeof tableBlockHandler.toHtml).toBe('function');
    expect(typeof tableBlockHandler.fromHtml).toBe('function');
    expect(typeof tableBlockHandler.getNestedDeltas).toBe('function');
    expect(typeof tableBlockHandler.setNestedDeltas).toBe('function');
  });

  it('exports alertBlockHandler and ALERT_TYPES', () => {
    expect(alertBlockHandler).toBeDefined();
    expect(alertBlockHandler.type).toBe('alert');
    expect(typeof alertBlockHandler.validate).toBe('function');
    expect(typeof alertBlockHandler.toHtml).toBe('function');
    expect(typeof alertBlockHandler.fromHtml).toBe('function');
    expect(typeof alertBlockHandler.toMarkdown).toBe('function');
    expect(typeof alertBlockHandler.getNestedDeltas).toBe('function');
    expect(typeof alertBlockHandler.setNestedDeltas).toBe('function');
    expect(ALERT_TYPES).toEqual(['note', 'tip', 'important', 'warning', 'caution']);
  });

  it('exports AlertBlockData and AlertType types', () => {
    // Type-only: verify types are importable and usable
    const data: AlertBlockData = {
      type: 'alert',
      alertType: 'note',
      content: { ops: [{ insert: '\n' }] },
    };
    const t: AlertType = 'warning';
    expect(data).toBeDefined();
    expect(t).toBe('warning');
  });
});

// Type-only tests (compile-time verification)
describe('Type exports (@scrider/formatting)', () => {
  it('Format type is usable', () => {
    const format: Format<boolean> = {
      name: 'test',
      scope: 'inline',
      validate: (v) => v === true,
    };
    expect(format).toBeDefined();
  });

  it('BlockHandler type is usable', () => {
    const handler: BlockHandler<{ type: string }> = {
      type: 'test',
      validate: (data) => data.type === 'test',
      toHtml: () => '<div>test</div>',
      fromHtml: () => null,
    };
    expect(handler).toBeDefined();
  });

  it('BlockContext type is usable', () => {
    const context: BlockContext = {
      registry: new Registry(),
    };
    expect(context).toBeDefined();
  });

  it('BlockRenderOptions type is usable', () => {
    const options: BlockRenderOptions = {
      pretty: true,
    };
    expect(options).toBeDefined();
  });

  it('TableBlockData type is usable', () => {
    const data: TableBlockData = {
      type: 'table',
      headerRows: 1,
      colWidths: [50, 50],
      cells: {
        '0:0': { ops: [{ insert: 'A\n' }] },
        '0:1': { ops: [{ insert: 'B\n' }] },
      },
    };
    expect(data).toBeDefined();
  });

  it('CellData type is usable', () => {
    const cell: CellData = {
      ops: [{ insert: 'test\n' }],
      colspan: 2,
      rowspan: 1,
    };
    expect(cell).toBeDefined();
  });

  it('CellAlign type is usable', () => {
    const align: CellAlign = 'center';
    expect(align).toBeDefined();
  });
});
