import { login, signup } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-50 to-stone-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-stone-200/70 bg-white p-8 shadow-xl shadow-stone-200/50 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 sm:p-10">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Calorie Tracker
          </h1>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Registra tus comidas y entrenamientos
          </p>
        </div>

        {searchParams.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {searchParams.error}
          </p>
        )}
        {searchParams.message && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            {searchParams.message}
          </p>
        )}

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              formAction={login}
              className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-300 hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              Iniciar sesión
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:border-slate-400 hover:bg-stone-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Crear cuenta
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
