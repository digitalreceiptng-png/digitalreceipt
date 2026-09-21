import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

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

// Without this, token refresh keeps running while backgrounded and auth calls
// (getSession/getUser) can hang after returning to the app, e.g. from Safari.
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
