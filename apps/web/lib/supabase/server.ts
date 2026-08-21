import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente para usar SOLO dentro de API routes (server-side).
// Usa la service role key: bypassa RLS, nunca debe llegar al navegador.
// TODO: tipar con `Database` una vez se corra `supabase gen types` sobre el schema real.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
