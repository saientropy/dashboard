const STRAVA_AUTH = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN = 'https://www.strava.com/oauth/token';
const STRAVA_API = 'https://www.strava.com/api/v3';

type StravaToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete: { id: number };
};

export function getStravaAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'read,activity:read,activity:read_all',
    state
  });
  return `${STRAVA_AUTH}?${params.toString()}`;
}

export async function stravaExchange(code: string): Promise<StravaToken> {
  const res = await fetch(STRAVA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code'
    })
  });
  if (!res.ok) throw new Error('Strava token exchange failed');
  return res.json();
}

export async function stravaRefresh(refreshToken: string): Promise<StravaToken> {
  const res = await fetch(STRAVA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error('Strava token refresh failed');
  return res.json();
}

export async function stravaGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Strava GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function listRecentActivities(accessToken: string, afterUnix?: number) {
  const params = new URLSearchParams();
  if (afterUnix) params.set('after', String(afterUnix));
  return stravaGet<any[]>(`/athlete/activities?${params.toString()}`, accessToken);
}

export async function getActivityStreams(accessToken: string, activityId: number, types: string[] = ['heartrate', 'time']) {
  const t = types.join(',');
  return stravaGet<{ type: string; data: number[] }[]>(`/activities/${activityId}/streams?keys=${t}&key_by_type=true`, accessToken);
}


