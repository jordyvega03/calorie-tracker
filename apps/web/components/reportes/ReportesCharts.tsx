"use client";

import { useState } from "react";
import { cardClass } from "@/lib/utils/styles";
import LineChart from "./LineChart";
import DivergingBars from "./DivergingBars";

type Dia = { fecha: string; consumidas: number; quemadas: number; neto: number };

function promedio(nums: number[]) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function formatCorta(fechaISO: string) {
  const d = new Date(fechaISO + "T00:00:00");
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(d);
}

export default function ReportesCharts({
  dias,
  objetivo,
}: {
  dias: Dia[];
  objetivo: number | null;
}) {
  const [tabla, setTabla] = useState(false);

  const hayDatos = dias.some((d) => d.consumidas > 0 || d.quemadas > 0);
  const promConsumidas = promedio(dias.map((d) => d.consumidas));
  const promQuemadas = promedio(dias.map((d) => d.quemadas));
  const promNeto = promedio(dias.map((d) => d.neto));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Promedio consumidas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {promConsumidas} <span className="text-sm font-normal text-slate-400">kcal/día</span>
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Promedio quemadas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {promQuemadas} <span className="text-sm font-normal text-slate-400">kcal/día</span>
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Balance neto promedio
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {promNeto > 0 ? "+" : ""}
            {promNeto} <span className="text-sm font-normal text-slate-400">kcal/día</span>
          </p>
        </div>
      </div>

      {!hayDatos ? (
        <div className={`${cardClass} text-center text-sm text-slate-400`}>
          Todavía no hay suficientes datos en este rango. Registra comidas y entrenamientos en
          el diario para ver tus tendencias aquí.
        </div>
      ) : (
        <>
          <section className={cardClass}>
            <h2 className="mb-4 font-medium text-slate-900 dark:text-white">
              Calorías consumidas por día
            </h2>
            <LineChart dias={dias} objetivo={objetivo} />
          </section>

          <section className={cardClass}>
            <h2 className="mb-4 font-medium text-slate-900 dark:text-white">
              Balance neto diario (consumidas − quemadas en entrenamientos)
            </h2>
            <DivergingBars dias={dias} />
          </section>
        </>
      )}

      <div>
        <button
          onClick={() => setTabla((v) => !v)}
          className="text-xs font-medium text-slate-500 underline-offset-2 transition-all duration-300 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          {tabla ? "Ocultar tabla" : "Ver como tabla"}
        </button>

        {tabla && (
          <div className={`${cardClass} mt-3 overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Consumidas</th>
                  <th className="py-2 pr-4 font-medium">Quemadas</th>
                  <th className="py-2 font-medium">Neto</th>
                </tr>
              </thead>
              <tbody className="[font-variant-numeric:tabular-nums]">
                {dias.map((d) => (
                  <tr
                    key={d.fecha}
                    className="border-b border-stone-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {formatCorta(d.fecha)}
                    </td>
                    <td className="py-2 pr-4 text-slate-900 dark:text-white">{d.consumidas}</td>
                    <td className="py-2 pr-4 text-slate-900 dark:text-white">{d.quemadas}</td>
                    <td className="py-2 text-slate-900 dark:text-white">
                      {d.neto > 0 ? "+" : ""}
                      {d.neto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
