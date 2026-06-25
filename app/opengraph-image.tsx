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
          justifyContent: 'center',
          padding: '60px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Stars */}
        {[
          [720,40],[800,80],[900,50],[980,110],[1060,55],[1130,100],
          [760,160],[860,190],[1040,170],[1150,210],[950,260],[1100,290],
          [820,380],[1000,410],[1130,460],[700,500],[200,70],[130,150],
          [90,400],[170,540],[300,30],[400,490],[500,570],[600,20],
        ].map(([x, y], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.4 + (i % 4) * 0.1,
          }} />
        ))}

        {/* Badge */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.92)',
          borderRadius: '14px',
          padding: '14px 32px',
          marginBottom: '36px',
          width: 'fit-content',
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '2px',
            color: '#1a2e22',
            fontFamily: 'sans-serif',
          }}>
            NIGERIA'S FIRST VERIFIABLE DIGITAL RECEIPT PLATFORM
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '28px' }}>
          <span style={{
            fontSize: 72,
            fontWeight: 400,
            color: 'white',
            lineHeight: 1.1,
            fontFamily: 'Georgia, serif',
          }}>
            Issue a Verifiable Digital
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span style={{
              fontSize: 72,
              fontWeight: 400,
              color: 'white',
              lineHeight: 1.1,
              fontFamily: 'Georgia, serif',
            }}>
              Receipt
            </span>
            <span style={{
              fontSize: 72,
              fontWeight: 400,
              color: '#4ade80',
              lineHeight: 1.1,
              fontFamily: 'Georgia, serif',
            }}>
              in Seconds
            </span>
          </div>
        </div>

        {/* Body text */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          marginBottom: '44px',
        }}>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, fontFamily: 'sans-serif' }}>
            Authenticated digital receipts with verification codes. Customers, auditors,
          </span>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, fontFamily: 'sans-serif' }}>
            and regulators can confirm authenticity instantly. No account required to verify.
          </span>
        </div>

        {/* Generate button */}
        <div style={{
          display: 'flex',
          background: 'white',
          borderRadius: '20px',
          padding: '20px 0',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a2e22', fontFamily: 'sans-serif' }}>
            Generate a receipt
          </span>
        </div>

        {/* Two buttons row */}
        <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
          <div style={{
            display: 'flex',
            flex: 1,
            background: 'rgba(15,25,18,0.80)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            padding: '20px 0',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'sans-serif' }}>
              Manage Receipts
            </span>
          </div>
          <div style={{
            display: 'flex',
            flex: 1,
            background: 'rgba(0,0,0,0.35)',
            border: '2px solid #4ade80',
            borderRadius: '20px',
            padding: '20px 0',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'sans-serif' }}>
              Free Invoice
            </span>
          </div>
        </div>

        {/* URL bottom right */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          right: 80,
          fontSize: 18,
          color: '#86efac',
          fontFamily: 'sans-serif',
          opacity: 0.8,
        }}>
          www.digitalreceipt.ng
        </div>
      </div>
    ),
    { ...size }
  )
}
