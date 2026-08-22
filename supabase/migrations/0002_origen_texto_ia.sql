-- Agrega 'texto_ia' como origen válido de meal_entries: el usuario describe
-- la comida en una frase ("2 huevos revueltos con media taza de frijol...")
-- y Gemini la interpreta en varios alimentos, en vez de subir una foto.
alter table meal_entries drop constraint if exists meal_entries_origen_check;

alter table meal_entries add constraint meal_entries_origen_check
  check (origen in ('manual', 'foto_plato', 'foto_etiqueta', 'texto_ia'));

-- Mismo criterio para el catálogo (foods.fuente), para no perder de dónde
-- salió cada alimento nuevo que se agrega al catálogo automáticamente.
alter table foods drop constraint if exists foods_fuente_check;

alter table foods add constraint foods_fuente_check
  check (fuente in ('manual', 'ia_foto', 'ia_etiqueta', 'ia_texto', 'seed'));
