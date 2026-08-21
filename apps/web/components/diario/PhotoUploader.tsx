"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/utils/image";
import { addMealEntriesFromPhoto } from "@/app/(dashboard)/diario/actions";
import { inputClass, primaryButtonClass } from "@/lib/utils/styles";
import type { TipoComida } from "@/types/database";

type Modo = "plato" | "etiqueta";

type Item = {
  nombre: string;
  cantidad_gramos: number;
  calorias: number;
  proteina: number;
  carbos: number;
  grasas: number;
  incluir: boolean;
};

const TIPOS: { value: TipoComida; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

function itemVacio(): Item {
  return {
    nombre: "",
    cantidad_gramos: 0,
    calorias: 0,
    proteina: 0,
    carbos: 0,
    grasas: 0,
    incluir: true,
  };
}

export default function PhotoUploader() {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>("plato");
  const [tipoComida, setTipoComida] = useState<TipoComida>("desayuno");
  const [file, setFile] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function reset() {
    setFile(null);
    setItems(null);
    setError(null);
    setFotoUrl(null);
  }

  async function analizar() {
    if (!file) return;
    setCargando(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No autenticado");

      const blob = await compressImage(file);
      const path = `${session.user.id}/${crypto.randomUUID()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(path, blob, { contentType: "image/webp" });
      if (uploadError) throw new Error(uploadError.message);

      const endpoint = modo === "plato" ? "/api/analyze-meal-photo" : "/api/analyze-label";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ storagePath: path, mimeType: "image/webp" }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error analizando la imagen");

      // El bucket es privado: guardamos el path de storage (no una URL pública,
      // que no funcionaría). Para mostrar la foto luego habría que generar un
      // signed URL bajo demanda.
      setFotoUrl(path);

      if (modo === "plato") {
        const alimentos = body.resultado.alimentos as {
          nombre: string;
          cantidad_gramos: number;
          calorias: number;
          proteina_g: number;
          carbos_g: number;
          grasas_g: number;
        }[];
        setItems(
          alimentos.map((a) => ({
            nombre: a.nombre,
            cantidad_gramos: a.cantidad_gramos,
            calorias: a.calorias,
            proteina: a.proteina_g,
            carbos: a.carbos_g,
            grasas: a.grasas_g,
            incluir: true,
          }))
        );
      } else {
        const r = body.resultado as {
          nombre_producto: string | null;
          tamano_porcion_g: number | null;
          calorias_por_porcion: number;
          proteina_g: number;
          carbos_g: number;
          grasas_g: number;
        };
        setItems([
          {
            nombre: r.nombre_producto ?? "Producto",
            cantidad_gramos: r.tamano_porcion_g ?? 0,
            calorias: r.calorias_por_porcion,
            proteina: r.proteina_g,
            carbos: r.carbos_g,
            grasas: r.grasas_g,
            incluir: true,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  function actualizarItem(i: number, campo: keyof Item, valor: string | boolean) {
    if (!items) return;
    const esNumerico = campo !== "nombre" && campo !== "incluir";
    const copia = [...items];
    copia[i] = {
      ...copia[i],
      [campo]: esNumerico ? Number(valor) : valor,
    } as Item;
    setItems(copia);
  }

  async function guardar() {
    if (!items) return;
    setGuardando(true);
    setError(null);
    try {
      await addMealEntriesFromPhoto({
        tipoComida,
        origen: modo === "plato" ? "foto_plato" : "foto_etiqueta",
        fotoUrl,
        items: items
          .filter((i) => i.incluir)
          .map(({ incluir, ...rest }) => rest),
      });
      setAbierto(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className={`w-full ${primaryButtonClass}`}
      >
        Agregar con foto (IA)
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900 dark:text-white">Agregar con foto (IA)</h2>
        <button
          onClick={() => {
            setAbierto(false);
            reset();
          }}
          className="text-xs font-medium text-slate-400 transition-all duration-300 hover:text-slate-600 dark:hover:text-slate-200"
        >
          Cerrar
        </button>
      </div>

      {!items && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["plato", "etiqueta"] as Modo[]).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-all duration-300 ${
                  modo === m
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-stone-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {m === "plato" ? "Foto del plato" : "Foto de etiqueta"}
              </button>
            ))}
          </div>

          <select
            value={tipoComida}
            onChange={(e) => setTipoComida(e.target.value as TipoComida)}
            aria-label="Tipo de comida"
            className={inputClass + " w-full"}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label={modo === "plato" ? "Foto del plato" : "Foto de la etiqueta nutricional"}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 file:transition-all file:duration-300 hover:file:bg-stone-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200"
          />

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            onClick={analizar}
            disabled={!file || cargando}
            className={`w-full ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {cargando ? "Analizando..." : "Analizar foto"}
          </button>
        </div>
      )}

      {items && (
        <div className="space-y-3">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <ul className="space-y-3">
            {items.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={item.incluir}
                    onChange={(e) => actualizarItem(i, "incluir", e.target.checked)}
                  />
                  Incluir en el diario
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <input
                    value={item.nombre}
                    onChange={(e) => actualizarItem(i, "nombre", e.target.value)}
                    placeholder="Alimento"
                    aria-label="Alimento"
                    className={`col-span-2 sm:col-span-3 ${inputClass}`}
                  />
                  <input
                    type="number"
                    value={item.cantidad_gramos}
                    onChange={(e) => actualizarItem(i, "cantidad_gramos", e.target.value)}
                    placeholder="Gramos"
                    aria-label="Cantidad en gramos"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={item.calorias}
                    onChange={(e) => actualizarItem(i, "calorias", e.target.value)}
                    placeholder="Calorías"
                    aria-label="Calorías"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={item.proteina}
                    onChange={(e) => actualizarItem(i, "proteina", e.target.value)}
                    placeholder="Proteína (g)"
                    aria-label="Proteína en gramos"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={item.carbos}
                    onChange={(e) => actualizarItem(i, "carbos", e.target.value)}
                    placeholder="Carbos (g)"
                    aria-label="Carbohidratos en gramos"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={item.grasas}
                    onChange={(e) => actualizarItem(i, "grasas", e.target.value)}
                    placeholder="Grasas (g)"
                    aria-label="Grasas en gramos"
                    className={inputClass}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Descartar
            </button>
            <button
              onClick={guardar}
              disabled={guardando || items.every((i) => !i.incluir)}
              className={`flex-1 ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {guardando ? "Guardando..." : "Guardar en el diario"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
