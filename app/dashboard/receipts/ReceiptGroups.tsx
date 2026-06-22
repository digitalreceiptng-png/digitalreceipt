'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Folder, Pencil, Trash2, Check, X, Loader2, MoveRight } from 'lucide-react'

interface Group {
  id: string
  name: string
  color: string
}

interface Props {
  groups: Group[]
  activeGroupId: string | null   // null = All, 'none' = General (ungrouped)
  selectedIds: string[]
  onGroupChange: (groupId: string | null) => void
}

const COLORS = ['#1a5c2a', '#1d4ed8', '#7c3aed', '#b45309', '#be123c', '#0e7490', '#374151']

export default function ReceiptGroups({ groups: initialGroups, activeGroupId, selectedIds, onGroupChange }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moving, setMoving] = useState(false)

  async function createGroup() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/receipt-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setGroups(prev => [...prev, data.group])
      setNewName('')
      setNewColor(COLORS[0])
      setCreating(false)
      router.refresh()
    }
  }

  async function renameGroup(id: string) {
    if (!editName.trim()) return
    const res = await fetch(`/api/receipt-groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setGroups(prev => prev.map(g => g.id === id ? data.group : g))
      setEditingId(null)
      router.refresh()
    }
  }

  async function deleteGroup(id: string) {
    setDeletingId(id)
    await fetch(`/api/receipt-groups/${id}`, { method: 'DELETE' })
    setGroups(prev => prev.filter(g => g.id !== id))
    if (activeGroupId === id) onGroupChange(null)
    setDeletingId(null)
    router.refresh()
  }

  async function moveToGroup(groupId: string | null) {
    if (selectedIds.length === 0) return
    setMoving(true)
    await fetch('/api/receipts/assign-group', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptIds: selectedIds, groupId }),
    })
    setMoving(false)
    setMoveOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {/* Group filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onGroupChange('none')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${(activeGroupId === null || activeGroupId === 'none') ? 'bg-forest text-white' : 'bg-white border border-border text-ink-muted hover:border-forest/40 hover:text-forest'}`}
        >
          <Folder size={12} /> General
        </button>
        {groups.map(g => (
          <div key={g.id} className="relative group/tab flex items-center">
            {editingId === g.id ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && renameGroup(g.id)}
                  className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:border-forest/60 w-28"
                />
                <button onClick={() => renameGroup(g.id)} className="p-1 bg-forest text-white rounded"><Check size={11} /></button>
                <button onClick={() => setEditingId(null)} className="p-1 text-ink-dim hover:text-ink"><X size={11} /></button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onGroupChange(g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeGroupId === g.id ? 'text-white' : 'bg-white border border-border text-ink-muted hover:text-ink'}`}
                  style={activeGroupId === g.id ? { background: g.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
                  {g.name}
                </button>
                <div className="hidden group-hover/tab:flex items-center gap-0.5 absolute -top-1.5 -right-1.5 bg-white border border-border rounded-md shadow-sm px-1 py-0.5 z-10">
                  <button onClick={() => { setEditingId(g.id); setEditName(g.name) }} className="text-ink-dim hover:text-forest p-0.5"><Pencil size={10} /></button>
                  <button onClick={() => deleteGroup(g.id)} className="text-ink-dim hover:text-danger p-0.5">
                    {deletingId === g.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Create group */}
        {creating ? (
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-2 py-1">
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)} className={`w-3.5 h-3.5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ background: c }} />
              ))}
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createGroup()}
              placeholder="Group name"
              className="text-xs border-none outline-none w-28 bg-transparent text-ink placeholder:text-ink-dim"
            />
            <button onClick={createGroup} disabled={saving || !newName.trim()} className="p-1 bg-forest text-white rounded disabled:opacity-50">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            </button>
            <button onClick={() => setCreating(false)} className="p-1 text-ink-dim hover:text-ink"><X size={11} /></button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-dim hover:text-forest border border-dashed border-border hover:border-forest/40 transition-colors bg-white"
          >
            <FolderPlus size={12} /> Create Group
          </button>
        )}

        {/* Move selected to group */}
        {selectedIds.length > 0 && (
          <div className="relative ml-auto">
            <button
              onClick={() => setMoveOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-ink text-white hover:bg-ink/80 transition-colors"
            >
              <MoveRight size={12} />
              Move {selectedIds.length} receipt{selectedIds.length > 1 ? 's' : ''}
            </button>
            {moveOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoveOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                  <p className="text-xs text-ink-dim px-3 py-1.5 font-medium border-b border-border">Move to group</p>
                  <button
                    onClick={() => moveToGroup(null)}
                    disabled={moving}
                    className="w-full text-left px-3 py-2 text-xs text-ink-muted hover:bg-surface flex items-center gap-2"
                  >
                    <Folder size={12} /> General (no group)
                  </button>
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => moveToGroup(g.id)}
                      disabled={moving}
                      className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-surface flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                      {g.name}
                    </button>
                  ))}
                  {moving && <p className="text-xs text-ink-dim px-3 py-2 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Moving…</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
