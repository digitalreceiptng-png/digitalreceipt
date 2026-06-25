import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DigitalReceipt.ng — Authentic Digital Receipts for Nigerians'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#1a2e22',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Stars */}
        {[
          [750,50],[820,90],[680,130],[900,70],[960,140],[1050,60],[1100,110],
          [780,180],[870,200],[1020,180],[1140,200],[940,280],[1080,300],[1160,350],
          [830,400],[1000,420],[1120,480],[200,80],[120,160],[80,420],
        ].map(([x, y], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y,
            width: 3, height: 3, borderRadius: '50%',
            background: 'white', opacity: 0.5,
          }} />
        ))}

        {/* Green glow */}
        <div style={{
          position: 'absolute', right: -100, top: -100,
          width: 600, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
        }} />

        {/* Badge */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.92)',
          borderRadius: '10px', padding: '10px 24px',
          marginBottom: '32px', width: 'fit-content',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: 2,
            color: '#1a2e22', textTransform: 'uppercase',
          }}>
            Nigeria's First Verifiable Digital Receipt Platform
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: '24px' }}>
          <span style={{ fontSize: 60, fontWeight: 400, color: 'white', lineHeight: 1.15 }}>
            Issue a Verifiable Digital
          </span>
          <span style={{ fontSize: 60, fontWeight: 400, lineHeight: 1.15 }}>
            <span style={{ color: 'white' }}>Receipt </span>
            <span style={{ color: '#86efac' }}>in Seconds</span>
          </span>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '40px' }}>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            Authenticated digital receipts with verification codes.
          </span>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            Customers, auditors, and regulators can confirm authenticity instantly.
          </span>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            No account required to verify.
          </span>
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 'auto' }}>
          <div style={{
            background: 'white', borderRadius: 14,
            padding: '16px 32px',
            fontSize: 18, fontWeight: 700, color: '#1a2e22',
          }}>
            Generate a receipt
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 14, padding: '16px 28px',
            fontSize: 16, fontWeight: 700, color: 'white',
          }}>
            Manage Receipts
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            border: '2px solid #4ade80',
            borderRadius: 14, padding: '16px 28px',
            fontSize: 16, fontWeight: 700, color: 'white',
          }}>
            Free Invoice
          </div>
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', bottom: 48, left: 80,
          fontSize: 20, color: '#86efac', opacity: 0.9,
        }}>
          www.digitalreceipt.ng
        </div>

        {/* Right: receipt card */}
        <div style={{
          position: 'absolute', right: 80, top: 60,
          width: 260, height: 490,
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          display: 'flex', flexDirection: 'column',
          padding: '24px 20px', gap: 12,
        }}>
          <div style={{ width: 100, height: 10, background: 'rgba(74,222,128,0.5)', borderRadius: 5 }} />
          <div style={{ width: 70, height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ width: 150, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
          <div style={{ width: 120, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
          <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 60, height: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 5 }} />
            <div style={{ width: 70, height: 14, background: 'rgba(74,222,128,0.7)', borderRadius: 5 }} />
          </div>
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
          {/* QR box */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* QR top row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 36, height: 36, border: '2.5px solid #4ade80', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 12, height: 12, background: '#4ade80', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, background: 'rgba(74,222,128,0.5)', borderRadius: 1 }} />
                  <div style={{ width: 6, height: 6, background: 'rgba(74,222,128,0.5)', borderRadius: 1 }} />
                  <div style={{ width: 6, height: 6, background: 'rgba(74,222,128,0.5)', borderRadius: 1 }} />
                </div>
                <div style={{ width: 36, height: 36, border: '2.5px solid #4ade80', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 12, height: 12, background: '#4ade80', borderRadius: 2 }} />
                </div>
              </div>
              {/* QR bottom row */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, border: '2.5px solid #4ade80', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 12, height: 12, background: '#4ade80', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, background: 'rgba(74,222,128,0.5)', borderRadius: 1 }} />
                  <div style={{ width: 6, height: 6, background: 'rgba(74,222,128,0.5)', borderRadius: 1 }} />
                </div>
              </div>
            </div>
          </div>
          {/* Verified badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(74,222,128,0.12)',
            border: '1px solid rgba(74,222,128,0.4)',
            borderRadius: 10, padding: '8px 0',
            fontSize: 13, fontWeight: 700, color: '#4ade80',
          }}>
            ✓ VERIFIED
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
