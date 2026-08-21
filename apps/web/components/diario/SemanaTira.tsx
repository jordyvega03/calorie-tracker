import Link from "next/link";
import { diaCortoGuatemala } from "@/lib/utils/date";

export default function SemanaTira({
  dias,
  fechaSeleccionada,
  fechaHoy,
  diasConDatos,
  mesParaVerMas,
}: {
  dias: string[];
  fechaSeleccionada: string;
  fechaHoy: string;
  diasConDatos: Set<string>;
  mesParaVerMas: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid flex-1 grid-cols-7 gap-1.5">
        {dias.map((dia) => {
          const esHoy = dia === fechaHoy;
          const esSeleccionado = dia === fechaSeleccionada;
          const numero = Number(dia.slice(8, 10));

          return (
            <Link
              key={dia}
              href={`/diario?fecha=${dia}`}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-medium transition-all duration-300 ${
                esHoy
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                  : esSeleccionado
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-stone-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="uppercase tracking-wide opacity-80">{diaCortoGuatemala(dia)}</span>
              <span className="text-sm font-semibold">{numero}</span>
              <span
                className={`h-1 w-1 rounded-full ${
                  diasConDatos.has(dia)
                    ? esHoy
                      ? "bg-white"
                      : "bg-emerald-500"
                    : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>

      <Link
        href={`/diario/mes?mes=${mesParaVerMas}`}
        className="shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition-all duration-300 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Ver más →
      </Link>
    </div>
  );
}
