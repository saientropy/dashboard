# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heart Health Dashboard: A Next.js app that integrates with WHOOP, Strava, and Orangetheory to track and visualize cardiovascular health metrics, specifically 2-minute Heart Rate Recovery (HRR) and Heart Rate Variability (HRV/RMSSD).

**Tech Stack**: Next.js 14, React, TypeScript, Prisma (PostgreSQL), Vercel deployment

## Common Commands

```bash
# Development
npm install
npm run dev                    # Start dev server on http://localhost:3000

# Database
npx prisma generate           # Generate Prisma client after schema changes
npx prisma migrate deploy     # Run migrations (production)
npx prisma db push            # Push schema changes (development)
npx prisma studio             # Open database GUI

# Build
npm run build                 # Production build
npm start                     # Start production server
```

## Architecture

### Data Flow

1. **OAuth Integration Layer** (WHOOP & Strava):
   - Users authorize via OAuth, tokens stored in `WhoopToken` and `StravaToken` tables
   - Tokens automatically refreshed when expired (5-min buffer)
   - Cron jobs (`/api/cron/fetch`, `/api/cron/otf`) run every 6 hours to sync data

2. **Multi-Source Data Ingestion**:
   - **WHOOP**: Fetches workouts, recovery (HRV), sleep via `/lib/whoop.ts`
   - **Strava**: Fetches activities tagged with "orange" (OTF classes) via `/lib/strava.ts`
     - Downloads HR streams to compute 2-min HRR using linear interpolation
     - Maps Strava activity IDs to negative `whoopId` values to avoid conflicts
   - **Orangetheory**: Encrypted credential storage for future direct integration (currently placeholder in `/lib/otf.ts`)

3. **Metric Computation**:
   - **2-min HRR**: `HR(end) - HR(end + 120s)` using linear interpolation on heart rate time series
   - **HRV (RMSSD)**: Fetched from WHOOP recovery/sleep data (in milliseconds, stored divided by 1000)
   - Computed in `/api/cron/fetch/route.ts` for Strava activities with HR streams

4. **Storage**:
   - `Workout` table: Stores all workouts with `whoopId` (WHOOP uses positive IDs, Strava uses negative)
   - `HrvDaily` table: Daily HRV values with source tracking ("whoop" or "computed")
   - User-scoped data via `userId` foreign keys

### Key Files

- **`/src/lib/db.ts`**: Prisma client singleton (prevents hot-reload issues in dev)
- **`/src/lib/whoop.ts`**: WHOOP OAuth flow and API client
- **`/src/lib/strava.ts`**: Strava OAuth flow and API client
- **`/src/lib/otf.ts`**: Orangetheory client (placeholder, needs implementation)
- **`/src/lib/crypto.ts`**: AES-256-GCM encryption for OTF credentials
- **`/src/app/api/cron/fetch/route.ts`**: Main sync job (WHOOP + Strava)
- **`/src/app/api/cron/otf/route.ts`**: OTF sync job (future use)
- **`/src/app/dashboard/page.tsx`**: Server component rendering recent HRR and HRV
- **`/prisma/schema.prisma`**: Database schema with User, tokens, workouts, HRV

### Database Schema Notes

- `Workout.whoopId` is unique: WHOOP uses positive integers, Strava uses negative integers (`-abs(stravaId)`)
- `HrvDaily` has composite unique constraint on `[userId, date]`
- `OtfCredential` stores encrypted username/password with IV for AES-GCM decryption

### Environment Variables

Required for deployment:
- `DATABASE_URL`: PostgreSQL connection string
- `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`
- `NEXT_PUBLIC_APP_URL`: Base URL for callbacks
- `OTF_ENCRYPTION_KEY`: 32-byte base64 key (`openssl rand -base64 32`)

### Deployment

- Designed for Vercel with Postgres (Neon, Vercel Postgres, etc.)
- `vercel.json` configures two cron jobs:
  - `/api/cron/fetch` every 6 hours (WHOOP + Strava sync)
  - `/api/cron/otf` every 6 hours at :15 past (staggered, future use)
- Prisma migrations run automatically via Vercel build hooks or manual `prisma migrate deploy`

### TypeScript Path Aliases

- `@/app/*` → `src/app/*`
- `@/lib/*` → `src/lib/*`

### Authentication Pattern

Currently MVP with first-user pattern: `prisma.user.findFirst()` in all routes. Multi-user support would require session management (NextAuth.js, Clerk, etc.) and scoping all queries by authenticated user.

### HRR Computation Details

Located in `/api/cron/fetch/route.ts` lines 108-131:
- Requires HR stream (heartrate + time arrays) from Strava
- Finds HR at workout end time and at end + 120 seconds
- Uses linear interpolation between nearest time points
- Only computes if workout duration >= 150 seconds

### Strava-to-Workout Mapping

Orangetheory classes detected via activity name containing "orange" (case-insensitive). Stored with `whoopId = -abs(stravaId)` to distinguish from WHOOP workouts while maintaining unique constraint.
