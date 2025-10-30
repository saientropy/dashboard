import { NextResponse } from 'next/server';
import { getWhoopAuthorizeUrl } from '@/lib/whoop';

export async function GET() {
  const state = Math.random().toString(36).slice(2);
  // In production, associate state with user/session. For now, redirect directly.
  const url = getWhoopAuthorizeUrl(state);
  return NextResponse.redirect(url);
}


