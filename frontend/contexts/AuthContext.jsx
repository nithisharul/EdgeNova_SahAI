import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { onUnauthorized } from '../services/apiClient';
import authService from '../services/authService';
import { clearSessionResults } from '../services/sessionState';

/**
 * Who is signed in, for the whole app.
 *
 * Navigation reads `role` from here rather than probing the backend, so a
 * member is never shown a treasurer button that is guaranteed to 403. The
 * backend still enforces every rule -- this only stops the UI offering doors
 * that are locked.
 *
 * A 401 anywhere clears the session and sends the user to Login with a message.
 * That is deliberate: the alternative, silently re-authenticating behind the
 * user's back, hides the fact that they were signed out.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;

    authService
      .restoreSession()
      .catch(() => null)
      .finally(() => {
        if (active) setRestoring(false);
      });

    const unsubscribeSession = authService.subscribe((next) => {
      if (active) setSession(next);
    });

    const unsubscribe401 = onUnauthorized(() => {
      if (!active) return;
      authService.logout();
      clearSessionResults();
      setNotice('Session expired. Please log in again.');
      router.replace('/login');
    });

    return () => {
      active = false;
      unsubscribeSession();
      unsubscribe401();
    };
  }, []);

  const signIn = useCallback(async (credentials) => {
    setNotice(null);
    return authService.login(credentials);
  }, []);

  const signUp = useCallback(async (details) => {
    setNotice(null);
    return authService.register(details);
  }, []);

  const signOut = useCallback(() => {
    authService.logout();
    clearSessionResults();
    setNotice(null);
    router.replace('/(tabs)/home');
  }, []);

  const value = useMemo(
    () => ({
      session,
      memberId: session?.memberId || null,
      role: session?.role || null,
      name: session?.name || null,
      signedIn: !!session?.token,
      // admin is staff too: the backend's STAFF_ROLES contains both.
      isTreasurer: ['treasurer', 'admin'].includes(session?.role),
      restoring,
      notice,
      clearNotice: () => setNotice(null),
      signIn,
      signUp,
      signOut,
    }),
    [session, restoring, notice, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

export default AuthContext;
