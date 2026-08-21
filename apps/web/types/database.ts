// Tipos manuales que reflejan supabase/migrations/0001_init.sql.
// Cuando el schema esté estable, reemplazar por tipos generados con:
//   supabase gen types typescript --project-id <id> > types/database.ts

export type TipoComida = "desayuno" | "almuerzo" | "cena" | "snack";
export type OrigenRegistro = "manual" | "foto_plato" | "foto_etiqueta";
export type TipoWorkout = "cardio" | "fuerza" | "otro";

export interface Profile {
  id: string;
  full_name: string | null;
  sexo: "m" | "f" | "otro" | null;
  fecha_nacimiento: string | null;
  altura_cm: number | null;
  peso_kg: number | null;
  objetivo_calorico_diario: number | null;
  created_at: string;
}

export interface Food {
  id: string;
  nombre: string;
  marca: string | null;
  calorias_100g: number;
  proteina_100g: number | null;
  carbos_100g: number | null;
  grasas_100g: number | null;
  fuente: "manual" | "ia_foto" | "ia_etiqueta" | "seed";
  created_by: string | null;
  created_at: string;
}

export interface MealEntry {
  id: string;
  user_id: string;
  food_id: string | null;
  nombre_libre: string | null;
  tipo_comida: TipoComida;
  cantidad_gramos: number;
  calorias: number;
  proteina: number | null;
  carbos: number | null;
  grasas: number | null;
  fecha: string;
  hora: string;
  origen: OrigenRegistro;
  foto_url: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  tipo: TipoWorkout;
  nombre: string;
  duracion_min: number | null;
  calorias_quemadas: number | null;
  fecha: string;
  notas: string | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  nombre_ejercicio: string;
  series: number | null;
  repeticiones: number | null;
  peso_kg: number | null;
  orden: number;
}

// Placeholder mínimo para que @supabase/ssr tipe el cliente.
// Reemplazar por el tipo `Database` real generado por el CLI de Supabase.
export type Database = Record<string, unknown>;
