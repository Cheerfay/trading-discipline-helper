import { createFileRoute } from '@tanstack/react-router';
import { respData, respErr } from '@/lib/resp';
import { getAuth } from '@/core/auth';
import { getUserPlan } from '@/modules/invite-codes/service';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const { plan, trialEndsAt } = await getUserPlan(session.user.id);

    return respData({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      plan,
      trialEndsAt: trialEndsAt?.toISOString() || null,
      authorized: plan === 'trial' || plan === 'member',
    });
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/user/info')({
  server: {
    handlers: { GET },
  },
});
