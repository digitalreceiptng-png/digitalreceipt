'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-[#1a3728] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d5a3d]"
    >
      Print / Save as PDF
    </button>
  )
}
