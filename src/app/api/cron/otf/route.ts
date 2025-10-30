import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto';
import { fetchRecentClasses } from '@/lib/otf';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await prisma.user.findFirst({ include: { otfCredential: true } });
  if (!user || !user.otfCredential) return NextResponse.json({ ok: true, message: 'no creds' });

  const username = decryptString(user.otfCredential.iv, user.otfCredential.usernameE);
  const password = decryptString(user.otfCredential.iv, user.otfCredential.passwordE);
  const classes = await fetchRecentClasses(username, password);
  let upserts = 0;
  for (const c of classes) {
    const syntheticId = -100000000 - Math.abs(c.id); // separate space from Strava
    await prisma.workout.upsert({
      where: { whoopId: syntheticId },
      update: {
        start: new Date(c.start),
        end: new Date(c.end),
        avgHr: c.avgHr ?? null,
        maxHr: c.maxHr ?? null
      },
      create: {
        userId: user.id,
        whoopId: syntheticId,
        start: new Date(c.start),
        end: new Date(c.end),
        avgHr: c.avgHr ?? null,
        maxHr: c.maxHr ?? null
      }
    });
    upserts++;
  }
  return NextResponse.json({ ok: true, imported: upserts });
}


