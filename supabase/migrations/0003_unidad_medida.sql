-- ============================================================
-- Cantidad dinámica por alimento: gramos (ej. arroz) o unidades
-- (ej. huevo, uva). gramos_por_unidad solo aplica cuando
-- unidad_medida = 'unidad' — es el peso promedio de una unidad,
-- usado para convertir unidades <-> gramos al editar cantidades.
-- ============================================================

alter table foods
  add column unidad_medida text not null default 'gramos'
    check (unidad_medida in ('gramos', 'unidad')),
  add column gramos_por_unidad numeric;

alter table meal_entries
  add column unidad_medida text not null default 'gramos'
    check (unidad_medida in ('gramos', 'unidad')),
  add column gramos_por_unidad numeric;
