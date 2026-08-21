import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente para usar en Route Handlers que actúan en nombre del usuario que
// hizo la request (recibe el JWT en el header Authorization). A diferencia
// de server.ts (service role), respeta RLS: solo puede leer/escribir lo que
// el propio usuario podría vía RLS.
export function createRouteClient(authHeader: string | null) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    }
  );
}
