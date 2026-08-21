"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addMealEntry } from "@/app/(dashboard)/diario/actions";
import { inputClass, primaryButtonClass } from "@/lib/utils/styles";
import type { TipoComida } from "@/types/database";

const TIPOS: { value: TipoComida; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

type Sugerencia = {
  id: string;
  nombre: string;
  marca: string | null;
  calorias_100g: number;
  proteina_100g: number | null;
  carbos_100g: number | null;
  grasas_100g: number | null;
};

const VACIO = {
  nombre: "",
  tipoComida: "desayuno" as TipoComida,
  cantidadGramos: "",
  calorias: "",
  proteina: "",
  carbos: "",
  grasas: "",
};

export default function ManualEntryForm() {
  const [form, setForm] = useState(VACIO);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [alimentoSeleccionado, setAlimentoSeleccionado] = useState<Sugerencia | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Busca en el catálogo personal (tabla `foods`, RLS ya restringe a lo
  // propio + el catálogo semilla) mientras el usuario escribe el nombre.
  useEffect(() => {
    const query = form.nombre.trim();
    if (query.length < 2) {
      setSugerencias([]);
      return;
    }

    const id = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("foods")
        .select("id, nombre, marca, calorias_100g, proteina_100g, carbos_100g, grasas_100g")
        .ilike("nombre", `%${query}%`)
        .order("nombre")
        .limit(8);
      setSugerencias((data as Sugerencia[]) ?? []);
    }, 250);

    return () => clearTimeout(id);
  }, [form.nombre]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  function recalcularDesde(alimento: Sugerencia, gramosStr: string) {
    const gramos = Number(gramosStr) || 100;
    const factor = gramos / 100;
    setForm((f) => ({
      ...f,
      cantidadGramos: String(gramos),
      calorias: String(Math.round(alimento.calorias_100g * factor)),
      proteina: String(Math.round((alimento.proteina_100g ?? 0) * factor)),
      carbos: String(Math.round((alimento.carbos_100g ?? 0) * factor)),
      grasas: String(Math.round((alimento.grasas_100g ?? 0) * factor)),
    }));
  }

  function seleccionarSugerencia(s: Sugerencia) {
    setAlimentoSeleccionado(s);
    setForm((f) => ({ ...f, nombre: s.nombre }));
    recalcularDesde(s, form.cantidadGramos || "100");
    setMostrarSugerencias(false);
  }

  function actualizar(campo: keyof typeof VACIO, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));

    if (campo === "nombre") {
      setAlimentoSeleccionado(null);
      setMostrarSugerencias(true);
    }

    // Si hay un alimento vinculado y cambian los gramos, recalcular macros
    // en vivo. Si el usuario edita las macros a mano, se desvincula: a
    // partir de ahí los gramos ya no le pisan lo que escribió.
    if (campo === "cantidadGramos" && alimentoSeleccionado) {
      recalcularDesde(alimentoSeleccionado, valor);
      return;
    }
    if (["calorias", "proteina", "carbos", "grasas"].includes(campo)) {
      setAlimentoSeleccionado(null);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await addMealEntry({
        nombre: form.nombre,
        tipoComida: form.tipoComida,
        cantidadGramos: Number(form.cantidadGramos),
        calorias: Number(form.calorias),
        proteina: Number(form.proteina || 0),
        carbos: Number(form.carbos || 0),
        grasas: Number(form.grasas || 0),
      });
      setForm(VACIO);
      setAlimentoSeleccionado(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div ref={contenedorRef} className="relative col-span-1 sm:col-span-2">
        <input
          value={form.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
          onFocus={() => setMostrarSugerencias(true)}
          placeholder="Alimento"
          aria-label="Alimento"
          autoComplete="off"
          required
          className={inputClass + " w-full"}
        />
        {mostrarSugerencias && sugerencias.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {sugerencias.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => seleccionarSugerencia(s)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-700 transition-all duration-300 hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>
                    {s.nombre}
                    {s.marca && <span className="text-slate-400"> · {s.marca}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {s.calorias_100g} kcal/100g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <select
        value={form.tipoComida}
        onChange={(e) => actualizar("tipoComida", e.target.value)}
        aria-label="Tipo de comida"
        required
        className={inputClass}
      >
        {TIPOS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        value={form.cantidadGramos}
        onChange={(e) => actualizar("cantidadGramos", e.target.value)}
        type="number"
        step="any"
        aria-label="Cantidad en gramos"
        placeholder="Gramos"
        required
        className={inputClass}
      />
      <input
        value={form.calorias}
        onChange={(e) => actualizar("calorias", e.target.value)}
        type="number"
        step="any"
        aria-label="Calorías"
        placeholder="Calorías"
        required
        className={inputClass}
      />
      <input
        value={form.proteina}
        onChange={(e) => actualizar("proteina", e.target.value)}
        type="number"
        step="any"
        aria-label="Proteína en gramos"
        placeholder="Proteína (g)"
        className={inputClass}
      />
      <input
        value={form.carbos}
        onChange={(e) => actualizar("carbos", e.target.value)}
        type="number"
        step="any"
        aria-label="Carbohidratos en gramos"
        placeholder="Carbos (g)"
        className={inputClass}
      />
      <input
        value={form.grasas}
        onChange={(e) => actualizar("grasas", e.target.value)}
        type="number"
        step="any"
        aria-label="Grasas en gramos"
        placeholder="Grasas (g)"
        className={inputClass}
      />

      {error && (
        <p className="col-span-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 sm:col-span-2">
          {error}
        </p>
      )}

      <button
        disabled={guardando}
        className={`col-span-1 sm:col-span-2 ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
