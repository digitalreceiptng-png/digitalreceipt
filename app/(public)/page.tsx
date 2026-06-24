import MobileHomePage from '@/components/mobile/MobileHomePage'
import DesktopHomePage from '@/components/desktop/DesktopHomePage'

export default function LandingPage() {
  return (
    <>
      <div className="md:hidden">
        <MobileHomePage />
      </div>
      <div className="hidden md:block">
        <DesktopHomePage />
      </div>
    </>
  )
}
