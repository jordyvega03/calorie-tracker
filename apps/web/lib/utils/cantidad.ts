import type { MealEntry } from "@/types/database";

// Muestra la cantidad en la unidad natural del alimento: gramos, o
// unidades (huevo, uva, tortilla...) cuando el registro se guardó así.
export function formatCantidad(entry: Pick<MealEntry, "cantidad_gramos" | "unidad_medida" | "gramos_por_unidad">) {
  if (entry.unidad_medida === "unidad" && entry.gramos_por_unidad) {
    const unidades = Math.round((entry.cantidad_gramos / entry.gramos_por_unidad) * 100) / 100;
    return `${unidades} ${unidades === 1 ? "unidad" : "unidades"}`;
  }
  return `${entry.cantidad_gramos}g`;
}
