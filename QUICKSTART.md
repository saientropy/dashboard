# Quick Deployment Guide

## Step 1: GitHub Repository ✓
Already done - code is ready to push.

## Step 2: Get OAuth Credentials (15 minutes)

### Google OAuth (for user login)
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback/google`
7. Copy Client ID and Secret

### WHOOP Developer
1. Go to https://developer.whoop.com/
2. Sign up / Log in
3. Register new application
4. Redirect URI: `https://YOUR-VERCEL-URL.vercel.app/api/whoop/callback`
5. Copy Client ID and Secret

### Strava API (optional)
1. Go to https://www.strava.com/settings/api
2. Create new app
3. Authorization Callback Domain: `YOUR-VERCEL-URL.vercel.app`
4. Copy Client ID and Secret

## Step 3: Database Setup (5 minutes)

### Option A: Neon (Recommended - Free tier)
1. Go to https://neon.tech/
2. Create account
3. Create new project
4. Copy connection string (starts with `postgresql://`)

### Option B: Vercel Postgres
1. In Vercel dashboard → Storage → Create Database
2. Select Postgres
3. Copy connection string

## Step 4: Deploy to Vercel (10 minutes)

1. Go to https://vercel.com/new
2. Import your GitHub repository: `saientropy/heart-health-dashboard`
3. Add environment variables (see below)
4. Click "Deploy"

### Environment Variables for Vercel

```bash
# Database
DATABASE_URL=postgresql://...your-neon-url...

# Auth (generate: openssl rand -base64 32)
AUTH_SECRET=<generate-this>
NEXTAUTH_URL=https://your-app.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>

# WHOOP OAuth
WHOOP_CLIENT_ID=<from-whoop-developer>
WHOOP_CLIENT_SECRET=<from-whoop-developer>
WHOOP_REDIRECT_URI=https://your-app.vercel.app/api/whoop/callback

# Strava OAuth (optional)
STRAVA_CLIENT_ID=<from-strava>
STRAVA_CLIENT_SECRET=<from-strava>
STRAVA_REDIRECT_URI=https://your-app.vercel.app/api/strava/callback

# Encryption (generate: openssl rand -base64 32)
OTF_ENCRYPTION_KEY=<generate-this>

# Cron Security (generate: openssl rand -base64 32)
CRON_SECRET=<generate-this>

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Email (optional - for magic links)
AUTH_RESEND_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

## Step 5: Run Database Migration

After first deploy:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to project
vercel link

# Pull env vars
vercel env pull .env.local

# Run migration
npx prisma db push
```

## Step 6: Update OAuth Redirect URIs

After deployment, get your Vercel URL (e.g., `heart-health-dashboard.vercel.app`).

Go back to:
- Google Cloud Console → Update redirect URI
- WHOOP Developer Portal → Update redirect URI
- Strava API Settings → Update callback domain

## Step 7: Test It Out

1. Visit your Vercel URL
2. Click "Get Started"
3. Sign in with Google
4. Connect WHOOP account
5. Connect Strava account (optional)
6. Configure OTF credentials (optional)
7. Check dashboard for data

## Generate Secrets Command

Run this to generate all three secrets at once:

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)"
echo "OTF_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "CRON_SECRET=$(openssl rand -base64 32)"
```

## Troubleshooting

**OAuth errors:**
- Verify redirect URIs match exactly (https, no trailing slash)
- Check that OAuth apps are enabled/published

**Database connection:**
- Verify DATABASE_URL is correct
- Check database allows connections from Vercel IPs

**Build fails:**
- Check all required env vars are set
- Verify Prisma schema is valid

## Support

Check logs in Vercel dashboard if anything fails.
