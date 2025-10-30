# Deployment Guide

## Prerequisites

1. PostgreSQL database (Neon, Vercel Postgres, or similar)
2. Google OAuth credentials for user authentication
3. WHOOP Developer API credentials
4. Strava API credentials
5. Resend account for magic link emails (optional)

## Step 1: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`
5. Copy Client ID and Client Secret

## Step 2: Create WHOOP Developer App

1. Go to [WHOOP Developer Portal](https://developer.whoop.com/)
2. Register application
3. Set redirect URI: `https://yourdomain.com/api/whoop/callback`
4. Copy Client ID and Client Secret

## Step 3: Create Strava API App

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create application
3. Set authorization callback domain: `yourdomain.com`
4. Copy Client ID and Client Secret

## Step 4: Setup Resend (Optional, for magic links)

1. Go to [Resend](https://resend.com/)
2. Create account and verify domain
3. Create API key
4. Note: You can skip this and only use Google OAuth

## Step 5: Deploy to Vercel

### Via Vercel Dashboard:

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables (see below)
4. Deploy

### Via CLI:

```bash
npm install -g vercel
vercel
```

## Environment Variables

Add these in Vercel Project Settings > Environment Variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="https://yourdomain.com"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Resend (optional)
AUTH_RESEND_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# WHOOP
WHOOP_CLIENT_ID="..."
WHOOP_CLIENT_SECRET="..."
WHOOP_REDIRECT_URI="https://yourdomain.com/api/whoop/callback"

# Strava
STRAVA_CLIENT_ID="..."
STRAVA_CLIENT_SECRET="..."
STRAVA_REDIRECT_URI="https://yourdomain.com/api/strava/callback"

# OTF Encryption
OTF_ENCRYPTION_KEY="<generate with: openssl rand -base64 32>"

# Cron Security
CRON_SECRET="<generate with: openssl rand -base64 32>"

# App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

## Step 6: Run Database Migration

After first deployment:

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Link to your project
vercel link

# Run migration
vercel env pull .env.local
npx prisma migrate deploy

# Or push schema directly (for development)
npx prisma db push
```

## Step 7: Configure Cron Jobs

Vercel will automatically configure cron jobs from `vercel.json`. They need authentication:

1. The cron jobs require the `CRON_SECRET` environment variable
2. Vercel Cron automatically includes `Authorization: Bearer ${CRON_SECRET}` header
3. If using external cron service, include this header manually

## Step 8: Verify Deployment

1. Visit `https://yourdomain.com`
2. Click "Get Started" and sign in with Google
3. Connect WHOOP account
4. Connect Strava account (optional)
5. Configure OTF credentials (optional)
6. Check dashboard for synced data

## Cron Job Details

- `/api/cron/fetch`: Runs every 6 hours, syncs WHOOP and Strava data for all users
- `/api/cron/otf`: Runs every 6 hours (staggered), syncs OTF data (when implemented)

## Monitoring

Check Vercel deployment logs:
```bash
vercel logs
```

## Troubleshooting

### OAuth errors
- Verify redirect URIs match exactly (https vs http, trailing slash)
- Check that OAuth apps are enabled/published

### Database connection issues
- Verify DATABASE_URL is correct
- Check database allows connections from Vercel IPs

### Cron jobs not running
- Verify CRON_SECRET is set
- Check Vercel cron logs in dashboard
- Ensure your Vercel plan supports cron jobs

## Security Notes

1. Rotate `CRON_SECRET` periodically
2. Rotate `OTF_ENCRYPTION_KEY` if compromised (requires re-entering credentials)
3. Never commit `.env` files
4. Use environment variable encryption in Vercel for sensitive values
5. Monitor OAuth token usage and revoke if suspicious activity

## Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Fill in values in .env.local

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Start dev server
npm run dev
```

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migration completed
- [ ] Google OAuth configured with correct redirect URI
- [ ] WHOOP OAuth configured with correct redirect URI
- [ ] Strava OAuth configured with correct redirect URI
- [ ] CRON_SECRET generated and set
- [ ] OTF_ENCRYPTION_KEY generated and set
- [ ] AUTH_SECRET generated and set
- [ ] Domain verified for email (if using Resend)
- [ ] Test full authentication flow
- [ ] Test WHOOP connection
- [ ] Test Strava connection
- [ ] Verify cron jobs run successfully
