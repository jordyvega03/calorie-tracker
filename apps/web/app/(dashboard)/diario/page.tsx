import { createClient } from "@/lib/supabase/rsc";
import { addMealEntry, deleteMealEntry } from "./actions";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/utils/styles";
import { hoyGuatemala } from "@/lib/utils/date";
import PhotoUploader from "@/components/diario/PhotoUploader";
import type { MealEntry, TipoComida } from "@/types/database";

const TIPOS: { value: TipoComida; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

export default async function DiarioPage() {
  const supabase = createClient();

  const hoy = hoyGuatemala();

  const { data } = await supabase
    .from("meal_entries")
    .select("*")
    .eq("fecha", hoy)
    .order("hora", { ascending: true });

  const entries = (data ?? []) as MealEntry[];
  const totalCalorias = entries.reduce((sum, e) => sum + Number(e.calorias), 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Diario de hoy
          </h1>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{hoy}</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        {TIPOS.map(({ value, label }) => {
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
                    <form action={deleteMealEntry.bind(null, e.id)}>
                      <button className="shrink-0 text-xs font-medium text-red-500 transition-all duration-300 hover:text-red-600">
                        Eliminar
                      </button>
                    </form>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="rounded-xl border border-dashed border-stone-200 px-3 py-3 text-center text-xs text-slate-400 dark:border-slate-800">
                    Nada registrado
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <section className={cardClass}>
        <PhotoUploader />
      </section>

      <section className={cardClass}>
        <h2 className="mb-4 font-medium text-slate-900 dark:text-white">Agregar manualmente</h2>
        {/* key fuerza a React a remontar el form (y vaciar los inputs) cada vez
            que la lista cambia, ya que son inputs sin controlar. */}
        <form
          key={entries.length}
          action={addMealEntry}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input
            name="nombre"
            aria-label="Alimento"
            placeholder="Alimento"
            required
            className={`col-span-1 sm:col-span-2 ${inputClass}`}
          />
          <select name="tipo_comida" aria-label="Tipo de comida" required className={inputClass}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            name="cantidad_gramos"
            type="number"
            step="any"
            aria-label="Cantidad en gramos"
            placeholder="Gramos"
            required
            className={inputClass}
          />
          <input
            name="calorias"
            type="number"
            step="any"
            aria-label="Calorías"
            placeholder="Calorías"
            required
            className={inputClass}
          />
          <input
            name="proteina"
            type="number"
            step="any"
            aria-label="Proteína en gramos"
            placeholder="Proteína (g)"
            className={inputClass}
          />
          <input
            name="carbos"
            type="number"
            step="any"
            aria-label="Carbohidratos en gramos"
            placeholder="Carbos (g)"
            className={inputClass}
          />
          <input
            name="grasas"
            type="number"
            step="any"
            aria-label="Grasas en gramos"
            placeholder="Grasas (g)"
            className={inputClass}
          />
          <button className={`col-span-1 sm:col-span-2 ${primaryButtonClass}`}>Guardar</button>
        </form>
      </section>
    </div>
  );
}
