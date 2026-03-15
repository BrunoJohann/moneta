'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type User } from '@/lib/api';
import { clearTokens, isAuthenticated as checkAuth } from '@/lib/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    if (!checkAuth()) {
      setState({ user: null, isAuthenticated: false, loading: false });
      return;
    }

    api.users
      .me()
      .then((user) => {
        setState({ user, isAuthenticated: true, loading: false });
      })
      .catch(() => {
        clearTokens();
        setState({ user: null, isAuthenticated: false, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string) => {
    return api.auth.login(email);
  }, []);

  const verify = useCallback(
    async (email: string, code: string) => {
      const data = await api.auth.verify(email, code);
      setState({ user: data.user, isAuthenticated: true, loading: false });
      router.push('/');
      return data;
    },
    [router],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    setState({ user: null, isAuthenticated: false, loading: false });
    router.push('/login');
  }, [router]);

  return {
    ...state,
    login,
    verify,
    logout,
  };
}
