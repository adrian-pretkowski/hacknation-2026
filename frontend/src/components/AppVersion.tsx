"use client";

import { useEffect, useState } from "react";
import { APP_VERSION, getHealth } from "@/lib/api";

/** Stopka: wersja wdrożonej aplikacji (FE z tagu, BE z /api/health) i zestawu reguł — INT-11. */
export function AppVersion() {
  const [backend, setBackend] = useState<{ app: string; rules: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealth().then((h) => {
      if (!cancelled && h) setBackend({ app: h.app_version, rules: h.ruleset_version });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className="mt-1 text-zinc-500" data-testid="app-version">
      Wersja aplikacji: {APP_VERSION}
      {backend && (
        <>
          {" · API: "}
          {backend.app}
          {backend.app !== APP_VERSION && " (inna niż interfejs)"}
          {" · zestaw reguł: "}
          {backend.rules}
        </>
      )}
    </p>
  );
}
