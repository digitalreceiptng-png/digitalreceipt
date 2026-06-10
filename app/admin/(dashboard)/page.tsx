import { redirect } from 'next/navigation'
import { adminHref } from '@/lib/admin-url'

export default function AdminRoot() {
  redirect(adminHref('/overview'))
}
