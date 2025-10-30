import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      whoopTokens: true,
      stravaTokens: true,
      otfCredential: true,
    },
  });

  if (!user) redirect('/auth/signin');

  const [workouts, hrv] = await Promise.all([
    prisma.workout.findMany({ where: { userId: user.id }, orderBy: { start: 'desc' }, take: 30 }),
    prisma.hrvDaily.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 30 }),
  ]);

  const hasWhoopConnected = !!user.whoopTokens;
  const hasStravaConnected = !!user.stravaTokens;
  const hasOtfCredentials = !!user.otfCredential;

  return (
    <main>
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Connected Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">WHOOP</div>
              <div className="text-sm text-gray-600">
                {hasWhoopConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>
            {!hasWhoopConnected && (
              <Link
                href="/api/whoop/authorize"
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Connect
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Strava</div>
              <div className="text-sm text-gray-600">
                {hasStravaConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>
            {!hasStravaConnected && (
              <Link
                href="/api/strava/authorize"
                className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
              >
                Connect
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Orangetheory</div>
              <div className="text-sm text-gray-600">
                {hasOtfCredentials ? 'Configured' : 'Not configured'}
              </div>
            </div>
            <Link
              href="/settings/otf"
              className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              {hasOtfCredentials ? 'Update' : 'Setup'}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent HRR (2-min)</h2>
          {workouts.length === 0 ? (
            <p className="text-gray-500">No workouts yet. Connect WHOOP or Strava to start tracking.</p>
          ) : (
            <ul className="space-y-2">
              {workouts.map((w) => (
                <li key={w.id} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-600">{new Date(w.start).toLocaleString()}</span>
                  <span className="font-medium">{w.hrr2min ?? 'n/a'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent HRV (RMSSD)</h2>
          {hrv.length === 0 ? (
            <p className="text-gray-500">No HRV data yet. Connect WHOOP to start tracking.</p>
          ) : (
            <ul className="space-y-2">
              {hrv.map((h) => (
                <li key={h.id} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-600">{new Date(h.date).toLocaleDateString()}</span>
                  <span className="font-medium">{Math.round(h.rmssd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}


