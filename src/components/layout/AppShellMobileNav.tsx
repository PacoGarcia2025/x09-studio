"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: string;
  hint?: string;
};

const BOTTOM = [
  { href: "/projects", label: "Painel", icon: "▦" },
  { href: "/assets", label: "3D", icon: "◇" },
  { href: "/billing", label: "Créditos", icon: "◎" },
] as const;

function isActive(href: string, activeHref: string) {
  if (href === activeHref) return true;
  if (href === "/projects" && activeHref.startsWith("/projects")) return true;
  if (href === "/assets" && activeHref.startsWith("/assets")) return true;
  if (href === "/billing" && activeHref.startsWith("/billing")) return true;
  return false;
}

export function AppShellMobileNav({
  items,
  activeHref,
  footer,
}: {
  items: ShellNavItem[];
  activeHref: string;
  footer: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [activeHref]);

  const drawer = open ? (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Fechar menu"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-white/10 bg-[#08060f] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/projects"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/20 text-[10px] font-bold text-violet-100 ring-1 ring-violet-400/30">
              X09
            </span>
            <span className="text-sm font-semibold text-white">Studio</span>
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const active =
              isActive(item.href, activeHref) &&
              item.href !== "/projects#prompt";
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-violet-500/15 text-white ring-1 ring-violet-400/20"
                    : "text-zinc-300 hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/8 p-3">{footer}</div>
      </aside>
    </div>
  ) : null;

  const bottom = (
    <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-black/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-3">
        {BOTTOM.map((item) => {
          const active = isActive(item.href, activeHref);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? "text-white" : "text-zinc-500"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-lg text-white lg:hidden"
        aria-expanded={open}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "✕" : "☰"}
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
      {mounted ? createPortal(bottom, document.body) : null}
    </>
  );
}
