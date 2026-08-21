import { createClient } from "@/lib/supabase/rsc";
import { upsertProfile } from "./actions";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/utils/styles";
import type { Profile } from "@/types/database";

export default async function PerfilPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .maybeSingle();

  const profile = data as Profile | null;

  return (
    <div className="mx-auto max-w-md space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Perfil</h1>

      <section className={cardClass}>
        <form action={upsertProfile} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="full_name"
            aria-label="Nombre completo"
            placeholder="Nombre completo"
            defaultValue={profile?.full_name ?? ""}
            className={`col-span-1 sm:col-span-2 ${inputClass}`}
          />
          <select
            name="sexo"
            aria-label="Sexo"
            defaultValue={profile?.sexo ?? ""}
            className={inputClass}
          >
            <option value="">Sexo</option>
            <option value="m">Masculino</option>
            <option value="f">Femenino</option>
            <option value="otro">Otro</option>
          </select>
          <input
            name="fecha_nacimiento"
            type="date"
            aria-label="Fecha de nacimiento"
            defaultValue={profile?.fecha_nacimiento ?? ""}
            className={inputClass}
          />
          <input
            name="altura_cm"
            type="number"
            step="any"
            aria-label="Altura en centímetros"
            placeholder="Altura (cm)"
            defaultValue={profile?.altura_cm ?? ""}
            className={inputClass}
          />
          <input
            name="peso_kg"
            type="number"
            step="any"
            aria-label="Peso en kilogramos"
            placeholder="Peso (kg)"
            defaultValue={profile?.peso_kg ?? ""}
            className={inputClass}
          />
          <input
            name="objetivo_calorico_diario"
            type="number"
            step="any"
            aria-label="Objetivo calórico diario"
            placeholder="Objetivo calórico diario"
            defaultValue={profile?.objetivo_calorico_diario ?? ""}
            className={`col-span-1 sm:col-span-2 ${inputClass}`}
          />
          <button className={`col-span-1 sm:col-span-2 ${primaryButtonClass}`}>Guardar</button>
        </form>
      </section>
    </div>
  );
}
