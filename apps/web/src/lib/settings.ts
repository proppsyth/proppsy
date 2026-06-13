import { createServiceClient } from '@/lib/supabase/server'

/**
 * Reads require_approval from settings.
 * Returns true if new registrations must wait for admin approval.
 * Defaults to false (auto-approve) when the setting is missing.
 */
export async function getRequireApproval(): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'require_approval')
    .single()
  return data?.value === true
}
