"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), [ready, setReady] = useState(false);
  useEffect(() => {
    if (pathname === "/sign-in") return;
    let cancelled = false;
    const original = window.fetch.bind(window);
    const changed = (event: StorageEvent) => { if (event.key === "safehome:auth-change") window.location.assign("/sign-in"); };
    window.addEventListener("storage", changed);
    original("/api/auth/me", { cache: "no-store" }).then(async response => {
      if (!response.ok) { window.location.replace("/sign-in"); return; }
      const { account } = await response.json(); if (cancelled) return;
      window.fetch = async (input, init) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
        if (url.origin !== location.origin || !url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/auth/")) return original(input, init);
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        headers.set("X-SafeHome-Account", account.id);
        const result = await original(input, { ...init, headers });
        if (result.status === 401 || result.headers.get("X-SafeHome-Account-Changed") === "1") window.location.assign("/sign-in");
        return result;
      };
      setReady(true);
    }).catch(() => { if (!cancelled) window.location.replace("/sign-in"); });
    return () => { cancelled = true; window.fetch = original; window.removeEventListener("storage", changed); };
  }, [pathname === "/sign-in"]);
  if (pathname === "/sign-in") return <>{children}</>;
  if (!ready) return <div className="p-8 text-sm text-slate-600">Đang mở hồ sơ gia đình…</div>;
  return <><AppHeader /><div className="flex flex-1 overflow-hidden"><AppSidebar /><main className="flex-1 overflow-y-auto">{children}</main></div></>;
}
