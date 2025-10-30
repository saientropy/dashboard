import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exchangeCodeForToken } from '@/lib/whoop';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) return new NextResponse('Missing code', { status: 400 });

  const token = await exchangeCodeForToken(code);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  await prisma.whoopToken.upsert({
    where: { userId: user.id },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      scope: token.scope,
      expiresAt,
    },
    create: {
      userId: user.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      scope: token.scope,
      expiresAt,
    },
  });

  return NextResponse.redirect(new URL('/dashboard', url.origin));
}


