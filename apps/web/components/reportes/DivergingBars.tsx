"use client";

import { useState } from "react";

type Dia = { fecha: string; consumidas: number; quemadas: number; neto: number };

const W = 720;
const H = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const BAR_MAX = 24;
const GAP = 2;

// Par divergente validado (skill dataviz): rojo = superávit, azul = déficit,
// gris neutro en el punto medio (el eje cero).
const POS_COLOR_LIGHT = "#e34948";
const POS_COLOR_DARK = "#e66767";
const NEG_COLOR_LIGHT = "#2a78d6";
const NEG_COLOR_DARK = "#3987e5";

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

export default function DivergingBars({ dias }: { dias: Dia[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const maxAbs = Math.max(...dias.map((d) => Math.abs(d.neto)), 0);
  const yMax = niceMax(maxAbs * 1.2);

  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const zeroY = PAD_TOP + plotH / 2;

  const slot = plotW / dias.length;
  const barWidth = Math.min(BAR_MAX, slot - GAP);

  const y = (v: number) => zeroY - (v / yMax) * (plotH / 2);
  const xCenter = (i: number) => PAD_LEFT + slot * i + slot / 2;

  const maxLabels = 6;
  const labelStep = Math.max(1, Math.ceil(dias.length / maxLabels));
  const labelIdx = new Set<number>();
  for (let i = 0; i < dias.length; i += labelStep) labelIdx.add(i);
  labelIdx.add(dias.length - 1);

  return (
    <div className="relative [--neg:#2a78d6] [--pos:#e34948] dark:[--neg:#3987e5] dark:[--pos:#e66767]">
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--pos)" }}
          />
          Superávit (consumidas &gt; quemadas)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--neg)" }}
          />
          Déficit (quemadas &gt; consumidas)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Balance neto diario: calorías consumidas menos calorías quemadas en entrenamientos"
      >
        <line
          x1={PAD_LEFT}
          x2={W - PAD_RIGHT}
          y1={zeroY}
          y2={zeroY}
          className="stroke-stone-300 dark:stroke-slate-600"
          strokeWidth={1}
        />
        <text
          x={PAD_LEFT - 8}
          y={zeroY}
          textAnchor="end"
          dominantBaseline="middle"
          className="fill-stone-400 dark:fill-slate-500"
          fontSize={10}
        >
          0
        </text>

        {dias.map((d, i) => {
          const barY = d.neto >= 0 ? y(d.neto) : zeroY;
          const barH = Math.abs(y(d.neto) - zeroY);
          const rTop = d.neto >= 0 ? 4 : 0;
          const rBottom = d.neto < 0 ? 4 : 0;
          const fill = `var(${d.neto >= 0 ? "--pos" : "--neg"})`;

          return (
            <g key={d.fecha}>
              <path
                d={roundedBarPath(xCenter(i) - barWidth / 2, barY, barWidth, Math.max(barH, 1), rTop, rBottom)}
                fill={fill}
                opacity={hover === null || hover === i ? 1 : 0.55}
                className="transition-opacity duration-150"
              />
              <rect
                x={xCenter(i) - slot / 2}
                y={PAD_TOP}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}

        {dias.map((d, i) => (
          <text
            key={d.fecha}
            x={xCenter(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-stone-400 dark:fill-slate-500"
            fontSize={10}
          >
            {labelIdx.has(i) ? formatCorta(d.fecha) : ""}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800"
          style={{
            left: `${(xCenter(hover) / W) * 100}%`,
            top: `${(Math.min(y(dias[hover].neto), zeroY) / H) * 100}%`,
          }}
        >
          <p className="font-semibold text-slate-900 dark:text-white">
            {dias[hover].neto > 0 ? "+" : ""}
            {dias[hover].neto} kcal
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {formatCorta(dias[hover].fecha)} · {dias[hover].consumidas} consumidas −{" "}
            {dias[hover].quemadas} quemadas
          </p>
        </div>
      )}
    </div>
  );
}

// Rectángulo con esquinas redondeadas solo en el extremo lejano a la línea base
// (el spec de la skill: "4px rounded data-end, square at the baseline").
function roundedBarPath(x: number, y: number, w: number, h: number, rTop: number, rBottom: number) {
  const r = Math.min(rTop || rBottom, h, w / 2);
  if (r <= 0) return `M${x},${y} h${w} v${h} h${-w} Z`;
  if (rTop > 0) {
    return `M${x},${y + r} a${r},${r} 0 0 1 ${r},${-r} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h${-w} Z`;
  }
  return `M${x},${y} h${w} v${h - r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} Z`;
}
