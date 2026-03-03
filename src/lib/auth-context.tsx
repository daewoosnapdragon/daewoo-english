'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase-browser';

type UserRole = 'teacher' | 'viewer' | null;

interface AuthContextType {
  role: UserRole;
  userEmail: string | null;
  isTeacher: boolean;
  isViewer: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  role: null, userEmail: null, isTeacher: false, isViewer: false, loading: true,
  signOut: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

const VIEWER_EMAIL = 'viewer@teachervault.local';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const email = user.email || '';
        setUserEmail(email);
        setRole(email === VIEWER_EMAIL ? 'viewer' : 'teacher');
      } else {
        setRole(null);
        setUserEmail(null);
      }
      setLoading(false);
    }
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || '';
      setUserEmail(email || null);
      setRole(email === VIEWER_EMAIL ? 'viewer' : email ? 'teacher' : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      role, userEmail,
      isTeacher: role === 'teacher',
      isViewer: role === 'viewer',
      loading, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
