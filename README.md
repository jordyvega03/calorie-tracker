# Calorie Tracker

Contador de calorías por comida (desayuno/almuerzo/cena/snacks) + registro de entrenamientos, con análisis de imágenes por IA (foto de plato o de etiqueta nutricional).

Ver **[PLAN.md](./PLAN.md)** para el análisis completo de requerimientos, arquitectura, modelo de datos y costos.

## Stack

- **Front-end + API**: Next.js (App Router) — `apps/web`
- **Backend de datos**: Supabase (Postgres + Auth + Storage) — `supabase/`
- **IA de imágenes**: Gemini Flash (multimodal)
- **Hosting**: Vercel (free) + Supabase (free)

## Levantar el proyecto (primera vez)

1. **Supabase**
   - Crear proyecto en [supabase.com](https://supabase.com) (plan Free).
   - En el SQL Editor del dashboard, correr el contenido de `supabase/migrations/0001_init.sql`.
   - Copiar la URL del proyecto y las keys (`anon` y `service_role`) desde *Settings > API*.

2. **Gemini**
   - Obtener una API key gratis en [Google AI Studio](https://aistudio.google.com/apikey).

3. **Variables de entorno**
   ```bash
   cp .env.example apps/web/.env.local
   # completar los valores obtenidos en los pasos 1 y 2
   ```

4. **Front-end**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
   Abrir http://localhost:3000

## Estado del proyecto

Esqueleto inicial — ver la sección "Fases de desarrollo" en `PLAN.md` para el orden recomendado de implementación (empezar por registro manual, la IA va después).
