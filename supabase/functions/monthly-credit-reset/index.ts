import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')

const PRO_MONTHLY_CREDITS = 100

Deno.serve(async (req) => {
  // Guard with a shared secret so this endpoint can't be called publicly
  const auth = req.headers.get('Authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const firstOfMonth = new Date().toISOString().slice(0, 8) + '01'

  // Find all active Professional users
  const { data: proUsers, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('plan', 'professional')
    .gt('plan_expires_at', new Date().toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let reset = 0
  const errors: string[] = []

  for (const user of proUsers ?? []) {
    // Skip if already reset this month
    const { data: credit } = await supabase
      .from('credits')
      .select('last_reset_date')
      .eq('user_id', user.id)
      .maybeSingle()

    const lastReset = credit?.last_reset_date as string | null
    if (lastReset && lastReset >= firstOfMonth) continue

    const { data } = await supabase.rpc('grant_credits', {
      p_user_id: user.id,
      p_amount: PRO_MONTHLY_CREDITS,
      p_tx_type: 'reset',
      p_description: `รีเซ็ตเครดิตรายเดือน Professional (${PRO_MONTHLY_CREDITS} เครดิต)`,
      p_is_reset: true,
    })

    if (data?.ok) reset++
    else errors.push(`${user.id}: ${data?.error ?? 'unknown'}`)
  }

  return new Response(
    JSON.stringify({ ok: true, reset, errors, total: proUsers?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
