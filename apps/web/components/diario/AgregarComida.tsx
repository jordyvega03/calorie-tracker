"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/utils/image";
import {
  addMealEntriesDesdeIA,
  analizarDescripcionComida,
} from "@/app/(dashboard)/diario/actions";
import { inputClass, primaryButtonClass } from "@/lib/utils/styles";
import type { TipoComida, UnidadMedida } from "@/types/database";

type ModoEntrada = "foto" | "texto";
type ModoFoto = "plato" | "etiqueta";

type Item = {
  nombre: string;
  cantidad_gramos: number;
  calorias: number;
  proteina: number;
  carbos: number;
  grasas: number;
  unidad_medida: UnidadMedida;
  gramos_por_unidad: number | null;
  incluir: boolean;
};

function redondear2(valor: number) {
  return Math.round(valor * 100) / 100;
}

const TIPOS: { value: TipoComida; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

export default function AgregarComida() {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<ModoEntrada | null>(null);
  const [modoFoto, setModoFoto] = useState<ModoFoto>("plato");
  const [tipoComida, setTipoComida] = useState<TipoComida>("desayuno");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  // object URL de la vista previa: se crea al elegir foto y se libera al
  // cambiarla/cerrarla, para no ir acumulando memoria.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function elegirArchivo(f: File | null) {
    setFile(f);
    setError(null);
  }

  function reset() {
    setModo(null);
    setFile(null);
    setDescripcion("");
    setItems(null);
    setError(null);
    setFotoUrl(null);
    if (inputCamaraRef.current) inputCamaraRef.current.value = "";
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
  }

  async function analizarFoto() {
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

      const endpoint = modoFoto === "plato" ? "/api/analyze-meal-photo" : "/api/analyze-label";
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

      if (modoFoto === "plato") {
        const alimentos = body.resultado.alimentos as {
          nombre: string;
          cantidad_gramos: number;
          calorias: number;
          proteina_g: number;
          carbos_g: number;
          grasas_g: number;
          unidad_medida: UnidadMedida;
          gramos_por_unidad: number | null;
        }[];
        setItems(
          alimentos.map((a) => ({
            nombre: a.nombre,
            cantidad_gramos: a.cantidad_gramos,
            calorias: a.calorias,
            proteina: a.proteina_g,
            carbos: a.carbos_g,
            grasas: a.grasas_g,
            unidad_medida: a.unidad_medida,
            gramos_por_unidad: a.gramos_por_unidad,
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
            unidad_medida: "gramos",
            gramos_por_unidad: null,
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

  async function analizarTexto() {
    if (!descripcion.trim()) return;
    setCargando(true);
    setError(null);

    try {
      const resultado = await analizarDescripcionComida(descripcion);
      setItems(resultado.map((i) => ({ ...i, incluir: true })));
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

  // La cantidad se edita en la unidad natural del alimento (gramos, o
  // unidades si es algo que se cuenta por piezas como huevo/uva) y las
  // calorías/macros se reescalan a partir de la densidad actual del ítem,
  // igual que al editar una entrada ya guardada del diario.
  function actualizarCantidad(i: number, valorMostrado: string) {
    if (!items) return;
    const item = items[i];
    const gramosAnteriores = item.cantidad_gramos || 1;
    const densidad = {
      calorias: item.calorias / gramosAnteriores,
      proteina: item.proteina / gramosAnteriores,
      carbos: item.carbos / gramosAnteriores,
      grasas: item.grasas / gramosAnteriores,
    };

    const valor = Number(valorMostrado) || 0;
    const nuevosGramos =
      item.unidad_medida === "unidad" && item.gramos_por_unidad
        ? valor * item.gramos_por_unidad
        : valor;

    const copia = [...items];
    copia[i] = {
      ...item,
      cantidad_gramos: nuevosGramos,
      calorias: Math.round(densidad.calorias * nuevosGramos),
      proteina: Math.round(densidad.proteina * nuevosGramos),
      carbos: Math.round(densidad.carbos * nuevosGramos),
      grasas: Math.round(densidad.grasas * nuevosGramos),
    };
    setItems(copia);
  }

  async function guardar() {
    if (!items) return;
    setGuardando(true);
    setError(null);
    try {
      await addMealEntriesDesdeIA({
        tipoComida,
        origen: modo === "foto" ? (modoFoto === "plato" ? "foto_plato" : "foto_etiqueta") : "texto_ia",
        fotoUrl,
        items: items.filter((i) => i.incluir).map(({ incluir, ...rest }) => rest),
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
      <button onClick={() => setAbierto(true)} className={`w-full ${primaryButtonClass}`}>
        Agregar alimento
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900 dark:text-white">Agregar alimento</h2>
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

      {!items && modo === null && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setModo("foto")}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 py-6 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9a2 2 0 0 1 2-2h1.5l1-1.5h9l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"
              />
              <circle cx="12" cy="13.5" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Escaneo por foto
          </button>
          <button
            type="button"
            onClick={() => setModo("texto")}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 py-6 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5l3 3" />
            </svg>
            Describir lo que comí
          </button>
        </div>
      )}

      {!items && modo !== null && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setModo(null);
              setError(null);
            }}
            className="text-xs font-medium text-slate-400 transition-all duration-300 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ← Cambiar forma de agregar
          </button>

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

          {modo === "foto" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["plato", "etiqueta"] as ModoFoto[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModoFoto(m)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-all duration-300 ${
                      modoFoto === m
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-stone-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    {m === "plato" ? "Foto del plato" : "Foto de etiqueta"}
                  </button>
                ))}
              </div>

              {/* Dos inputs ocultos separados: uno fuerza la cámara (capture),
                  el otro abre la galería (sin capture). Confiar en un solo
                  input con `capture` es inconsistente entre navegadores/SO —
                  Android suele saltar directo a cámara e ignorar la galería. */}
              <input
                ref={inputCamaraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              />
              <input
                ref={inputGaleriaRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              />

              {!file && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => inputCamaraRef.current?.click()}
                    aria-label={`Tomar foto ${modoFoto === "plato" ? "del plato" : "de la etiqueta"}`}
                    className="flex flex-col items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 py-6 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 9a2 2 0 0 1 2-2h1.5l1-1.5h9l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"
                      />
                      <circle cx="12" cy="13.5" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Tomar foto
                  </button>
                  <button
                    type="button"
                    onClick={() => inputGaleriaRef.current?.click()}
                    aria-label={`Elegir de la galería una foto ${modoFoto === "plato" ? "del plato" : "de la etiqueta"}`}
                    className="flex flex-col items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 py-6 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
                      <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3 16 5-5 4 4 3-3 6 6" />
                      <circle cx="8" cy="9" r="1.5" />
                    </svg>
                    Elegir de galería
                  </button>
                </div>
              )}

              {file && previewUrl && (
                <div className="relative overflow-hidden rounded-xl border border-stone-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Vista previa" className="h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => elegirArchivo(null)}
                    aria-label="Quitar foto"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-all duration-300 hover:bg-black/80"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <button
                onClick={analizarFoto}
                disabled={!file || cargando}
                className={`w-full ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {cargando ? "Analizando..." : "Analizar foto"}
              </button>
            </div>
          )}

          {modo === "texto" && (
            <div className="space-y-3">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. 2 huevos revueltos con media taza de frijol, 1 cucharada de queso fresco y 1 taza de café"
                aria-label="Descripción de la comida"
                rows={3}
                className={inputClass + " w-full resize-none"}
              />

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <button
                onClick={analizarTexto}
                disabled={!descripcion.trim() || cargando}
                className={`w-full ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {cargando ? "Interpretando..." : "Analizar descripción"}
              </button>
            </div>
          )}
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
                    step="any"
                    value={
                      item.unidad_medida === "unidad" && item.gramos_por_unidad
                        ? redondear2(item.cantidad_gramos / item.gramos_por_unidad)
                        : item.cantidad_gramos
                    }
                    onChange={(e) => actualizarCantidad(i, e.target.value)}
                    placeholder={item.unidad_medida === "unidad" ? "Unidades" : "Gramos"}
                    aria-label={
                      item.unidad_medida === "unidad" ? "Cantidad en unidades" : "Cantidad en gramos"
                    }
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

          <p className="text-right text-sm font-medium text-slate-500 dark:text-slate-400">
            Total:{" "}
            <span className="text-slate-900 dark:text-white">
              {items.filter((i) => i.incluir).reduce((sum, i) => sum + Number(i.calorias), 0)} kcal
            </span>
          </p>

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
