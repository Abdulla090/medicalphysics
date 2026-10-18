import type { ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/** UI capabilities follow authenticated database roles; server functions enforce them. */
export const useAuth = () => {
  const { isLoaded, sessionId, signOut } = useClerkAuth();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const account = useQuery(api.roles.current, isAuthenticated ? {} : 'skip');
  return {
    user, session: sessionId,
    loading: !isLoaded || isLoading || (isAuthenticated && account === undefined),
    isAdmin: account?.role === 'admin',
    isInstructor: account?.role === 'instructor' || account?.role === 'admin',
    role: account?.role ?? 'student',
    signIn: async () => ({ error: new Error('Use the sign-in form') }),
    signUp: async () => ({ error: new Error('Use the registration form') }),
    signOut: async () => { await signOut(); },
  };
};
export const AuthProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
