import { createBrowserClient } from "@supabase/ssr";

// Cliente para usar en componentes de cliente ("use client").
// Usa la anon key: seguro de exponer, la seguridad real la da RLS en Postgres.
// TODO: tipar con `Database` una vez se corra `supabase gen types` sobre el schema real.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
