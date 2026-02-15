import { describe, expect, it } from 'vitest';
import type { AlignType, ListType, TableColAlignType } from '../../../src/schema/formats/block';
import {
  alignFormat,
  blockquoteFormat,
  codeBlockFormat,
  headerFormat,
  indentFormat,
  listFormat,
  tableRowFormat,
  tableColFormat,
  tableHeaderFormat,
  tableColAlignFormat,
} from '../../../src/schema/formats/block';

describe('Block Formats', () => {
  describe('headerFormat', () => {
    it('should have correct name and scope', () => {
      expect(headerFormat.name).toBe('header');
      expect(headerFormat.scope).toBe('block');
    });

    it('should normalize by clamping', () => {
      expect(headerFormat.normalize!(0)).toBe(1);
      expect(headerFormat.normalize!(3.7)).toBe(3);
      expect(headerFormat.normalize!(10)).toBe(6);
    });

    it('should validate 1-6', () => {
      expect(headerFormat.validate!(1)).toBe(true);
      expect(headerFormat.validate!(6)).toBe(true);
      expect(headerFormat.validate!(0)).toBe(false);
      expect(headerFormat.validate!(7)).toBe(false);
      expect(headerFormat.validate!(1.5)).toBe(false);
    });
  });

  describe('blockquoteFormat', () => {
    it('should have correct name and scope', () => {
      expect(blockquoteFormat.name).toBe('blockquote');
      expect(blockquoteFormat.scope).toBe('block');
    });

    it('should validate true only', () => {
      expect(blockquoteFormat.validate!(true)).toBe(true);
      expect(blockquoteFormat.validate!(false)).toBe(false);
    });
  });

  describe('codeBlockFormat', () => {
    it('should have correct name and scope', () => {
      expect(codeBlockFormat.name).toBe('code-block');
      expect(codeBlockFormat.scope).toBe('block');
    });

    it('should normalize language to lowercase', () => {
      expect(codeBlockFormat.normalize!('JavaScript')).toBe('javascript');
      expect(codeBlockFormat.normalize!(true)).toBe(true);
    });

    it('should validate true or language string', () => {
      expect(codeBlockFormat.validate!(true)).toBe(true);
      expect(codeBlockFormat.validate!('javascript')).toBe(true);
      expect(codeBlockFormat.validate!('python')).toBe(true);
      expect(codeBlockFormat.validate!(false)).toBe(false);
      expect(codeBlockFormat.validate!('')).toBe(false);
    });
  });

  describe('listFormat', () => {
    it('should have correct name and scope', () => {
      expect(listFormat.name).toBe('list');
      expect(listFormat.scope).toBe('block');
    });

    it('should normalize to lowercase', () => {
      expect(listFormat.normalize!('Ordered' as unknown as ListType)).toBe('ordered');
    });

    it('should validate list types', () => {
      expect(listFormat.validate!('ordered')).toBe(true);
      expect(listFormat.validate!('bullet')).toBe(true);
      expect(listFormat.validate!('checked')).toBe(true);
      expect(listFormat.validate!('unchecked')).toBe(true);
      expect(listFormat.validate!('invalid' as unknown as ListType)).toBe(false);
    });
  });

  describe('alignFormat', () => {
    it('should have correct name and scope', () => {
      expect(alignFormat.name).toBe('align');
      expect(alignFormat.scope).toBe('block');
    });

    it('should normalize to lowercase', () => {
      expect(alignFormat.normalize!('Center' as unknown as AlignType)).toBe('center');
    });

    it('should validate alignment types', () => {
      expect(alignFormat.validate!('left')).toBe(true);
      expect(alignFormat.validate!('center')).toBe(true);
      expect(alignFormat.validate!('right')).toBe(true);
      expect(alignFormat.validate!('justify')).toBe(true);
      expect(alignFormat.validate!('invalid' as unknown as AlignType)).toBe(false);
    });
  });

  describe('indentFormat', () => {
    it('should have correct name and scope', () => {
      expect(indentFormat.name).toBe('indent');
      expect(indentFormat.scope).toBe('block');
    });

    it('should normalize by clamping', () => {
      expect(indentFormat.normalize!(-1)).toBe(0);
      expect(indentFormat.normalize!(2.7)).toBe(2);
      expect(indentFormat.normalize!(10)).toBe(8);
    });

    it('should validate 0-8', () => {
      expect(indentFormat.validate!(0)).toBe(true);
      expect(indentFormat.validate!(8)).toBe(true);
      expect(indentFormat.validate!(-1)).toBe(false);
      expect(indentFormat.validate!(9)).toBe(false);
      expect(indentFormat.validate!(1.5)).toBe(false);
    });
  });

  describe('tableRowFormat', () => {
    it('should have correct name and scope', () => {
      expect(tableRowFormat.name).toBe('table-row');
      expect(tableRowFormat.scope).toBe('block');
    });

    it('should validate non-negative integers', () => {
      expect(tableRowFormat.validate!(0)).toBe(true);
      expect(tableRowFormat.validate!(5)).toBe(true);
      expect(tableRowFormat.validate!(100)).toBe(true);
      expect(tableRowFormat.validate!(-1)).toBe(false);
      expect(tableRowFormat.validate!(1.5)).toBe(false);
      expect(tableRowFormat.validate!('0' as unknown as number)).toBe(false);
    });
  });

  describe('tableColFormat', () => {
    it('should have correct name and scope', () => {
      expect(tableColFormat.name).toBe('table-col');
      expect(tableColFormat.scope).toBe('block');
    });

    it('should validate non-negative integers', () => {
      expect(tableColFormat.validate!(0)).toBe(true);
      expect(tableColFormat.validate!(3)).toBe(true);
      expect(tableColFormat.validate!(-1)).toBe(false);
      expect(tableColFormat.validate!(2.5)).toBe(false);
    });
  });

  describe('tableHeaderFormat', () => {
    it('should have correct name and scope', () => {
      expect(tableHeaderFormat.name).toBe('table-header');
      expect(tableHeaderFormat.scope).toBe('block');
    });

    it('should validate true only', () => {
      expect(tableHeaderFormat.validate!(true)).toBe(true);
      expect(tableHeaderFormat.validate!(false)).toBe(false);
      expect(tableHeaderFormat.validate!('true' as unknown as boolean)).toBe(false);
    });
  });

  describe('tableColAlignFormat', () => {
    it('should have correct name and scope', () => {
      expect(tableColAlignFormat.name).toBe('table-col-align');
      expect(tableColAlignFormat.scope).toBe('block');
    });

    it('should normalize to lowercase', () => {
      expect(tableColAlignFormat.normalize!('Center' as unknown as TableColAlignType)).toBe(
        'center',
      );
    });

    it('should validate alignment types', () => {
      expect(tableColAlignFormat.validate!('left')).toBe(true);
      expect(tableColAlignFormat.validate!('center')).toBe(true);
      expect(tableColAlignFormat.validate!('right')).toBe(true);
      expect(tableColAlignFormat.validate!('justify' as unknown as TableColAlignType)).toBe(false);
      expect(tableColAlignFormat.validate!('invalid' as unknown as TableColAlignType)).toBe(false);
    });
  });
});
