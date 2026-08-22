"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/rsc";
import { hoyGuatemala, horaActualGuatemala } from "@/lib/utils/date";
import { analyzeTextWithGemini } from "@/lib/ai/gemini";
import type { OrigenRegistro, TipoComida } from "@/types/database";

type ItemDetectado = {
  nombre: string;
  cantidad_gramos: number;
  calorias: number;
  proteina: number;
  carbos: number;
  grasas: number;
};

type SupabaseClient = ReturnType<typeof createClient>;

// Guarda el alimento en el catálogo personal (tabla `foods`) la primera vez
// que se usa, normalizado a valores por 100g, para que el autocompletar del
// formulario manual lo encuentre después. Si ya existe uno con ese nombre
// (propio o del catálogo semilla) no se toca, para no pisar un valor bueno
// con una estimación de IA menos precisa.
async function upsertFoodIfNew(
  supabase: SupabaseClient,
  userId: string,
  item: ItemDetectado,
  fuente: "manual" | "ia_foto" | "ia_etiqueta" | "ia_texto"
) {
  if (!item.nombre.trim() || item.cantidad_gramos <= 0) return;

  const { data: existente } = await supabase
    .from("foods")
    .select("id")
    .ilike("nombre", item.nombre.trim())
    .limit(1)
    .maybeSingle();

  if (existente) return;

  const factor = 100 / item.cantidad_gramos;
  await supabase.from("foods").insert({
    nombre: item.nombre.trim(),
    calorias_100g: Math.round(item.calorias * factor),
    proteina_100g: Math.round(item.proteina * factor),
    carbos_100g: Math.round(item.carbos * factor),
    grasas_100g: Math.round(item.grasas * factor),
    fuente,
    created_by: userId,
  });
}

export async function addMealEntry(input: {
  nombre: string;
  tipoComida: TipoComida;
  cantidadGramos: number;
  calorias: number;
  proteina: number;
  carbos: number;
  grasas: number;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("meal_entries").insert({
    user_id: user.id,
    nombre_libre: input.nombre,
    tipo_comida: input.tipoComida,
    cantidad_gramos: input.cantidadGramos,
    calorias: input.calorias,
    proteina: input.proteina,
    carbos: input.carbos,
    grasas: input.grasas,
    origen: "manual",
    fecha: hoyGuatemala(),
    hora: horaActualGuatemala(),
  });

  if (error) throw new Error(error.message);

  await upsertFoodIfNew(
    supabase,
    user.id,
    {
      nombre: input.nombre,
      cantidad_gramos: input.cantidadGramos,
      calorias: input.calorias,
      proteina: input.proteina,
      carbos: input.carbos,
      grasas: input.grasas,
    },
    "manual"
  );

  revalidatePath("/diario");
}

const FUENTE_POR_ORIGEN: Record<
  Extract<OrigenRegistro, "foto_plato" | "foto_etiqueta" | "texto_ia">,
  "ia_foto" | "ia_etiqueta" | "ia_texto"
> = {
  foto_plato: "ia_foto",
  foto_etiqueta: "ia_etiqueta",
  texto_ia: "ia_texto",
};

// Guarda los alimentos que el usuario confirmó tras revisar/editar un
// resultado de la IA (foto de plato, foto de etiqueta, o descripción de
// texto). Nunca se llama directo desde la respuesta de Gemini sin pasar por
// la confirmación del usuario.
export async function addMealEntriesDesdeIA(input: {
  tipoComida: TipoComida;
  origen: Extract<OrigenRegistro, "foto_plato" | "foto_etiqueta" | "texto_ia">;
  fotoUrl: string | null;
  items: ItemDetectado[];
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (input.items.length === 0) throw new Error("No hay alimentos para guardar");

  const fecha = hoyGuatemala();
  const hora = horaActualGuatemala();

  const rows = input.items.map((item) => ({
    user_id: user.id,
    nombre_libre: item.nombre,
    tipo_comida: input.tipoComida,
    cantidad_gramos: item.cantidad_gramos,
    calorias: item.calorias,
    proteina: item.proteina,
    carbos: item.carbos,
    grasas: item.grasas,
    origen: input.origen,
    foto_url: input.fotoUrl,
    fecha,
    hora,
  }));

  const { error } = await supabase.from("meal_entries").insert(rows);
  if (error) throw new Error(error.message);

  for (const item of input.items) {
    await upsertFoodIfNew(supabase, user.id, item, FUENTE_POR_ORIGEN[input.origen]);
  }

  revalidatePath("/diario");
}

// Interpreta una descripción libre de una comida completa ("2 huevos
// revueltos con media taza de frijol...") con Gemini, y para cada alimento
// que ya está en el catálogo local (tabla `foods`) reemplaza la estimación
// de Gemini por los valores guardados — así solo se "gasta" IA en
// alimentos que de verdad son nuevos, tal como se pidió.
export async function analizarDescripcionComida(descripcion: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const texto = descripcion.trim();
  if (texto.length < 3) throw new Error("Describe al menos un alimento");

  const { alimentos } = await analyzeTextWithGemini(texto);
  if (!alimentos || alimentos.length === 0) {
    throw new Error("No pude identificar alimentos en esa descripción");
  }

  return Promise.all(
    alimentos.map(async (item) => {
      const { data: local } = await supabase
        .from("foods")
        .select("nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g")
        .ilike("nombre", item.nombre.trim())
        .limit(1)
        .maybeSingle();

      if (local) {
        const factor = item.cantidad_gramos / 100;
        return {
          nombre: local.nombre,
          cantidad_gramos: item.cantidad_gramos,
          calorias: Math.round(local.calorias_100g * factor),
          proteina: Math.round((local.proteina_100g ?? 0) * factor),
          carbos: Math.round((local.carbos_100g ?? 0) * factor),
          grasas: Math.round((local.grasas_100g ?? 0) * factor),
        };
      }

      return {
        nombre: item.nombre,
        cantidad_gramos: item.cantidad_gramos,
        calorias: item.calorias,
        proteina: item.proteina_g,
        carbos: item.carbos_g,
        grasas: item.grasas_g,
      };
    })
  );
}

export async function deleteMealEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("meal_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/diario");
}
