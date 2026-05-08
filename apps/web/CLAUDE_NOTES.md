# Proppsy — Claude Working Notes
> อัปเดตล่าสุด: 2026-05-08 (session 3) | อ่านไฟล์นี้ก่อนทุก session แทนการ explore codebase ใหม่

---

## Phase Status (ทุก Phase เสร็จแล้ว)
- ✅ Phase 1: Foundation — login/register, profile, admin approve/reject
- ✅ Phase 2: Core CRUD — stock (AI paste, OCR), owners, customers, projects (AI enrich)
- ✅ Phase 3: Contracts — wizard (9 doc types), PDF bundle (Sarabun font), status workflow
- ✅ Phase 4: Public website — / listing, /listing/[id] detail
- ✅ Phase 5: Appointments, Calendar (merged page), Commission, PWA
- ✅ Phase 6: UX Polish — full-width lists, mobile zoom fix, ID card upload, AI entity create, address dropdowns
- ✅ Phase 7: Site Expansion — logo+text, forgot pwd, admin CRUD users, stock mobile fix, commission year, public pages (news/about/contact), admin news CMS
- ✅ Phase 8: UX & Features — mobile overflow fix, calendar 3rd color (นัดทำสัญญา), logo→home link, admin mobile menu, delete stock, download all photos, online signature pad (ProfileForm + OwnerForm), PDF font fix
- ✅ Phase 9: Public Site — register rewrite (prefix/name/address/OTP), homepage search bar, /services page (pricing+stats), PublicNav shared component, fix listing/[id] mobile, all navbars consistent

---

## Latest Commits (main, May 2026)
| Commit | Description |
|--------|-------------|
| `7ae4818` | feat: delete stock, download all photos, online signature pad (OwnerForm + ProfileForm) |
| `81eec1d` | fix(pdf): Sarabun font load via filesystem path แทน HTTP URL |
| `e55244c` | fix: 8 UX — mobile overflow, forgot-pwd touch, ติดตาม align, logo→home, admin mobile menu, calendar 3rd color, stock overflow |
| `fec4602` | 7 UX improvements: logo, forgot pwd, admin users CRUD, stock mobile, commission year, news CMS, about/contact |
| `0a901ab` | CLAUDE_NOTES.md system overview update |

---

## Route Map (ทุก route ในระบบ)

### Public (no auth)
```
/                   หน้าแรก — listing ทรัพย์ว่าง + hero banner + search bar + filter + news section
/listing/[id]       รายละเอียดทรัพย์สาธารณะ + ContactCard
/services           หน้าบริการ — features, pricing 3 tier (Starter/Pro/Business), live stats from DB
/news               ข่าวสารทั้งหมด (admin publish เท่านั้น)
/news/[id]          อ่านข่าวรายชิ้น
/about              เกี่ยวกับ Proppsy
/contact            ติดต่อเรา
/login              เข้าสู่ระบบ (มี "ลืมรหัสผ่าน?" link)
/register           สมัครเป็นเอเจนต์
/forgot-password    ขอ reset password (ส่งอีเมล)
/reset-password     ตั้งรหัสผ่านใหม่ (จาก email link)
```

### Protected (ต้อง login + approved)
```
/dashboard          KPI overview
/stock              รายการทรัพย์ทั้งหมด
/stock/new          เพิ่มทรัพย์ใหม่ (AI paste + OCR)
/stock/[id]         รายละเอียดทรัพย์ (photo gallery aspect-video)
/stock/[id]/edit    แก้ไขทรัพย์
/owners             รายการเจ้าของทรัพย์
/owners/new         เพิ่มเจ้าของ (OCR บัตรประชาชน + AddressSelector)
/owners/[id]        รายละเอียด/แก้ไขเจ้าของ
/customers          รายการลูกค้า
/customers/new      เพิ่มลูกค้า (OCR + AddressSelector)
/customers/[id]     รายละเอียด/แก้ไขลูกค้า
/projects           รายการโครงการ
/projects/new       เพิ่มโครงการ (AI enrich + AddressSelector)
/projects/[id]      รายละเอียด/แก้ไขโครงการ
/contracts          รายการสัญญา
/contracts/new      สร้างสัญญา (4-step wizard)
/contracts/[id]     รายละเอียดสัญญา + download PDF
/calendar           นัดหมาย & ปฏิทิน (merged page, 2 views)
/appointments/new   สร้างนัดหมาย
/commission         คอมมิชชัน (year selector + bar chart)
/profile            โปรไฟล์ของตัวเอง
```

### Admin only (role = 'admin')
```
/admin/users        จัดการผู้ใช้ — approve/reject/edit/delete ทุก user
/admin/news         จัดการข่าวสาร — list + toggle publish
/admin/news/new     เพิ่มข่าวใหม่
/admin/news/[id]/edit  แก้ไขข่าว
```

### API
```
/api/places         GET — serve places.csv เป็น JSON (province→district→subdistrict→zip)
```

---

## Key Source Files
| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/types/index.ts` | All TypeScript interfaces + helpers |
| `src/app/(protected)/layout.tsx` | Sidebar layout (`overflow-x-hidden min-w-0` on main) |
| `src/components/shared/Sidebar.tsx` | Desktop sidebar (logo-icon.jpg + "Proppsy" text) |
| `src/components/shared/MobileBottomNav.tsx` | Mobile bottom nav |
| `src/components/shared/AddressSelector.tsx` | Cascading province/district/subdistrict/zip |
| `src/components/shared/SignaturePad.tsx` | Canvas signature drawing (touch+mouse, saves PNG blob) |
| `src/components/shared/PublicNav.tsx` | Shared public navbar (async server component, auth-aware, all public pages) |
| `src/app/listing/SearchBar.tsx` | Client component: text search input in hero, pushes `?q=` URL param |
| `src/app/services/page.tsx` | Services page — feature grid, live stats, 3-tier pricing (Starter/Pro/Business) |
| `src/app/(protected)/stock/[id]/DeleteStockButton.tsx` | Client component: confirm → deleteStock action → redirect |
| `src/app/(protected)/stock/[id]/PhotoGallery.tsx` | Photo carousel + download-all button |
| `src/lib/pdf/ContractDocument.tsx` | PDF template (react-pdf, Sarabun font via filesystem path) |
| `public/fonts/Sarabun-*.ttf` | Thai font for PDF |
| `public/logo/logo-icon.jpg` | Icon-only logo (ใช้ใน sidebar + public nav) |
| `public/logo/logo.png` | Full logo (ใช้ใน login page) |
| `public/template-doc/สัญญา.md` | Contract template `<<variable>>` syntax |
| `public/template-doc/places.csv` | 7435 rows: province, district, subdistrict, zip |

---

## Supabase

**URL:** `https://otlvjnmmcvqjzbxefbhw.supabase.co`

**Tables:**
| Table | Key Fields |
|-------|------------|
| `profiles` | id, email, name, nickname, phone, line_id, role (admin/manager/user), account_status (pending/approved/rejected), permissions{} |
| `projects` | id (PRJ-xxxx), name_th, name_en, developer, province, district, address_road, bts_mrt[], facilities[] |
| `owners` | id (OWN-xxxx), first_name_th, last_name_th, nickname, phone, line_id, id_card_url |
| `customers` | id (CUS-xxxx), first_name_th, last_name_th, nickname, phone, line_id, id_card_url |
| `stock` | id (STK-xxxx), agent_uid, owner_id, project_id, project_name, unit_no, status (available/rented/sold/unavailable), listing_type (rent/sale/both), photo_urls[] |
| `contracts` | id (BK-xxxx), stock_id, owner_id, customer_id, doc_type, status (draft/sent/signed/cancelled), commission_net |
| `appointments` | id, agent_uid, stock_id, customer_id, datetime, status |
| `news` | id (UUID), title, summary, content, cover_url, published (bool), created_by, created_at |

**Storage Buckets:**
- `stock-photos` — รูปทรัพย์ (stock form upload)
- `documents` — id-cards/..., signatures/..., PDF เอกสาร
- `logos` — โลโก้บริษัท/เอเจนต์

**RLS:** ข้อมูล agent ใช้ `.eq('agent_uid', user.id)` | news ใช้ `is_admin()` function | public stock ใช้ `.eq('status', 'available')` ไม่มี agent filter

**Admin Client:** `createAdminClient()` จาก `server.ts` — bypass RLS สำหรับ admin actions

---

## Patterns

### ID Generation
```ts
async function nextId(table: string, prefix: string): Promise<string> {
  const { data } = await supabase.from(table).select('id')
    .like('id', `${prefix}-%`).order('id', { ascending: false }).limit(1).maybeSingle()
  const num = data?.id ? (parseInt(data.id.slice(prefix.length + 1)) || 0) : 0
  return `${prefix}-${String(num + 1).padStart(4, '0')}`
}
// Prefixes: STK, OWN, CUS, PRJ, BK
```

### Server Component (data fetch)
```tsx
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
export async function doThing(input: Input): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }
  const { error } = await supabase.from('table').insert({ agent_uid: user.id, ...input })
  if (error) return { error: error.message }
  revalidatePath('/path')
  return {}
}
```

### Client Form
```tsx
'use client'
export default function MyForm() {
  const [isPending, startTransition] = useTransition()
  function handleSubmit() {
    startTransition(async () => {
      const res = await myAction(...)
      if (res.error) { setError(res.error); return }
      router.push('/success')
    })
  }
}
```

### Storage Upload (client-side)
```ts
const path = `subdir/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
const { data, error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(data.path)
```

### Address Selector
```tsx
import AddressSelector from '@/components/shared/AddressSelector'
// Props: province, district, subdistrict, zip, onChange(field, value)
// Cascades: จังหวัด → เขต/อำเภอ → แขวง/ตำบล → zip auto-fill
// ข้อมูลจาก /api/places → places.csv (cached module-level)
```

### searchParams (Next.js 15+)
```tsx
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'all' } = await searchParams
}
```

---

## AI Features

### parseStockTextWithEntities (stock/actions.ts)
- rawtext → Gemini → stock fields + owner_name/phone/line + project_name
- Owner: ค้นหาด้วย phone → line_id → สร้างใหม่ถ้าไม่พบ
- Project: ilike name_th → Gemini enrich → สร้างใหม่ถ้าไม่พบ
- Returns: `ParseWithEntitiesResult`

### Gemini Model: `gemini-2.0-flash` | Key: `GEMINI_API_KEY`
### OCR: ถ่ายบัตร → สกัดชื่อ/เลขบัตร/วันเกิด/ที่อยู่

---

## Contract System

### Doc Types: `rental_agreement | reservation | invoice_reservation | receipt_reservation | invoice_deposit | receipt_deposit | commission_confirm | renewal | co_agent`

### PDF: `ContractDocument.tsx` → `<<variable>>` syntax | Thai bahtText() | Sarabun font

### DB Migrations: `001_initial.sql` | `002_contracts_expansion.sql` (fees, payment, commission fields)

---

## News System (admin-only CMS)
- DB: `news` table — title, summary, content, cover_url, published (bool), created_by
- RLS: SELECT → published=true หรือ is_admin() | INSERT/UPDATE/DELETE → is_admin() เท่านั้น
- Admin เขียนข่าว → toggle published → แสดงใน /news สาธารณะ
- หน้าแรก (/) แสดง latestNews 3 รายการ (published=true)

---

## Public Listing Filters
FilterBar รองรับ: listing_type, room_type, price_bucket, province, **district** (ขึ้นเมื่อเลือก province), **bts_mrt**
ข้อมูล filter options ดึงจาก projects table (province, district, bts_mrt[])

---

## Known Manual Steps (Supabase)
1. **Site URL** → Dashboard → Authentication → URL Configuration → Site URL = Vercel URL
2. **Migration 002** → SQL Editor → รัน `002_contracts_expansion.sql` (bank_ref, payment fields, commission fields) ✅ Done
3. **Storage RLS** → SQL Editor → INSERT/SELECT/UPDATE/DELETE policies บน `documents` bucket ✅ Done
4. **documents bucket public** → `UPDATE storage.buckets SET public = true WHERE id = 'documents'` (ให้ publicUrl ใช้งานได้)
5. **Profile phone/LINE** → เอเจนต์กรอกในหน้า /profile เพื่อให้ ContactCard แสดงข้อมูล

## Signature System
- **OwnerForm**: tab toggle "วาดออนไลน์" / "อัปโหลดไฟล์" — canvas drawing → PNG → upload `documents/signatures/`
- **ProfileForm**: signature section แยก (auto-save ไม่ต้องกดบันทึก) — ใช้ใน PDF สัญญา
- **SignaturePad**: `src/components/shared/SignaturePad.tsx` — pointer events (touch+mouse), onSave(blob), onCancel
