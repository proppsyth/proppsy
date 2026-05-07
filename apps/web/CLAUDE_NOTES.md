# Proppsy — Claude Working Notes
> ไฟล์นี้สำหรับ Claude ใช้อ้างอิงเอง ไม่ใช่ docs สำหรับผู้ใช้

---

## Phase Status
- ✅ Phase 1: Foundation (dev server, login, profile, admin users)
- ✅ Phase 2: Core CRUD (stock, owners, customers, projects)
- ✅ Phase 3: Contracts (4-step wizard, 9 doc types, PDF generation)
- ✅ Phase 4: Public website (/ listing, /listing/[id] detail, /register already done)
- ✅ Phase 5: Appointments CRUD, Calendar month view, Commission tracking, PWA manifest

---

## Established Patterns (copy from these, don't reinvent)

### Server Component (data fetch)
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params                          // Next.js 15+ async params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // fetch + render
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

### Client Form with Server Action
```tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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

### ID Generation Pattern
```ts
async function nextId(table: string, prefix: string): Promise<string> {
  const { data } = await supabase.from(table).select('id')
    .like('id', `${prefix}-%`).order('id', { ascending: false }).limit(1).maybeSingle()
  const num = data?.id ? (parseInt(data.id.slice(prefix.length + 1)) || 0) : 0
  return `${prefix}-${String(num + 1).padStart(4, '0')}`
}
// STK-0001, OWN-0001, CUS-0001, PRJ-0001, BK-0001
```

### Supabase Storage Upload (client-side)
```ts
const supabase = createClient()  // from '@/lib/supabase/client'
const path = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
const { data, error } = await supabase.storage.from('bucket-name').upload(path, file, { upsert: true })
const { data: { publicUrl } } = supabase.storage.from('bucket-name').getPublicUrl(data.path)
```

### searchParams (server, Next.js 15+)
```tsx
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'all' } = await searchParams
}
```

---

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/types/index.ts` | All TypeScript types + helper functions |
| `src/app/(protected)/layout.tsx` | Sidebar layout for dashboard |
| `src/lib/pdf/ContractDocument.tsx` | PDF template (react-pdf) |
| `public/fonts/Sarabun-*.ttf` | Thai font for PDF generation |

## Supabase
- URL: `https://otlvjnmmcvqjzbxefbhw.supabase.co`
- Storage buckets: `stock-photos`, `id-cards`, `signatures`, `logos`, `documents`
- Tables: `profiles`, `projects`, `owners`, `customers`, `stock`, `contracts`, `appointments`, `news`
- RLS: always filter `.eq('agent_uid', user.id)` for agent data

## Types (from @/types)
- `ownerDisplayName(owner)` — nickname first, then full Thai name
- `customerDisplayName(customer)` — same
- `stockDisplayTitle(stock)` — "Project · UnitNo · RoomType"
- `DOC_TYPE_LABELS` — Record<ContractDocType, string> in Thai
- `STATUS_LABELS` — Record<StockStatus, string> in Thai

---

## Phase 4 Plan (Public Website)

### Pages to build:
1. **`/`** — Public listing (no auth)
   - Fetch `stock` where `status = 'available'`, no agent_uid filter
   - Grid of property cards (photo, price, size, project name)
   - Filter: listing_type (rent/sale/both), room_type, price range
   - NO owner info visible (RLS + code)

2. **`/listing/[id]`** — Public property detail (no auth)
   - Fetch single stock where `status = 'available'`
   - Show: photos (gallery), price, details, facilities, floor plan
   - NO contact info for owner — only "ติดต่อสอบถาม" form or Line button
   - Breadcrumb back to `/`

3. **`/register`** — Agent registration form
   - Name, email, password, phone, company name
   - Submit → Supabase signUp() → profile auto-created by trigger → status = 'pending'
   - Show "รอการอนุมัติ" message after submit

### Notes for Phase 4:
- These routes are NOT in `(protected)` group → no sidebar, no auth check
- Use `createClient()` from server.ts but don't require login
- Public pages: query `stock` table directly (Supabase RLS allows public to read available stock)
- Register page: use `createClient()` from client.ts (browser-side signUp)
- Style: same Tailwind classes, but more spacious/marketing feel
- Images: already configured remotePatterns for supabase.co in next.config.mjs

---

## Phase 5 Plan (Polish)

### Dashboard KPIs (`/dashboard`)
- Currently: skeleton page
- Need: real data queries
  - total stocks, by status (available/rented/sold)
  - total contracts this month, by type
  - upcoming contract expirations (next 30 days)
  - total owners, customers

### Calendar
- Show appointments + contract end dates on a calendar
- Simple month view, no external lib needed (pure CSS grid)

### Commission tracking
- Sum commission_net from signed contracts
- Group by month

### PWA
- Add `manifest.json` to public/
- Add `next-pwa` or manual service worker
- Meta tags for iOS/Android install prompts
