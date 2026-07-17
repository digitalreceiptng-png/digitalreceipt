import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'dr_active_scope'

// Which company profile ('main' or a user_sub_accounts id) receipts should be issued under.
// Web keeps this in a cookie; mobile has no cookie jar, so it's kept on-device instead and sent
// explicitly with each receipt-creation request.
export async function getActiveScopeId(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEY)) || 'main'
  } catch {
    return 'main'
  }
}

export async function setActiveScopeId(id: string): Promise<void> {
  try { await AsyncStorage.setItem(KEY, id) } catch {}
}

export interface StaffScope {
  id: string
  name: string
  isMain: boolean
  logoUrl?: string | null
}

// The profiles the signed-in user (staff or owner) may issue receipts under.
export async function fetchScopes(accessToken: string): Promise<{ scopes: StaffScope[]; isStaff: boolean }> {
  try {
    const res = await fetch('https://www.digitalreceipt.ng/api/staff/scopes', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return { scopes: [], isStaff: false }
    const data = await res.json()
    return { scopes: Array.isArray(data.scopes) ? data.scopes : [], isStaff: !!data.isStaff }
  } catch {
    return { scopes: [], isStaff: false }
  }
}
