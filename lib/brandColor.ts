const BRAND_COLORS = ['#1a5c2a', '#1d4ed8', '#7c3aed', '#b45309', '#be123c', '#0e7490', '#374151', '#065f46', '#92400e', '#1e3a5f']

export function brandColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]
}
