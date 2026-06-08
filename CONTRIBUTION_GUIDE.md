# Contribution Guide for DigitalReceipt.ng

## Setup & Run Locally

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account (for environment variables)

### Installation

```bash
# Clone the repo
git clone https://github.com/digitalreceiptng-png/digitalreceipt.git
cd digitalreceipt

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at **http://localhost:3000** (or 3001 if 3000 is in use).

---

## Project Structure

```
digitalreceipt/
├── app/                    # Next.js App Router
│   ├── api/               # Backend API routes
│   │   ├── nin/           # NIN verification endpoint
│   │   ├── cac/           # CAC verification endpoint
│   │   ├── receipts/      # Receipt CRUD operations
│   │   ├── verify/        # Public receipt verification
│   │   └── auth/          # Auth routes
│   ├── (public)/          # Public pages (no auth required)
│   │   ├── page.tsx       # Homepage
│   │   ├── generate/      # Receipt generation page
│   │   ├── verify/        # Public receipt verification
│   │   └── ...
│   └── dashboard/         # Protected pages (auth required)
│       ├── page.tsx       # User dashboard
│       ├── receipts/      # Receipt management
│       └── profile/       # Profile management
├── components/            # Reusable React components
│   ├── desktop/          # Desktop-specific layouts
│   └── mobile/           # Mobile-specific layouts
├── lib/                   # Utilities & helpers
│   ├── supabase/         # Supabase client configurations
│   └── ...
├── types/                 # TypeScript types
├── public/                # Static assets
└── package.json

```

---

## Key Technologies

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email OTP)
- **KYC APIs**: QoreID (NIN & CAC verification)
- **PDF Generation**: @react-pdf/renderer, pdf-lib
- **QR Codes**: qrcode, react-qr-code
- **Email**: Resend

---

## Common Issues & How to Fix

### 1. ESLint Errors
The project has these known ESLint issues:

**Error in `/app/(public)/generate/verify/page.tsx:710`**
```
setState called synchronously in an effect (causes cascading renders)
```

**Errors in `/app/(public)/terms/page.tsx:23`**
```
Unescaped quotes in JSX
```

**Warnings**: Missing `alt` attributes on images, unused imports

Fix these by:
1. Moving `setForm` to a `useState` initializer
2. Escaping quotes with HTML entities (`&quot;`)
3. Adding `alt=""` to `<Image>` components
4. Removing unused imports

### 2. Missing Environment Variables
If you see `NIN_NOT_CONFIGURED` or `CAC API not configured`:

You need:
```env
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
QOREID_CLIENT_ID=<qoreid_client_id>
QOREID_SECRET=<qoreid_secret>
```

Without these, KYC verification won't work (expected behavior).

### 3. Port Already in Use
If port 3000 is already in use:
- The dev server automatically uses port 3001
- Or manually: `npm run dev -- -p 3002`

---

## Understanding the KYC Flow

### For New Contributors

The app has two identity verification systems:

**1. Individual Users (NIN)**
- User enters 11-digit NIN
- App calls QoreID API → verifies against NIMC database
- Only the NIN is stored in `profiles` table
- Buyer sees "NIN Verified" badge (not the actual NIN)

**2. Business Users (CAC)**
- User enters RC (Registered Company) or BN (Business Name) number
- App calls QoreID API → verifies against CAC database
- Only the RC/BN number stored in `profiles` table
- Buyer sees company name + "CAC Verified" badge

### The Database Flow

When a receipt is generated:
1. Check user's monthly limit (10 receipts/month by default)
2. Pull seller info from `profiles` table
3. Create receipt in `receipts` table (includes seller_nin or seller_rc_number)
4. Add line items to `receipt_items` table

Anyone can verify a receipt by entering its unique identifier (public flow).

---

## How to Test Features

### Test Receipt Generation
1. Go to **http://localhost:3000**
2. Click "Generate"
3. Enter your email, create password
4. For now, skip NIN/CAC verification (needs QoreID credentials)
5. Fill in receipt details
6. Generate and see the PDF

### Test Receipt Verification
1. After generating a receipt, copy the unique identifier
2. Go to **http://localhost:3000/r/{identifier}**
3. Receipt details display (no login required)

### Test Dashboard
1. Sign in with your email
2. View generated receipts
3. Edit profile
4. Download receipts as PDF

---

## Best Practices for Contributing

1. **Follow the existing code style**
   - No unnecessary comments
   - Use TypeScript types
   - Prefer simple solutions over abstractions

2. **Test locally before submitting**
   ```bash
   npm run lint      # Check linting errors
   npm run build     # Build for production
   npm run dev       # Run locally
   ```

3. **Keep commits focused**
   - One feature or fix per commit
   - Write clear commit messages

4. **Open an issue before large changes**
   - Discuss the approach first
   - Get feedback from maintainers

---

## Environment File Template

Create `.env.local` (never commit this):

```env
# Supabase (get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# QoreID (get from qoreid.com - optional for testing)
QOREID_CLIENT_ID=your-client-id
QOREID_SECRET=your-client-secret
```

---

## Next Steps for Your Friend

1. **Clone & Setup**
   ```bash
   git clone https://github.com/digitalreceiptng-png/digitalreceipt.git
   cd digitalreceipt
   npm install
   npm run dev
   ```

2. **Explore the Codebase**
   - Read `KYC_AND_DATABASE_ARCHITECTURE.md` (generated by Claude)
   - Look at `/app/api/nin/route.ts` to understand KYC flow
   - Check `/app/auth/register/page.tsx` for signup flow

3. **Find Issues to Fix**
   - Run `npm run lint` to see linting errors
   - Pick one of the ESLint errors mentioned above
   - Submit a PR with the fix

4. **Start Small**
   - Fix unused imports
   - Add missing `alt` attributes
   - Improve UI/UX in small ways
   - Write tests for existing features

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint -- --fix    # Auto-fix linting issues

# Database
# (Requires Supabase CLI setup)
supabase local start     # Run Supabase locally
supabase db push         # Push migrations
```

---

## Support & Questions

- **GitHub Issues**: https://github.com/digitalreceiptng-png/digitalreceipt/issues
- **Code Review**: Open a PR and tag maintainers for feedback
- **Discussion**: Check existing issues for solutions

Good luck contributing! 🚀
