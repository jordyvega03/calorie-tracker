"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/rsc";

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
