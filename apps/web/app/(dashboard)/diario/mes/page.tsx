import Link from "next/link";
import { createClient } from "@/lib/supabase/rsc";
import { cardClass } from "@/lib/utils/styles";
import {
  diasEnMes,
  diaSemanaInicioMes,
  hoyGuatemala,
  mesActualGuatemala,
  mesAdyacente,
} from "@/lib/utils/date";

const MES_VALIDO = /^\d{4}-\d{2}$/;
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_HEADER = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export default async function DiarioMesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const mes =
    searchParams.mes && MES_VALIDO.test(searchParams.mes) ? searchParams.mes : mesActualGuatemala();
  const hoy = hoyGuatemala();

  const supabase = createClient();
  const desde = `${mes}-01`;
  const hasta = `${mes}-${String(diasEnMes(mes)).padStart(2, "0")}`;

  const { data } = await supabase
    .from("meal_entries")
    .select("fecha, calorias")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  const totalesPorDia = new Map<string, number>();
  for (const row of data ?? []) {
    const f = row.fecha as string;
    totalesPorDia.set(f, (totalesPorDia.get(f) ?? 0) + Number(row.calorias));
  }

  const totalDias = diasEnMes(mes);
  const primerDiaSemana = diaSemanaInicioMes(mes); // 0=domingo..6=sábado
  const espaciosVacios = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1; // grid lunes-primero

  const [anio, mesNum] = mes.split("-").map(Number);
  const nombreMes = NOMBRES_MES[mesNum - 1];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/diario"
          className="text-sm font-medium text-slate-500 transition-all duration-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Volver al diario
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize tracking-tight text-slate-900 dark:text-white">
          {nombreMes} {anio}
        </h1>
        <div className="flex gap-1">
          <Link
            href={`/diario/mes?mes=${mesAdyacente(mes, -1)}`}
            aria-label="Mes anterior"
            className="rounded-xl px-3 py-1.5 text-sm text-slate-500 transition-all duration-300 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ←
          </Link>
          <Link
            href={`/diario/mes?mes=${mesAdyacente(mes, 1)}`}
            aria-label="Mes siguiente"
            className="rounded-xl px-3 py-1.5 text-sm text-slate-500 transition-all duration-300 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            →
          </Link>
        </div>
      </div>

      <section className={cardClass}>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          {DIAS_HEADER.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {Array.from({ length: espaciosVacios }, (_, i) => (
            <div key={`vacio-${i}`} />
          ))}

          {Array.from({ length: totalDias }, (_, i) => {
            const numero = i + 1;
            const fecha = `${mes}-${String(numero).padStart(2, "0")}`;
            const total = totalesPorDia.get(fecha);
            const esHoy = fecha === hoy;

            return (
              <Link
                key={fecha}
                href={`/diario?fecha=${fecha}`}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border text-xs transition-all duration-300 ${
                  esHoy
                    ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                    : total !== undefined
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-stone-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <span className="font-semibold">{numero}</span>
                {total !== undefined && (
                  <span className={esHoy ? "text-white/90" : "text-[10px] opacity-80"}>
                    {total} kcal
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
