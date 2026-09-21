import { NextRequest, NextResponse } from 'next/server'

// Hosted Paystack Popup V2 page, opened by the mobile app in the Safari sheet.
// Apple Pay only works in real Safari (not an in-app WebView), and Popup V2 is
// Paystack's documented way to complete a server-initialized transaction:
// resumeTransaction(access_code). The access code is the only thing needed and
// carries no secret; crediting happens server-side afterwards.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code') ?? ''
  const reference = searchParams.get('reference') ?? ''
  const safe = /^[A-Za-z0-9._=-]{4,100}$/
  if (!safe.test(code) || !safe.test(reference)) {
    return new NextResponse('Invalid payment link', { status: 400 })
  }

  const returnUrl = `/api/wallet/return?reference=${encodeURIComponent(reference)}`
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fund wallet</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:56px 24px;color:#1a2e22}button{margin-top:20px;padding:14px 28px;background:#1a3728;color:#fff;border:0;border-radius:10px;font-size:16px;font-weight:600}#msg{color:#b91c1c;margin-top:16px}</style></head>
<body><h2>Fund your wallet</h2><p id="hint">Loading secure checkout…</p><button id="pay" style="display:none">Open checkout</button><p id="msg"></p>
<script src="https://js.paystack.co/v2/inline.js"></script>
<script>
  var code = ${JSON.stringify(code)};
  var returnUrl = ${JSON.stringify(returnUrl)};
  var opened = false;
  function back() { window.location.replace(returnUrl); }
  function fail(m) { document.getElementById('msg').textContent = m || 'Could not load checkout.'; document.getElementById('pay').style.display = 'inline-block'; document.getElementById('hint').textContent = ''; }
  function start() {
    try {
      var popup = new PaystackPop();
      popup.resumeTransaction(code, {
        onLoad: function () { opened = true; document.getElementById('hint').textContent = ''; },
        onSuccess: function () { back(); },
        onCancel: function () { back(); },
        onError: function (e) { fail(e && e.message); }
      });
    } catch (e) { fail(e && e.message); }
  }
  document.getElementById('pay').onclick = start;
  window.addEventListener('load', function () {
    if (typeof PaystackPop === 'undefined') return fail('Checkout script did not load. Check your connection.');
    start();
    setTimeout(function () { if (!opened) document.getElementById('pay').style.display = 'inline-block'; }, 6000);
  });
</script></body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
