"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/rsc";

export async function upsertProfile(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: (formData.get("full_name") as string) || null,
    sexo: (formData.get("sexo") as string) || null,
    fecha_nacimiento: (formData.get("fecha_nacimiento") as string) || null,
    altura_cm: Number(formData.get("altura_cm")) || null,
    peso_kg: Number(formData.get("peso_kg")) || null,
    objetivo_calorico_diario: Number(formData.get("objetivo_calorico_diario")) || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/perfil");
}
