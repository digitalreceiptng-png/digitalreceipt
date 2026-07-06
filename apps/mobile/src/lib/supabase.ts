import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://ctmiexmeufxvhfyffljx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_cozFJh30JmYR1a-h7HWwGQ_c9IoAPoo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
