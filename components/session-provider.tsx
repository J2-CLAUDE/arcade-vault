"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { StoredUser, StoredScore } from "@/lib/data";

// Module-level store — mutations go through writeUser(), never through setState
let _user: StoredUser = null;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function writeUser(u: StoredUser) {
  _user = u;
  if (u) localStorage.setItem("av_user", JSON.stringify(u));
  else localStorage.removeItem("av_user");
  notify();
}

const userStore = {
  subscribe: (fn: () => void) => {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },
  getSnapshot: () => _user,
  getServerSnapshot: (): StoredUser => null,
};

type SessionCtx = {
  user: StoredUser;
  login: (u: { name: string }) => void;
  signOut: () => void;
  saveScore: (entry: Omit<StoredScore, "at">) => void;
};

const SessionContext = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(
    userStore.subscribe,
    userStore.getSnapshot,
    userStore.getServerSnapshot
  );

  // Hydrate from localStorage once on mount — mutates _user directly,
  // no setState call, so no cascading render warning
  useEffect(() => {
    try {
      const stored = localStorage.getItem("av_user");
      if (stored) {
        _user = JSON.parse(stored);
        notify();
      }
    } catch {}
  }, []);

  const login = (u: { name: string }) => writeUser(u);
  const signOut = () => writeUser(null);

  const saveScore = (entry: Omit<StoredScore, "at">) => {
    try {
      const all: StoredScore[] = JSON.parse(
        localStorage.getItem("av_scores") || "[]"
      );
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {}
  };

  return (
    <SessionContext.Provider value={{ user, login, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
