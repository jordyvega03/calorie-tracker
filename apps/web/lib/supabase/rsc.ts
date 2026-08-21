import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para usar en Server Components, Server Actions y Route Handlers
// que actúan EN NOMBRE del usuario logueado (lee la sesión de las cookies).
// A diferencia de server.ts (service role), este respeta RLS.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar si se llama desde un Server Component:
            // el middleware ya se encarga de refrescar la sesión en cada request.
          }
        },
      },
    }
  );
}
