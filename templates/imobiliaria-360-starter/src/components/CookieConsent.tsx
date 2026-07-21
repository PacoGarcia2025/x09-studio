import { useEffect, useState } from "react";

const STORAGE_KEY = "x09_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(STORAGE_KEY, "declined");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-stone-200 md:left-6 md:right-auto"
    >
      <p className="text-sm text-stone-700">
        Utilizamos cookies para melhorar sua experiência e analisar tráfego, em
        conformidade com a LGPD. Você pode aceitar ou recusar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        >
          Aceitar
        </button>
        <button
          type="button"
          onClick={decline}
          className="rounded-full px-4 py-2 text-sm text-stone-600 ring-1 ring-stone-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-stone-400"
        >
          Recusar
        </button>
      </div>
    </div>
  );
}
