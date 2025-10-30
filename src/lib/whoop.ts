import dayjs from 'dayjs';

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API = 'https://api.prod.whoop.com';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope: string;
};

export function getWhoopAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    scope: [
      'offline_access',
      'read:recovery',
      'read:sleep',
      'read:workout',
      'read:cycle',
      'read:profile'
    ].join(' '),
    state
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

export async function whoopGet(path: string, accessToken: string) {
  const res = await fetch(`${WHOOP_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`WHOOP GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function fetchWhoopDailyRange(accessToken: string, startIso: string, endIso: string) {
  // Workouts
  const workouts = await whoopGet(`/developer/v1/activity?start=${startIso}&end=${endIso}`, accessToken);
  // Recovery
  const recovery = await whoopGet(`/developer/v1/recovery?start=${startIso}&end=${endIso}`, accessToken);
  // Sleep
  const sleep = await whoopGet(`/developer/v1/sleep?start=${startIso}&end=${endIso}`, accessToken);
  return { workouts, recovery, sleep };
}

export function toIsoDaysBack(daysBack: number) {
  const end = dayjs().endOf('day').toISOString();
  const start = dayjs().subtract(daysBack, 'day').startOf('day').toISOString();
  return { start, end };
}


