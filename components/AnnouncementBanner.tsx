import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Info, AlertTriangle, CheckCircle, Megaphone } from 'lucide-react'

const TYPE_STYLES = {
  info:    { bar: 'bg-blue-600',   text: 'text-white',   icon: Info },
  warning: { bar: 'bg-amber-500',  text: 'text-white',   icon: AlertTriangle },
  success: { bar: 'bg-forest',     text: 'text-white',   icon: CheckCircle },
  urgent:  { bar: 'bg-red-600',    text: 'text-white',   icon: Megaphone },
}

export default async function AnnouncementBanner() {
  const db = createAdminClient()
  const now = new Date().toISOString()

  const { data } = await db
    .from('announcements')
    .select('id, title, message, type, link_text, link_url')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  const style = TYPE_STYLES[data.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.info
  const Icon = style.icon

  return (
    <div className={`${style.bar} ${style.text} px-4 py-2.5`}>
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-sm">
        <Icon size={15} className="shrink-0 opacity-90" />
        <span className="font-medium">{data.title}</span>
        <span className="opacity-80 hidden sm:inline">—</span>
        <span className="opacity-80 hidden sm:inline">{data.message}</span>
        {data.link_url && (
          <Link
            href={data.link_url}
            target={data.link_url.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="underline font-semibold hover:opacity-80 transition-opacity shrink-0"
          >
            {data.link_text ?? 'Learn more'}
          </Link>
        )}
      </div>
    </div>
  )
}
