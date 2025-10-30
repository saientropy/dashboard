import { NextResponse } from 'next/server';
import { getStravaAuthorizeUrl } from '@/lib/strava';

export async function GET() {
  const state = Math.random().toString(36).slice(2);
  return NextResponse.redirect(getStravaAuthorizeUrl(state));
}


