# Proppsy — Claude Code Reference

## Project Identity

**Proppsy** is a Thai real estate SaaS platform for professional agents. It manages property listings (stock), owners, customers, contracts (with e-signatures), appointments, billing, and analytics. UI language is Thai. Users are 100% mobile — every screen must be designed mobile-first.

Supabase project ID: `otlvjnmmcvqjzbxefbhw`

---

## Monorepo Layout

```
proppsy/                         ← repo root (git is here)
└── apps/
    └── web/                     ← Next.js app (git working directory for commits)
        ├── src/
        │   ├── app/             ← Next.js App Router pages
        │   ├── components/      ← shared UI components
        │   ├── hooks/           ← client hooks
        │   ├── lib/             ← supabase clients, contracts, upload utils
        │   └── types/index.ts   ← all shared TypeScript types + display helpers
        ├── public/
        │   └── template-doc/    ← .docx contract templates (9 files)
        └── supabase/
            └── migrations/      ← SQL migration files (001–027)
```

**Git working directory is `apps/web/`** — when staging files with `git add`, paths must be relative to `apps/web/`, e.g. `src/app/...`, NOT `apps/web/src/app/...`.

---

## Supabase Clients — Critical Rules

Three distinct clients in `apps/web/src/lib/supabase/`:

| Client | Function | Sync? | When to Use |
|--------|----------|-------|-------------|
| `createClient()` | auth-aware (anon key + cookies) | **async** | Protected pages, middleware |
| `createServiceClient()` | service-role, no RLS | **sync** | Public/admin server components (sitemap, public pages, admin pages) |
| `createAdminClient()` | service-role + cookies | **async** | Server actions that need both service role and cookie context |
| `createClient()` from `@/lib/supabase/client` | browser client (anon key) | sync | Client components only |

**Most common mistake:** using `createClient()` (async, auth-aware) instead of `createServiceClient()` (sync) in public server components. Public pages like `/faq`, `/articles`, `/news`, `/listing/[id]` should always use `createServiceClient()`.

**`assertAdmin()` pattern** — used in every server action under `(admin)`:
```ts
async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}
```

---

## Route Architecture

```
app/
├── (admin)/admin/           ← Admin panel (role=admin only)
│   ├── page.tsx             ← Dashboard overview
│   ├── users/               ← User management + approve/reject
│   ├── contracts/           ← All contracts (read-only overview)
│   ├── companies/           ← Profiles grouped by company_name
│   ├── projects/            ← All projects with stock counts
│   ├── logs/                ← contract_timeline_events
│   ├── billing/             ← credit_transactions (purchase/assign)
│   ├── templates/           ← Static TEMPLATE_REGISTRY display
│   ├── packages/            ← Plan counts + upgrade info
│   ├── news/                ← CRUD for news table
│   ├── articles/            ← CRUD for articles table
│   ├── banners/             ← CRUD for banners table
│   ├── faq/                 ← CRUD for faq table
│   ├── settings/            ← app_settings key-value editor
│   ├── credits/             ← Credit grant tool
│   └── analytics/           ← Stats charts
│
├── (auth)/                  ← Login, register, reset-password (public)
│
├── (protected)/             ← Agent workspace (auth required)
│   ├── dashboard/
│   ├── stock/               ← Property listings CRUD
│   ├── owners/              ← Owner CRUD
│   ├── customers/           ← Customer CRUD
│   ├── projects/            ← Project CRUD
│   ├── contracts/           ← Contract CRUD + e-sign flow
│   ├── calendar/
│   ├── commission/
│   ├── credits/
│   ├── billing/
│   └── profile/
│
├── (checkout)/checkout/     ← Omise payment flow
│
├── agent/[slug]/            ← Public agent profile page
├── listing/[id]/            ← Public property listing page
├── articles/                ← Public articles list + [slug] detail
├── news/                    ← Public news list + [id] detail
├── faq/                     ← Public FAQ page
├── help/                    ← Public help page
├── about/                   ← Public about page
├── contact/                 ← Public contact page
├── services/                ← Public services page
└── sign/[token]/            ← E-signature page (public, token-gated)
```

---

## Database Tables (Migrations 001–027)

### Core tables (001_initial)
- **`profiles`** — users. Key cols: `id` (uuid, FK to auth.users), `role` (admin/manager/user), `account_status` (pending/approved/rejected), `plan` (starter/professional/business), `permissions` (jsonb), `public_slug`, `company_name`
- **`stock`** (STK-XXXX) — property listings. Key cols: `agent_uid`, `project_id`, `listing_type` (rent/sale/both), `status` (available/rented/sold/unavailable), `is_published`, `photo_urls[]`, `photo_thumb_urls[]`
- **`projects`** (PRJ-XXXX) — building/project registry
- **`owners`** (OWN-XXXX) — property owners, per-agent
- **`customers`** (CUS-XXXX) — customers/leads, per-agent
- **`contracts`** (BK-XXXX) — contract documents

### Contract system (002, 007, 009, 011, 012, 022, 023)
- **`contract_signers`** — esign participants (tenant/owner/co_agent/witness), each with `sign_token`, `status`, `signature_url`
- **`contract_timeline_events`** — audit log for all contract actions
- Contract V2 fields on `contracts`: `template_slug`, `language_version`, `sign_token`, `is_finalized`, `finalized_pdf_url`, `parent_contract_id`, `master_contract_id`, `contract_category` (reservation/lease/child)

### Supporting tables
- **`credit_transactions`** — types: grant/topup/spend/reset/assign/expire
- **`appointments`** — calendar events
- **`news`** — published news articles (simple: title/summary/content/cover_url)
- **`articles`** (024) — rich articles with `slug` (unique), `category` (general/guide/market/update), `is_published`, `cover_url`, `excerpt`
- **`banners`** (025) — `position` (home_hero/home_feature/sidebar), `sort_order`, `link_url`, `is_active`, `start_date`, `end_date`
- **`faq`** (026) — `question`, `answer`, `category` (general/contract/listing/payment/account), `sort_order`, `is_published`
- **`app_settings`** (027) — key-value store: `key`, `value` (jsonb), `label`, `description`. Pre-seeded with 8 keys: `site_name`, `maintenance_mode`, `allow_registration`, `require_approval`, `ai_enabled`, `max_free_stock`, `contact_email`, `line_notify_token`

### Storage buckets
- `stock-photos` — public, property photos (main 1920px WebP + thumb 400px WebP)
- `documents` — public, non-sensitive docs (id-cards, signatures, profiles, news-covers, article-covers, banner-images)
- `secure-documents` — private (signed URLs), sensitive docs (id cards when watermarked)
- `contracts` — private, generated PDF/DOCX files

---

## Server Actions Pattern

All mutation files are `actions.ts` with `'use server'` at the top:

```ts
'use server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin(): Promise<void> { ... }

export async function someAction(data: ...): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('table').update(data)...
    if (error) return { error: error.message }
    revalidatePath('/admin/some-path')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
```

Always call `revalidatePath()` after mutations that affect a page.

---

## Key Files Index

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All types, enums, `PLAN_META`, `PLAN_LIMITS`, `resolvePlan()`, `DOC_TYPE_LABELS`, display helpers |
| `src/lib/supabase/server.ts` | `createClient` (async), `createServiceClient` (sync), `createAdminClient` (async) |
| `src/lib/supabase/client.ts` | `createClient` for browser components |
| `src/lib/contracts/templateRegistry.ts` | `TEMPLATE_REGISTRY` — 9 `.docx` templates (rental×3, reservation×3, renewal×2, co_agent×1) |
| `src/hooks/useUpload.ts` | `usePropertyImages`, `useDocumentUpload` hooks |
| `src/components/shared/Sidebar.tsx` | Agent sidebar + mobile nav + hamburger dropdown |
| `src/components/shared/AdminSidebar.tsx` | Admin panel sidebar |
| `src/components/shared/PublicNav.tsx` | Public pages top nav |
| `src/components/shared/MobileBottomNav.tsx` | Mobile bottom nav bar |
| `src/components/shared/StorageImage.tsx` | Renders private storage images via signed URL |
| `src/lib/upload/storageService.ts` | `uploadPublic`, `uploadPrivate`, `deleteStorageFile`, `extractStoragePath` |
| `src/lib/upload/imageProcessor.ts` | `processPropertyImages` (dual WebP), `processToWebp`, `applyIdCardWatermark` |
| `src/lib/credits/actions.ts` | `grantStarterCredits`, `spendCredits` |

---

## Plan System

```ts
// types/index.ts
export const PLAN_LIMITS = {
  starter:      { maxStock: 10,   maxContractsPerMonth: 5,    aiCallsPerMonth: 10 },
  professional: { maxStock: null, maxContractsPerMonth: null, aiCallsPerMonth: 300 },
  business:     { maxStock: null, maxContractsPerMonth: null, aiCallsPerMonth: 300 },
}

export const PLAN_META = {
  starter:      { label: 'Starter',      badge: 'bg-gray-100 text-gray-600' },
  professional: { label: 'Professional', badge: 'bg-blue-100 text-blue-700' },
  business:     { label: 'Business',     badge: 'bg-purple-100 text-purple-700' },
}

export function resolvePlan(plan?: string | null): Plan {
  if (plan === 'professional' || plan === 'business') return plan
  return 'starter'
}
```

`null` limits mean unlimited.

---

## Contract System (3-Layer Architecture)

Contracts have a hierarchy:
1. **Reservation** (`contract_category = 'reservation'`) — top level, BK-XXXX
2. **Lease** (`contract_category = 'lease'`) — links to reservation via `parent_contract_id`
3. **Child docs** (`contract_category = 'child'`) — renewal, cancellation, etc. link to lease via `master_contract_id`

**Supported doc types with .docx templates:** `rental`, `reservation`, `renewal`, `co_agent`

**Templates live in:** `apps/web/public/template-doc/*.docx`

**Lifecycle states:** draft → sent → viewed → partially_signed → signed → completed → cancelled/terminated/renewed

**Finalization:** Once `is_finalized = true`, the contract is immutable. `finalized_pdf_url` and `finalized_docx_url` are the locked versions.

---

## Upload System

### Property photos — `usePropertyImages`
```ts
const { mainUrls, thumbUrls, progress, addImages, removeImage } = usePropertyImages({
  stockId: 'STK-0001',  // folder prefix
})
```
Generates main (1920px) + thumb (400px) WebP per image. Bucket: `stock-photos`.

### Documents — `useDocumentUpload`
```ts
const { url, progress, upload, clear } = useDocumentUpload({
  category: 'article-covers',  // 'id-cards' | 'signatures' | 'profiles' | 'news-covers' | 'article-covers' | 'banner-images'
  entityId: article.id,
  isPrivate: false,
})
```
Single-file uploader. Converts to WebP (1280px). Bucket: `documents` (public) or `secure-documents` (private).

---

## UI Conventions

### Card pattern
```tsx
<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
```

### Mobile-first section headers
```tsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-base font-semibold text-gray-700">Section Title</h2>
  <button className="text-sm text-blue-600">Action</button>
</div>
```

### Status/category badge
```tsx
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
  Label
</span>
```

### 2-click delete confirm (client component pattern)
```tsx
const [confirmId, setConfirmId] = useState<string | null>(null)

{confirmId === item.id ? (
  <>
    <button onClick={() => handleDelete(item.id)} className="text-xs text-red-600">ยืนยัน</button>
    <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400">ยกเลิก</button>
  </>
) : (
  <button onClick={() => setConfirmId(item.id)} className="text-xs text-gray-400">ลบ</button>
)}
```

### Toggle switch (settings/publish)
```tsx
<button
  type="button"
  onClick={handleToggle}
  className={`relative w-11 h-6 rounded-full transition-colors ${val ? 'bg-green-500' : 'bg-gray-200'}`}
>
  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : ''}`} />
</button>
```

### Parallel DB queries (performance standard)
```ts
const [aRes, bRes, cRes] = await Promise.all([
  supabase.from('table_a').select('...'),
  supabase.from('table_b').select('...'),
  supabase.from('table_c').select('...'),
])
```

### Avoiding N+1 — batch profile lookups
```ts
const uids = [...new Set(items.map(i => i.agent_uid))]
const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids)
const profileMap = new Map(profiles?.map(p => [p.id, p]))
const enriched = items.map(i => ({ ...i, agent: profileMap.get(i.agent_uid) }))
```

---

## Thai Language Conventions

- All user-facing text is in Thai
- Date display: `toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })`
- Error messages: Thai (e.g. `'กรุณากรอกตัวเลข'`, `'ไม่มีสิทธิ์'`)
- Empty state text: Thai (e.g. `'ยังไม่มีข้อมูล'`, `'ไม่พบรายการ'`)
- Action labels: Thai (บันทึก, ยกเลิก, ลบ, แก้ไข, เพิ่ม)
- "บันทึกแล้ว ✓" — success feedback after save

---

## Common Pitfalls

1. **`createServiceClient` is sync, not async** — no `await`. Calling `await createServiceClient()` gives a Supabase client object where you try to `.from()` a Promise.

2. **Admin pages use `createServiceClient()`** — not `createClient()`. Admin pages bypass RLS by using service role.

3. **Public pages also use `createServiceClient()`** — sitemap, `/faq`, `/articles`, `/news`, `/listing/[id]`, `/agent/[slug]` all use service role so they can read published data regardless of RLS.

4. **Git paths from `apps/web/`** — when running git commands, the working directory is `apps/web/`, so use `src/app/...` not `apps/web/src/app/...`.

5. **`revalidatePath` after every mutation** — without this, Next.js serves stale cached data.

6. **Type widening for mixed DB types** — Supabase may return `number | null` while a component wants `string | null`. Widen to `number | string | null | undefined` rather than casting.

7. **Client components with `'use client'`** — only needed for hooks (useState, useEffect, useMemo), event handlers, or browser APIs. Server components are the default and preferred.
