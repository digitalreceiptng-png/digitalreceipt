// Centered loading overlay shown during route navigation (used by loading.tsx
// files across the app). Appears in the middle of the screen while the next
// page loads, so tapping a link/button gives immediate feedback.
export default function RouteLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
      <div className="h-11 w-11 rounded-full border-4 border-forest/20 border-t-forest animate-spin" />
    </div>
  )
}
