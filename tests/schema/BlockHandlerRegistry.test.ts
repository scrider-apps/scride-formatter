import { describe, expect, it } from 'vitest';
import type { BlockHandler } from '../../src/schema/BlockHandler';
import { BlockHandlerRegistry } from '../../src/schema/BlockHandlerRegistry';

interface TestBlockData {
  type: string;
  content: string;
}

const createTestHandler = (type: string): BlockHandler<TestBlockData> => ({
  type,
  validate: (data) => data.type === type && typeof data.content === 'string',
  toHtml: (data) => `<div class="${type}">${data.content}</div>`,
  fromHtml: () => null,
});

describe('BlockHandlerRegistry', () => {
  it('should register and retrieve handlers', () => {
    const registry = new BlockHandlerRegistry();
    const handler = createTestHandler('test');

    registry.register(handler);

    expect(registry.has('test')).toBe(true);
    expect(registry.get('test')).toBe(handler);
  });

  it('should return undefined for unregistered types', () => {
    const registry = new BlockHandlerRegistry();

    expect(registry.has('unknown')).toBe(false);
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('should throw on duplicate registration', () => {
    const registry = new BlockHandlerRegistry();
    const handler1 = createTestHandler('table');
    const handler2 = createTestHandler('table');

    registry.register(handler1);

    expect(() => registry.register(handler2)).toThrow('BlockHandler "table" is already registered');
  });

  it('should support chaining on register', () => {
    const registry = new BlockHandlerRegistry();
    const handler1 = createTestHandler('table');
    const handler2 = createTestHandler('columns');

    const result = registry.register(handler1).register(handler2);

    expect(result).toBe(registry);
    expect(registry.has('table')).toBe(true);
    expect(registry.has('columns')).toBe(true);
  });

  it('should register multiple different handlers', () => {
    const registry = new BlockHandlerRegistry();
    const tableHandler = createTestHandler('table');
    const columnsHandler = createTestHandler('columns');
    const diagramHandler = createTestHandler('diagram');

    registry.register(tableHandler);
    registry.register(columnsHandler);
    registry.register(diagramHandler);

    expect(registry.get('table')).toBe(tableHandler);
    expect(registry.get('columns')).toBe(columnsHandler);
    expect(registry.get('diagram')).toBe(diagramHandler);
  });
});
