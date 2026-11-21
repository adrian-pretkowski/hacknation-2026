"use client";

// SYMULACJA logowania aplikacją mobilną: kod QR → zeskanowanie telefonem → potwierdzenie kodem weryfikacyjnym → zalogowano.
// Przebieg wzorowany na typowym logowaniu kodem QR, ale bez wyglądu, nazw handlowych i grafik prawdziwej usługi.
import { useEffect, useState } from "react";
import { simLogin } from "./simApi";
import { PseudoQr, SimModal, simBtnPrimary, simBtnSecondary } from "./ui";
import { TEST_USERS, type TestUser, fullName, initials } from "./users";

const QR_TTL_S = 120;
type Step = { kind: "qr"; note?: string } | { kind: "confirm"; user: TestUser; code: string } | { kind: "loading"; user: TestUser } | { kind: "done"; user: TestUser };

function Avatar({ u, size = "h-9 w-9 text-sm" }: { u: TestUser; size?: string }) {
  return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-800 ${size}`}>{initials(u)}</span>;
}

function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section aria-label={label} className="mx-auto w-full max-w-[17rem] rounded-[2rem] border-4 border-zinc-800 bg-zinc-800 p-1.5 shadow-lg">
      <div className="rounded-[1.6rem] bg-zinc-50 px-3 pb-4 pt-2">
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-zinc-300" />
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Telefon (symulacja)</p>
        {children}
      </div>
    </section>
  );
}

export function LoginDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: (u: TestUser) => void }) {
  const [step, setStep] = useState<Step>({ kind: "qr" });
  const [seed, setSeed] = useState(1);
  const [left, setLeft] = useState(QR_TTL_S);

  useEffect(() => {
    if (step.kind !== "qr") return;
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) { setSeed((x) => x + 1); return QR_TTL_S; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [step.kind]);

  useEffect(() => {
    if (step.kind !== "done") return;
    const t = setTimeout(() => onSuccess(step.user), 1400);
    return () => clearTimeout(t);
  }, [step, onSuccess]);

  const scan = (user: TestUser) => {
    const code = String(1000 + ((seed * 7919 + user.id.length * 104729) % 9000));
    setStep({ kind: "confirm", user, code });
  };
  const confirm = async (user: TestUser) => {
    setStep({ kind: "loading", user });
    await simLogin(user.id);
    setStep({ kind: "done", user });
  };
  const reject = () => { setStep({ kind: "qr", note: "Logowanie odrzucone w aplikacji. Możesz zeskanować kod ponownie." }); setLeft(QR_TTL_S); setSeed((x) => x + 1); };
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <SimModal title="Logowanie aplikacją mobilną (symulacja)" integration="logowaniem przez aplikację mObywatel (węzeł krajowy)" onClose={onClose} wide>
      <p aria-live="polite" className="sr-only">
        {step.kind === "confirm" ? `Zeskanowano kod. Kod weryfikacyjny ${step.code.split("").join(" ")}. Potwierdź w telefonie.` :
          step.kind === "loading" ? "Trwa logowanie" : step.kind === "done" ? `Zalogowano jako ${fullName(step.user)}` : ""}
      </p>

      {step.kind === "qr" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <ol className="space-y-1 text-sm text-zinc-700">
              <li><span className="font-semibold">1.</span> Otwórz aplikację na telefonie.</li>
              <li><span className="font-semibold">2.</span> Wybierz opcję „Zeskanuj kod QR”.</li>
              <li><span className="font-semibold">3.</span> Skieruj aparat na kod i potwierdź logowanie.</li>
            </ol>
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <PseudoQr seed={`ppr-login-${seed}`} />
              <p className="text-xs text-zinc-600">Kod wygaśnie za <span className="font-mono font-semibold text-zinc-900">{mmss}</span></p>
              <button type="button" onClick={() => { setSeed((x) => x + 1); setLeft(QR_TTL_S); }} className="text-xs font-medium text-zinc-800 underline underline-offset-2">
                Wygeneruj nowy kod
              </button>
            </div>
            {step.note && <p role="status" className="mt-3 rounded-md bg-zinc-100 p-2 text-xs text-zinc-800">{step.note}</p>}
          </div>
          <Phone label="Symulowany telefon — wybierz konto testowe">
            <p className="mb-2 text-center text-xs text-zinc-700">Zeskanuj kod jako użytkownik testowy:</p>
            <ul className="space-y-2">
              {TEST_USERS.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => scan(u)}
                    className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 text-left hover:border-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900">
                    <Avatar u={u} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-zinc-900">{fullName(u)}</span>
                      <span className="block text-[11px] leading-tight text-zinc-600">{u.persona}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Phone>
        </div>
      )}

      {(step.kind === "confirm" || step.kind === "loading") && (
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div className="text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Kod zeskanowany. Potwierdź logowanie w telefonie.</p>
            <p className="mt-2">Sprawdź, czy kod w aplikacji jest taki sam jak tutaj:</p>
            <p className="mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-zinc-900" aria-label={`Kod weryfikacyjny ${step.kind === "confirm" ? step.code : ""}`}>
              {step.kind === "confirm" ? step.code : "····"}
            </p>
            <button type="button" onClick={reject} disabled={step.kind === "loading"} className={`${simBtnSecondary} mt-5`}>Anuluj i wróć do kodu QR</button>
          </div>
          <Phone label="Symulowany telefon — prośba o potwierdzenie">
            <div className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <div className="flex items-center gap-2"><Avatar u={step.user} size="h-8 w-8 text-xs" /><span className="font-semibold">{fullName(step.user)}</span></div>
              <p className="mt-3 text-xs text-zinc-600">Prośba o zalogowanie do serwisu:</p>
              <p className="font-semibold text-zinc-900">Przewodnik Przyszłego Rodzica</p>
              <p className="mt-2 text-xs text-zinc-600">Kod weryfikacyjny</p>
              <p className="font-mono text-2xl font-bold tracking-[0.25em]">{step.kind === "confirm" ? step.code : "····"}</p>
              <p className="mt-2 text-xs text-zinc-600">Serwis otrzyma: imię i nazwisko oraz identyfikator konta testowego.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={reject} disabled={step.kind === "loading"} className={simBtnSecondary}>Odrzuć</button>
                <button type="button" onClick={() => confirm(step.user)} disabled={step.kind === "loading"} className={simBtnPrimary}>
                  {step.kind === "loading" ? "…" : "Potwierdź"}
                </button>
              </div>
            </div>
          </Phone>
        </div>
      )}

      {step.kind === "done" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white">✓</span>
          <p className="text-lg font-semibold text-zinc-900">Zalogowano jako {fullName(step.user)}</p>
          <p className="text-sm text-zinc-600">Konto testowe: {step.user.persona.toLowerCase()}. Wracamy do serwisu…</p>
          <button type="button" onClick={() => onSuccess(step.user)} className={simBtnPrimary}>Przejdź dalej</button>
        </div>
      )}
    </SimModal>
  );
}
