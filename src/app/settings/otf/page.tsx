import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

async function save(formData: FormData) {
  'use server';
  const session = await auth();
  if (!session?.user?.email) return;

  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '').trim();
  if (!username || !password) return;

  const { encryptString } = await import('@/lib/crypto');
  const { ivB64, cipherB64: userE } = encryptString(username);
  const { cipherB64: passE } = encryptString(password);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return;

  await prisma.otfCredential.upsert({
    where: { userId: user.id },
    update: { usernameE: userE, passwordE: passE, iv: ivB64 },
    create: { userId: user.id, usernameE: userE, passwordE: passE, iv: ivB64 },
  });

  redirect('/settings/otf?saved=true');
}

export default async function OtfSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { otfCredential: true },
  });

  if (!user) redirect('/auth/signin');

  const hasCreds = !!user.otfCredential;
  const saved = searchParams.saved === 'true';

  return (
    <main>
      <div className="max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Orangetheory Credentials</h2>
        <p className="text-gray-600 mb-6">
          Stored encrypted with AES-256-GCM. Used by a scheduled job to automatically fetch your classes.
        </p>

        <form action={save} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Email / Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Your OTF password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {hasCreds ? 'Update Credentials' : 'Save Credentials'}
          </button>
        </form>

        {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Credentials saved successfully. The sync job will use these credentials to fetch your classes.
          </div>
        )}

        {hasCreds && !saved && (
          <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            Credentials are currently saved and encrypted. Update them anytime above.
          </div>
        )}
      </div>
    </main>
  );
}


