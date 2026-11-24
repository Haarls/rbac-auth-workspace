import { redirect } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { BrandIsotipo } from '../../components/pin-otp-input';
import { getActiveSession } from '../../lib/auth';

export default async function LoginPage() {
  const session = await getActiveSession();
  if (session) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2.5">
        <BrandIsotipo />
        <span className="text-xs font-medium tracking-[-0.01em] text-zinc-400">
          Haarls / Workspace
        </span>
      </div>
      <LoginForm />
    </main>
  );
}
