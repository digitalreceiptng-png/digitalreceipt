'use client'

import MobileNav from './MobileNav'

export default function MobileNavWrapper({ isLoggedIn }: { isLoggedIn: boolean }) {
  return <MobileNav isLoggedIn={isLoggedIn} />
}
