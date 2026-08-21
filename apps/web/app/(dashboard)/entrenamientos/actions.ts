"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/rsc";
import { hoyGuatemala } from "@/lib/utils/date";
import type { TipoWorkout } from "@/types/database";

export async function addWorkout(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    tipo: formData.get("tipo") as TipoWorkout,
    nombre: formData.get("nombre") as string,
    duracion_min: Number(formData.get("duracion_min") || 0),
    calorias_quemadas: Number(formData.get("calorias_quemadas") || 0),
    notas: (formData.get("notas") as string) || null,
    fecha: hoyGuatemala(),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/entrenamientos");
}

export async function deleteWorkout(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/entrenamientos");
}
