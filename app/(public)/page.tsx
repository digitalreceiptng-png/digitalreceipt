'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import MobileHomePage from '@/components/mobile/MobileHomePage'
import DesktopHomePage from '@/components/desktop/DesktopHomePage'

export default function LandingPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileHomePage /> : <DesktopHomePage />
}
