'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'

// Extract the verification code from a scanned value.
// QR codes contain a URL like https://digitalreceipt.ng/r/ABC123XYZ
// or /verify?q=ABC123XYZ — pull just the code.
function extractCode(raw: string): string {
  try {
    const url = new URL(raw)
    // /r/[identifier]
    const rMatch = url.pathname.match(/\/r\/([^/?#]+)/)
    if (rMatch) return rMatch[1]
    // /verify?q=[identifier]
    const q = url.searchParams.get('q')
    if (q) return q
  } catch {
    // not a URL — use raw value as-is
  }
  return raw.trim()
}

interface Props {
  onScan: (value: string) => void
  onClose: () => void
}

export default function QRCameraModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [error, setError] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [ready, setReady] = useState(false)
  const [permBlocked, setPermBlocked] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    setError('')
    setPermBlocked(false)
    setRequesting(true)

    // Check if the permission is already hard-blocked before calling getUserMedia.
    // If blocked, the browser will never show the dialog — we must direct the user to settings.
    if (typeof navigator.permissions !== 'undefined') {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (perm.state === 'denied') {
          setRequesting(false)
          setPermBlocked(true)
          return
        }
      } catch {
        // Permissions API unavailable (iOS Safari) — fall through to getUserMedia
      }
    }

    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      setRequesting(false)
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.onloadedmetadata = () => {
          video.play().catch(() => {})
          setReady(true)
          scan()
        }
      }
    } catch (err: unknown) {
      setRequesting(false)
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermBlocked(true)
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError('Could not start camera. Please try again.')
      }
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }

  function scan() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scan)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data) {
      stopCamera()
      onScan(extractCode(code.data))
      return
    }
    rafRef.current = requestAnimationFrame(scan)
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 9999 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 shrink-0">
        <span className="font-semibold text-sm text-white">Scan QR Code</span>
        <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Camera area — video always in the layout so iOS can render the stream */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {/* Video always rendered — never display:none, iOS refuses to decode a hidden stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder shown once camera is live */}
        {ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-white/70 rounded-2xl" />
          </div>
        )}

        {/* Overlay covering the (blank) video while we're not yet live */}
        {!ready && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-5 p-6 text-center">
            {requesting ? (
              <>
                <Loader2 size={28} className="text-white/60 animate-spin" />
                <p className="text-sm text-white/70">Requesting camera access…</p>
              </>
            ) : permBlocked ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center text-3xl">🚫</div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">Camera access is blocked</p>
                  <p className="text-sm text-white/60 max-w-xs">Your browser has blocked camera access for this site. Follow the steps below to enable it.</p>
                </div>
                <div className="w-full max-w-xs bg-white/10 rounded-xl p-4 text-left space-y-2">
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">On Android (Chrome)</p>
                  <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside">
                    <li>Tap the <strong className="text-white">lock icon</strong> in the address bar</li>
                    <li>Tap <strong className="text-white">Permissions</strong></li>
                    <li>Set <strong className="text-white">Camera</strong> to Allow</li>
                    <li>Refresh and try again</li>
                  </ol>
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-wider pt-2">On iPhone (Safari)</p>
                  <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside">
                    <li>Open <strong className="text-white">Settings → Safari</strong></li>
                    <li>Tap <strong className="text-white">Camera</strong></li>
                    <li>Select <strong className="text-white">Allow</strong></li>
                    <li>Return here and tap Try again</li>
                  </ol>
                </div>
                <button onClick={startCamera} className="px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl active:scale-95 transition-all">
                  Try again
                </button>
              </>
            ) : error ? (
              <>
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">📷</div>
                <p className="text-sm text-white/80 max-w-xs">{error}</p>
                <button onClick={startCamera} className="px-6 py-3 bg-white text-black text-sm font-semibold rounded-xl active:scale-95 transition-all">
                  Try again
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-4xl">📷</div>
                <div>
                  <p className="text-base font-semibold text-white">Enable Camera</p>
                  <p className="text-sm text-white/60 mt-1 max-w-xs">Tap the button below — your browser will ask you to allow the camera.</p>
                </div>
                <button onClick={startCamera} className="px-8 py-3.5 bg-white text-black text-sm font-bold rounded-xl active:scale-95 transition-all">
                  Enable Camera
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 bg-black/80 flex flex-col items-center gap-3 shrink-0">
        <p className="text-xs text-white/70">Point camera at the QR code on the receipt</p>
        <button
          onClick={handleClose}
          className="w-full py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          Close Camera
        </button>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
