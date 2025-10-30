import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchWhoopDailyRange, refreshAccessToken, toIsoDaysBack } from '@/lib/whoop';
import { listRecentActivities, stravaRefresh, getActivityStreams } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [{ whoopTokens: { isNot: null } }, { stravaTokens: { isNot: null } }],
    },
    include: { whoopTokens: true, stravaTokens: true },
  });

  const results = [];

  for (const user of users) {
    try {
      let workoutsCount = 0;
      let recoveryCount = 0;
      let stravaImported = 0;

      if (user.whoopTokens) {
        let accessToken = user.whoopTokens.accessToken;
        const needsRefresh = user.whoopTokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
        if (needsRefresh) {
          const refreshed = await refreshAccessToken(user.whoopTokens.refreshToken);
          const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
          await prisma.whoopToken.update({
            where: { userId: user.id },
            data: {
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token,
              tokenType: refreshed.token_type,
              scope: refreshed.scope,
              expiresAt,
            },
          });
          accessToken = refreshed.access_token;
        }

        const { start, end } = toIsoDaysBack(14);
        const { workouts, recovery } = await fetchWhoopDailyRange(accessToken, start, end);

        for (const w of workouts) {
          await prisma.workout.upsert({
            where: { whoopId: w.id },
            update: {
              start: new Date(w.start),
              end: new Date(w.end),
              avgHr: w.average_heart_rate ?? null,
              maxHr: w.max_heart_rate ?? null,
            },
            create: {
              userId: user.id,
              whoopId: w.id,
              start: new Date(w.start),
              end: new Date(w.end),
              avgHr: w.average_heart_rate ?? null,
              maxHr: w.max_heart_rate ?? null,
            },
          });
          workoutsCount++;
        }

        for (const r of recovery) {
          if (!r.rmssd_millis || !r.date) continue;
          await prisma.hrvDaily.upsert({
            where: { userId_date: { userId: user.id, date: new Date(r.date) } },
            update: { rmssd: r.rmssd_millis / 1000, rhr: r.resting_heart_rate ?? null, source: 'whoop' },
            create: {
              userId: user.id,
              date: new Date(r.date),
              rmssd: r.rmssd_millis / 1000,
              rhr: r.resting_heart_rate ?? null,
              source: 'whoop',
            },
          });
          recoveryCount++;
        }
      }

      if (user.stravaTokens) {
        let stravaAccess = user.stravaTokens.accessToken;
        if (user.stravaTokens.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
          const refreshed = await stravaRefresh(user.stravaTokens.refreshToken);
          await prisma.stravaToken.update({
            where: { userId: user.id },
            data: {
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token,
              expiresAt: new Date(refreshed.expires_at * 1000),
            },
          });
          stravaAccess = refreshed.access_token;
        }
        const afterUnix = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 14;
        const acts = await listRecentActivities(stravaAccess, afterUnix);
        for (const a of acts) {
          const isOTF = typeof a.name === 'string' && a.name.toLowerCase().includes('orange');
          if (!isOTF) continue;

          const syntheticId = -Math.abs(a.id);
          await prisma.workout.upsert({
            where: { whoopId: syntheticId },
            update: {
              start: new Date(a.start_date),
              end: new Date(new Date(a.start_date).getTime() + a.elapsed_time * 1000),
              avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
              maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
            },
            create: {
              userId: user.id,
              whoopId: syntheticId,
              start: new Date(a.start_date),
              end: new Date(new Date(a.start_date).getTime() + a.elapsed_time * 1000),
              avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
              maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
            },
          });
          stravaImported++;

          try {
            const streams = await getActivityStreams(stravaAccess, a.id, ['heartrate', 'time']);
            const hr = (streams as any).heartrate?.data as number[] | undefined;
            const t = (streams as any).time?.data as number[] | undefined;
            if (hr && t && hr.length > 0 && t.length === hr.length && a.elapsed_time >= 150) {
              const endTime = a.elapsed_time;
              const hrAt = (sec: number) => {
                let i = t.findIndex((x) => x >= sec);
                if (i <= 0) return hr[0];
                if (i >= t.length) return hr[hr.length - 1];
                if (t[i] === sec) return hr[i];
                const t0 = t[i - 1],
                  t1 = t[i];
                const h0 = hr[i - 1],
                  h1 = hr[i];
                const ratio = (sec - t0) / (t1 - t0);
                return Math.round(h0 + ratio * (h1 - h0));
              };
              const hEnd = hrAt(endTime);
              const hPlus120 = hrAt(endTime + 120);
              const hrr2 = hEnd - hPlus120;
              await prisma.workout.update({ where: { whoopId: syntheticId }, data: { hrr2min: hrr2 } });
            }
          } catch {}
        }
      }

      results.push({
        userId: user.id,
        email: user.email,
        workoutsCount,
        recoveryCount,
        stravaImported,
      });
    } catch (error) {
      results.push({
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
