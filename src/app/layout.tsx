import './globals.css';
import { auth, signOut } from '@/auth';
import Link from 'next/link';

export const metadata = { title: 'Heart Health Dashboard' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Heart Health Dashboard</h1>
            </Link>
            {session && (
              <div className="flex items-center gap-6">
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 font-medium">
                  Dashboard
                </Link>
                <Link href="/settings/otf" className="text-gray-700 hover:text-gray-900 font-medium">
                  Settings
                </Link>
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/' });
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1 rounded"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">{children}</main>
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-600 text-center">
            Privacy-first heart health tracking. Your data stays in your database.
          </div>
        </footer>
      </body>
    </html>
  );
}


