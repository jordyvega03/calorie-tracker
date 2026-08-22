import { createClient } from "@/lib/supabase/rsc";
import { deleteMealEntry } from "./actions";
import { cardClass } from "@/lib/utils/styles";
import { hoyGuatemala, semanaActualGuatemala } from "@/lib/utils/date";
import AgregarComida from "@/components/diario/AgregarComida";
import SemanaTira from "@/components/diario/SemanaTira";
import type { MealEntry, TipoComida } from "@/types/database";

const TIPOS: { value: TipoComida; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: { fecha?: string };
}) {
  const supabase = createClient();

  const hoy = hoyGuatemala();
  const fecha = searchParams.fecha && FECHA_VALIDA.test(searchParams.fecha) ? searchParams.fecha : hoy;
  const esHoy = fecha === hoy;
  const semana = semanaActualGuatemala();

  const [{ data }, { data: semanaData }] = await Promise.all([
    supabase.from("meal_entries").select("*").eq("fecha", fecha).order("hora", { ascending: true }),
    supabase.from("meal_entries").select("fecha").in("fecha", semana),
  ]);

  const entries = (data ?? []) as MealEntry[];
  const totalCalorias = entries.reduce((sum, e) => sum + Number(e.calorias), 0);
  const diasConDatos = new Set((semanaData ?? []).map((r) => r.fecha as string));
  const tiposConDatos = TIPOS.filter((t) => entries.some((e) => e.tipo_comida === t.value));

  return (
    <div className="space-y-10">
      <SemanaTira
        dias={semana}
        fechaSeleccionada={fecha}
        fechaHoy={hoy}
        diasConDatos={diasConDatos}
        mesParaVerMas={fecha.slice(0, 7)}
      />

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {esHoy ? "Diario de hoy" : "Diario"}
          </h1>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{fecha}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-right dark:bg-emerald-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Total del día
          </p>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {totalCalorias} kcal
          </p>
        </div>
      </div>

      {tiposConDatos.length === 0 ? (
        <div className={`${cardClass} text-center text-sm text-slate-400`}>
          Nada registrado {esHoy ? "todavía hoy" : "este día"}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tiposConDatos.map(({ value, label }) => {
            const items = entries.filter((e) => e.tipo_comida === value);
            const subtotal = items.reduce((sum, e) => sum + Number(e.calorias), 0);
            return (
              <section key={value} className={cardClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-medium text-slate-900 dark:text-white">{label}</h2>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {subtotal} kcal
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 text-sm transition-all duration-300 hover:bg-stone-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                    >
                      <span className="leading-relaxed text-slate-700 dark:text-slate-300">
                        {e.nombre_libre}{" "}
                        <span className="text-slate-400">
                          — {e.cantidad_gramos}g — {e.calorias} kcal
                        </span>
                      </span>
                      {esHoy && (
                        <form action={deleteMealEntry.bind(null, e.id)}>
                          <button className="shrink-0 text-xs font-medium text-red-500 transition-all duration-300 hover:text-red-600">
                            Eliminar
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {esHoy && (
        <section className={cardClass}>
          <AgregarComida />
        </section>
      )}
    </div>
  );
}
