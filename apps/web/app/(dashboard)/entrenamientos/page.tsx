import { createClient } from "@/lib/supabase/rsc";
import { addWorkout, deleteWorkout } from "./actions";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/utils/styles";
import type { Workout } from "@/types/database";

export default async function EntrenamientosPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("workouts")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(30);

  const workouts = (data ?? []) as Workout[];

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Entrenamientos
      </h1>

      <section className={cardClass}>
        <ul className="space-y-2">
          {workouts.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5 text-sm transition-all duration-300 hover:bg-stone-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
            >
              <span className="leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">{w.nombre}</span>{" "}
                <span className="text-slate-400">
                  — {w.tipo} — {w.fecha} — {w.duracion_min ?? 0} min — {w.calorias_quemadas ?? 0}{" "}
                  kcal
                </span>
              </span>
              <form action={deleteWorkout.bind(null, w.id)}>
                <button className="shrink-0 text-xs font-medium text-red-500 transition-all duration-300 hover:text-red-600">
                  Eliminar
                </button>
              </form>
            </li>
          ))}
          {workouts.length === 0 && (
            <li className="rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
              Sin entrenamientos registrados
            </li>
          )}
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className="mb-4 font-medium text-slate-900 dark:text-white">Registrar entrenamiento</h2>
        <form
          key={workouts.length}
          action={addWorkout}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input
            name="nombre"
            aria-label="Nombre del entrenamiento"
            placeholder="Nombre (ej. Pierna, Correr)"
            required
            className={`col-span-1 sm:col-span-2 ${inputClass}`}
          />
          <select name="tipo" aria-label="Tipo de entrenamiento" required className={inputClass}>
            <option value="cardio">Cardio</option>
            <option value="fuerza">Fuerza</option>
            <option value="otro">Otro</option>
          </select>
          <input
            name="duracion_min"
            type="number"
            step="any"
            aria-label="Duración en minutos"
            placeholder="Duración (min)"
            className={inputClass}
          />
          <input
            name="calorias_quemadas"
            type="number"
            step="any"
            aria-label="Calorías quemadas"
            placeholder="Calorías quemadas"
            className={inputClass}
          />
          <input
            name="notas"
            aria-label="Notas"
            placeholder="Notas (opcional)"
            className={`col-span-1 sm:col-span-2 ${inputClass}`}
          />
          <button className={`col-span-1 sm:col-span-2 ${primaryButtonClass}`}>Guardar</button>
        </form>
      </section>
    </div>
  );
}
