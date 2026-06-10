// Root admin layout — strips the public site nav/footer so admin pages
// get a completely separate shell.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
