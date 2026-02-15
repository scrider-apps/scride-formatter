import { describe, expect, it } from 'vitest';
import { tableBlockHandler } from '../../../src/schema/blocks/table';
import type { TableBlockData, CellData } from '../../../src/schema/blocks/table';
import type { Registry } from '../../../src/schema/Registry';
import type { Op } from '@scrider/delta';

/** Helper: minimal valid 1×1 table */
function table1x1(cell?: CellData | null): TableBlockData {
  return {
    type: 'table',
    cells: { '0:0': cell ?? { ops: [{ insert: '\n' }] } },
  };
}

/** Helper: minimal valid 2×2 table */
function table2x2(overrides?: Partial<TableBlockData>): TableBlockData {
  return {
    type: 'table',
    cells: {
      '0:0': { ops: [{ insert: 'A\n' }] },
      '0:1': { ops: [{ insert: 'B\n' }] },
      '1:0': { ops: [{ insert: 'C\n' }] },
      '1:1': { ops: [{ insert: 'D\n' }] },
    },
    ...overrides,
  };
}

describe('TableBlockHandler', () => {
  describe('type', () => {
    it('should be "table"', () => {
      expect(tableBlockHandler.type).toBe('table');
    });
  });

  describe('validate', () => {
    // ── Valid tables ────────────────────────────────────────

    it('should accept minimal 1×1 table', () => {
      expect(tableBlockHandler.validate(table1x1())).toBe(true);
    });

    it('should accept 2×2 table', () => {
      expect(tableBlockHandler.validate(table2x2())).toBe(true);
    });

    it('should accept table with headerRows', () => {
      expect(tableBlockHandler.validate(table2x2({ headerRows: 1 }))).toBe(true);
    });

    it('should accept table with headerRows: 0', () => {
      expect(tableBlockHandler.validate(table2x2({ headerRows: 0 }))).toBe(true);
    });

    it('should accept table with all rows as headers', () => {
      expect(tableBlockHandler.validate(table2x2({ headerRows: 2 }))).toBe(true);
    });

    it('should accept table with colWidths', () => {
      expect(tableBlockHandler.validate(table2x2({ colWidths: [40, 60] }))).toBe(true);
    });

    it('should accept table with colWidths of 0', () => {
      expect(tableBlockHandler.validate(table2x2({ colWidths: [0, 100] }))).toBe(true);
    });

    it('should accept table with colAligns', () => {
      expect(tableBlockHandler.validate(table2x2({ colAligns: ['left', 'center'] }))).toBe(true);
    });

    it('should accept table with null colAligns', () => {
      expect(tableBlockHandler.validate(table2x2({ colAligns: [null, 'right'] }))).toBe(true);
    });

    it('should accept table with colspan', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Merged\n' }], colspan: 2 },
          '0:1': null,
          '1:0': { ops: [{ insert: 'A\n' }] },
          '1:1': { ops: [{ insert: 'B\n' }] },
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(true);
    });

    it('should accept table with rowspan', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Span\n' }], rowspan: 2 },
          '0:1': { ops: [{ insert: 'B\n' }] },
          '1:0': null,
          '1:1': { ops: [{ insert: 'D\n' }] },
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(true);
    });

    it('should accept table with colspan + rowspan', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Big\n' }], colspan: 2, rowspan: 2 },
          '0:1': null,
          '1:0': null,
          '1:1': null,
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(true);
    });

    it('should accept table with rich content', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': {
            ops: [{ insert: 'Bold', attributes: { bold: true } }, { insert: '\n' }],
          },
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(true);
    });

    it('should accept table with empty cell (just newline)', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: [{ insert: '\n' }] }))).toBe(true);
    });

    it('should accept 3×3 table with complex merges', () => {
      const data: TableBlockData = {
        type: 'table',
        headerRows: 1,
        colWidths: [30, 30, 40],
        colAligns: ['left', 'center', 'right'],
        cells: {
          '0:0': { ops: [{ insert: 'H1\n' }], colspan: 3 },
          '0:1': null,
          '0:2': null,
          '1:0': { ops: [{ insert: 'A\n' }] },
          '1:1': { ops: [{ insert: 'B\n' }], rowspan: 2 },
          '1:2': { ops: [{ insert: 'C\n' }] },
          '2:0': { ops: [{ insert: 'D\n' }] },
          '2:1': null,
          '2:2': { ops: [{ insert: 'F\n' }] },
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(true);
    });

    // ── Invalid tables: basic structure ─────────────────────

    it('should reject null', () => {
      expect(tableBlockHandler.validate(null as unknown as TableBlockData)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(tableBlockHandler.validate(undefined as unknown as TableBlockData)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(tableBlockHandler.validate('table' as unknown as TableBlockData)).toBe(false);
    });

    it('should reject wrong type', () => {
      expect(
        tableBlockHandler.validate({
          type: 'columns',
          cells: { '0:0': { ops: [{ insert: '\n' }] } },
        } as unknown as TableBlockData),
      ).toBe(false);
    });

    it('should reject missing type', () => {
      expect(
        tableBlockHandler.validate({
          cells: { '0:0': { ops: [{ insert: '\n' }] } },
        } as unknown as TableBlockData),
      ).toBe(false);
    });

    it('should reject missing cells', () => {
      expect(tableBlockHandler.validate({ type: 'table' } as unknown as TableBlockData)).toBe(
        false,
      );
    });

    it('should reject empty cells', () => {
      expect(tableBlockHandler.validate({ type: 'table', cells: {} } as TableBlockData)).toBe(
        false,
      );
    });

    it('should reject cells as array', () => {
      expect(
        tableBlockHandler.validate({ type: 'table', cells: [] } as unknown as TableBlockData),
      ).toBe(false);
    });

    // ── Invalid tables: key format ──────────────────────────

    it('should reject invalid cell key format', () => {
      expect(
        tableBlockHandler.validate({
          type: 'table',
          cells: { 'a:b': { ops: [{ insert: '\n' }] } },
        } as unknown as TableBlockData),
      ).toBe(false);
    });

    it('should reject negative indices', () => {
      expect(
        tableBlockHandler.validate({
          type: 'table',
          cells: { '-1:0': { ops: [{ insert: '\n' }] } },
        } as unknown as TableBlockData),
      ).toBe(false);
    });

    it('should reject keys with spaces', () => {
      expect(
        tableBlockHandler.validate({
          type: 'table',
          cells: { '0: 0': { ops: [{ insert: '\n' }] } },
        } as unknown as TableBlockData),
      ).toBe(false);
    });

    // ── Invalid tables: holes ───────────────────────────────

    it('should reject grid with holes', () => {
      expect(
        tableBlockHandler.validate({
          type: 'table',
          cells: {
            '0:0': { ops: [{ insert: '\n' }] },
            // '0:1' is missing — hole!
            '1:0': { ops: [{ insert: '\n' }] },
            '1:1': { ops: [{ insert: '\n' }] },
          },
        } as TableBlockData),
      ).toBe(false);
    });

    it('should reject non-contiguous rows', () => {
      expect(
        tableBlockHandler.validate({
          type: 'table',
          cells: {
            '0:0': { ops: [{ insert: '\n' }] },
            '2:0': { ops: [{ insert: '\n' }] }, // gap: row 1 missing
          },
        } as TableBlockData),
      ).toBe(false);
    });

    // ── Invalid tables: cell data ───────────────────────────

    it('should reject cell with empty ops', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: [] }))).toBe(false);
    });

    it('should reject cell with non-array ops', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: 'text' } as unknown as CellData))).toBe(
        false,
      );
    });

    it('should reject cell without ops', () => {
      expect(tableBlockHandler.validate(table1x1({} as unknown as CellData))).toBe(false);
    });

    it('should reject cell with invalid colspan', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: [{ insert: '\n' }], colspan: 0 }))).toBe(
        false,
      );
    });

    it('should reject cell with negative colspan', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: [{ insert: '\n' }], colspan: -1 }))).toBe(
        false,
      );
    });

    it('should reject cell with float colspan', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: [{ insert: '\n' }], colspan: 1.5 }))).toBe(
        false,
      );
    });

    it('should reject cell with invalid rowspan', () => {
      expect(tableBlockHandler.validate(table1x1({ ops: [{ insert: '\n' }], rowspan: 0 }))).toBe(
        false,
      );
    });

    // ── Invalid tables: merged cells inconsistency ──────────

    it('should reject null cell not covered by any span', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: '\n' }] },
          '0:1': null, // null but no colspan covers it
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(false);
    });

    it('should reject colspan exceeding grid', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: '\n' }], colspan: 3 }, // only 2 cols exist
          '0:1': null,
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(false);
    });

    it('should reject rowspan exceeding grid', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: '\n' }], rowspan: 3 }, // only 1 row exists
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(false);
    });

    it('should reject non-null cell covered by span', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'A\n' }], colspan: 2 },
          '0:1': { ops: [{ insert: 'B\n' }] }, // should be null!
        },
      };
      expect(tableBlockHandler.validate(data)).toBe(false);
    });

    // ── Invalid tables: headerRows ──────────────────────────

    it('should reject negative headerRows', () => {
      expect(tableBlockHandler.validate(table2x2({ headerRows: -1 }))).toBe(false);
    });

    it('should reject headerRows > rows', () => {
      expect(tableBlockHandler.validate(table2x2({ headerRows: 3 }))).toBe(false);
    });

    it('should reject non-integer headerRows', () => {
      expect(tableBlockHandler.validate(table2x2({ headerRows: 1.5 }))).toBe(false);
    });

    // ── Invalid tables: colWidths ───────────────────────────

    it('should reject colWidths with wrong length', () => {
      expect(tableBlockHandler.validate(table2x2({ colWidths: [100] }))).toBe(false);
    });

    it('should reject colWidths with negative values', () => {
      expect(tableBlockHandler.validate(table2x2({ colWidths: [-10, 60] }))).toBe(false);
    });

    it('should reject colWidths with non-number values', () => {
      expect(
        tableBlockHandler.validate(table2x2({ colWidths: ['50', 50] as unknown as number[] })),
      ).toBe(false);
    });

    // ── Invalid tables: colAligns ───────────────────────────

    it('should reject colAligns with wrong length', () => {
      expect(tableBlockHandler.validate(table2x2({ colAligns: ['left'] }))).toBe(false);
    });

    it('should reject colAligns with invalid values', () => {
      expect(
        tableBlockHandler.validate(
          table2x2({
            colAligns: ['left', 'justify'] as unknown as ('left' | 'center' | 'right' | null)[],
          }),
        ),
      ).toBe(false);
    });
  });

  describe('getNestedDeltas', () => {
    it('should extract ops from all non-null cells', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'A\n' }], colspan: 2 },
          '0:1': null,
          '1:0': { ops: [{ insert: 'B\n' }] },
          '1:1': { ops: [{ insert: 'C\n' }] },
        },
      };
      const deltas = tableBlockHandler.getNestedDeltas!(data);
      expect(deltas).toHaveLength(3);
      expect(deltas[0]).toEqual([{ insert: 'A\n' }]);
      expect(deltas[1]).toEqual([{ insert: 'B\n' }]);
      expect(deltas[2]).toEqual([{ insert: 'C\n' }]);
    });

    it('should return empty array for all-null cells', () => {
      // This is structurally invalid but getNestedDeltas doesn't validate
      const data = {
        type: 'table' as const,
        cells: { '0:0': null },
      };
      const deltas = tableBlockHandler.getNestedDeltas!(data);
      expect(deltas).toHaveLength(0);
    });
  });

  describe('setNestedDeltas', () => {
    it('should replace ops in non-null cells preserving structure', () => {
      const data: TableBlockData = {
        type: 'table',
        headerRows: 1,
        colWidths: [50, 50],
        cells: {
          '0:0': { ops: [{ insert: 'old\n' }], colspan: 2 },
          '0:1': null,
          '1:0': { ops: [{ insert: 'old\n' }] },
          '1:1': { ops: [{ insert: 'old\n' }] },
        },
      };

      const newDeltas = [[{ insert: 'new1\n' }], [{ insert: 'new2\n' }], [{ insert: 'new3\n' }]];

      const result = tableBlockHandler.setNestedDeltas!(data, newDeltas);

      // Structure preserved
      expect(result.type).toBe('table');
      expect(result.headerRows).toBe(1);
      expect(result.colWidths).toEqual([50, 50]);

      // Ops replaced
      expect(result.cells['0:0']).toEqual({ ops: [{ insert: 'new1\n' }], colspan: 2 });
      expect(result.cells['0:1']).toBeNull();
      expect(result.cells['1:0']).toEqual({ ops: [{ insert: 'new2\n' }] });
      expect(result.cells['1:1']).toEqual({ ops: [{ insert: 'new3\n' }] });

      // Original not mutated
      expect(data.cells['0:0']!.ops).toEqual([{ insert: 'old\n' }]);
    });
  });

  describe('toMarkdown', () => {
    it('should return GFM table for simple table without headers', () => {
      const data = table2x2();
      const context = {
        registry: {} as unknown as Registry,
        renderDelta: (ops: Op[]): string =>
          ops
            .filter(
              (op): op is Op & { insert: string } =>
                'insert' in op && typeof op.insert === 'string',
            )
            .map((op): string => op.insert)
            .join(''),
      };
      const md = tableBlockHandler.toMarkdown!(data, context);
      expect(md).not.toBeNull();
      expect(md).toContain('| --- | --- |');
      expect(md).toContain('| A | B |');
      expect(md).toContain('| C | D |');
    });

    it('should return null for table with colspan', () => {
      const data: TableBlockData = {
        type: 'table',
        cells: {
          '0:0': { ops: [{ insert: 'Merged\n' }], colspan: 2 },
          '0:1': null,
          '1:0': { ops: [{ insert: 'A\n' }] },
          '1:1': { ops: [{ insert: 'B\n' }] },
        },
      };
      const context = { registry: {} as unknown as Registry };
      expect(tableBlockHandler.toMarkdown!(data, context)).toBeNull();
    });
  });
});
