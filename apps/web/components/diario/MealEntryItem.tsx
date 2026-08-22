"use client";

import { useState } from "react";
import { updateMealEntry, deleteMealEntry } from "@/app/(dashboard)/diario/actions";
import { inputClass, primaryButtonClass } from "@/lib/utils/styles";
import type { MealEntry } from "@/types/database";

function aNumero(valor: string) {
  return Number(valor) || 0;
}

export default function MealEntryItem({ entry }: { entry: MealEntry }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(entry.nombre_libre ?? "");
  const [gramos, setGramos] = useState(String(entry.cantidad_gramos));
  const [calorias, setCalorias] = useState(String(entry.calorias));
  const [proteina, setProteina] = useState(String(entry.proteina ?? 0));
  const [carbos, setCarbos] = useState(String(entry.carbos ?? 0));
  const [grasas, setGrasas] = useState(String(entry.grasas ?? 0));
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Densidad nutricional del registro original (por gramo), para recalcular
  // calorías/macros en vivo cuando el usuario cambia la cantidad.
  const gramosBase = entry.cantidad_gramos || 1;
  const densidad = {
    calorias: entry.calorias / gramosBase,
    proteina: (entry.proteina ?? 0) / gramosBase,
    carbos: (entry.carbos ?? 0) / gramosBase,
    grasas: (entry.grasas ?? 0) / gramosBase,
  };

  function cambiarGramos(valor: string) {
    setGramos(valor);
    const g = aNumero(valor);
    setCalorias(String(Math.round(densidad.calorias * g)));
    setProteina(String(Math.round(densidad.proteina * g)));
    setCarbos(String(Math.round(densidad.carbos * g)));
    setGrasas(String(Math.round(densidad.grasas * g)));
  }

  function cancelar() {
    setEditando(false);
    setError(null);
    setNombre(entry.nombre_libre ?? "");
    setGramos(String(entry.cantidad_gramos));
    setCalorias(String(entry.calorias));
    setProteina(String(entry.proteina ?? 0));
    setCarbos(String(entry.carbos ?? 0));
    setGrasas(String(entry.grasas ?? 0));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await updateMealEntry(entry.id, {
        nombre,
        cantidadGramos: aNumero(gramos),
        calorias: aNumero(calorias),
        proteina: aNumero(proteina),
        carbos: aNumero(carbos),
        grasas: aNumero(grasas),
      });
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    setEliminando(true);
    setError(null);
    try {
      await deleteMealEntry(entry.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando");
      setEliminando(false);
    }
  }

  if (!editando) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 text-left text-sm transition-all duration-300 hover:bg-stone-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
        >
          <span className="leading-relaxed text-slate-700 dark:text-slate-300">
            {entry.nombre_libre}{" "}
            <span className="text-slate-400">
              — {entry.cantidad_gramos}g — {entry.calorias} kcal
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Editar
          </span>
        </button>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-xl border border-emerald-200 bg-stone-50 p-3 dark:border-emerald-900/50 dark:bg-slate-800/60">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Alimento"
        aria-label="Alimento"
        className={`w-full ${inputClass}`}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input
          type="number"
          step="any"
          value={gramos}
          onChange={(e) => cambiarGramos(e.target.value)}
          placeholder="Gramos"
          aria-label="Cantidad en gramos"
          className={inputClass}
        />
        <input
          type="number"
          step="any"
          value={calorias}
          onChange={(e) => setCalorias(e.target.value)}
          placeholder="Calorías"
          aria-label="Calorías"
          className={inputClass}
        />
        <input
          type="number"
          step="any"
          value={proteina}
          onChange={(e) => setProteina(e.target.value)}
          placeholder="Proteína (g)"
          aria-label="Proteína en gramos"
          className={inputClass}
        />
        <input
          type="number"
          step="any"
          value={carbos}
          onChange={(e) => setCarbos(e.target.value)}
          placeholder="Carbos (g)"
          aria-label="Carbohidratos en gramos"
          className={inputClass}
        />
        <input
          type="number"
          step="any"
          value={grasas}
          onChange={(e) => setGrasas(e.target.value)}
          placeholder="Grasas (g)"
          aria-label="Grasas en gramos"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={eliminar}
          disabled={eliminando}
          className="text-xs font-medium text-red-500 transition-all duration-300 hover:text-red-600 disabled:opacity-50"
        >
          {eliminando ? "Eliminando..." : "Eliminar alimento"}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelar}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-300 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className={`px-3 py-1.5 text-xs ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </li>
  );
}
