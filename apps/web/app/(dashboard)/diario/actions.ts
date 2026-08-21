"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/rsc";
import { hoyGuatemala, horaActualGuatemala } from "@/lib/utils/date";
import type { OrigenRegistro, TipoComida } from "@/types/database";

type ItemDetectado = {
  nombre: string;
  cantidad_gramos: number;
  calorias: number;
  proteina: number;
  carbos: number;
  grasas: number;
};

export async function addMealEntry(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("meal_entries").insert({
    user_id: user.id,
    nombre_libre: formData.get("nombre") as string,
    tipo_comida: formData.get("tipo_comida") as TipoComida,
    cantidad_gramos: Number(formData.get("cantidad_gramos")),
    calorias: Number(formData.get("calorias")),
    proteina: Number(formData.get("proteina") || 0),
    carbos: Number(formData.get("carbos") || 0),
    grasas: Number(formData.get("grasas") || 0),
    origen: "manual",
    fecha: hoyGuatemala(),
    hora: horaActualGuatemala(),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/diario");
}

// Guarda los alimentos que el usuario confirmó tras revisar/editar el
// resultado de la IA (foto de plato o foto de etiqueta). Nunca se llama
// directo desde la respuesta de Gemini sin pasar por la confirmación del usuario.
export async function addMealEntriesFromPhoto(input: {
  tipoComida: TipoComida;
  origen: Extract<OrigenRegistro, "foto_plato" | "foto_etiqueta">;
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
  revalidatePath("/diario");
}

export async function deleteMealEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("meal_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/diario");
}
