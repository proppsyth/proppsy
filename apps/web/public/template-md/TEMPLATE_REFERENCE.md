# Proppsy Template Reference

This document describes every variable, directive, and syntax feature available in `.md` contract templates.

---

## 1. Document Directives

These lines must appear alone (own line). They set document-level features and are removed from the rendered body.

| Directive | Effect |
|-----------|--------|
| `{page-number}` | Show page X / Y in the footer |
| `{signature-mini}` | Show mini signature boxes in every page footer |
| `{signature-final}` | Render the full signature block at the end of the body |

**Example:**
```
{page-number}
{signature-mini}
```

---

## 2. Variables

Variables are substituted before parsing. Format: `<<key>>` or `<<key|fallback>>`.

### Fallback syntax
```
<<หมู่ที่ เจ้าของ|- >>
```
If `หมู่ที่ เจ้าของ` is empty, renders `- ` instead of blank. Keeps underline visually balanced.

---

### Date variables

| Variable | Example output |
|----------|---------------|
| `<<ทำสัญญาวันที่ภาษาไทย>>` | `4 มิถุนายน 2569` |
| `<<ทำสัญญาวันที่ภาษาอังกฤษ>>` | `4 June 2026` |
| `<<ทำสัญญาวันที่ภาษาอังกฤษLong>>` | `June 4th, 2026` — ordinal format |
| `<<ทำสัญญาวันที่ตัวอักษร>>` | `4 มิถุนายน 2569` |
| `<<ทำสัญญาวันที่สิ้นสุดภาษาไทย>>` | `3 มิถุนายน 2570` (from extra_vars) |
| `<<ทำสัญญาวันที่สิ้นสุดภาษาอังกฤษ>>` | `June 3rd, 2027` (from extra_vars) |
| `<<ปีที่ทำสัญญา>>` | `2569` (Thai year) |
| `<<ทำสัญญาเดือนอย่างเดียว>>` | `6` (month number) |
| `<<ทำสัญญาวันที่อย่างเดียว>>` | `4` (day number, also = payment day) |
| `<<ปีสิ้นสุด>>` | `2570` (Thai year) |
| `<<ปีที่สิ้นสุดไทย>>` | `2570` |
| `<<ปีที่สิ้นสุดอังกฤษ>>` | `2027` |
| `<<เดือนที่สิ้นสุด>>` / `<<เดือนสิ้นสุด>>` | `มิถุนายน` |
| `<<วันที่สิ้นสุด>>` | `3` |

---

### Lessor (owner) variables

| Variable | Description |
|----------|-------------|
| `<<ชื่อผู้ให้เช่า>>` | Owner full name (Thai) |
| `<<ผู้ให้เช่าบัตรประชาชนเลขที่>>` | Owner national ID (digits only) |
| `<<บ้านเลขที่ เจ้าของ>>` | House number |
| `<<หมู่ที่ เจ้าของ>>` | Moo (village group) — often empty |
| `<<ถนน เจ้าของ>>` | Road |
| `<<แขวงตำบล เจ้าของ>>` | Sub-district |
| `<<เขตอำเภอ เจ้าของ>>` | District |
| `<<จังหวัด เจ้าของ>>` | Province |
| `<<รหัสไปรษณีย์ เจ้าของ>>` | Postcode |
| `<<บัญชีธนาคาร>>` | Bank name |
| `<<เลขบัญชี>>` | Bank account number |

---

### Lessee (customer) variables

| Variable | Description |
|----------|-------------|
| `<<ชื่อผู้เช่า>>` | Customer full name (Thai) |
| `<<ผู้เช่าบัตรประชาชนเลขที่>>` | Customer national ID |
| `<<บ้านเลขที่ ลูกค้า>>` | House number |
| `<<หมู่ที่ ลูกค้า>>` | Moo — often empty |
| `<<ถนน ลูกค้า>>` | Road |
| `<<แขวงตำบล ลูกค้า>>` | Sub-district |
| `<<เขตอำเภอ ลูกค้า>>` | District |
| `<<จังหวัด ลูกค้า>>` | Province |
| `<<รหัสไปรษณีย์ ลูกค้า>>` | Postcode |

---

### Property / unit variables

| Variable | Description |
|----------|-------------|
| `<<view>>` | Project name |
| `<<เลขที่ห้องชุด>>` | Unit number |
| `<<ชั้น>>` | Floor |
| `<<ตึก>>` | Building |
| `<<ประเภทห้อง>>` | Room type |
| `<<ขนาด>>` | Size (e.g. `45.50 ตร.ม.`) |
| `<<ซอย>>` | Soi |
| `<<ถนนโครงการ>>` | Project road |
| `<<แขวงตำบลห้องชุด>>` | Sub-district |
| `<<เขตอำเภอห้องชุด>>` | District |
| `<<จังหวัดห้องชุด>>` | Province |
| `<<รหัสไปรษณีย์ห้องชุด>>` | Postcode |

---

### Financial variables

| Variable | Example | Description |
|----------|---------|-------------|
| `<<ค่าเช่าเติมลูกน้ำ>>` | `25,000` | Monthly rent (formatted) |
| `<<ค่าเช่าตัวอักษร>>` | `สองหมื่นห้าพันบาทถ้วน` | Rent in Thai text |
| `<<ค่าเช่าภาษาอังกฤษ>>` | `Twenty Five Thousand` | Rent in English text |
| `<<ค่าเช่าx3>>` | `75,000` | 3× rent (first payment) |
| `<<จำนวนเงินวันทำสัญญา>>` | `50,000` | Deposit amount |
| `<<จำนวนเงินวันทำสัญญาตัวอักษร>>` | `ห้าหมื่นบาทถ้วน` | Deposit in Thai text |
| `<<จำนวนเงินวันทำสัญญาภาษาอังกฤษ>>` | `Fifty Thousand` | Deposit in English |
| `<<ค่าปรับเติมลูกน้ำ>>` | `500` | Daily penalty |
| `<<ค่าปรับตัวอักษร>>` | `ห้าร้อยบาทถ้วน` | Penalty in Thai text |
| `<<ค่าปรับตัวอักษรen>>` | `Five Hundred` | Penalty in English |
| `<<ค่าทำความสะอาดเติมลูกน้ำ>>` | `1,500` | Cleaning fee |
| `<<ค่าทำความสะอาดตัวอักษร>>` | `หนึ่งพันห้าร้อยบาทถ้วน` | Cleaning fee (Thai) |
| `<<ค่าทำความสะอาดตัวอักษรen>>` | `One Thousand Five Hundred` | Cleaning fee (EN) |
| `<<จำนวนแอร์>>` | `2` | Number of A/C units |
| `<<ค่าล้างแอร์เติมลูกน้ำ>>` | `800` | A/C cleaning per unit |
| `<<รวมค่าล้างแอร์เติมลูกน้ำ>>` | `1,600` | Total A/C cleaning |
| `<<รวมทำความสะอาดและล้างแอร์เติมลูกน้ำ>>` | `3,100` | Grand total cleaning |

---

### Contract term variables

| Variable | Description |
|----------|-------------|
| `<<ระยะเวลาสัญญา>>` | Contract months (e.g. `12`) |
| `<<ทำสัญญาวันที่อย่างเดียว>>` | Payment day of month (e.g. `1`) |
| `<<พ้นกำหนดชำระได้>>` | Grace days after payment due date |
| `<<จำนวนผู้พักอาศัย>>` | Number of permitted residents |

---

### Payment schedule (TH-EN-ZH template)

Variables `<<1>>` through `<<12>>` expand to Thai month names for the rental period.
`<<1+5>>` through `<<12+5>>` expand to `"paymentDay+graceDays monthName"` labels.

---

## 3. Table Syntax

Tables use pipe-separated cells. Every table must have a **column-spec row** immediately after the header row.

### Basic structure
```
| Cell 1     | Cell 2     | Cell 3 |
| colspec    | colspec    | colspec |
```

### Column spec syntax

| Spec  | Meaning |
|-------|---------|
| `N`   | Flex width N, left-aligned, no underline |
| `N:` | Flex width N, right-aligned |
| `:N`  | Flex width N, left-aligned |
| `:N:` | Flex width N, center-aligned, **with underline** (value field) |
| `~N~` | Flex width N, center-aligned, no underline |
| `0`   | Zero width (hidden cell — use for single-cell full-width rows) |

**Examples:**
```
| Label   | Value                |
| 3:      | :7:                  |
```
Left cell: right-aligned label (flex 3). Right cell: center + underline (flex 7).

```
| Full width paragraph | |
| 10                   | 0 |
```
Single-content cell spanning full width. Second cell has flex 0 (invisible).

```
| Address | <<addr>> | Moo | <<moo>> | Road | <<road>> |
| 2       | :1.5:    | ~1.5~ | :1:  | ~1.5~ | :3:     |
```
Six-cell address row with alternating label/value columns.

### Auto-detected row styles

The renderer auto-classifies rows based on content:

| Class | Trigger | Visual |
|-------|---------|--------|
| `row-header` | Every non-empty cell is `**bold**` | Navy background |
| `row-total` | Bold cell containing digit + `บาท` | Blue highlighted total |
| `row-amtwords` | Single cell with `{size:N}` containing `บาทถ้วน` | Framed italic box |
| `row-info` | 4+ cols, col[0] right-aligned + non-bold | Muted label style |

> **Note:** `row-amtwords` now only triggers when the cell contains `บาทถ้วน`. Plain Thai clause text that mentions บาท is no longer misclassified.

### Multiline cell behavior
Cells do not support literal newlines. Long text wraps naturally within its flex width. Use separate rows for EN + TH content, or use inline `{size:8}` / `{th}` tags within a single cell.

### Merged cells
Not supported. Use zero-width columns (`0`) for single-cell full-width rows.

---

## 4. Inline Tags

Inline tags work **anywhere inside text** — table cells, paragraphs, block text.

### Font size
```
{size:8}Smaller text{/size}
{size:11}Larger text{/size}
{size:14}Big heading style{/size}
```
Size is clamped between 5pt and 30pt.

### Bilingual / language hierarchy
```
Primary English text {size:8}รองไทย{/size}

{size:8}ข้อความภาษาไทย{/size}
{size:9}中文{/size}
```
Or with semantic tags (same visual result, more readable):
```
Primary English {th}รองไทย{/th}
Primary English {zh}中文{/zh} {th}รองไทย{/th}
```

### All semantic inline tags

| Tag | Visual |
|-----|--------|
| `{en}text{/en}` | Inherits base style (English primary) |
| `{th}text{/th}` | 8pt, gray `#555` — Thai secondary |
| `{zh}text{/zh}` | 9pt, dark `#3A3A3A` — Chinese secondary |
| `{muted}text{/muted}` | 8.5pt, muted `#6B7A99` |
| `{small}text{/small}` | 7.5pt |
| `{bold}text{/bold}` | Bold weight |
| `{italic}text{/italic}` | Italic |
| `{underline}text{/underline}` | Underlined text |
| `{uppercase}text{/uppercase}` | ALL CAPS |
| `{lowercase}text{/lowercase}` | all lowercase |
| `{color:#1f4e79}text{/color}` | Custom hex color |
| `{color:navy}text{/color}` | Named CSS color |
| `{b}text{/b}` | Bold (shorthand for `{bold}`) |
| `{i}text{/i}` | Italic (shorthand for `{italic}`) |
| `{u}text{/u}` | Underline (shorthand for `{underline}`) |

### Bank logo
```
{banklogo:SCB}
{banklogo:KBank}
```
Embeds the bank's logo image inline. Silently ignored if the bank is not in the logo registry.

### Auto-linked: bankcard
```
{bankcard:KBank|Account Name|123-4-56789-0}
{bankcard:compact:KBank|Account Name|123-4-56789-0}
```
Renders a card-style bank info block. Use `compact:` prefix for a smaller version (invoice/receipt style).

Also accepts template variables:
```
{bankcard:<<บัญชีธนาคาร>>|<<ชื่อผู้ให้เช่า>>|<<เลขบัญชี>>}
```

---

## 5. Block-Level Tags (single line)

These must be the **entire line** — no leading spaces, no other content.

### Format: `{tag}content{/tag}`

| Tag | Visual |
|-----|--------|
| `{en-title}text{/en-title}` | 13pt bold navy, centered — English primary title |
| `{th-subtitle}text{/th-subtitle}` | 9.5pt gray, centered — Thai subtitle |
| `{section}text{/section}` | 10pt bold navy, blue bottom border |
| `{box}text{/box}` | Light blue framed box |
| `{center}text{/center}` | Center-aligned paragraph |
| `{right}text{/right}` | Right-aligned paragraph |
| `{en}text{/en}` | 10pt standard English paragraph |
| `{th}text{/th}` | 8pt gray Thai paragraph |
| `{zh}text{/zh}` | 9pt Chinese paragraph |
| `{muted}text{/muted}` | Muted gray paragraph |
| `{small}text{/small}` | 7.5pt small paragraph |
| `{italic}text{/italic}` | Italic paragraph |
| `{bold}text{/bold}` | Bold paragraph |

**Example — bilingual contract title:**
```
{en-title}LEASE AGREEMENT{/en-title}
{th-subtitle}สัญญาเช่า{/th-subtitle}
```

### Format: `{tag:EN param|TH param}` — Bilingual param-blocks

These accept parameters inline using `|` as separator. No closing tag needed.

#### `{section:EN|TH}` — Bilingual section header

```
{section:LESSOR INFORMATION|ข้อมูลผู้ให้เช่า}
{section:RENTAL PROPERTY|ข้อมูลทรัพย์สิน}
{section:FINANCIAL TERMS|ข้อกำหนดทางการเงิน}
```
Renders English title (10.5pt bold navy) above Thai subtitle (8.5pt gray), with a navy bottom border. Self-contained — no closing tag required.

#### `{label:EN|TH}` — Bilingual inline label

```
{label:Date of Agreement|วันที่ทำสัญญา}
{label:Monthly Rent|ค่าเช่ารายเดือน}
```
Renders as `ENGLISH  ภาษาไทย` on one line — English prominent (10pt semibold), Thai muted (8pt). Use as a field header above a table row or value block.

---

## 6. Multi-Line Block Tags

For content spanning multiple lines. Opening tag on its own line, closing tag on its own line.

### `{heading}` — Large centered heading
```
{heading}
LEASE AGREEMENT
{small}สัญญาเช่า{/small}
{/heading}
```
First line renders as `<h1>` (13pt bold navy centered). Subsequent lines render as smaller subtitles.

### `{section-title}` — Section separator heading
```
{section-title}
PARTIES TO THE AGREEMENT
{/section-title}
```
Renders as a 10pt bold navy heading with a blue bottom border — identical to the `h2` element style.

### `{label}` — Bilingual stacked label
```
{label}
ENGLISH LABEL
{th}ป้ายภาษาไทย{/th}
{/label}
```
Each line becomes a stacked paragraph. Use `{th}`, `{small}`, `{size:8}` inside for secondary language styling.

**Example — document date field label:**
```
{label}
Date of Agreement
{size:8}วันที่ทำสัญญา{/size}
{/label}
```

### `{info-box}` — Bilingual information card
```
{info-box}
Date|วันที่|<<ทำสัญญาวันที่ภาษาอังกฤษLong>>|<<ทำสัญญาวันที่ภาษาไทย>>
Property|ห้องชุด|<<เลขที่ห้องชุด>>  <<โครงการ>>
Tenant|ผู้เช่า|<<ชื่อผู้เช่า>>
{/info-box}
```
Renders a light-blue framed card. Lines with `|` separators are split into equal columns. Lines without `|` render as full-width text. Use for key info summaries at the top of bilingual documents.

### `{note}` — Shaded note box
```
{note}
This agreement is subject to the terms and conditions stated herein.
สัญญาฉบับนี้อยู่ภายใต้ข้อกำหนดและเงื่อนไขที่ระบุไว้ในนี้
{/note}
```
Renders with a gray left border and light background — use for footnotes, important notices, or bilingual disclaimers.

### `{box}` and `{box:variant}` — Framed content box
```
{box}
Important notice text here.
Second line of notice.
{/box}

{box:blue}
Blue-tinted notice.
{/box:blue}

{box:gray}
Gray-tinted notice.
{/box:gray}
```

---

## 7. Spacing and Separators

### Vertical space
```
{space:4}    ← 4pt gap
{space:8}    ← 8pt gap (standard section break)
{space:12}   ← 12pt gap (larger break)
```

### Horizontal rules
```
{line}            ← Default light gray line
{line:blue}       ← Blue line (matches section heading color)
{line:thick}      ← Thick 2pt line
{line:dashed}     ← Dashed line
```

### Section divider
```
{divider}
```
A bold blue 2pt rule — use for major document sections.

### Page break
```
{break}
```
Starts a new PDF page at this point.

---

## 8. Standard Markdown Elements

### Headings
```
# Document Title         ← h1: 13pt bold navy, centered
## Section Heading       ← h2: 10pt bold navy, blue border bottom
```

> Note: `h2` headings are currently removed from bilingual templates to preserve the scoped heading hierarchy. Use `{section-title}` or `{section}` instead.

### Paragraphs
Plain text on its own line becomes a paragraph.
```
This is a paragraph.
**This is a bold paragraph.**
```

### Indented paragraphs
```
>20 Indented text with 20pt left padding.
>40 **Bold indented text with 40pt padding.**
```

---

## 9. Column Spec Quick Reference

| Use case | Spec example |
|----------|-------------|
| Full-width single cell | `10 \| 0` |
| Label + underlined value | `3: \| :7:` |
| Clause number + text | `0.5: \| 9.5` |
| Sub-clause | `1: \| 9` |
| 6-col address row | `2 \| :1.5: \| ~1.5~ \| :1: \| ~1.5~ \| :3:` |
| Sub-district + district | `2 \| :3: \| ~2~ \| :3:` |
| Province + postcode | `1.5: \| :4.5: \| ~2.5~ \| :1.5:` |

---

## 10. Complete Template Example

```markdown
{page-number}
{signature-mini}

# LEASE AGREEMENT
{th-subtitle}สัญญาเช่า{/th-subtitle}

| Written at | <<view>> |
| 3: | :7: |
| {size:8}ทำที่{/size} | {size:8}<<view>>{/size} |
| 3: | ~7~ |

| Date | <<ทำสัญญาวันที่ภาษาอังกฤษ>> |
| 2.5: | :7.5: |
| {size:8}วันที่{/size} | {size:8}· <<ทำสัญญาวันที่ภาษาไทย>>{/size} |
| 2.5: | ~7.5~ |
{space:8}

| **1. LEASE TERM** {size:8}/ ข้อ 1. ระยะเวลาของสัญญา{/size} | |
| 10 | 0 |

| 1.1 | The term shall be <<ระยะเวลาสัญญา>> months. |
| 0.5: | 9.5 |

| | {size:8}ระยะเวลาเช่า <<ระยะเวลาสัญญา>> เดือน{/size} |
| 0.5 | 9.5 |
{space:8}

{bankcard:<<บัญชีธนาคาร>>|<<ชื่อผู้ให้เช่า>>|<<เลขบัญชี>>}

{space:12}

{signature-final}
{page-number}
```

---

## 11. Tips for Template Authors

1. **One blank line between table blocks** — prevents consecutive tables from merging.
2. **Never leave a spec row out** — the table will render with default flex=1 for all columns.
3. **Use `| 10 | 0 |` for full-width paragraphs** — the `0` makes the second cell invisible.
4. **Empty optional fields** — use `<<field|- >>` to render a dash when the field is empty (e.g. Moo, Soi).
5. **Bilingual hierarchy** — English at normal size, Thai with `{size:8}`, Chinese with `{size:9}`.
6. **`{size:N}` vs `{th}` tags** — both produce similar visuals. `{th}` is more readable in source. `{size:8}` gives exact point size control.
7. **`row-amtwords` only fires on `บาทถ้วน`** — clause text that mentions บาท is never styled as an amount-in-words box.
