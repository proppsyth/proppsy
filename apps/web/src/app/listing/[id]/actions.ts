'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { pushLineMessage, buildInquiryNotification } from '@/lib/lineOa'

export interface InquiryInput {
  stock_id: string
  agent_uid: string
  project_name?: string
  unit_no?: string
  // Lead fields
  nickname: string
  phone: string
  line_id?: string
  gender?: string
  occupation?: string
  move_in_date?: string
  budget?: string
  occupants?: string
  duration?: string
}

export async function submitInquiry(
  input: InquiryInput
): Promise<{ error?: string; id?: string }> {
  if (!input.nickname?.trim()) return { error: 'กรุณาระบุชื่อ' }
  if (!input.phone?.trim()) return { error: 'กรุณาระบุเบอร์โทรศัพท์' }

  // Service client bypasses RLS — safe for public form submission
  const supabase = createServiceClient()

  // Generate next customer ID
  const { data: lastRow } = await supabase
    .from('customers')
    .select('id')
    .like('id', 'CUS-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = lastRow?.id ? (parseInt(lastRow.id.slice(4)) || 0) : 0
  const customerId = `CUS-${String(num + 1).padStart(4, '0')}`

  // Build inquiry notes from chip selections
  const noteParts = [
    input.budget ? `งบ: ${input.budget}` : '',
    input.occupants ? `ผู้พัก: ${input.occupants}` : '',
    input.duration ? `ระยะ: ${input.duration}` : '',
    input.move_in_date ? `ย้ายเข้า: ${input.move_in_date}` : '',
  ].filter(Boolean)

  // Create customer/lead
  const { error: customerError } = await supabase.from('customers').insert({
    id: customerId,
    agent_uid: input.agent_uid,
    nickname: input.nickname.trim(),
    phone: input.phone.trim(),
    line_id: input.line_id?.trim() || null,
    gender: input.gender || null,
    occupation: input.occupation || null,
    source: 'public_listing',
    lead_status: 'lead',
    follow_up: true,
    notes: noteParts.length ? noteParts.join(' · ') : null,
  })

  if (customerError) {
    console.error('submitInquiry customer insert:', customerError)
    return { error: `บันทึกไม่สำเร็จ: ${customerError.message}` }
  }

  // Create property inquiry event
  await supabase.from('property_inquiries').insert({
    agent_uid: input.agent_uid,
    stock_id: input.stock_id,
    customer_id: customerId,
    source: 'public_listing',
    notes: noteParts.length ? noteParts.join(' · ') : null,
  })

  // Fire LINE notification (best-effort, non-blocking)
  const { data: agent } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', input.agent_uid)
    .maybeSingle()

  const agentLineUserId = (agent as { line_user_id?: string | null } | null)?.line_user_id
  if (agentLineUserId) {
    const message = buildInquiryNotification({
      projectName: input.project_name,
      unitNo: input.unit_no,
      nickname: input.nickname.trim(),
      gender: input.gender,
      occupation: input.occupation,
      budget: input.budget,
      moveInDate: input.move_in_date,
      occupants: input.occupants,
      phone: input.phone.trim(),
      lineId: input.line_id?.trim(),
    })
    await pushLineMessage(agentLineUserId, message)
  }

  return { id: customerId }
}
