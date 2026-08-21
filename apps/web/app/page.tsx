import { redirect } from "next/navigation";

export default function Home() {
  // TODO: si hay sesión activa, redirigir a /diario; si no, a /login.
  redirect("/diario");
}
