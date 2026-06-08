# KYC API & Supabase Integration Architecture

## Overview
DigitalReceipt.ng uses **QoreID** (a third-party KYC provider) for identity verification, integrated with **Supabase** for authentication, user profiles, and receipt storage.

---

## 1. KYC API Integration (QoreID)

### API Endpoints Used
- **NIN Verification**: `https://api.qoreid.com/v1/ng/identities/nin/{nin}`
- **CAC Verification**: `https://api.qoreid.com/v1/ng/identities/cac-basic`
- **Token Endpoint**: `https://api.qoreid.com/token`

### Environment Variables Required
```
QOREID_CLIENT_ID=<your_client_id>
QOREID_SECRET=<your_client_secret>
```

### Authentication Flow
1. Application sends `clientId` + `secret` to token endpoint
2. QoreID returns `accessToken` (or `access_token`)
3. Bearer token used in all subsequent requests

---

## 2. NIN (National Identification Number) Verification

### API Route: `POST /api/nin`

**Request Body:**
```json
{
  "nin": "12345678901",  // 11-digit NIN (required)
  "firstname": "John",   // optional
  "lastname": "Doe",     // optional
  "dob": "1990-01-15",   // optional
  "phone": "08012345678", // optional
  "gender": "M"          // optional
}
```

**Response (Success):**
```json
{
  "person": {
    "nin": "12345678901",
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Michael",
    "dateOfBirth": "1990-01-15",
    "gender": "M",
    "phone": "08012345678",
    "photo": "<base64_image_or_null>"
  }
}
```

**Response (Error):**
```json
{
  "error": "NIN not found. Check the number and try again.",
  "code": 404
}
```

### Key Implementation (`app/api/nin/route.ts`)
- Validates NIN format (11 digits)
- Gets token from QoreID token endpoint
- Calls `/v1/ng/identities/nin/{nin}` with bearer token
- Returns parsed person object with extracted fields
- Handles errors: invalid format, service unavailable, not found

---

## 3. CAC (Corporate Affairs Commission) Verification

### API Route: `GET /api/cac?rc=RC123456`

**Request Parameters:**
```
rc: "RC123456"  or  "BN123456"  (RC = Registered Company, BN = Business Name)
```

**Response (Success):**
```json
{
  "company": {
    "rcNumber": "123456",
    "name": "Acme Technologies Ltd",
    "type": "Limited Liability Company",
    "status": "Active",
    "dateRegistered": "2020-05-15",
    "address": "123 Business Street, Lagos, Nigeria"
  }
}
```

**Response (Error):**
```json
{
  "error": "Company not found. Check the RC number and try again.",
  "code": 404
}
```

### Key Implementation (`app/api/cac/route.ts`)
- Parses RC/BN prefix from input
- Validates format: 5-8 digits
- Gets token from QoreID
- Calls `cac-basic` endpoint with `regNumber`
- Returns parsed company object

---

## 4. Supabase Database Integration

### Supabase Configuration

**Client-side** (`lib/supabase/client.ts`):
```typescript
createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

**Server-side** (`lib/supabase/server.ts`):
- Uses SSR client for server components
- Manages auth session via cookies

**Admin Client** (`lib/supabase/admin.ts`):
- Uses service role key (privileged operations)
- Used for receipt creation (bypasses RLS for auto-generated data)

---

## 5. Database Schema & Key Tables

### `profiles` Table
Stores user identity and verification data.

```sql
profiles (
  id UUID PRIMARY KEY (matches auth.users.id),
  email TEXT,
  full_name TEXT,
  phone TEXT,
  nin TEXT,                      -- Individual's NIN (encrypted)
  rc_number TEXT,                -- Business CAC registration number
  business_name TEXT,            -- Company name
  issuer_type TEXT,              -- 'individual' or 'business'
  address TEXT,                  -- Business address
  monthly_limit_override INT,    -- Custom receipt limit
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### `receipts` Table
Stores all generated receipts.

```sql
receipts (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY (profiles.id),
  receipt_number TEXT UNIQUE,           -- State-coded (e.g., "LGS-2024-001")
  unique_identifier TEXT UNIQUE,        -- Public verification code
  receipt_type TEXT,                    -- 'standard'
  
  -- Seller Information
  seller_name TEXT,                     -- Full name or business name
  seller_phone TEXT,
  seller_email TEXT,
  seller_address TEXT,
  seller_rc_number TEXT,                -- CAC number if business
  seller_nin TEXT,                      -- NIN if individual
  
  -- Buyer Information
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  buyer_address TEXT,
  
  -- Transaction Details
  description TEXT,
  amount NUMERIC,
  payment_method TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### `receipt_items` Table
Line items for each receipt.

```sql
receipt_items (
  id UUID PRIMARY KEY,
  receipt_id UUID FOREIGN KEY (receipts.id),
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_price NUMERIC,
  sort_order INT,
  created_at TIMESTAMP
)
```

---

## 6. Data Flow: Sign-Up Process

### Step 1: Email OTP (Supabase Auth)
```
User enters email → signInWithOtp({ email, shouldCreateUser: true })
→ Supabase sends OTP → User verifies → Email confirmed
```

### Step 2: NIN/CAC Verification
```
User enters NIN (individual) → POST /api/nin → QoreID validates
→ If valid, setNinResult shows verified name

User enters RC number (business) → GET /api/cac?rc=... → QoreID validates
→ If valid, setCacResult shows company name
```

### Step 3: Profile Creation
```
supabase.auth.updateUser({ password })
→ supabase.from('profiles').update({
    issuer_type: 'individual' | 'business',
    phone: '...',
    nin: '...',     // only if individual
    rc_number: '...' // only if business
  }).eq('id', user.id)
```

**Important**: Only the NIN or RC number is stored, not the full person/company data from QoreID.

---

## 7. Receipt Generation Flow

### When User Creates a Receipt

1. **Check Monthly Limit** (server):
   ```sql
   SELECT COUNT(*) FROM receipts 
   WHERE user_id = ? AND created_at >= ?
   ```

2. **Generate Unique IDs** (admin client):
   - `unique_identifier`: Random 8-character public code for verification
   - `receipt_number`: State-coded number (e.g., "LGS-2024-001")

3. **Insert Receipt** (admin client):
   ```sql
   INSERT INTO receipts (
     user_id, receipt_number, unique_identifier,
     seller_name, seller_phone, seller_email,
     seller_nin, seller_rc_number, ...
   ) VALUES (...)
   ```

4. **Insert Line Items** (admin client):
   ```sql
   INSERT INTO receipt_items (receipt_id, description, quantity, ...)
   ```

### Key Points:
- **seller_nin** stored on receipt (used to verify issuer identity)
- **Monthly limit enforced**: default 10 receipts/month (overridable)
- **Unique identifier** used for public verification URL: `/r/{identifier}`

---

## 8. Verification Flow (Public)

### Receipt Verification (`/r/{identifier}`)

Anyone can verify a receipt without signing in:

```sql
SELECT * FROM receipts 
WHERE unique_identifier = ?
```

The receipt shows:
- Seller name, phone, address
- Seller NIN/CAC verification badge
- Buyer details
- Items and amount
- Generation date

---

## 9. Error Handling

### KYC API Errors:

| Scenario | HTTP | Response |
|----------|------|----------|
| QoreID not configured | 503 | `{ error: 'NIN_NOT_CONFIGURED' }` |
| Invalid NIN format | 400 | `{ error: 'Enter a valid 11-digit NIN.' }` |
| NIN not found | 404 | `{ error: 'NIN not found...' }` |
| QoreID service down | 502 | `{ error: 'NIN service error: ...' }` |
| Invalid RC format | 400 | `{ error: 'Enter a valid RC or BN...' }` |
| CAC not found | 404 | `{ error: 'Company not found...' }` |

### Database Errors:

| Issue | Handling |
|-------|----------|
| Monthly limit exceeded | 429 + `LIMIT_REACHED` code |
| User not authenticated | 401 Unauthorized |
| Profile not found | 404 Not Found |
| Duplicate receipt_number | Retry with new number |

---

## 10. Security & Privacy

### NIN/CAC Data Security:
- **Only stored on profiles table**, not shared with QoreID responses
- **Encrypted at rest** (Supabase default)
- **Never displayed to buyers** (only "NIN Verified" badge shown)
- **Only used during registration** to verify identity once

### Supabase Auth Security:
- **Session managed via cookies** (SSR prevents client-side token exposure)
- **RLS (Row Level Security)** on protected tables (not visible in this excerpt)
- **Middleware** (`proxy.ts`) enforces auth for `/dashboard` and `/admin`

### Receipt Verification Security:
- **unique_identifier** is a random public code
- Receipt is **publicly readable** (transparency by design)
- Buyer cannot modify receipt (database is source of truth)
- If receipt is flagged, it's **linked to seller's verified NIN/CAC**

---

## 11. Configuration Checklist

To run this locally, you need:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ctmiexmeufxvhfyffljx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# QoreID
QOREID_CLIENT_ID=<your_client_id>
QOREID_SECRET=<your_client_secret>
```

**Note**: Without QOREID credentials, NIN/CAC verification returns `NIN_NOT_CONFIGURED` error.

---

## 12. Key Insights

1. **QoreID is read-only**: App never stores full person/company data, just the NIN/RC number
2. **Verification is one-time**: Checked during signup, then result stored
3. **Supabase handles auth + storage**: All user profiles, receipts, and items stored here
4. **Admin client used for receipts**: Bypasses RLS to auto-create system data
5. **Receipt verification is public**: Anyone can verify by entering a receipt code
6. **State codes in receipt numbers**: Extracted from seller address for locality tracking
7. **Monthly limit enforcement**: Prevents abuse, but can be overridden per profile

