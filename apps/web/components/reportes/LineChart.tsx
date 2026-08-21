"use client";

import { useState } from "react";

type Dia = { fecha: string; consumidas: number };

const W = 720;
const H = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 28;
const PAD_BOTTOM = 28;
const LINE_COLOR = "#059669"; // emerald-600 — pasa contraste 3:1 en claro y oscuro (validado)

function niceMax(value: number) {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

function formatCorta(fechaISO: string) {
  const d = new Date(fechaISO + "T00:00:00");
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(d);
}

export default function LineChart({ dias, objetivo }: { dias: Dia[]; objetivo: number | null }) {
  const [hover, setHover] = useState<number | null>(null);

  const maxConsumidas = Math.max(...dias.map((d) => d.consumidas), 0);
  const yMax = niceMax(Math.max(maxConsumidas, objetivo ?? 0) * 1.15);

  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) => PAD_LEFT + (dias.length === 1 ? plotW / 2 : (i / (dias.length - 1)) * plotW);
  const y = (v: number) => PAD_TOP + plotH - (v / yMax) * plotH;

  const puntos = dias.map((d, i) => `${x(i)},${y(d.consumidas)}`).join(" ");
  const areaPts = `${x(0)},${y(0)} ${puntos} ${x(dias.length - 1)},${y(0)}`;

  const yTicks = [0, yMax / 2, yMax];

  // Etiquetas del eje X: como máximo ~6, siempre incluye el primero y el último.
  const maxLabels = 6;
  const labelStep = Math.max(1, Math.ceil(dias.length / maxLabels));
  const labelIdx = new Set<number>();
  for (let i = 0; i < dias.length; i += labelStep) labelIdx.add(i);
  labelIdx.add(dias.length - 1);

  const ultimo = dias[dias.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Calorías consumidas por día">
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={y(t)}
              y2={y(t)}
              className="stroke-stone-200 dark:stroke-slate-800"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-stone-400 dark:fill-slate-500"
              fontSize={10}
            >
              {Math.round(t)}
            </text>
          </g>
        ))}

        {objetivo && objetivo > 0 && (
          <g>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={y(objetivo)}
              y2={y(objetivo)}
              className="stroke-stone-400 dark:stroke-slate-500"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text
              x={W - PAD_RIGHT}
              y={y(objetivo) - 6}
              textAnchor="end"
              className="fill-stone-500 dark:fill-slate-400"
              fontSize={10}
            >
              Meta {objetivo} kcal
            </text>
          </g>
        )}

        <polygon points={areaPts} fill={LINE_COLOR} opacity={0.08} />
        <polyline
          points={puntos}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {dias.map((d, i) => (
          <text
            key={d.fecha}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-stone-400 dark:fill-slate-500"
            fontSize={10}
          >
            {labelIdx.has(i) ? formatCorta(d.fecha) : ""}
          </text>
        ))}

        {/* Marcador + etiqueta directa en el último punto */}
        <circle
          cx={x(dias.length - 1)}
          cy={y(ultimo.consumidas)}
          r={4}
          fill={LINE_COLOR}
          className="stroke-white dark:stroke-slate-900"
          strokeWidth={2}
        />
        <text
          x={x(dias.length - 1)}
          y={y(ultimo.consumidas) - 10}
          textAnchor="end"
          className="fill-slate-700 dark:fill-slate-200"
          fontSize={11}
          fontWeight={600}
        >
          {ultimo.consumidas} kcal
        </text>

        {/* Objetivos de hover/foco: círculo transparente ≥24px de diámetro por punto */}
        {dias.map((d, i) => (
          <circle
            key={d.fecha}
            cx={x(i)}
            cy={y(d.consumidas)}
            r={12}
            fill="transparent"
            tabIndex={0}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD_TOP}
            y2={H - PAD_BOTTOM}
            className="stroke-stone-300 dark:stroke-slate-700"
            strokeWidth={1}
          />
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(dias[hover].consumidas) / H) * 100}%`,
          }}
        >
          <p className="font-semibold text-slate-900 dark:text-white">
            {dias[hover].consumidas} kcal
          </p>
          <p className="text-slate-500 dark:text-slate-400">{formatCorta(dias[hover].fecha)}</p>
        </div>
      )}
    </div>
  );
}
