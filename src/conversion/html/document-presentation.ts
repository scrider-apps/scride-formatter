/**

 * Document-level HTML presentation for deltaToHtml (clipboard, export).

 * Not stored in Delta — mirrors editor Settings (line spacing, indents).

 */



export interface DocumentPresentation {

  /** Line spacing multiplier, e.g. 1.5 */

  lineSpacing?: number;

  /** First-line indent in cm on `<p>` only (lists: use listBlockIndentCm). */

  textIndentCm?: number;

  /** Extra left padding on top-level `<ul>`/`<ol>` — shifts marker + text as a block. */

  listBlockIndentCm?: number;

}



export interface ResolvedDocumentPresentation {

  lineSpacing: number | undefined;

  textIndentCm: number | undefined;

  listBlockIndentCm: number | undefined;

}



export function resolveDocumentPresentation(

  presentation?: DocumentPresentation,

): ResolvedDocumentPresentation | undefined {

  if (!presentation) return undefined;



  const lineSpacing =

    typeof presentation.lineSpacing === 'number' && presentation.lineSpacing > 0

      ? presentation.lineSpacing

      : undefined;

  const textIndentCm =

    typeof presentation.textIndentCm === 'number' && presentation.textIndentCm > 0

      ? presentation.textIndentCm

      : undefined;

  const listBlockIndentCm =

    typeof presentation.listBlockIndentCm === 'number' && presentation.listBlockIndentCm > 0

      ? presentation.listBlockIndentCm

      : undefined;



  if (

    lineSpacing === undefined &&

    textIndentCm === undefined &&

    listBlockIndentCm === undefined

  ) {

    return undefined;

  }



  return { lineSpacing, textIndentCm, listBlockIndentCm };

}



/** Block tags that receive document line spacing (not headings). */

const LINE_HEIGHT_TAGS = new Set(['p', 'li', 'blockquote']);



/** Block tags that receive document first-line indent. */

const TEXT_INDENT_TAGS = new Set(['p']);



/** Extra padding on top-level `<ul>`/`<ol>` — shifts marker + text (list block indent). */

export function documentPresentationListWrapperStyleParts(

  resolved: ResolvedDocumentPresentation | undefined,

): string[] {

  if (!resolved?.listBlockIndentCm) return [];

  return [
    `padding-left:1.25em`,
    `margin-left:${resolved.listBlockIndentCm}cm`,
  ];

}



export function documentPresentationStyleParts(

  tag: string,

  resolved: ResolvedDocumentPresentation | undefined,

): string[] {

  if (!resolved) return [];



  const parts: string[] = [];



  if (resolved.lineSpacing !== undefined && LINE_HEIGHT_TAGS.has(tag)) {

    const pct = Math.round(resolved.lineSpacing * 100);

    parts.push(`line-height:${resolved.lineSpacing}`);

    parts.push(`mso-line-height-alt:${pct}%`);

  }



  if (resolved.textIndentCm !== undefined && TEXT_INDENT_TAGS.has(tag)) {
    parts.push(`text-indent:${resolved.textIndentCm}cm`);
  }



  return parts;

}



export function joinStyleParts(parts: string[]): string {

  return parts.length > 0 ? ` style="${parts.join('; ')}"` : '';

}


