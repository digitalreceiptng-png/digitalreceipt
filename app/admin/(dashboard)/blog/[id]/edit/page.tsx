import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PostEditor from '../../PostEditor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit Post | Admin Console' }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()
  const { data: post } = await db.from('blog_posts').select('*').eq('id', id).single()
  if (!post) notFound()
  return <PostEditor post={post} />
}
