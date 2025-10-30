import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { stravaExchange } from '@/lib/strava';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) return new NextResponse('Missing code', { status: 400 });

  const token = await stravaExchange(code);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  await prisma.stravaToken.upsert({
    where: { userId: user.id },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      athleteId: token.athlete.id,
      expiresAt: new Date(token.expires_at * 1000),
    },
    create: {
      userId: user.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      athleteId: token.athlete.id,
      expiresAt: new Date(token.expires_at * 1000),
    },
  });

  return NextResponse.redirect(new URL('/dashboard', url.origin));
}


