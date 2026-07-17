"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Galaxy Map" },
  { href: "/log", label: "Journey Log" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-10">
      <Link
        href="/"
        className="pointer-events-auto text-sm font-semibold uppercase tracking-[0.35em] text-slate-200 transition-colors hover:text-glow-gold"
      >
        Focus&nbsp;Flight
      </Link>
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-xl">
        {LINKS.map((l) => {
          const active =
            pathname === l.href || pathname === `${l.href}/`;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                active
                  ? "bg-white/10 text-glow-gold"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
