"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { authProvider } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

// Module-level store — mutations go through writeUser(), never through setState
let _user: AuthUser | null = null;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function writeUser(u: AuthUser | null) {
  _user = u;
  notify();
}

const userStore = {
  subscribe: (fn: () => void) => {
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  },
  getSnapshot: () => _user,
  getServerSnapshot: (): AuthUser | null => null,
};

type SessionCtx = {
  user: AuthUser | null;
  signOut: () => void;
};

const SessionContext = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useSyncExternalStore(
    userStore.subscribe,
    userStore.getSnapshot,
    userStore.getServerSnapshot,
  );

  useEffect(() => {
    // Clean up any leftover mock data from the previous localStorage-based auth
    try {
      localStorage.removeItem("av_user");
      localStorage.removeItem("av_scores");
    } catch {}

    // Subscribe to real auth state changes and hydrate initial session
    const unsub = authProvider.onChange(writeUser);
    authProvider.getSession().then(writeUser);
    return unsub;
  }, []);

  const signOut = () => {
    authProvider.signOut().then(() => {
      router.push("/acceso");
    });
  };

  return (
    <SessionContext.Provider value={{ user, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
