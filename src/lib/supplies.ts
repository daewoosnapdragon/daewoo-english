import { supabase } from '@/lib/supabase'
import { DEFAULT_SUPPLIES_SETTINGS, SUPPLIES_KEY, type SuppliesSettings } from '@/lib/suppliesCore'

export * from '@/lib/suppliesCore'

export async function loadSuppliesSettings(): Promise<SuppliesSettings> {
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', SUPPLIES_KEY).limit(1)
    const raw = (data as any[] | null)?.[0]?.value
    if (raw) { const v = JSON.parse(raw); return { countJobKey: typeof v.countJobKey === 'string' ? v.countJobKey : DEFAULT_SUPPLIES_SETTINGS.countJobKey, fullCountDays: Number(v.fullCountDays) > 0 ? Number(v.fullCountDays) : DEFAULT_SUPPLIES_SETTINGS.fullCountDays } }
  } catch {}
  return DEFAULT_SUPPLIES_SETTINGS
}
export async function saveSuppliesSettings(s: SuppliesSettings): Promise<string | null> {
  const { error } = await supabase.from('app_settings').upsert({ key: SUPPLIES_KEY, value: JSON.stringify(s), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return error ? error.message : null
}

