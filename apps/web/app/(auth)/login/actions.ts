"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/rsc";

export async function login(formData: FormData) {
  const supabase = createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/diario");
}

export async function signup(formData: FormData) {
  const supabase = createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Si el proyecto de Supabase tiene "Confirm email" activado (default),
  // no hay sesión hasta que el usuario confirme por correo.
  if (!data.session) {
    redirect(`/login?message=${encodeURIComponent("Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.")}`);
  }

  revalidatePath("/", "layout");
  redirect("/diario");
}
