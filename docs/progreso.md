# Estado del proyecto — para retomar en otra sesión

Última actualización: 2026-08-20

## Resumen rápido

**Las 5 fases del roadmap (ver `PLAN.md` sección 6) están completas**, probadas en el navegador con datos reales, y funcionando en `http://localhost:3000`. El MVP está funcionalmente terminado — lo que queda es deploy a producción (Vercel) y decisiones de pulido opcional (ver pendientes).

## Qué está hecho

### Fase 0 — Setup
- Proyecto Supabase creado (`liltfoeuabvdwapwjezx.supabase.co`), migración `supabase/migrations/0001_init.sql` corrida (tablas, RLS, bucket `meal-photos` privado).
- Proyecto Next.js 14 (App Router, TypeScript, Tailwind) en `apps/web`, dependencias instaladas.
- **"Confirm email" desactivado** en Supabase Auth (Authentication → Sign In / Providers → Email) para agilizar pruebas — recuerda reactivarlo antes de un lanzamiento real.

### Fase 1 — Registro manual (auth + CRUD)
- Auth completo con `@supabase/ssr`: middleware de sesión (`middleware.ts`, `lib/supabase/middleware.ts`), login/signup por email+contraseña (`app/(auth)/login/`), logout, protección de rutas del dashboard.
- Diario (`app/(dashboard)/diario/`): listado del día agrupado por desayuno/almuerzo/cena/snack con subtotales, alta/baja manual.
- Entrenamientos (`app/(dashboard)/entrenamientos/`): alta/baja manual (tipo, duración, calorías quemadas, notas).
- Perfil (`app/(dashboard)/perfil/`): formulario que hace upsert de peso/altura/sexo/objetivo calórico.
- **Rediseño visual completo** siguiendo las reglas de diseño en `CLAUDE.md` (tipografía Inter, paleta stone/slate + acento emerald, `rounded-2xl`, sombras, transiciones, mobile-first). Clases reutilizables en `lib/utils/styles.ts` (`inputClass`, `primaryButtonClass`, `cardClass`).
- Probado de punta a punta con la cuenta real `jordyvega15@gmail.com` (signup, login, agregar/ver/eliminar en diario y entrenamientos, guardar perfil, logout).

### Fase 2 — Análisis de imágenes con IA
- `PhotoUploader` (componente cliente en el diario): elige modo "Foto del plato" o "Foto de etiqueta", comprime la imagen en el navegador (`lib/utils/image.ts`), la sube a Storage, llama a la API, y muestra el resultado en un **formulario editable** — nunca se guarda nada sin confirmación del usuario.
- Rutas `app/api/analyze-meal-photo/route.ts` y `app/api/analyze-label/route.ts`: usan la sesión del propio usuario (`lib/supabase/route.ts`, vía header `Authorization`) en vez de la service role key — más simple y más seguro (RLS decide qué puede leer, y además se valida explícitamente que el storage path pertenece al usuario).
- `lib/ai/gemini.ts`: wrapper de llamadas a Gemini con prompts que piden JSON estructurado. **Usa el alias `gemini-flash-latest`** (no una versión fija) porque Google retira versiones periódicamente — nos pasó con `gemini-2.0-flash` durante el desarrollo.
- `addMealEntriesFromPhoto` (en `diario/actions.ts`): guarda en lote solo los alimentos que el usuario dejó marcados como "incluir".
- **Probado de punta a punta** con la API key real de Gemini: subida → análisis → edición → guardado, en ambos modos (plato y etiqueta), incluyendo verificación de que RLS bloquea acceso a fotos de otros usuarios.

### Fase 3 — Reportes
- `app/(dashboard)/reportes/page.tsx` (Server Component): arma un arreglo día por día (7 o 30 días, elegido por `?rango=` en la URL) cruzando `meal_entries` (calorías consumidas) con `workouts` (calorías quemadas) y el objetivo del perfil. Sin librería de gráficas externa — SVG a mano en `components/reportes/`, siguiendo el método de la skill `dataviz` (formas, color computado y validado, marks, hover, tabla accesible).
- `LineChart.tsx`: calorías consumidas por día + línea de meta punteada (si el perfil tiene objetivo), área suave, tooltip con crosshair.
- `DivergingBars.tsx`: balance neto diario (consumidas − quemadas en entrenamientos) como barras divergentes alrededor de cero. Colores del **par divergente validado** de la skill dataviz (rojo `#e34948`/`#e66767` = superávit, azul `#2a78d6`/`#3987e5` = déficit) — deliberadamente NO verde/rojo (el error clásico de daltonismo rojo-verde).
- `ReportesCharts.tsx`: stat tiles (promedios), orquesta ambos charts, y un toggle "Ver como tabla" (el equivalente accesible de cada gráfico, WCAG-clean).
- Colores validados con `scripts/validate_palette.js` de la skill contra las superficies reales de la app (blanco claro / `slate-900` oscuro), no a ojo.
- **Probado visualmente** en ambos modos (claro/oscuro) y ambos rangos (7 y 30 días): tooltips, leyenda, tabla, tarjetas responsive.

### Fase 4 — PWA y pulido
- **Íconos reales de PWA** (`public/icons/icon-192.png`, `icon-512.png`): generados con un script Python puro (sin dependencias, sin PIL/ImageMagick disponibles) — un ícono simple (círculo blanco sobre fondo emerald) con padding suficiente para el área segura de íconos "maskable" en Android.
- **`manifest.json` completo**: `theme_color`/`background_color` alineados a la marca (emerald-600 / stone-50), `start_url` apuntando a `/diario`, variantes `any` + `maskable` de cada ícono.
- **Metadata de `layout.tsx`**: `viewport` con `themeColor`, soporte `apple-web-app` (para instalar en iOS), íconos declarados vía la Metadata API de Next.js.
- **Offline básico**: `public/sw.js`, un service worker mínimo escrito a mano (sin `next-pwa` ni otra dependencia) — cachea la última página visitada (diario, entrenamientos, reportes, perfil) con estrategia network-first, y los assets estáticos de Next con cache-first. Nunca intercepta `/api/*` ni peticiones a Supabase/Gemini. Se registra desde `components/ServiceWorkerRegistration.tsx` (client component montado en el layout raíz).
- **Accesibilidad**: `aria-label` agregado a todos los inputs que solo tenían `placeholder` (diario, entrenamientos, perfil, `PhotoUploader`) — un placeholder no es un label persistente para lectores de pantalla.
- **Fix del formulario que no se limpiaba**: los forms de "Agregar manualmente" (diario) y "Registrar entrenamiento" (entrenamientos) ahora tienen `key={entries.length}` / `key={workouts.length}` — fuerza a React a remontar el `<form>` (inputs sin controlar) cada vez que la lista cambia, así que quedan vacíos después de guardar.
- **Probado en el navegador**: manifest y íconos cargan (200), el service worker se registra y su caché queda poblada tras navegar (`/diario` + assets de Next), y el formulario del diario se limpia correctamente tras guardar.

### Fix — zona horaria fija a Guatemala
- Nuevo `lib/utils/date.ts`: helpers `hoyGuatemala()`, `horaActualGuatemala()` y `ultimosNDiasGuatemala(n)`, todos basados en `Intl.DateTimeFormat` con `timeZone: "America/Guatemala"` (no en offsets hardcodeados) — así "hoy" en la app siempre es el día calendario real en Guatemala (UTC-6, sin horario de verano), sin importar en qué zona horaria corra el servidor de Next.js.
- **Diario** (`diario/page.tsx`) ahora calcula "hoy" con `hoyGuatemala()` en vez de `new Date().toISOString()` (que devolvía UTC).
- **Los inserts** (`addMealEntry`, `addMealEntriesFromPhoto` en diario/actions.ts; `addWorkout` en entrenamientos/actions.ts) ahora pasan `fecha`/`hora` explícitos calculados en Guatemala, en vez de dejar que Postgres use su default `current_date`/`current_time` (que en Supabase es UTC). El default de la columna en la migración se deja como está — ya no se usa en la práctica, pero no estorba como red de seguridad.
- **Reportes** (`reportes/page.tsx`) arma el rango de días con `ultimosNDiasGuatemala(rango)` en vez de sumar/restar días sobre un `Date` y formatear con `toISOString()`.
- **Verificado**: con la hora real de Guatemala en 20 de agosto ~8pm (cuando en UTC ya era 21 de agosto), el diario y los reportes muestran correctamente "2026-08-20" como hoy.
- **Trade-off deliberado**: la zona horaria queda fija en el código (`TIMEZONE` en `lib/utils/date.ts`), no es configurable por usuario. Correcto mientras la app sea de un solo usuario/región (Guatemala); si en el futuro hay usuarios en otras zonas horarias, esto tendría que volverse un campo del perfil.

## Decisiones tomadas que no estaban en el `PLAN.md` original

- Las rutas de análisis de imagen **no necesitan `SUPABASE_SERVICE_ROLE_KEY`** (se dejó vacía a propósito en `.env.local`, con comentario explicando por qué). Si en el futuro se necesita una tarea admin real (ej. borrar datos de un usuario eliminado), ahí sí se usaría `lib/supabase/server.ts`.
- El bucket `meal-photos` es privado, así que `foto_url` en `meal_entries` guarda el **storage path**, no una URL pública (`getPublicUrl` no serviría). Para mostrar la foto en el futuro habría que generar un signed URL bajo demanda.
- Reglas de diseño UI fijadas en `CLAUDE.md` — cualquier trabajo de front nuevo debe seguirlas (Tailwind, `rounded-xl/2xl`, transiciones, mobile-first, paleta sofisticada).

## Configuración actual (`apps/web/.env.local`)

| Variable | Estado |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | vacía a propósito (no se usa por ahora) |
| `GEMINI_API_KEY` | ✅ configurada, tier gratis (sin tarjeta vinculada) |

## Pendientes / deuda técnica menor (no bloquean nada, pero quedan anotados)

- No hay rate limiting en `/api/analyze-*` (aceptable para 1 usuario; si el proyecto crece a varios usuarios, conviene agregar un límite básico por usuario/día).
- `types/database.ts` tiene tipos escritos a mano; sería mejor generarlos con `supabase gen types typescript` cuando el schema se estabilice más.
- El ícono de PWA es un placeholder simple generado por script (círculo blanco sobre emerald) — funcional y con buen padding para maskable, pero no es un diseño de marca trabajado; si en algún momento se quiere un ícono "de verdad" (logo, tipografía), reemplazar `public/icons/icon-192.png` y `icon-512.png`.
- El offline básico solo cachea páginas ya visitadas con conexión — si un usuario nunca abrió `/reportes` con internet, no va a estar disponible sin conexión la primera vez. Es el comportamiento esperado de un service worker simple (no hay pre-cache de todo el sitio a propósito, para no gastar cuota de cache innecesariamente).

## Próximos pasos sugeridos (todas las fases del plan original están completas)

- **Deploy a Vercel**: conectar el repo (hay que inicializar git — el proyecto no es un repositorio todavía), configurar las mismas variables de entorno de `.env.local` como env vars de Vercel, y hacer el primer deploy. Después de eso, actualizar `NEXT_PUBLIC_SUPABASE_URL`/keys si se crea un proyecto Supabase separado para producción (hoy todo apunta al mismo proyecto que se usa en desarrollo).
- **Reactivar "Confirm email"** en Supabase Auth antes de compartir la app con otros usuarios (hoy cualquiera puede crear cuenta sin verificar el correo).
- Si algún día hay usuarios fuera de Guatemala, la zona horaria fija en `lib/utils/date.ts` tendría que volverse configurable por perfil.
- Historial de peso a lo largo del tiempo (hoy `profiles.peso_kg` es un único valor actual, no una serie histórica) si se quiere esa gráfica que mencionaba el `PLAN.md` original.

## Cómo retomar

1. `cd apps/web && npm run dev` (variables de entorno ya están en `.env.local`).
2. Login con `jordyvega15@gmail.com` / `prueba123`, o crear cuenta nueva (email confirm sigue desactivado).
3. Leer esta guía + `PLAN.md` (arquitectura general) + `docs/decisiones-tecnicas.md` (por qué de cada decisión).
