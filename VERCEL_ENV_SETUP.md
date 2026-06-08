# Vercel Environment Variables Setup

## Required Environment Variables

Your Vercel project needs these environment variables to function properly:

### 1. **Supabase (Database & Auth)**

These are **CRITICAL** - without them, the entire app won't work:

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Where to get them:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Settings → API
4. Copy the values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

---

### 2. **QoreID (KYC Verification - NIN & CAC)**

These enable identity verification for users:

```
QOREID_CLIENT_ID=your-client-id
QOREID_SECRET=your-client-secret
```

**Where to get them:**
1. Go to [qoreid.com](https://qoreid.com)
2. Create an account or log in
3. Go to API Credentials/Settings
4. Copy your Client ID and Secret

**If missing:** Users will see "NIN verification is not available yet" error

---

### 3. **Resend (Email Service)**

Used for sending email notifications:

```
RESEND_API_KEY=re_...
```

**Where to get it:**
1. Go to [resend.com](https://resend.com)
2. Create account or log in
3. API Keys section
4. Copy your API key

**If missing:** Email features won't work (but app still functions)

---

### 4. **App URL (Optional but Recommended)**

For public links and email redirects:

```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Example values:
- Production: `https://digitalreceipt.ng`
- Staging: `https://staging-digitalreceipt.ng`
- Development: `http://localhost:3000`

**If missing:** Defaults to Vercel's auto-generated domain

---

## How to Set Environment Variables on Vercel

### **Option 1: Via Vercel Dashboard (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Select your **digitalreceipt** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: (paste the value)
   - **Environments**: Select where this applies:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (if testing)
6. Click **Add**
7. Repeat for all other variables

**Important notes:**
- Variables starting with `NEXT_PUBLIC_` are visible in browser (safe for public keys)
- Variables without `NEXT_PUBLIC_` are server-only (safe for secrets)
- Click on a variable to edit it later

### **Option 2: Via Vercel CLI**

```bash
# Login to Vercel
vercel login

# Set environment variables
vercel env add QOREID_CLIENT_ID
# Follow prompts, paste the value

vercel env add QOREID_SECRET
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... etc for all variables
```

### **Option 3: Via GitHub (if using Vercel GitHub integration)**

Create a `.env.production` file in your repo (⚠️ only for public values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_APP_URL=https://digitalreceipt.ng
```

Then add secrets via Vercel dashboard (not Git).

---

## Environment Variables Checklist

### **Critical (API Won't Work Without These)**

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Database URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Client auth key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Server-side privileged key

### **For Full KYC Verification**

- [ ] `QOREID_CLIENT_ID` — NIN/CAC verification
- [ ] `QOREID_SECRET` — NIN/CAC verification

### **For Email Features (Optional)**

- [ ] `RESEND_API_KEY` — Email notifications
- [ ] `NEXT_PUBLIC_APP_URL` — Email links

---

## Testing Environment Variables on Vercel

After adding variables:

1. **Redeploy** the project (go to Deployments → Redeploy)
2. **Test NIN verification:**
   - Go to `/api/nin-check?nin=12345678901`
   - Should return data from QoreID (or error if credentials wrong)

3. **Test CAC verification:**
   - Go to `/api/cac?rc=RC123456`
   - Should return company data from QoreID

4. **Test signup flow:**
   - Try to create an account
   - Verify NIN/CAC should work now

---

## Common Issues & Fixes

### **"NIN_NOT_CONFIGURED" Error**
```
Cause: QOREID_CLIENT_ID or QOREID_SECRET missing/wrong
Fix: Verify credentials in Vercel Environment Variables
```

### **"NIN service error" (502)**
```
Cause: QoreID API down OR invalid credentials
Fix: Check QoreID status at status.qoreid.com
     Verify credentials are correct
```

### **Auth not working (403 Unauthorized)**
```
Cause: SUPABASE_SERVICE_ROLE_KEY missing/wrong
Fix: Get fresh key from Supabase > Settings > API
     Make sure it's the service_role secret, not anon key
```

### **"Unauthorized" when accessing dashboard**
```
Cause: NEXT_PUBLIC_SUPABASE_ANON_KEY missing/wrong
Fix: Get fresh key from Supabase > Settings > API
```

### **Email not sending**
```
Cause: RESEND_API_KEY missing
Fix: Add it to Vercel Environment Variables (optional feature)
```

---

## Security Best Practices

### **DO:**
- ✅ Use `NEXT_PUBLIC_` prefix only for public keys (anon key)
- ✅ Keep secrets in Vercel dashboard (not in Git)
- ✅ Rotate QoreID and Resend keys regularly
- ✅ Use different keys for staging vs production

### **DON'T:**
- ❌ Commit `.env.local` or `.env` files to Git
- ❌ Share service role key or secrets in messages
- ❌ Use production credentials in development
- ❌ Expose `SUPABASE_SERVICE_ROLE_KEY` to frontend

---

## Quick Setup Summary

**In 5 minutes:**

1. Get Supabase credentials (3 values from Settings → API)
2. Get QoreID credentials (2 values from their dashboard)
3. Get Resend API key (1 value from resend.com)
4. Go to Vercel → Project → Settings → Environment Variables
5. Add all 6 variables
6. Redeploy the project
7. Test the APIs

**That's it!** The app should be fully functional now.

---

## Environment Variables Reference

| Variable | Type | Required | Where to Get | Purpose |
|----------|------|----------|--------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ✅ Yes | Supabase Settings → API | Database URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ✅ Yes | Supabase Settings → API | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | ✅ Yes | Supabase Settings → API | Server operations |
| `QOREID_CLIENT_ID` | Secret | ✅ Yes | QoreID Dashboard | NIN verification |
| `QOREID_SECRET` | Secret | ✅ Yes | QoreID Dashboard | NIN verification |
| `RESEND_API_KEY` | Secret | ❌ No | Resend Dashboard | Email sending |
| `NEXT_PUBLIC_APP_URL` | Public | ❌ No | Your domain | Public URLs |

---

## After Deployment

Once variables are set:

1. **Test signup flow** — Should work with email + OTP
2. **Test NIN verification** — Should verify identity
3. **Test CAC verification** — Should verify business
4. **Test receipt generation** — Should create receipts
5. **Test public verification** — Should allow anyone to verify receipts

If any feature fails, check the Vercel logs:
- Vercel Dashboard → Project → Deployments → Latest → Logs
- Look for error messages indicating missing env vars
