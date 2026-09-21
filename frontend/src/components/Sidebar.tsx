"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isDashboard = pathname === "/dashboard";

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between bg-[var(--color-chrome)] px-4 py-5 text-white">
      <div>
        <div className="mb-8 px-2">
          <span className="text-lg font-semibold tracking-tight">TaskFlow</span>
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isDashboard ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Dashboard
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10 px-2 pt-4">
        <p className="truncate text-sm font-medium text-white">{user?.name}</p>
        <p className="truncate text-xs text-white/50">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-3 text-sm font-medium text-white/70 hover:text-white"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
