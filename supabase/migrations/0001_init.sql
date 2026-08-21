-- ============================================================
-- Contador de calorías y entrenamientos — schema inicial
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  sexo text check (sexo in ('m', 'f', 'otro')),
  fecha_nacimiento date,
  altura_cm numeric,
  peso_kg numeric,
  objetivo_calorico_diario numeric,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: usuario ve/edita solo lo suyo"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- foods (catálogo de alimentos)
-- ------------------------------------------------------------
create table foods (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  marca text,
  calorias_100g numeric not null,
  proteina_100g numeric,
  carbos_100g numeric,
  grasas_100g numeric,
  fuente text not null check (fuente in ('manual', 'ia_foto', 'ia_etiqueta', 'seed')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table foods enable row level security;

-- catálogo global (seed) visible para todos; lo que crea cada usuario, solo lo ve él
create policy "foods: lectura de seed o propios"
  on foods for select
  using (fuente = 'seed' or created_by = auth.uid());

create policy "foods: insertar propios"
  on foods for insert
  with check (created_by = auth.uid());

create policy "foods: editar/borrar propios"
  on foods for update using (created_by = auth.uid());

create policy "foods: borrar propios"
  on foods for delete using (created_by = auth.uid());

-- ------------------------------------------------------------
-- meal_entries
-- ------------------------------------------------------------
create table meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid references foods (id) on delete set null,
  nombre_libre text,
  tipo_comida text not null check (tipo_comida in ('desayuno', 'almuerzo', 'cena', 'snack')),
  cantidad_gramos numeric not null,
  calorias numeric not null,
  proteina numeric,
  carbos numeric,
  grasas numeric,
  fecha date not null default current_date,
  hora time not null default current_time,
  origen text not null check (origen in ('manual', 'foto_plato', 'foto_etiqueta')),
  foto_url text,
  created_at timestamptz not null default now()
);

create index meal_entries_user_fecha_idx on meal_entries (user_id, fecha);

alter table meal_entries enable row level security;

create policy "meal_entries: solo el dueño"
  on meal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- workouts
-- ------------------------------------------------------------
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('cardio', 'fuerza', 'otro')),
  nombre text not null,
  duracion_min numeric,
  calorias_quemadas numeric,
  fecha date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create index workouts_user_fecha_idx on workouts (user_id, fecha);

alter table workouts enable row level security;

create policy "workouts: solo el dueño"
  on workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- workout_exercises (detalle opcional para entrenamientos de fuerza)
-- ------------------------------------------------------------
create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  nombre_ejercicio text not null,
  series integer,
  repeticiones integer,
  peso_kg numeric,
  orden integer default 0
);

alter table workout_exercises enable row level security;

create policy "workout_exercises: solo el dueño del workout"
  on workout_exercises for all
  using (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- daily_summary (vista de conveniencia)
-- ------------------------------------------------------------
create view daily_summary as
select
  user_id,
  fecha,
  coalesce(sum(calorias), 0) as calorias_consumidas,
  coalesce(sum(proteina), 0) as proteina_total,
  coalesce(sum(carbos), 0) as carbos_total,
  coalesce(sum(grasas), 0) as grasas_total
from meal_entries
group by user_id, fecha;

-- Nota: las calorías quemadas por entrenamiento se agregan aparte
-- (join contra workouts por user_id + fecha) en la capa de front/API,
-- para no mezclar dos fuentes con distinta granularidad en una sola vista.

-- ------------------------------------------------------------
-- Storage: bucket privado para fotos de comida
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

create policy "meal-photos: usuario solo accede a su carpeta"
  on storage.objects for all
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
