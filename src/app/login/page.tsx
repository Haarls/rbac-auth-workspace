import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getActiveSession } from '@/lib/auth';

export default async function LoginPage() {
  const session = await getActiveSession();
  if (session) {
    redirect('/');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          RBAC AUTH WORKSPACE
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
          Operator Sign In
        </h1>
        <p className="mt-1 text-sm text-muted">
          Authenticate with credentials or unlock an assigned station PIN.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
