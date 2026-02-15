import type { Format, FormatMatchResult } from '../../Format';
import type { DOMElement } from '../../../conversion/adapters/types';
import { escapeHtml } from '../../../conversion/html/config';

/**
 * Diagram (Mermaid / PlantUML) embed format
 *
 * Delta: { insert: { diagram: "graph TD\n    A-->B" } }
 * Delta: { insert: { diagram: "@startuml\nAlice -> Bob\n@enduml" } }
 *
 * Value is diagram source string (Mermaid or PlantUML).
 * Type is detected by content: @startuml → PlantUML, otherwise → Mermaid.
 * Used when mermaidBlock=false / plantumlBlock=false (inline rendering mode).
 */
export const diagramFormat: Format<string> = {
  name: 'diagram',
  scope: 'embed',

  normalize(value: string): string {
    // Trim outer whitespace but preserve internal formatting
    return value.trim();
  },

  validate(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    // Must have non-empty content
    return value.trim().length > 0;
  },

  render(value: string): string {
    const source = typeof value === 'string' ? value : '';
    return `<span class="diagram" data-diagram="${escapeHtml(source)}">${escapeHtml(source)}</span>`;
  },

  match(element: DOMElement): FormatMatchResult<string> | null {
    if (element.tagName.toLowerCase() !== 'span') return null;
    const className = element.getAttribute('class') || '';
    if (!className.includes('diagram')) return null;
    const diagram = element.getAttribute('data-diagram');
    if (!diagram) return null;
    return { value: diagram };
  },
};
