'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
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

  useEffect(() => {
    startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = () => scan()
      }
    } catch {
      setError('Camera access denied. Please allow camera permission and try again.')
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm text-ink">Scan QR Code</span>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors">
            <X size={16} />
          </button>
        </div>
        {error ? (
          <div className="p-6 text-center text-sm text-danger">{error}</div>
        ) : (
          <div className="relative bg-black">
            <video ref={videoRef} className="w-full" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/70 rounded-xl" />
            </div>
          </div>
        )}
        <div className="px-4 py-3 flex flex-col items-center gap-2">
          <p className="text-xs text-ink-muted">Point camera at the QR code on the receipt</p>
          <button
            onClick={handleClose}
            className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:bg-surface transition-colors"
          >
            Close Camera
          </button>
        </div>
      </div>
    </div>
  )
}
