import { auth } from '@/auth';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();

  if (session) {
    return (
      <main className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Welcome back, {session.user?.name || session.user?.email}</h2>
        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard →
        </Link>
      </main>
    );
  }

  return (
    <main>
      <div className="text-center mb-12">
        <h2 className="text-2xl font-semibold mb-3">Track Your Heart Health</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Connect your WHOOP and Orangetheory accounts to automatically sync workouts, track 2-minute Heart Rate
          Recovery (HRR), and monitor Heart Rate Variability (HRV) trends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">WHOOP Integration</h3>
          <p className="text-sm text-gray-600 mb-4">
            Automatic sync of workouts, recovery data, and nightly HRV. One-time OAuth authorization keeps your data
            fresh.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Strava + OTF</h3>
          <p className="text-sm text-gray-600 mb-4">
            Import Orangetheory classes via Strava with heart rate streams to compute 2-min HRR automatically.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Private & Secure</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your data stays in your database. Encrypted credentials, automatic token refresh, and privacy-first
            architecture.
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/auth/signin"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-lg"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}


