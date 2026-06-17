'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { pushLineMessage, buildInquiryNotification } from '@/lib/lineOa'
import { sendEmail, buildInquiryEmail, siteUrl } from '@/lib/email'

export interface InquiryInput {
  stock_id: string
  agent_uid: string
  project_name?: string
  unit_no?: string
  rent_price?: number
  sale_price?: number
  listing_type?: string
  nickname: string
  phone: string
  line_id?: string
  gender?: string
  occupation?: string
  move_in_date?: string
  budget?: string
}

export async function submitInquiry(
  input: InquiryInput
): Promise<{ error?: string; id?: string; returning?: boolean }> {
  if (!input.nickname?.trim()) return { error: 'กรุณาระบุชื่อ' }
  if (!input.phone?.trim() && !input.line_id?.trim()) return { error: 'กรุณาระบุเบอร์โทรหรือ LINE ID' }

  const supabase = createServiceClient()

  const phone = input.phone.trim()
  const line_id = input.line_id?.trim() || null

  // Deduplication: find existing customer by phone or line_id under this agent
  const orParts = phone ? [`phone.eq.${phone}`] : []
  if (line_id) orParts.push(`line_id.eq.${line_id}`)

  const { data: existingRows } = await supabase
    .from('customers')
    .select('id, nickname, phone, line_id, gender, occupation')
    .eq('agent_uid', input.agent_uid)
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = existingRows?.[0] ?? null

  const notes = [
    input.budget ? `งบ: ${input.budget}` : '',
    input.move_in_date ? `ย้ายเข้า: ${input.move_in_date}` : '',
  ].filter(Boolean).join(' · ') || null

  let customerId: string

  if (existing) {
    customerId = existing.id
    const updates: Record<string, unknown> = { follow_up: true }

    // Contact enrichment — fill missing identifiers discovered from this submission
    if (!existing.phone && phone) updates.phone = phone
    if (!existing.line_id && line_id) updates.line_id = line_id
    if (!existing.nickname && input.nickname.trim()) updates.nickname = input.nickname.trim()

    // Preference fields — always update with latest if the customer provides them
    if (input.gender && input.gender !== existing.gender) updates.gender = input.gender
    if (input.occupation && input.occupation !== existing.occupation) updates.occupation = input.occupation
    if (input.move_in_date) updates.preferred_move_in_date = input.move_in_date

    await supabase.from('customers').update(updates).eq('id', customerId)
  } else {
    const { data: lastRow } = await supabase
      .from('customers')
      .select('id')
      .like('id', 'CUS-%')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const num = lastRow?.id ? (parseInt(lastRow.id.slice(4)) || 0) : 0
    customerId = `CUS-${String(num + 1).padStart(4, '0')}`

    const { error: customerError } = await supabase.from('customers').insert({
      id: customerId,
      agent_uid: input.agent_uid,
      nickname: input.nickname.trim(),
      phone: phone || null,
      line_id,
      gender: input.gender || null,
      occupation: input.occupation || null,
      preferred_move_in_date: input.move_in_date || null,
      source: 'public_listing',
      lead_status: 'lead',
      follow_up: true,
      notes,
    })

    if (customerError) {
      console.error('submitInquiry customer insert:', customerError)
      return { error: `บันทึกไม่สำเร็จ: ${customerError.message}` }
    }
  }

  // Always create a new inquiry event with structured fields
  await supabase.from('property_inquiries').insert({
    agent_uid: input.agent_uid,
    stock_id: input.stock_id,
    customer_id: customerId,
    source: 'public_listing',
    budget: input.budget || null,
    move_in_date: input.move_in_date || null,
    notes,
  })

  // LINE notification — best-effort, non-blocking
  const { data: agent } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', input.agent_uid)
    .maybeSingle()

  const agentLineUserId = (agent as { line_user_id?: string | null } | null)?.line_user_id
  if (agentLineUserId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proppsy.com'
    const message = buildInquiryNotification({
      projectName: input.project_name,
      unitNo: input.unit_no,
      rentPrice: input.rent_price,
      salePrice: input.sale_price,
      listingType: input.listing_type,
      listingUrl: `${baseUrl}/listing/${input.stock_id}`,
      nickname: input.nickname.trim(),
      gender: input.gender,
      occupation: input.occupation,
      budget: input.budget,
      moveInDate: input.move_in_date,
      phone,
      lineId: line_id || undefined,
      isReturning: !!existing,
    })
    await pushLineMessage(agentLineUserId, message)
  }

  // Email notification — best-effort, non-blocking
  try {
    const { data: agentUser } = await supabase.auth.admin.getUserById(input.agent_uid)
    const agentEmail = agentUser?.user?.email
    if (agentEmail) {
      const { subject, html } = buildInquiryEmail({
        projectName: input.project_name,
        unitNo: input.unit_no,
        rentPrice: input.rent_price,
        salePrice: input.sale_price,
        listingType: input.listing_type,
        listingUrl: `${siteUrl()}/listing/${input.stock_id}`,
        nickname: input.nickname.trim(),
        phone: phone || undefined,
        lineId: line_id || undefined,
        budget: input.budget,
        moveInDate: input.move_in_date,
        gender: input.gender,
        occupation: input.occupation,
        isReturning: !!existing,
      })
      await sendEmail({ to: agentEmail, subject, html })
    }
  } catch (err) {
    console.error('inquiry email error:', err)
  }

  return { id: customerId, returning: !!existing }
}
