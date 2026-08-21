import Link from "next/link";
import { createClient } from "@/lib/supabase/rsc";
import { logout } from "./actions";

const NAV_LINKS = [
  { href: "/diario", label: "Diario" },
  { href: "/entrenamientos", label: "Entrenamientos" },
  { href: "/reportes", label: "Reportes" },
  { href: "/perfil", label: "Perfil" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-1.5 font-medium text-slate-600 transition-all duration-300 hover:bg-stone-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-400 sm:inline dark:text-slate-500">
              {user?.email}
            </span>
            <form action={logout}>
              <button className="rounded-xl px-3 py-1.5 font-medium text-red-600 transition-all duration-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
