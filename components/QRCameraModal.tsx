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
  const [requesting, setRequesting] = useState(true)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    startCamera()
    return () => {
      document.body.style.overflow = ''
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    setError('')
    setRequesting(true)
    try {
      // Try rear camera first, fall back to any available camera
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      setRequesting(false)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = () => scan()
      }
    } catch (err: unknown) {
      setRequesting(false)
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Camera access was denied. Tap "Try again" below, or go to your browser settings and allow camera access for this site.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError('Could not start camera. Tap "Try again" or check your browser settings.')
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

      {/* Camera — fills all available space */}
      {requesting ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 size={28} className="text-white/60 animate-spin" />
          <p className="text-sm text-white/70">Requesting camera access…</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-white/80">{error}</p>
          <button
            onClick={startCamera}
            className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="relative flex-1 bg-black overflow-hidden">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-white/70 rounded-2xl" />
          </div>
        </div>
      )}

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
