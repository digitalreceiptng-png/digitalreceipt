# Status Page Guide

## Overview

The **`/status`** page is a real-time health check dashboard for debugging deployment and environment variable issues. It shows:

1. **Service Connectivity** — Tests actual connection to Supabase, QoreID, and Resend
2. **Environment Variables** — Shows which env vars are configured
3. **Latency** — Response time from each service
4. **Error Details** — Specific error messages if services fail

---

## Access the Status Page

### **Development**
```
http://localhost:3000/status
```

### **Production (Vercel)**
```
https://your-domain.com/status
https://digitalreceipt.ng/status
```

---

## What It Checks

### **1. Supabase**
✅ Checks if:
- `NEXT_PUBLIC_SUPABASE_URL` is set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- `SUPABASE_SERVICE_ROLE_KEY` is set
- Database is accessible (tries to query profiles table)

❌ Common errors:
- "Missing credentials" → Missing env vars
- "Invalid key" → Wrong key in Vercel settings
- "Connection refused" → Supabase is down
- "Permission denied" → Service role key is wrong

### **2. QoreID**
✅ Checks if:
- `QOREID_CLIENT_ID` is set
- `QOREID_SECRET` is set
- Can authenticate with QoreID API

❌ Common errors:
- "Missing CLIENT_ID or SECRET" → Env vars not set
- "Auth failed (403)" → Invalid credentials
- "Auth failed (401)" → Expired credentials
- "Token not returned" → API response malformed

### **3. Resend**
✅ Checks if:
- `RESEND_API_KEY` is set
- Can authenticate with Resend API

❌ Common errors:
- "Missing API_KEY" → Env var not set
- "API error (401)" → Invalid API key
- "API error (403)" → Key doesn't have permission

---

## Status Page Display

### **Service Cards**

Each service shows:
- **Status badge**: ✅ Connected | ❌ Not Connected | ⚠️ Not Configured
- **Color coding**: Green (ok), Red (error), Amber (missing)
- **Latency**: Response time in milliseconds
- **Error message**: Specific reason if it failed

### **Environment Variables List**

Shows all required env vars with status:
- ✅ **Set** — Green badge, variable is configured
- ⚠️ **Missing** — Amber badge, variable needs to be added

### **Meta Information**

- **Environment**: Shows if you're in development/production
- **Last Updated**: Timestamp of the last status check

---

## Common Issues & Fixes

### **Supabase Not Connected After Deployment**

**Problem**: `/status` shows ❌ Supabase (Not Connected)

**Fix**:
1. Go to Vercel → Project → Settings → Environment Variables
2. Verify these 3 variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. If unsure of values, get fresh ones from Supabase → Settings → API
4. **Redeploy** the project
5. Refresh `/status` page

### **QoreID Verification Not Working**

**Problem**: `/status` shows ✅ QoreID (Connected) but `POST /api/nin` still fails

**Possible causes**:
- QoreID credentials are correct for `/status` but might be wrong for the NIN API
- Check the full error message in `/status`
- Verify credentials at qoreid.com dashboard

**Fix**:
1. Visit `/status` and check the error message
2. Get fresh credentials from QoreID dashboard
3. Update in Vercel Environment Variables
4. Redeploy
5. Test again at `/status`

### **Resend API Not Configured**

**Problem**: `/status` shows ⚠️ Resend (Not Configured)

**This is normal if email is not needed yet.**

**To fix** (if email features are required):
1. Go to resend.com and get API key
2. Add `RESEND_API_KEY` to Vercel Environment Variables
3. Redeploy

### **All Services Connected But App Still Broken**

**Problem**: All services show ✅ Connected but app has errors

**Possible causes**:
1. Database schema missing (hasn't been migrated)
2. Auth session issue (not related to env vars)
3. Frontend code error

**Next steps**:
1. Check Vercel logs: Deployments → Latest → Logs
2. Check browser console: F12 → Console tab
3. Check browser Network tab for API errors

---

## API Response Format

The `/api/status` endpoint returns JSON:

```json
{
  "timestamp": "2026-06-08T17:48:00.000Z",
  "environment": "production",
  "services": {
    "supabase": {
      "name": "Supabase",
      "configured": true,
      "connected": true,
      "latency": 145
    },
    "qoreid": {
      "name": "QoreID",
      "configured": true,
      "connected": false,
      "error": "Auth failed (403): Invalid credentials",
      "latency": 234
    },
    "resend": {
      "name": "Resend",
      "configured": false,
      "connected": false,
      "error": "Missing API_KEY"
    }
  },
  "envVars": {
    "NEXT_PUBLIC_SUPABASE_URL": true,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "QOREID_CLIENT_ID": true,
    "QOREID_SECRET": true,
    "RESEND_API_KEY": false,
    "NEXT_PUBLIC_APP_URL": true
  }
}
```

---

## Using Status Page for Troubleshooting

### **Deployment Checklist**

After deploying to Vercel:

1. ✅ Visit `/status` page
2. ✅ Verify all 3 services show ✅ Connected (or ⚠️ Not Configured if optional)
3. ✅ Verify all env vars show ✅ Set (except RESEND_API_KEY if not using email)
4. ✅ If errors, fix the issue and **redeploy**
5. ✅ Refresh `/status` and verify again

### **Debug a Specific Feature**

Example: "NIN verification isn't working"

1. Visit `/status`
2. Check QoreID card:
   - Is it ✅ Connected? 
     - Yes → Problem is not with credentials
     - No → Credentials are wrong, update in Vercel
3. Check the exact error message
4. Fix based on the error message

---

## Security & Permissions

### **Who Can Access `/status`?**

Currently: **Anyone can access** `/status` (public endpoint)

**This is intentional** because:
- Env vars are not exposed (only their presence shown)
- Error messages are helpful for debugging
- Public status pages are common practice

**If you want to restrict access**, add authentication:

```typescript
// In app/status/page.tsx, add at the top:
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'

export default async function StatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  
  // ... rest of component
}
```

---

## Testing Status Page

### **Local Development**

```bash
npm run dev
# Visit http://localhost:3000/status
```

### **After Deployment**

1. Push code to GitHub
2. Wait for Vercel auto-deployment
3. Visit `https://your-domain.com/status`
4. Verify all services show correct status

### **Simulate Missing Env Var**

To test the page when an env var is missing:
1. Go to Vercel → Settings → Environment Variables
2. Temporarily remove one (e.g., `RESEND_API_KEY`)
3. Redeploy
4. Visit `/status` → Should show ⚠️ Not Configured

---

## Refresh Behavior

- **Auto-refresh on load**: Page fetches status when first loaded
- **Manual refresh**: Click the "Refresh" button to test again
- **No auto-polling**: Page doesn't continuously refresh (you must click refresh)

---

## Next Steps

After setting up `/status` page:

1. **Deploy to Vercel** with your code
2. **Visit `/status`** on production
3. **Fix any red ❌ services**:
   - Add missing env vars
   - Fix invalid credentials
   - Redeploy
4. **Verify everything is ✅ Connected**
5. **Share the URL** with team for quick debugging: `https://your-domain.com/status`

---

## Example Scenarios

### **Scenario 1: Fresh Deployment**

1. Deploy code to Vercel
2. Visit `/status`
3. All services show ⚠️ Not Configured
4. **Action**: Add env vars to Vercel, redeploy
5. Refresh `/status` → All ✅ Connected

### **Scenario 2: Wrong QoreID Credentials**

1. Env vars are set
2. Visit `/status`
3. Supabase ✅ Connected, QoreID ❌ "Auth failed (403)"
4. **Action**: Get new credentials from qoreid.com, update in Vercel, redeploy
5. Refresh `/status` → QoreID ✅ Connected

### **Scenario 3: Database Down**

1. All env vars correct
2. Visit `/status`
3. Supabase ❌ "Connection refused"
4. **Action**: Check Supabase status at supabase.com/status
5. Wait for it to come back online
6. Refresh `/status` → Supabase ✅ Connected

---

## Support

If you're still having issues after checking `/status`:

1. **Screenshot `/status` page** showing the error
2. **Share the error message** from the service card
3. **Check Vercel logs** for more details
4. **Contact the maintainers** with the status page screenshot

