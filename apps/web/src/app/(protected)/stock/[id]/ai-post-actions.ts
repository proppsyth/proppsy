'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { checkAiQuota, incrementAiUsage } from '@/lib/aiQuota'

interface StockPostInput {
  stockId: string
}

interface PostResult {
  post?: string
  error?: string
}

const ROOM_LABELS: Record<string, string> = {
  Studio: 'ห้อง Studio', '1BR': '1 ห้องนอน', '2BR': '2 ห้องนอน',
  '3BR': '3 ห้องนอน', Penthouse: 'Penthouse',
}
const DIRECTION_LABELS: Record<string, string> = {
  N: 'ทิศเหนือ', S: 'ทิศใต้', E: 'ทิศตะวันออก', W: 'ทิศตะวันตก',
  NE: 'ทิศตะวันออกเฉียงเหนือ', NW: 'ทิศตะวันตกเฉียงเหนือ',
  SE: 'ทิศตะวันออกเฉียงใต้', SW: 'ทิศตะวันตกเฉียงใต้',
}

export async function generateFacebookPost(input: StockPostInput): Promise<PostResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY' }

  try {
    const { allowed, error: quotaErr } = await checkAiQuota()
    if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

    // Fetch stock + agent profile in parallel (no join — avoids RLS issue on projects table)
    const [{ data: stock }, { data: agent }] = await Promise.all([
      supabase
        .from('stock')
        .select('id, is_published, unit_no, room_type, floor, size_sqm, direction, listing_type, rent_price, sale_price, deposit_months, pet_allowed, notes, project_name, project_id')
        .eq('id', input.stockId)
        .eq('agent_uid', user.id)
        .single(),
      supabase
        .from('profiles')
        .select('name, nickname, phone, line_id, first_name_th')
        .eq('id', user.id)
        .single(),
    ])

    if (!stock) return { error: 'ไม่พบข้อมูลทรัพย์' }
    if (!stock.is_published) return { error: 'ทรัพย์นี้ยังไม่ได้เผยแพร่' }

    // Fetch project separately (service-role-like read via user's accessible projects)
    let proj: { name_th?: string; district?: string; province?: string; bts_mrt?: string[] } | null = null
    if (stock.project_id) {
      const { data: p } = await supabase
        .from('projects')
        .select('name_th, district, province, bts_mrt')
        .eq('id', stock.project_id)
        .maybeSingle()
      proj = p
    }

    const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n)
    const agentName = agent?.nickname || agent?.first_name_th || agent?.name || 'เอเจนต์'
    const projectName = proj?.name_th ?? stock.project_name ?? ''
    const location = [proj?.district, proj?.province].filter(Boolean).join(' ')
    const bts = (proj?.bts_mrt ?? []).slice(0, 2).join(', ')
    const roomLabel = stock.room_type ? (ROOM_LABELS[stock.room_type] ?? stock.room_type) : ''
    const dirLabel = stock.direction ? (DIRECTION_LABELS[stock.direction] ?? '') : ''

    const facts = [
      projectName && `โครงการ: ${projectName}`,
      location && `ย่าน: ${location}`,
      bts && `ใกล้: ${bts}`,
      roomLabel && `ประเภทห้อง: ${roomLabel}`,
      stock.size_sqm && `ขนาด: ${stock.size_sqm} ตร.ม.`,
      stock.floor && `ชั้น: ${stock.floor}`,
      dirLabel && `ทิศ: ${dirLabel}`,
      stock.listing_type !== 'sale' && stock.rent_price && `ราคาเช่า: ${fmt(stock.rent_price)} บาท/เดือน`,
      stock.listing_type !== 'rent' && stock.sale_price && `ราคาขาย: ${fmt(stock.sale_price)} บาท`,
      stock.deposit_months && `เงินมัดจำ: ${stock.deposit_months} เดือน`,
      stock.pet_allowed ? 'เลี้ยงสัตว์ได้' : null,
      stock.notes && `หมายเหตุ: ${stock.notes}`,
    ].filter(Boolean).join('\n')

    const contactLines = [
      `ชื่อเอเจนต์: ${agentName}`,
      agent?.phone && `โทร: ${agent.phone}`,
      agent?.line_id && `LINE: ${agent.line_id}`,
    ].filter(Boolean).join('\n')

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการเขียนโพสต์ขายอสังหาริมทรัพย์บน Facebook สำหรับเอเจนต์ไทย

ข้อมูลทรัพย์:
${facts}

ข้อมูลติดต่อเอเจนต์:
${contactLines}

สร้างโพสต์ Facebook ภาษาไทยสำหรับหาผู้เช่า/ผู้ซื้อ โดยมีเงื่อนไขดังนี้:
1. ห้ามระบุเลขที่ห้องโดยเด็ดขาด
2. ห้ามระบุข้อมูลติดต่อเจ้าของห้อง (มีเฉพาะข้อมูลเอเจนต์)
3. ใช้ emoji เพิ่มความน่าสนใจ แต่ไม่มากเกินไป
4. แบ่งเนื้อหาเป็นย่อหน้าสั้นๆ อ่านง่าย เหมาะกับมือถือ
5. ใส่ข้อมูลทรัพย์ให้ครบ จัดรูปแบบให้สแกนหาข้อมูลได้เร็ว
6. ลงท้ายด้วย "ติดต่อ: [ชื่อ] [เบอร์/LINE]" และ hashtag ที่เกี่ยวข้อง
7. ความยาวไม่เกิน 350 คำ

ตอบเฉพาะโพสต์เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม`

    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    await incrementAiUsage()
    return { post: text.trim() }
  } catch (err) {
    console.error('[ai-post]', err)
    return { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }
  }
}
