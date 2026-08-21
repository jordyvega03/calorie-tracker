# Estado del proyecto — para retomar en otra sesión

Última actualización: 2026-08-20

## Resumen rápido

**Las 5 fases del roadmap (ver `PLAN.md` sección 6) están completas y la app está desplegada en producción (Vercel), con CI en GitHub Actions.** El MVP está terminado y en línea. Lo que queda son mejoras post-MVP (ver sección al final) — nada bloqueante.

- **Repo:** [github.com/jordyvega03/calorie-tracker](https://github.com/jordyvega03/calorie-tracker) (público)
- **Producción:** desplegada en Vercel (root directory `apps/web`), deploy automático en cada push a `main`

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

### Post-MVP — GitHub, Vercel y CI
- **Repo en GitHub**: `git init` + primer commit + push a `github.com/jordyvega03/calorie-tracker` (público). Remote configurado por SSH con un host alias personal (`git@github-personal:...`, ver `~/.ssh/config`) — `git push`/`git pull` no piden credenciales.
- **Deploy en Vercel**: proyecto importado desde GitHub, **Root Directory = `apps/web`** (el repo es un monorepo), variables de entorno cargadas a mano en el dashboard de Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` — mismos valores que `.env.local`; `SUPABASE_SERVICE_ROLE_KEY` no hace falta). Deploy automático en cada push a `main`.
- **Fix de build de producción**: el primer deploy falló — `next build` en Vercel corre chequeo de tipos estricto (`next dev` no lo hace igual de estricto) y encontró un parámetro `cookiesToSet` sin tipo explícito en `lib/supabase/middleware.ts` y `lib/supabase/rsc.ts` (el callback `setAll` de `@supabase/ssr`). Se tipó con `CookieOptions` importado de `@supabase/ssr`. Verificado con `npm run build` local antes de volver a subir.
- **CI en GitHub Actions** (`.github/workflows/ci.yml`): corre `npm run build` en cada push/PR a `main`, para atrapar errores como el de arriba *antes* de que lleguen a Vercel. No necesita secretos — se comprobó que el build compila sin variables de entorno reales (las rutas dinámicas no ejecutan código server-side en build time). No incluye `next lint` porque el proyecto no tiene ESLint configurado todavía.

### Post-MVP — Autocompletar alimentos (catálogo personal)
- La tabla `foods` del schema (existía pero no se usaba) ahora se llena sola: cada vez que se guarda un alimento — manual o confirmado desde una foto de IA — `diario/actions.ts` revisa si ya existe uno con ese nombre (propio o del catálogo semilla) y, si no, lo inserta normalizado a valores por 100g (`upsertFoodIfNew`). No pisa un valor existente, para no perder un dato bueno por una estimación de IA menos precisa.
- **`ManualEntryForm.tsx`** (nuevo componente cliente, reemplaza el form estático de "Agregar manualmente" en el diario): busca en `foods` mientras se escribe el nombre (debounce 250ms, vía el cliente de Supabase del navegador — RLS ya limita a lo propio + semilla), muestra sugerencias con sus kcal/100g, y al elegir una autocompleta gramos (100 por defecto) y macros escaladas. Si después cambian los gramos con un alimento vinculado, las macros se recalculan en vivo; si el usuario edita las macros a mano, se desvincula (los gramos dejan de pisarle lo que escribió).
- `addMealEntry` cambió de recibir `FormData` a un objeto tipado (mismo patrón que `addMealEntriesFromPhoto`), porque ahora se llama directo desde el cliente en vez de vía `<form action={...}>`. El reset del formulario tras guardar ya no depende del truco `key={entries.length}` (remontar el DOM) — ahora es state de React que se limpia explícitamente tras un guardado exitoso.
- **Bug encontrado y arreglado de paso**: en modo oscuro, enfocar cualquier input ponía el fondo blanco (`focus:bg-white`) pero el texto seguía blanco (`dark:text-white`) — texto invisible mientras se escribía. Ya estaba resuelto en `login/page.tsx` (`dark:focus:bg-slate-800`) pero no se había llevado al `inputClass` compartido en `lib/utils/styles.ts` cuando se extrajo en la Fase 1. Corregido ahí, así que aplica a todos los formularios del dashboard de una vez.
- **Probado en el navegador**: se guardó "Mango maduro" (150g/90kcal → 60kcal/100g calculado), y al escribir "man" en una entrada nueva apareció como sugerencia; al seleccionarla autocompletó gramos/calorías/macros, y cambiar los gramos a 300 recalculó correctamente (180kcal/3g/45g/0g).

### Post-MVP — Captura de foto mejorada (cámara / galería)
- `PhotoUploader.tsx`: el input único `<input type="file" capture="environment">` se reemplazó por **dos botones explícitos** ("Tomar foto" / "Elegir de galería"), cada uno con su propio `<input type="file">` oculto (uno con `capture="environment"`, el otro sin `capture`). Motivo: un solo input con `capture` es inconsistente entre navegadores — en Android suele abrir la cámara directo e ignorar la opción de galería, dejando al usuario sin poder subir una foto ya tomada.
- Se agregó **vista previa** de la foto elegida (con `URL.createObjectURL`, liberado con `URL.revokeObjectURL` al cambiar/cerrar) antes de analizarla, con botón para quitarla y elegir otra.
- **Probado en el navegador**: subida por "Elegir de galería" muestra la vista previa correctamente, el botón "Analizar foto" se habilita, y "quitar foto" regresa a los dos botones limpio (el input se resetea).

### Post-MVP — Buscar alimentos con IA cuando no están en el catálogo
- Se evaluaron 3 fuentes para autocompletar alimentos que el usuario nunca ha registrado (ej. "aguacate"): USDA FoodData Central (base de datos real, pero en inglés y sin comida guatemalteca), Open Food Facts (sin API key, pero pensada para productos empacados con código de barras, no alimentos genéricos crudos), y **reutilizar Gemini** (ya integrado, entiende español y comida local sin traducir, cero registro nuevo). Se eligió Gemini — decisión del usuario, consciente de que es una estimación de IA y no una base de datos certificada, igual que el resto de la app.
- `lib/ai/gemini.ts`: la llamada HTTP a Gemini se factorizó a un helper común `callGemini(parts)`; `analyzeImageWithGemini` (fotos) y la nueva `estimateFoodNutrition(nombre)` (solo texto) lo reutilizan.
- `buscarAlimentoExterno` (Server Action en `diario/actions.ts`): llama a `estimateFoodNutrition`, devuelve `null` si Gemini no reconoce el alimento. No guarda nada en `foods` directamente — eso lo sigue haciendo `upsertFoodIfNew` cuando el usuario confirma y guarda la entrada (mismo criterio de todo el proyecto: ninguna estimación de IA se persiste sin pasar por el usuario).
- `ManualEntryForm.tsx`: cuando la búsqueda local en `foods` no encuentra nada (mientras se escribe), aparece una fila **"Buscar '&lt;nombre&gt;' con IA"** en el dropdown. Al hacer clic, autocompleta el formulario igual que una sugerencia local (mismo mecanismo de recálculo al cambiar los gramos). Si Gemini no lo reconoce o falla la llamada, muestra un mensaje y el usuario completa los datos a mano.
- **Cache automática, tal como se pidió**: la primera vez que se busca un alimento nuevo pasa por Gemini; al guardar la entrada, `upsertFoodIfNew` lo deja en la tabla `foods`. La segunda vez que se escribe el mismo nombre, aparece como sugerencia **local** instantánea — no vuelve a llamar a la IA.
- **Probado en el navegador** con "aguacate": sin match local → apareció "Buscar 'aguacate' con IA" → Gemini devolvió 160 kcal / 2g proteína / 9g carbos / 15g grasas por 100g (coincide con tablas nutricionales reales) → se guardó la entrada → al escribir "aguac" de nuevo, apareció como sugerencia local instantánea sin pasar por IA. De paso se confirmó que la app maneja bien un 503 transitorio de Gemini ("high demand") — mostró el mensaje de "no encontrado" en vez de romperse, y reintentar funcionó.

## Cómo mandar cambios (flujo normal de trabajo)

Con el repo en GitHub y Vercel conectado, mandar un cambio a producción es:

```bash
cd /Users/jordy/Documents/personal/calorie-tracker
git add -A
git status              # revisar qué se va a subir antes de commitear
git commit -m "Descripción corta del cambio"
git push
```

Qué pasa automáticamente después del `push` a `main`:
1. **GitHub Actions** corre `npm run build` (`.github/workflows/ci.yml`). Se revisa en la pestaña **Actions** del repo, o con el badge `https://github.com/jordyvega03/calorie-tracker/actions/workflows/ci.yml/badge.svg`.
2. **Vercel** dispara un deploy nuevo automáticamente. Se revisa en el dashboard de Vercel.

Si el build falla (en CI o en Vercel), casi siempre es un error de tipos que `next dev` no mostró — correr `npm run build` en local (`cd apps/web && npm run build`) reproduce el mismo chequeo antes de volver a subir.

**No hace falta re-explicar el contexto del proyecto en una sesión nueva de Claude**: basta con pedir que lea este archivo (`docs/progreso.md`), `PLAN.md` y `docs/decisiones-tecnicas.md`.

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

## Mejoras post-MVP sugeridas (nada de esto bloquea nada, es la lista para elegir qué sigue)

**Infraestructura**
- ✅ ~~CI en GitHub Actions~~ — hecho (ver arriba).
- Generar `types/database.ts` con `supabase gen types typescript` en vez de mantenerlo a mano.
- Proyecto Supabase separado para producción (hoy dev y producción comparten la misma base de datos).

**Producto**
- ✅ ~~Autocompletar/buscar en alimentos ya registrados~~ — hecho (ver arriba).
- Editar una entrada existente en vez de solo poder eliminarla y volver a crearla.
- Objetivo calórico calculado automáticamente (ej. fórmula Mifflin-St Jeor) a partir de peso/altura/edad/sexo del perfil.
- Historial de peso a lo largo del tiempo (hoy `profiles.peso_kg` es un único valor actual, no una serie histórica) para poder graficarlo en Reportes.
- Metas de macros (proteína/carbos/grasas), no solo calorías — el dato ya se guarda por entrada, falta mostrarlo contra un objetivo.
- Exportar datos a CSV.

**Seguridad**
- Rate limiting en `/api/analyze-*` (aceptable para 1 usuario; importante si el proyecto crece a varios usuarios, para controlar costo/abuso de Gemini).
- **Reactivar "Confirm email"** en Supabase Auth antes de compartir la app con otros usuarios (hoy cualquiera puede crear cuenta sin verificar el correo).

**Otros**
- Si algún día hay usuarios fuera de Guatemala, la zona horaria fija en `lib/utils/date.ts` tendría que volverse configurable por perfil.
- El ícono de PWA es un placeholder simple generado por script (círculo blanco sobre emerald) — reemplazar `public/icons/icon-192.png`/`icon-512.png` si se quiere un diseño de marca real.
- El offline básico solo cachea páginas ya visitadas con conexión (comportamiento esperado de un service worker simple, no pre-cachea todo el sitio a propósito).

## Cómo retomar

1. `cd apps/web && npm run dev` (variables de entorno ya están en `.env.local`).
2. Login con `jordyvega15@gmail.com` / `prueba123`, o crear cuenta nueva (email confirm sigue desactivado).
3. Leer esta guía + `PLAN.md` (arquitectura general) + `docs/decisiones-tecnicas.md` (por qué de cada decisión).
4. Para mandar cambios a producción, ver "Cómo mandar cambios" más arriba — resumen: `git add -A && git commit -m "..." && git push`, y CI + Vercel se encargan del resto.
