import Link from "next/link";
import { createClient } from "@/lib/supabase/rsc";
import { ultimosNDiasGuatemala } from "@/lib/utils/date";
import ReportesCharts from "@/components/reportes/ReportesCharts";

const RANGOS = [7, 30] as const;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { rango?: string };
}) {
  const rango = RANGOS.includes(Number(searchParams.rango) as (typeof RANGOS)[number])
    ? (Number(searchParams.rango) as (typeof RANGOS)[number])
    : 7;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fechas = ultimosNDiasGuatemala(rango);
  const desdeStr = fechas[0];
  const hoyStr = fechas[fechas.length - 1];

  const [{ data: meals }, { data: workouts }, { data: profile }] = await Promise.all([
    supabase
      .from("meal_entries")
      .select("fecha, calorias")
      .gte("fecha", desdeStr)
      .lte("fecha", hoyStr),
    supabase
      .from("workouts")
      .select("fecha, calorias_quemadas")
      .gte("fecha", desdeStr)
      .lte("fecha", hoyStr),
    supabase.from("profiles").select("objetivo_calorico_diario").eq("id", user?.id).maybeSingle(),
  ]);

  const consumidasPorDia = new Map<string, number>();
  for (const m of meals ?? []) {
    const fecha = m.fecha as string;
    consumidasPorDia.set(fecha, (consumidasPorDia.get(fecha) ?? 0) + Number(m.calorias));
  }
  const quemadasPorDia = new Map<string, number>();
  for (const w of workouts ?? []) {
    const fecha = w.fecha as string;
    quemadasPorDia.set(
      fecha,
      (quemadasPorDia.get(fecha) ?? 0) + Number(w.calorias_quemadas ?? 0)
    );
  }

  const dias = fechas.map((fecha) => {
    const consumidas = consumidasPorDia.get(fecha) ?? 0;
    const quemadas = quemadasPorDia.get(fecha) ?? 0;
    return { fecha, consumidas, quemadas, neto: consumidas - quemadas };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Reportes
        </h1>
        <div className="flex gap-1">
          {RANGOS.map((r) => (
            <Link
              key={r}
              href={`/reportes?rango=${r}`}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                r === rango
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "text-slate-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      <ReportesCharts dias={dias} objetivo={profile?.objetivo_calorico_diario ?? null} />
    </div>
  );
}
