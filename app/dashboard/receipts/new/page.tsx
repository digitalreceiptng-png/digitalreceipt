import { createClient } from '@/lib/supabase/server'
import NewReceiptClient from './NewReceiptClient'

export default async function NewReceiptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isGenerateOnly = user?.app_metadata?.access_level === 'generate_only'
  return <NewReceiptClient isGenerateOnly={isGenerateOnly} />
}
