"use client";

// SYMULACJA sesji użytkownika testowego. Stan w sessionStorage (tylko identyfikator profilu testowego, bez danych osobowych).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccountPanel } from "./AccountPanel";
import { LoginDialog } from "./LoginDialog";
import { type TestUser, findUser } from "./users";

const STORAGE_KEY = "ppr.sim.profile";

type Ctx = {
  user: TestUser | null;
  /** Otwiera symulowane logowanie; po sukcesie wywołuje onSuccess z zalogowanym użytkownikiem. */
  requestLogin: (onSuccess?: (u: TestUser) => void) => void;
  openAccount: () => void;
  logout: () => void;
};

const SimSessionContext = createContext<Ctx | null>(null);

export function useSimSession(): Ctx {
  const ctx = useContext(SimSessionContext);
  if (!ctx) throw new Error("useSimSession poza SimSessionProvider");
  return ctx;
}

export function SimSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TestUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pending = useRef<((u: TestUser) => void) | null>(null);

  useEffect(() => {
    // Przywrócenie sesji po odświeżeniu — synchronizacja z zewnętrznym magazynem przeglądarki.
    const restored = findUser(window.sessionStorage.getItem(STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (restored) setUser(restored);
  }, []);

  const requestLogin = useCallback((onSuccess?: (u: TestUser) => void) => {
    pending.current = onSuccess ?? null;
    setLoginOpen(true);
  }, []);

  const finishLogin = (u: TestUser) => {
    setUser(u);
    window.sessionStorage.setItem(STORAGE_KEY, u.id);
    setLoginOpen(false);
    const cb = pending.current;
    pending.current = null;
    cb?.(u);
  };

  const logout = useCallback(() => {
    setUser(null);
    setAccountOpen(false);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <SimSessionContext.Provider value={{ user, requestLogin, openAccount: () => setAccountOpen(true), logout }}>
      {children}
      {loginOpen && <LoginDialog onClose={() => { pending.current = null; setLoginOpen(false); }} onSuccess={finishLogin} />}
      {accountOpen && user && <AccountPanel user={user} onClose={() => setAccountOpen(false)} onLogout={logout} />}
    </SimSessionContext.Provider>
  );
}
