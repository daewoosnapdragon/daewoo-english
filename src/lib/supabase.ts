import { createClient } from '@supabase/supabase-js'
import { cachedFetch } from '@/lib/readCache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Reads go through lib/readCache, so a page opened again draws at once.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: cachedFetch } })
