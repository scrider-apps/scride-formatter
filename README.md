# @scrider/formatter

Schema, conversion and block handlers for rich-text content. HTML, Markdown, sanitization.

## Overview

`@scrider/formatter` is the processing layer of the [Scrider](https://github.com/scrider-apps) ecosystem. It provides format definitions (schema), HTML/Markdown conversion, sanitization, and extensible block handlers — all as pure, stateless functions on top of [`@scrider/delta`](https://github.com/scrider-apps/scrider-delta). Strict TypeScript, zero runtime dependencies beyond `@scrider/delta`.

## Key Features

- **Schema** — extensible format registry (31 built-in formats: inline, block, embed)
- **HTML conversion** — `deltaToHtml()` / `htmlToDelta()` with DOM adapters (browser + Node.js)
- **Markdown conversion** — `deltaToMarkdown()` / `markdownToDelta()` (GFM, math, footnotes)
- **Block handlers** — tables, footnotes, alerts, columns, inline-box
- **Sanitization** — `sanitizeDelta()`, `validateDelta()`, `normalizeDelta()`
- **Dual format** — ESM + CJS builds
- **Strict TypeScript** — full type safety, discriminated unions
- **Stateless** — pure functions, no DOM coupling, works in browser, Node.js, Web Workers

## Installation

```bash
npm install @scrider/formatter @scrider/delta
# or
pnpm add @scrider/formatter @scrider/delta
```

Optional peer dependencies (install only what you need):

```bash
# Node.js HTML conversion (server-side)
pnpm add jsdom

# Markdown conversion
pnpm add unified remark-parse remark-stringify remark-gfm

# Math in Markdown
pnpm add remark-math
```

## Quick Start

```typescript
import { Delta } from '@scrider/formatter';
import { deltaToHtml, htmlToDelta, createDefaultRegistry } from '@scrider/formatter';

// Create a document
const doc = new Delta()
  .insert('Hello', { bold: true })
  .insert(' world\n');

// Convert to HTML
const registry = createDefaultRegistry();
const html = deltaToHtml(doc, { registry });
// → '<p><strong>Hello</strong> world</p>'

// Convert back to Delta
const delta = htmlToDelta(html, { registry });
```

## API

### Schema

```typescript
import { Registry, createDefaultRegistry, BlockHandlerRegistry } from '@scrider/formatter';

const registry = createDefaultRegistry();  // 31 built-in formats
```

### HTML Conversion

```typescript
import { deltaToHtml, htmlToDelta } from '@scrider/formatter';

deltaToHtml(delta, { registry })           // Delta → HTML string
htmlToDelta(html, { registry })            // HTML string → Delta
```

### Markdown Conversion

```typescript
import { deltaToMarkdown, markdownToDelta } from '@scrider/formatter';

deltaToMarkdown(delta, options?)           // Delta → Markdown string
await markdownToDelta(markdown, options?)  // Markdown string → Delta (async)
```

### Sanitization

```typescript
import { sanitizeDelta, validateDelta, normalizeDelta } from '@scrider/formatter';

sanitizeDelta(delta, { registry })         // Remove unknown formats
validateDelta(delta, { registry })         // Check validity (boolean)
normalizeDelta(delta)                      // Normalize operations
```

### Block Handlers

```typescript
import {
  tableBlockHandler,
  footnotesBlockHandler,
  alertBlockHandler,
  columnsBlockHandler,
  boxBlockHandler,
} from '@scrider/formatter';
```

## Ecosystem

```
@scrider/delta          Core — Delta, OT (0 deps)
    ↑
@scrider/formatter      ← you are here (Schema + Conversion)
    ↑
@scrider/editor         React WYSIWYG Component (planned)
```

## License

[MIT](./LICENSE)
