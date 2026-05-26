// Standalone tests for tableParser. Run with:  npx tsx tableParser.test.ts
//
// We don't have vitest/jest set up. These tests use plain assertions and exit
// with non-zero status on failure so the file can be wired into CI later.

import { parseSpecCell, parseTable, isSpecCell, isSpecRow } from './tableParser'

let pass = 0
let fail = 0

function eq(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
    // console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.error(`  ✗ ${label}`)
    console.error(`     expected: ${e}`)
    console.error(`     actual:   ${a}`)
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`)
}

// ─── parseSpecCell ─────────────────────────────────────────────────

section('parseSpecCell — integer specs')
eq(parseSpecCell('5'),   { align: 'none',   flex: 5, underline: false }, 'plain int → none/5')
eq(parseSpecCell(':5'),  { align: 'left',   flex: 5, underline: false }, ':5 → left/5')
eq(parseSpecCell('5:'),  { align: 'right',  flex: 5, underline: false }, '5: → right/5')
eq(parseSpecCell(':5:'), { align: 'center', flex: 5, underline: true  }, ':5: → center/5/underline')

section('parseSpecCell — decimal specs')
eq(parseSpecCell('1.5'),    { align: 'none',   flex: 1.5,  underline: false }, '1.5 → none/1.5')
eq(parseSpecCell(':1.5'),   { align: 'left',   flex: 1.5,  underline: false }, ':1.5 → left/1.5')
eq(parseSpecCell('1.5:'),   { align: 'right',  flex: 1.5,  underline: false }, '1.5: → right/1.5')
eq(parseSpecCell(':3.5:'),  { align: 'center', flex: 3.5,  underline: true  }, ':3.5: → center/3.5/U')
eq(parseSpecCell(':2.25:'), { align: 'center', flex: 2.25, underline: true  }, ':2.25: → center/2.25/U')
eq(parseSpecCell(':10.5:'), { align: 'center', flex: 10.5, underline: true  }, ':10.5: → center/10.5/U')

section('parseSpecCell — tilde integer specs')
eq(parseSpecCell('~1~'),  { align: 'center', flex: 1,  underline: false }, '~1~ → center/1/no-U')
eq(parseSpecCell('~2~'),  { align: 'center', flex: 2,  underline: false }, '~2~ → center/2/no-U')
eq(parseSpecCell('~10~'), { align: 'center', flex: 10, underline: false }, '~10~ → center/10/no-U')

section('parseSpecCell — tilde DECIMAL specs (user requested)')
eq(parseSpecCell('~1.5~'),    { align: 'center', flex: 1.5,  underline: false }, '~1.5~ → center/1.5/no-U')
eq(parseSpecCell('~2.25~'),   { align: 'center', flex: 2.25, underline: false }, '~2.25~ → center/2.25/no-U')
eq(parseSpecCell('~10.5~'),   { align: 'center', flex: 10.5, underline: false }, '~10.5~ → center/10.5/no-U')
eq(parseSpecCell('~0.5~'),    { align: 'center', flex: 0.5,  underline: false }, '~0.5~ → center/0.5/no-U')
eq(parseSpecCell('~.5~'),     { align: 'center', flex: 0.5,  underline: false }, '~.5~ → center/0.5/no-U (no leading 0)')
eq(parseSpecCell('~1.~'),     { align: 'center', flex: 1,    underline: false }, '~1.~ → center/1/no-U (trailing dot)')
eq(parseSpecCell('~ 1.5 ~'),  { align: 'center', flex: 1.5,  underline: false }, '~ 1.5 ~ → center/1.5/no-U (whitespace OK)')

section('parseSpecCell — edge cases (graceful fallback)')
eq(parseSpecCell(''),         { align: 'none',   flex: 1, underline: false }, 'empty → default')
eq(parseSpecCell('   '),      { align: 'none',   flex: 1, underline: false }, 'whitespace → default')
eq(parseSpecCell('~~'),       { align: 'none',   flex: 1, underline: false }, '~~ (no number) → default')
eq(parseSpecCell('~abc~'),    { align: 'none',   flex: 1, underline: false }, '~abc~ (non-numeric) → default')
eq(parseSpecCell('~1.5.5~'),  { align: 'none',   flex: 1, underline: false }, '~1.5.5~ (invalid number) → default')
// Single `:` — startsWith AND endsWith colon both true → treated as center
eq(parseSpecCell(':'),        { align: 'center', flex: 1, underline: true  }, ': alone → center (both colons)')
eq(parseSpecCell('::'),       { align: 'center', flex: 1, underline: true  }, ':: → center/1/U')

section('parseSpecCell — dash form (legacy)')
eq(parseSpecCell(':---:'),    { align: 'center', flex: 0.5, underline: true  }, ':---: → center/0.5/U')
eq(parseSpecCell(':----'),    { align: 'left',   flex: 1,   underline: false }, ':---- → left/1')
eq(parseSpecCell('----:'),    { align: 'right',  flex: 1,   underline: false }, '----: → right/1')

// ─── isSpecCell / isSpecRow ────────────────────────────────────────

section('isSpecCell — token detection')
eq(isSpecCell('5'),       true, 'int is spec')
eq(isSpecCell('1.5'),     true, 'decimal is spec')
eq(isSpecCell(':3.5:'),   true, ':decimal: is spec')
eq(isSpecCell('~1.5~'),   true, '~decimal~ is spec')
eq(isSpecCell(''),        true, 'empty is spec (acts as default col)')
eq(isSpecCell('hello'),   false, 'text is not spec')
eq(isSpecCell('1.5 foo'), false, 'mixed is not spec')

section('isSpecRow — row detection')
eq(isSpecRow(['1', ':2:', '~1.5~', '3:']), true,  'all-spec row → true')
eq(isSpecRow(['1', 'hello', ':2:']),       false, 'mixed row → false')
eq(isSpecRow([]),                           false, 'empty array → false')

// ─── parseTable — full table parsing ───────────────────────────────

section('parseTable — user-reported tilde decimal case (SHOULD WORK)')
const t1 = parseTable([
  '| H1 | H2 | H3 | H4 |',
  '| 1.5 | :3.5: | ~1.5~ | :3.5: |',
])
eq(t1.error,           undefined, 't1: no error')
eq(t1.table !== null,  true,      't1: table parsed')
if (t1.table) {
  eq(t1.table.cols.length, 4, 't1: 4 columns')
  eq(t1.table.cols[0]!.flex, 1.5, 't1: col[0] flex=1.5')
  eq(t1.table.cols[1]!.flex, 3.5, 't1: col[1] flex=3.5')
  eq(t1.table.cols[2]!.flex, 1.5, 't1: col[2] flex=1.5')
  eq(t1.table.cols[3]!.flex, 3.5, 't1: col[3] flex=3.5')
  eq(t1.table.cols[2]!.align, 'center', 't1: col[2] center (~1.5~)')
  eq(t1.table.cols[2]!.underline, false, 't1: col[2] NO underline (~1.5~)')
  eq(t1.table.cols[1]!.underline, true,  't1: col[1] WITH underline (:3.5:)')
}

section('parseTable — 6-column mixed decimals + tildes')
const t2 = parseTable([
  '| a | b | c | d | e | f |',
  '| 1.5 | :2: | ~1~ | :1: | ~1~ | :3: |',
])
eq(t2.error, undefined, 't2: no error')
if (t2.table) {
  eq(t2.table.cols.length, 6, 't2: 6 columns')
}

section('parseTable — graceful fallback on bad input')
const t3 = parseTable([])
eq(t3.table, null, 't3: empty input → null table (no crash)')
eq(typeof t3.error, 'string', 't3: error message returned')

// `~bogus~` contains letters so the cell is NOT a spec cell → whole row is
// treated as data. Result: 1 data row, no spec row, default cols.
const t4 = parseTable(['| ~bogus~ | ~~ | ~1.5~ |'])
eq(t4.table !== null, true, 't4: mixed-content row treated as data (does not crash)')
if (t4.table) {
  eq(t4.table.rows.length, 1, 't4: 1 data row')
  eq(t4.table.cols.length, 3, 't4: 3 default cols')
}

section('parseTable — column count mismatch normalizes (does NOT crash)')
const t5 = parseTable([
  '| H1 | H2 | H3 | H4 |',
  '| 1 | :2: |',
])
eq(t5.error, undefined, 't5: no error (normalizes)')
if (t5.table) {
  eq(t5.table.cols.length, 4, 't5: cols padded to 4')
}
eq(t5.warnings.length > 0, true, 't5: warning emitted')

// ─── Summary ───────────────────────────────────────────────────────

console.log(`\n──────────────────────────`)
console.log(` ${pass} passed, ${fail} failed`)
if (fail > 0) {
  process.exit(1)
}
