# Contract Template Specification

> **Single source of truth** for the custom Markdown syntax used by Proppsy's contract PDF renderer.
> Intended for future developers and AI agents.
> Do not keep parser knowledge only in code comments — update this document whenever syntax changes.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Table Column Spec Syntax](#table-column-spec-syntax)
4. [Decimal Width Support](#decimal-width-support)
5. [Table Rules](#table-rules)
6. [Special Directives](#special-directives)
7. [Signature System](#signature-system)
8. [Variable Placeholders](#variable-placeholders)
9. [Recommended Authoring Rules](#recommended-authoring-rules)
10. [Common Errors and Troubleshooting](#common-errors-and-troubleshooting)
11. [Implementation Notes](#implementation-notes)

---

## Overview

Contract templates live in:

```
apps/web/public/template-md/*.md
```

Each `.md` file is a Markdown document with a small set of **custom syntax extensions** that drive the PDF renderer. The renderer parses the file, substitutes `<<variable>>` placeholders with values from the contract data, converts the result to HTML, then uses **Puppeteer (headless Chromium)** to produce the final PDF.

The system was designed for Thai legal documents but works for any UTF-8 text.

> ⚠️ **Important:** Templates are legally finalized content. Do **not** edit wording, structure, or page flow. Edit syntax only when you understand what each token produces.

---

## Architecture

```
.md template (Markdown + custom syntax)
        │
        ▼
┌──────────────────────────────────────────┐
│  markdownParser.ts                       │
│  ─ extractDirectives (page-number, …)    │
│  ─ substituteVars  <<name>> → value      │
│  ─ parseBlocks (h1/h2/p/space/break/…)   │
└──────────────────┬───────────────────────┘
                   │
                   ▼ (table block detected)
┌──────────────────────────────────────────┐
│  tableParser.ts (isolated, validated)    │
│  ─ splitRow / isSpecRow / parseSpecCell  │
│  ─ normalizeRowWidth                     │
│  ─ never throws, returns warnings        │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  markdownToHtml.ts                       │
│  blocks → semantic HTML + CSS classes    │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  htmlToPdf.ts                            │
│  ─ Puppeteer browser singleton           │
│  ─ headerTemplate / footerTemplate       │
│  ─ Two-pass merge for last-page mini-sig │
│  ─ Base64-inline signature images        │
└──────────────────┬───────────────────────┘
                   │
                   ▼
              PDF buffer
```

### Why Puppeteer instead of react-pdf

**react-pdf v4 cannot wrap Thai text correctly.** It drops 5–8 characters at every line-wrap boundary. Verified via minimal pure-contiguous test with no markdown parser, no nested nodes, no custom segmentation — the line-break engine itself drops characters. Affects both Sarabun and Noto Sans Thai. Glyph shaping is fine; the bug is in line breaking. Not patchable from userland.

Chromium has **native Thai shaping and proper line breaking**, eliminating wrap-boundary character loss entirely. Cost: Puppeteer is heavier than react-pdf (~170 MB Chromium download, ~1–2s per render). For Thai contracts the trade-off is worth it.

`apps/web/src/lib/pdf/ContractDocument.tsx` (legacy react-pdf for invoice / receipt) is retained because those documents have only short, single-line Thai strings that don't hit the wrap bug.

---

## Table Column Spec Syntax

A markdown table in a contract template has two kinds of rows:

- **Data rows** — contain the actual cell content
- **Spec row** — describes how each column should be aligned and how wide it should be

A row is treated as a **spec row** when *every* cell in it matches the pattern `[-:~\s\d.]*` (only digits, colons, tildes, dashes, dots, and whitespace).

### Spec cell syntax

| Syntax  | Alignment | Underline | Visual                          | Use case                             |
| ------- | --------- | --------- | ------------------------------- | ------------------------------------ |
| `5`     | none      | no        | left-aligned, plain             | default, no decoration               |
| `:5`    | left      | no        | left-aligned, plain             | explicit left                        |
| `5:`    | right     | no        | right-aligned, plain            | numbers, dates aligned right         |
| `:5:`   | center    | **yes**   | centered, with bottom underline | **value cell** — fill-in-the-blank   |
| `~5~`   | center    | no        | centered, plain                 | **centered label** — heading-style   |

The number is the **flex weight**. Higher = wider column. Weights are relative within the row; `[1, 2, 1]` gives the middle column twice the width of the outer columns.

### Example

```md
| สัญญานี้ทำขึ้นระหว่าง | <<ชื่อผู้ให้เช่า>> |
| 3                     | :7:                |
```

Renders as:

```
สัญญานี้ทำขึ้นระหว่าง         ___________(centered, underlined)____________
                              นาย ชนานัท โพคิน
```

Column 1 (`3`): left-aligned, 30% width, plain label.
Column 2 (`:7:`): centered, 70% width, underlined value cell (because both colons present).

### Six-column example

```md
| ทำที่ | <<view>> | วันที่ | <<เมื่อวันที่ภาษาไทย>> | ระยะเวลา | <<ระยะเวลาสัญญา>> |
| 1     | :3:      | 1      | :3:                      | 1.5      | ~1.5~              |
```

Six columns: three label cells (`1`, `1`, `1.5`) and three value cells. The duration on the right uses `~1.5~` to center the number **without** an underline (it's not a fill-in field).

### Dash form (legacy)

Older templates may use dash-style spec cells: `:----:` for center, `:----` for left, `----:` for right. Flex is computed as `(dashes - 2) * 0.5`. This form is still supported but **prefer the numeric form** for clarity.

---

## Decimal Width Support

Decimal flex weights are **fully supported**.

```md
| 1.5 | :3.5: | ~1.5~ | :3.5: |
```

The parser uses `parseFloat` and clamps results to `>= 0`. Non-finite results (`NaN`, `Infinity`) fall back to `1`. Whole numbers and decimals can be mixed freely:

```md
| 2 | :2.5: | ~1~ | :3.5: |
```

### How widths are normalized internally

After parsing, every column produces a `{ align, flex, underline }` record. At render time, the row is laid out via CSS flexbox; the `flex: N` style maps directly to CSS `flex-grow: N`. Browsers handle the proportional distribution.

If a spec cell is unrecognized or produces `NaN`, the parser **clamps it to `1`** and emits a warning (does not crash).

---

## Table Rules

### Column-count mismatch

If the spec row has fewer cells than the data rows, the missing columns receive defaults: `{ align: 'none', flex: 1, underline: false }`. If more, the extra spec cells are ignored. Data rows that are shorter or longer than the canonical column count (= the max width across data rows) are padded with empty strings or truncated.

The parser emits warnings via `console.warn` in non-production mode:

```
[tableParser] warnings: [
  'spec column count 2 ≠ data column count 4, normalizing',
  'row 1: column count 3 ≠ canonical 4, padding/truncating'
]
```

### Multiple spec rows

If a single table contains multiple spec rows (uncommon — usually a mistake), the **last spec row wins**. A warning is logged.

### Graceful fallback

If the table cannot be parsed at all (zero data rows, zero-column input, etc.) `parseTable` returns `{ table: null, error: '…', warnings: [...] }`. The caller in `markdownParser.ts` falls back to rendering each offending line as a plain paragraph instead of crashing:

```ts
if (!result.table) {
  for (const tl of tableLines) {
    blocks.push({ type: 'p', text: stripPipes(tl), bold: false })
  }
}
```

### No runtime crash policy

> **Malformed template syntax must never crash preview rendering.**

The parser:
- Never throws an unhandled exception
- Returns `{ error, warnings }` for diagnostics
- Falls back to plain-text rendering of the offending block
- Logs warnings to the dev console for debugging

This is enforced because preview is rendered inside a Next.js Server Component; an unhandled throw cascades into React Server Components streaming errors (`enqueueModel is not a function`, see Troubleshooting below) that are very hard to diagnose downstream.

---

## Special Directives

Directives are single-token lines that enable document-level features or insert layout primitives. They are removed from the body before rendering and processed separately.

| Directive           | Where                       | Effect                                                                                       |
| ------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `{page-number}`     | anywhere (top recommended)  | Enables Puppeteer footer page numbering: `หน้า 1 / 2`                                       |
| `{signature-mini}`  | anywhere (top recommended)  | Enables small signature row above the footer on every page **except the last**              |
| `{signature-final}` | anywhere (top recommended)  | Enables the large two-signer block at the **end of body content** (renders on the last page) |
| `{break}`           | between blocks              | Forces a page break at this position                                                         |
| `{space:N}`         | between blocks              | Inserts `N` points of vertical whitespace (e.g. `{space:8}` = 8 pt blank)                    |

### Directive placement

`{page-number}`, `{signature-mini}`, `{signature-final}` are **feature flags**. Their position in the file does not matter — the renderer scans for them anywhere. By convention they go at the **top** of the template:

```md
{page-number}
{signature-mini}
{signature-final}

# สัญญาจองห้องชุด

…body content…
```

`{break}` and `{space:N}` are **positional** — they take effect where they appear in the document flow.

---

## Signature System

There are three signature concepts. Each is independent and controlled by its own directive.

### 1. Mini-signature footer

- Enabled by `{signature-mini}`
- Rendered as part of Puppeteer's `footerTemplate` on every page **except the last**
- Two slots side-by-side: `signer[0]` (left), `signer[1]` (right)
- Each slot shows: signature image (if URL is provided), short underline, role label (`ผู้ให้เช่า` / `ผู้เช่า`)
- Sits just above the page-number line

### 2. Final signature block

- Enabled by `{signature-final}`
- Rendered in the **body** (not the footer), at the very end of the content
- Lands on the last page; the page-break-inside: avoid CSS keeps it intact
- Each signer gets a large box: signature image, line, role label, name in parentheses, signed date placeholder
- Two boxes laid out with `flex-direction: row, justify-content: space-around`

### 3. Page number

- Enabled by `{page-number}`
- Rendered in Puppeteer's `footerTemplate` as text: `หน้า X / Y`
- Uses the built-in `<span class="pageNumber"></span>` and `<span class="totalPages"></span>` placeholders that Chromium fills per page

### Multi-page rendering rules

A standard contract has 2 pages: body on page 1 + tail content on page 2 ending with the final signature block.

To make the mini-sig footer appear on page 1 but not page 2, the renderer uses a **two-pass merge**:

1. **Pass A** — render the whole document with the mini-sig footer.
2. **Pass B** — render the whole document with a no-mini footer (same margins, so identical page count).
3. **Merge** with `pdf-lib`: pages `[0 .. N-2]` from Pass A + page `[N-1]` from Pass B.

If page counts diverge (shouldn't happen because margins are identical), the renderer falls back to Pass A unmerged.

### Signature image embedding

Puppeteer's `footerTemplate` runs in an **isolated resource context**: external image URLs (e.g. Supabase signed URLs) silently fail to load. The renderer pre-fetches every `signer.signatureUrl` and inlines it as a `data:image/png;base64,…` URL before injecting into the footer template.

If a signer has no `signatureUrl`, the image slot is left empty but the line + label still render.

---

## Variable Placeholders

Placeholders use **double angle brackets**: `<<variable_name>>`.

```md
| ชื่อผู้ให้เช่า | <<ชื่อผู้ให้เช่า>> |
| 3              | :7:                |
```

Variable names can contain Thai characters, spaces, and punctuation — anything except `>`. The parser uses the regex `<<([^>]+)>>` and replaces with the value from the variable map, or **empty string** if the key is missing.

> ⚠️ Never put **spaces inside** the brackets. `<<ชื่อผู้เช่า>>` ✓ — `<< ชื่อผู้เช่า >>` ✗ (the leading/trailing spaces become part of the key, lookup fails, value is empty).

### Variable computation

Variables are computed in `apps/web/src/lib/contracts/variableCompute.ts`. The map merges:
- Contract fields (`contract.id`, `contract.rent_price`, …)
- Stock fields (`stock.project_name`, `stock.unit_no`, …)
- Owner fields, customer fields, agent fields
- Derived formats (Thai dates, baht-text amounts, formatted addresses)

When adding a new variable, add it both to `variableCompute.ts` (so it gets populated) and to the template (so it gets used). Missing variables render as empty strings, which is usually a layout bug, not a crash.

---

## Recommended Authoring Rules

### Content

- **Prefer shorter paragraphs** for Thai. Chromium wraps Thai correctly, but long paragraphs are harder to proofread and harder to reflow if you change page margins later. Aim for 1–3 sentences per paragraph.
- **Use `{space:N}` for spacing** instead of multiple blank lines. Blank lines collapse; explicit `{space:12}` is predictable.
- **Use `{break}` for hard page breaks** between major sections rather than relying on content length.

### Tables

- **Match spec column count to data column count.** The parser normalizes mismatches but you'll get warnings in the dev console.
- **Avoid nested markdown inside tables.** Bold (`**text**`) is supported in cells. Lists, sub-tables, and other complex markdown are not.
- **Use `~N~` for centered labels** (column headers, units like "บาท / เดือน") and `:N:` only for **actual fill-in value cells**. Mixing them up makes every centered word look like a fill-in blank.

### Placeholders

| Form                  | Correct? | Reason                                               |
| --------------------- | -------- | ---------------------------------------------------- |
| `<<ชื่อผู้เช่า>>`     | ✓ GOOD   | Exact key match                                      |
| `<< ชื่อผู้เช่า >>`   | ✗ BAD    | Leading/trailing spaces → no match → empty render    |
| `<<ชื่อผู้เช่า  >>`   | ✗ BAD    | Trailing spaces → no match                           |
| `< <ชื่อผู้เช่า> >`   | ✗ BAD    | Not the placeholder syntax                           |

### Things to avoid

- HTML tags directly in markdown — not parsed, will render as text
- Unsupported markdown: headings inside cells, blockquotes, images (use the signature system instead)
- Manual page-number text — use `{page-number}` directive
- Manual mini-sig rows in the body — use `{signature-mini}` directive

---

## Common Errors and Troubleshooting

### `chunk.reason.enqueueModel is not a function`

**Cause:** Next.js 16 + Turbopack RSC streaming error. The actual server-side error is something else — this is the downstream React Server Components error when the server response can't be deserialized.

**Common underlying causes:**
- An exception during PDF generation (Puppeteer launch failed, template parse failed, …)
- A package was statically imported into a Server Component but contains code Turbopack can't bundle (Puppeteer, pdf-lib)

**Fix:**
1. Check the **terminal log** of the Next.js dev server for the actual error (not just the browser console)
2. Make sure heavy native packages are dynamic-imported and listed in `serverExternalPackages` in `next.config.mjs`
3. Restart dev server and clear `.next/` cache

### `Cannot read properties of null (reading '…')`

**Cause:** Usually a cascade of the previous error.

**Fix:** Look for the root error in terminal log first.

### `Page range exceeds page count`

**Cause:** Two-pass mini-sig hide rendered the second pass with different margins → different page count → `pageRanges: "N-N"` exceeded actual page count.

**Fix:** Already fixed — both passes now use identical margins. If you see this again, check that `PDF_MARGIN` is used for **both** `renderPdf` calls in `htmlToPdf.ts:htmlToPdfBuffer`.

### Malformed table specs

**Symptom:** Layout looks broken, columns misaligned, or warning in dev console:

```
[tableParser] warnings: [
  'spec column count 2 ≠ data column count 4, normalizing'
]
```

**Cause:** Spec row has different number of cells than data rows.

**Fix:** Count the `|` characters. A row with N columns has N+1 pipes (leading + between + trailing). Make sure spec and data rows have the same count.

### Thai characters disappearing at line wraps

**Cause:** Code path is using react-pdf instead of Puppeteer.

**Fix:** Confirm the template has `mdFilename` set in `templateRegistry.ts`. If `mdFilename` is set, the markdown→HTML→Puppeteer pipeline is used (Thai-safe). If only `filename` is set (DOCX), it falls back to mammoth + react-pdf which has the Thai wrap bug.

### Preview page hangs or times out

**Cause:** First-time Puppeteer use needs to download Chromium (~170 MB).

**Fix:** Wait. After first download, subsequent renders take ~1–2 s. Check `~/.cache/puppeteer/` for the downloaded binary.

---

## Implementation Notes

### File layout

```
apps/web/
  next.config.mjs                          ← serverExternalPackages includes puppeteer, pdf-lib
  public/template-md/*.md                  ← source templates
  public/fonts/NotoSansThai-{Regular,Bold}.ttf
  src/lib/pdf/
    markdownToPdf.tsx                      ← public entry (renderMarkdownAsPdf)
    contract/
      markdownParser.ts                    ← directives + blocks
      tableParser.ts                       ← isolated robust table parser
      markdownToHtml.ts                    ← blocks → HTML
      htmlToPdf.ts                         ← Puppeteer + pdf-lib (two-pass)
    ContractDocument.tsx                   ← LEGACY react-pdf — invoices/receipts only
    mammothToPdf.tsx                       ← LEGACY DOCX fallback
  src/lib/contracts/
    templateRegistry.ts                    ← maps slug → md filename
    variableCompute.ts                     ← contract data → placeholder map
```

### Adding a new contract type

1. Write the markdown template at `apps/web/public/template-md/<slug>.md`
2. Add directive tokens at the top (`{page-number}`, `{signature-mini}`, `{signature-final}` as needed)
3. Use `<<placeholder>>` for any contract-data field. Confirm the key exists in `variableCompute.ts`; if not, add it.
4. Register the template in `templateRegistry.ts` with the `mdFilename` field set to your new file. Do **not** rely on `filename` (DOCX) alone for Thai content — the DOCX fallback uses react-pdf and has the Thai wrap bug.

### Why parser warnings, not errors

The parser is intentionally permissive: malformed input renders something (usually plain text fallback) and logs a warning. This is because:

- Preview is rendered inside a Next.js Server Component
- An unhandled throw cascades into RSC streaming errors that are very hard to diagnose
- We'd rather show "wrong layout + dev warning" than "blank page + cryptic error"

Production logs should be monitored for `[tableParser]` and `[markdownParser]` warnings as signals of template drift.

### Performance

- Puppeteer browser is **singleton** (`getBrowser()`) — one Chromium instance per Node process, reused across PDF requests.
- Each PDF render opens a fresh `Page` and closes it after. Memory should stay bounded.
- Two-pass render doubles Puppeteer cost (~2× the time). Acceptable for contract generation (not a hot path).
- Signature image fetching adds ~50–200 ms per signer per render (one fetch each).

### Production deployment notes

- Local dev uses full `puppeteer` (downloads Chromium to `~/.cache/puppeteer/`).
- For Vercel / serverless: swap to `puppeteer-core` + `@sparticuz/chromium-min`. The current `htmlToPdf.ts` uses `puppeteer.launch()` — adapt to accept the chromium-min binary path.
- Set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and provide the binary via Lambda layer or similar for serverless.

---

## Change Log

| Date       | Change                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| 2026-05-26 | Migrated PDF pipeline from react-pdf to Puppeteer (Thai line-wrap fix)       |
| 2026-05-26 | Added `~N~` syntax for centered label cells (no underline)                   |
| 2026-05-26 | Isolated `tableParser.ts` with validation, normalization, graceful fallback  |
| 2026-05-25 | Introduced layered architecture: parser + body renderer + orchestrator       |
| 2026-05-25 | Added `{page-number}`, `{signature-mini}`, `{signature-final}` directives    |

---

*Maintained alongside `apps/web/src/lib/pdf/contract/`. When syntax changes, update this doc in the same PR.*
