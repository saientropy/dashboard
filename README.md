## Heart Health Dashboard (WHOOP + Orangetheory)

This project gives you a local, privacy-first dashboard to visualize metrics that matter for heart health:

- 2-minute Heart Rate Recovery (HRR)
- HRV (RMSSD from RR intervals and/or nightly HRV from WHOOP)
- Workout timelines and zones

You can start immediately by uploading exported data files. When ready, connect your WHOOP account via OAuth to fetch data automatically. Orangetheory does not expose an official public API; use CSV or Health exports.

### What you can do now

- Drag-and-drop or select files in the dashboard to load data:
  - WHOOP JSON: workouts, sleep, recovery, HR time series, nightly HRV
  - Orangetheory CSV: class summaries (distance, treadmill/rower splits if present)
  - RR intervals CSV: to compute HRV (RMSSD) from raw RR data

### Quickstart (hosted, zero-maintenance)

Deploy to Vercel (recommended):

1) Create a Postgres database (e.g., Neon), get `DATABASE_URL`.

2) In Vercel, create a new project from this repo. Add environment variables:
   - `DATABASE_URL`
   - `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI` (set to `https://<your-domain>/api/whoop/callback`)
   - `NEXT_PUBLIC_APP_URL` (`https://<your-domain>`)
   - `OTF_ENCRYPTION_KEY` (32-byte key in base64; generate with `openssl rand -base64 32`)

3) Vercel will deploy and provision the cron in `vercel.json` to hit `/api/cron/fetch` every 6 hours.

4) Open the site → click "Connect WHOOP" once. Tokens are stored server-side; the cron keeps data fresh.

5) Visit `/dashboard` to see HRR and HRV. Metrics improve as more data accumulates.

### Local dev (optional)

- Install deps and run:
  - `npm install`
  - `npx prisma generate`
  - `npm run dev`

Migrate schema to your Postgres (`prisma migrate deploy`) or use `prisma db push` for dev.

Note: The older local upload demo is deprecated in favor of the hosted flow.

3) See metrics

- The Dashboard shows:
  - 2-min HRR per workout (using end-of-workout timestamp and HR time series)
  - Nightly HRV (from WHOOP recovery/sleep) when available
  - HRV (RMSSD) computed from uploaded RR intervals
  - Workout charts for heart rate timeline and summary tiles

### Connect WHOOP (optional, recommended)

WHOOP provides an OAuth API. You’ll need to register a client and obtain credentials.

See `scripts/whoop_oauth_guide.md` for step-by-step setup and `scripts/whoop_fetch.mjs` for a simple fetch script that writes JSON files you can load into the dashboard.

Notes:
- Keep your tokens in `.env` (see `.env.example`).
- The fetch script pulls workouts, sleep, recovery, and heart-rate time series.

### Orangetheory (direct, unofficial)

No official OTF API exists. This app supports a credentials-based fetcher that runs on a schedule:

Steps:
1) Ensure `OTF_ENCRYPTION_KEY` is set (base64 32 bytes).
2) Open `/settings/otf` on your deployed app and save your OTF credentials (stored encrypted with AES‑256‑GCM).
3) The cron at `/api/cron/otf` runs every 6 hours and imports recent classes.

Security notes:
- Credentials are encrypted at rest with your `OTF_ENCRYPTION_KEY`. Rotate by changing the key and re-saving.
- This integration is unofficial and may break if OTF changes their app. We’ll keep the client modular for quick fixes.

### File formats

- WHOOP JSON: The script writes a combined JSON in a loosely normalized shape:
  ```
  {
    "workouts": [ { id, start, end, hrSeries: [{t, hr}], ... } ],
    "recovery": [ { date, hrvRmssd, rhr, score } ],
    "sleep":    [ { date, hrvRmssd, rhr, stages: {...} } ]
  }
  ```

- Orangetheory CSV: Expected headers (best effort):
  - date, workout_type, duration_min, treadmill_dist_km, rower_dist_km, avg_hr, max_hr, splat_points

- RR intervals CSV:
  - `timestamp_ms, rr_ms` or `rr_ms` per row

### How 2‑minute HRR is computed

For each workout with heart rate time series:
1. Use the workout end time as the “stop” time.
2. Take the heart rate at end time (HR_end).
3. Take the heart rate 120 seconds after end (HR_+120). If no exact sample, linear interpolate between nearest points.
4. HRR_2min = HR_end − HR_+120. Higher is generally better.

If the workout contains explicit segments, the end is a reasonable proxy for the effort stop. You can also upload a CSV with a custom stop marker in the future.

### How HRV (RMSSD) is computed

Given RR intervals in milliseconds: compute RMSSD = sqrt(mean(diff(rr)^2)). The dashboard computes this per uploaded session and charts it. WHOOP nightly HRV (RMSSD) is also shown when present.

### Development notes

- The `web/` app is vanilla HTML/CSS/JS and uses Chart.js via CDN for easy local usage.
- No server is required to explore data manually.
- If you want a full-stack app with OAuth in-browser, we can scaffold Next.js and add the WHOOP OAuth flow; start with the script and move to server routes later.

### Roadmap

- Add in-browser WHOOP OAuth and token storage
- Add persistent storage (SQLite/IndexedDB)
- Add zone time analytics and trend dashboards
- Add export to CSV/PNG


