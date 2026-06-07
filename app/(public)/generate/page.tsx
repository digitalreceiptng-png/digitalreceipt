'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import MobileGeneratePage from '@/components/mobile/MobileGeneratePage'
import DesktopGeneratePage from '@/components/desktop/DesktopGeneratePage'

export default function GeneratePage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileGeneratePage /> : <DesktopGeneratePage />
}
