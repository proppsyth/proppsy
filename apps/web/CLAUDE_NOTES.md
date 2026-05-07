# Proppsy — Claude Working Notes
> อัปเดตล่าสุด: 2026-05-07 | อ่านไฟล์นี้ก่อนทุก session แทนการ explore codebase ใหม่

---

## Phase Status (ทุก Phase เสร็จแล้ว)
- ✅ Phase 1: Foundation — login/register, profile, admin approve/reject
- ✅ Phase 2: Core CRUD — stock (AI paste, OCR), owners, customers, projects (AI enrich)
- ✅ Phase 3: Contracts — wizard (9 doc types), PDF bundle (Sarabun font), status workflow
- ✅ Phase 4: Public website — / listing, /listing/[id] detail
- ✅ Phase 5: Appointments, Calendar (merged page), Commission, PWA
- ✅ Phase 6: UX Polish — full-width lists, mobile zoom fix, ID card upload fix, AI owner/project auto-create, address dropdowns, ContactCard fix

---

## Latest Commits (master → main, May 2026)
| Commit | Description |
|--------|-------------|
| `73b3ee1` | ContactCard email fallback เป็น mailto link |
| `0a2b014` | Full-width lists, mobile zoom, ID card upload, AI entity create, address dropdowns |
| `8009ce6` | Merge calendar+appointments, fix sidebar width, add loading states |
| `2b76708` | Contract bundle expansion Steps 2-5 complete |

---

## Architecture

### Monorepo
- Root: `C:\Users\Arnon\proppsy-web\proppsy\`
- App: `apps/web/src/`
- Run dev: `npm run dev` (from root)
- TypeScript check: `cd apps/web && npx tsc --noEmit`

### Next.js Routes
```
src/app/
├── (auth)/          login, register  (no sidebar)
├── (protected)/     dashboard, stock, owners, customers, projects,
│   │                contracts, calendar, appointments, commission, profile
│   └── layout.tsx   sidebar + mobile bottom nav + overflow-x-hidden min-w-0
├── listing/         / (public listing), /[id] (detail + ContactCard)
└── api/places/      GET → serves places.csv as nested JSON (province→district→subdistrict→zip)
```

### Key Source Files
| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/types/index.ts` | All TypeScript interfaces + helpers |
| `src/app/(protected)/layout.tsx` | Sidebar layout (has `overflow-x-hidden min-w-0` on main) |
| `src/components/shared/Sidebar.tsx` | Desktop sidebar nav |
| `src/components/shared/MobileBottomNav.tsx` | Mobile bottom nav |
| `src/components/shared/AddressSelector.tsx` | Cascading province/district/subdistrict/zip dropdowns |
| `src/lib/pdf/ContractDocument.tsx` | PDF template (react-pdf, Sarabun font) |
| `public/fonts/Sarabun-*.ttf` | Thai font for PDF |
| `public/template-doc/สัญญา.md` | Contract template with `<<variable>>` syntax |
| `public/template-doc/places.csv` | 7435 rows: province, district, subdistrict, zip |

---

## Supabase

**URL:** `https://otlvjnmmcvqjzbxefbhw.supabase.co`

**Tables:**
| Table | Key Fields |
|-------|------------|
| `profiles` | id, agent_uid, name, email, phone, line_id, role, account_status |
| `projects` | id (PRJ-xxxx), name_th, name_en, developer, province, district, address_road, bts_mrt[], facilities[] |
| `owners` | id (OWN-xxxx), first_name_th, last_name_th, nickname, phone, line_id, id_card_url |
| `customers` | id (CUS-xxxx), first_name_th, last_name_th, nickname, phone, line_id, id_card_url |
| `stock` | id (STK-xxxx), agent_uid, owner_id, project_id, project_name, unit_no, status (available/rented/sold/reserved) |
| `contracts` | id (BK-xxxx), stock_id, owner_id, customer_id, doc_type, status, rent_price, deposit, ... |
| `appointments` | id, agent_uid, stock_id, customer_id, datetime, status |
| `news` | id, agent_uid, title, body |

**Storage Buckets:**
- `stock-photos` — รูปทรัพย์
- `documents` — บัตรประชาชน (id-cards/...), ลายเซ็น (signatures/...), เอกสาร PDF
- `logos` — โลโก้บริษัท

**RLS Pattern:** `.eq('agent_uid', user.id)` — ข้อมูลแต่ละคนแยกกัน

---

## ID Generation Pattern
```ts
async function nextId(table: string, prefix: string): Promise<string> {
  const { data } = await supabase.from(table).select('id')
    .like('id', `${prefix}-%`).order('id', { ascending: false }).limit(1).maybeSingle()
  const num = data?.id ? (parseInt(data.id.slice(prefix.length + 1)) || 0) : 0
  return `${prefix}-${String(num + 1).padStart(4, '0')}`
}
// Prefixes: STK, OWN, CUS, PRJ, BK
```

---

## Established Patterns

### Server Component
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
}
```

### Server Action
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function doThing(input: Input): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }
  const { error } = await supabase.from('table').insert({ agent_uid: user.id, ...input })
  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }
  revalidatePath('/path')
  return {}
}
```

### Client Form
```tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function MyForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit() {
    startTransition(async () => {
      const res = await myAction(...)
      if (res.error) { setError(res.error); return }
      router.push('/success')
    })
  }
}
```

### Storage Upload (client)
```ts
const supabase = createClient()  // from '@/lib/supabase/client'
const path = `subdir/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
const { data, error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(data.path)
```

### Address Selector
```tsx
import AddressSelector from '@/components/shared/AddressSelector'
// Props: province, district, subdistrict, zip, onChange(field, value)
// Cascading: จังหวัด → เขต/อำเภอ → แขวง/ตำบล → รหัสไปรษณีย์ (auto-fill)
// Data source: /api/places → public/template-doc/places.csv (module-level cache)
```

### Loading State
```tsx
// ทุก route ใน (protected) มี loading.tsx แล้ว (spinners)
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

---

## AI Features

### parseStockTextWithEntities (actions.ts ใน /stock)
- รับ rawtext → Gemini → สกัดข้อมูล stock + owner + project
- **Owner:** ตรวจ phone ก่อน → ตรวจ line_id → ถ้าไม่พบสร้างใหม่ (revalidatePath /owners)
- **Project:** ตรวจ ilike name_th → ถ้าไม่พบ: Gemini enrich → สร้างใหม่ (revalidatePath /projects)
- Returns: `ParseWithEntitiesResult { stock, owner_id?, owner_created, owner_display?, project_id?, project_created, project_display? }`

### Gemini Model
- `gemini-2.0-flash` via `@google/generative-ai`
- Key: GEMINI_API_KEY env var
- OCR: ถ่ายบัตร → สกัดชื่อ/เลขบัตร/วันเกิด/ที่อยู่

---

## Contract System

### Doc Types (ContractDocType)
`rental_agreement | reservation | invoice_reservation | receipt_reservation | invoice_deposit | receipt_deposit | commission_confirm | renewal | co_agent`

### PDF Bundle
- `ContractDocument.tsx` ออก PDF หลายหน้า จาก template-doc/*.md
- Variables: `<<variable_name>>` syntax
- Thai number-to-words: bahtText() function

### DB Migration Files
- `supabase/migrations/001_initial.sql` — base schema
- `supabase/migrations/002_contracts_expansion.sql` — fields ใหม่ (water/electric/internet/parking fees, payment info, commission)

---

## Known Manual Steps Required
1. **Supabase Site URL** — ต้องตั้งใน Dashboard → Authentication → URL Configuration → Site URL เป็น Vercel production URL (ไม่งั้น email verification link ไป localhost)
2. **Profile phone/LINE** — เอเจนต์ต้องกรอกเบอร์โทรและ LINE ID ในหน้า Profile ถึงจะแสดงใน public listing ContactCard

---

## searchParams Pattern (Next.js 15+)
```tsx
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'all' } = await searchParams
}
```
