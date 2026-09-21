export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-chrome)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold tracking-tight text-white">TaskFlow</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-[var(--color-surface)] p-7 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
