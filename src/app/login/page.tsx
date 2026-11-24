import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getActiveSession } from '@/lib/auth';

export default async function LoginPage() {
  const session = await getActiveSession();
  if (session) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center px-4 py-12 sm:px-6">
      <LoginForm />
    </main>
  );
}
