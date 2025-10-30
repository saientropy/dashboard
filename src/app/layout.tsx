import './globals.css';
import { auth, signOut } from '@/auth';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'Heart Health Dashboard' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen flex flex-col antialiased selection:bg-pink-500/40 selection:text-white`}
      >
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 top-[-10%] mx-auto h-[480px] w-[720px] rounded-full bg-pink-500/40 blur-[180px] sm:w-[960px]" />
            <div className="absolute inset-x-0 bottom-[-25%] mx-auto h-[540px] w-[720px] rounded-full bg-blue-500/30 blur-[220px] sm:w-[960px]" />
          </div>
          <header className="relative border-b border-white/10 backdrop-blur-lg bg-white/5">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-pink-500/30">
                  HH
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Heart Health Dashboard</p>
                  <p className="text-xs text-slate-200/70">Sync workouts · Track recovery · Own your data</p>
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/#features"
                  className="hidden text-sm font-medium text-slate-200/80 transition hover:text-white sm:inline-flex"
                >
                  Features
                </Link>
                <Link
                  href="/#integrations"
                  className="hidden text-sm font-medium text-slate-200/80 transition hover:text-white sm:inline-flex"
                >
                  Integrations
                </Link>
                {session ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm font-semibold text-white hover:text-pink-100 transition"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings/otf"
                      className="text-sm font-semibold text-white/80 hover:text-white transition"
                    >
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
                        className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
                      >
                        Sign Out
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:-translate-y-[1px] hover:bg-slate-100"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </header>

          <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">{children}</main>
        </div>

        <footer className="border-t border-white/10 bg-slate-950/70 py-10">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-300/80">
            Privacy-first heart health tracking. Your data stays in your database.
          </div>
        </footer>
      </body>
    </html>
  );
}

