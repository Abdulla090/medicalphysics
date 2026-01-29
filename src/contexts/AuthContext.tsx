import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";

interface AuthContextType {
  user: any | null; // Clerk user object
  session: any | null; // Clerk session
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  // Instead of using Context, we can just wrap Clerk hooks here effectively
  // But to maintain compatibility with existing code that expects useAuth() to return { user, isAdmin, signOut, ... }
  // we will implement a hook that returns those values from Clerk hooks.

  const { isLoaded, userId, sessionId, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (clerkUser) {
      // Check public metadata for role
      // Assuming we set this in Clerk dashboard or via a function
      // For now, let's look at unsafeMetadata or publicMetadata
      // TEMPORARY: Force admin for development
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [clerkUser]);

  const signIn = async () => {
    console.warn("Manual signIn called - verify if this is needed with Clerk");
    return { error: null };
  };

  const signUp = async () => {
    console.warn("Manual signUp called - verify if this is needed with Clerk");
    return { error: null };
  }

  return {
    user: clerkUser,
    session: sessionId,
    loading: !isLoaded,
    isAdmin,
    signIn,
    signUp,
    signOut: async () => { await clerkSignOut(); }
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
