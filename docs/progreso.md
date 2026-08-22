# Estado del proyecto — para retomar en otra sesión

Última actualización: 2026-08-21

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

### Post-MVP — Tira semanal, navegación por día y vista de mes
- `lib/utils/date.ts`: nuevos helpers `semanaActualGuatemala` (lunes a domingo de la semana actual), `diaCortoGuatemala`, `mesActualGuatemala`, `diasEnMes`, `diaSemanaInicioMes`, `mesAdyacente`. Misma técnica TZ-segura que el resto del archivo: aritmética en epoch ms (o componentes de calendario puros para meses), conversión a calendario de Guatemala solo al formatear — nada de instantes cruzando zonas horarias a medias.
- `SemanaTira.tsx` (nuevo componente, arriba del diario): 7 días lunes-domingo de la semana actual, "hoy" resaltado en verde sólido, el día que se está viendo (si no es hoy) con borde verde, punto indicador debajo de los días con registros. Botón "Ver más →" al mes completo.
- `diario/page.tsx` ahora acepta `?fecha=YYYY-MM-DD` (default hoy) — la página entera es la misma, solo cambia qué día consulta. **Solo se muestran las categorías de comida que tienen registros ese día** (antes siempre mostraba las 4 con "Nada registrado" en las vacías); si el día no tiene nada, un solo mensaje en vez de 4 tarjetas vacías. Los formularios de agregar (foto/manual) y el botón "Eliminar" **solo aparecen viendo el día de hoy** — ver un día pasado es de solo lectura a propósito, no se edita historial (no se pidió esa capacidad, y evita el riesgo de "corregir" registros pasados sin querer).
- `diario/mes/page.tsx` (ruta nueva): calendario del mes con navegación anterior/siguiente (`?mes=YYYY-MM`), grid alineado lunes-primero, cada día con registros muestra su total de kcal, clic en cualquier día navega a `/diario?fecha=...`.
- **Probado en el navegador**: la tira mostró correctamente lunes 17 a domingo 23 (agosto 2026) con jueves 20 como hoy; clic en miércoles 19 (sin datos) mostró "Nada registrado este día" sin los formularios y con el día correctamente marcado como seleccionado en la tira; "Ver más" abrió el calendario de agosto con el 1 cayendo en sábado (correcto) y el día 20 mostrando su total; clic en un día del calendario regresó al detalle correcto.
- **Nota de datos, no de código**: durante la prueba se notó que "Desayuno" de hoy incluye alimentos con nombres muy similares a los de "Cena" (ej. "Frijoles negros refritos" vs "Frijoles negros molidos") — son registros reales distintos, probablemente de una foto real analizada en otra sesión sin cambiar el tipo de comida por defecto. No es un bug de la agrupación, se dejó tal cual (son datos del usuario).

### Post-MVP — Describir una comida en texto libre + pantalla de agregar unificada
- **Nuevo modo "Describir lo que comí"**: el usuario escribe una frase como "2 huevos revueltos con media taza de frijol, 1 cucharada de queso fresco y 1 taza de café" y Gemini la separa en alimentos individuales, convirtiendo medidas caseras (taza, cucharada, unidad) a gramos. `lib/ai/gemini.ts`: `analyzeTextWithGemini` (equivalente en texto a `PROMPT_ANALIZAR_PLATO`, que es para foto).
- **`analizarDescripcionComida`** (Server Action en `diario/actions.ts`): tras la interpretación de Gemini, para cada alimento identificado busca en el catálogo local (`foods`, `ilike` exacto por nombre — mismo criterio que `upsertFoodIfNew`); si existe, **reemplaza la estimación de Gemini por los valores guardados** (escalados a los gramos que Gemini calculó), y solo deja la estimación de Gemini tal cual para alimentos genuinamente nuevos. Esto es justo lo que se pidió: "si ya tengo un alimento no consulto a Gemini, sino que sea consulta local" — para la nutrición del ítem, no para la interpretación del texto en sí (eso sí necesita IA, no hay forma de parsear lenguaje natural con reglas fijas).
- **`AgregarComida.tsx`** (nuevo componente, reemplaza a `PhotoUploader.tsx` y `ManualEntryForm.tsx`, ambos borrados): la pantalla de agregar ahora **empieza preguntando "Escaneo por foto" o "Describir lo que comí"**, en vez de mostrar dos bloques siempre visibles (foto + formulario manual). El formulario manual campo-por-campo con autocomplete de un solo alimento queda absorbido por el modo texto (que también consulta el catálogo local) — cubre el mismo caso de uso ("solo aguacate") con menos fricción, y sigue siendo editable antes de guardar igual que el resultado de una foto.
- `addMealEntriesFromPhoto` se generalizó a **`addMealEntriesDesdeIA`** (cubre `foto_plato`, `foto_etiqueta` y `texto_ia`). `buscarAlimentoExterno` y `estimateFoodNutrition` se eliminaron por quedar sin uso tras borrar `ManualEntryForm`.
- **Migración `0002_origen_texto_ia.sql`**: agrega `'texto_ia'` a `meal_entries.origen` y `'ia_texto'` a `foods.fuente` (los `CHECK` no lo permitían). **El usuario ya la corrió** en el SQL Editor de Supabase.
- La lista de alimentos a confirmar ahora muestra el **total de kcal** de lo seleccionado, no solo por ítem.
- **Validado el prompt directo contra la API de Gemini** con el ejemplo exacto del usuario (sin poder usar el navegador esta vez — ver nota abajo): segmentó correctamente en 4 alimentos — huevo revuelto 100g/154kcal, frijoles negros cocidos 120g/114kcal, queso fresco 15g/45kcal, café negro 240g/2kcal (total 315kcal) — con conversión razonable de medidas caseras a gramos.
- **Pendiente de confirmar en el navegador**: la extensión de Chrome se desconectó a mitad de esta sesión y no se pudo recuperar ni con reinicio de Chrome — no se alcanzó a probar visualmente el selector Foto/Describir, el guardado con `texto_ia`, ni el override desde catálogo local dentro de la propia app (aunque el build compila limpio y la lógica de Gemini se validó por separado). Si algo se ve raro al usarlo, es el primer lugar a revisar.

### Bug reportado — "An error occurred in the Server Components render" al usar "Agregar alimento" (sin resolver aún)
El usuario reportó este error genérico de Next.js en producción justo después de la feature de arriba, usando "Agregar alimento" (no se pudo precisar si foto o texto). Next.js oculta el mensaje real en producción (solo un `digest`), así que se investigó sin navegador (seguía desconectado) con estos pasos, **todos exitosos, sin reproducir el error**:
1. Insert directo en `meal_entries` con `origen: 'texto_ia'` → OK (la migración sí aplicó).
2. Insert directo en `foods` con `fuente: 'ia_texto'` → OK.
3. Réplica completa de `analizarDescripcionComida` (llamada real a Gemini con el ejemplo del usuario + búsqueda `ilike` en `foods`) fuera de Next.js → sin errores, "Queso fresco" se resolvió correctamente contra el catálogo local.
4. Réplica completa de `addMealEntriesDesdeIA` (insert de 4 filas + `upsertFoodIfNew` por cada una) → sin errores.
5. **Truco para probar páginas autenticadas sin el navegador**: se puede armar la cookie de sesión de `@supabase/ssr` a mano — iniciar sesión con `supabase-js` (`signInWithPassword`), tomar `data.session`, y mandarla como cookie `sb-liltfoeuabvdwapwjezx-auth-token` con valor `"base64-" + Buffer.from(JSON.stringify(session)).toString('base64url')` en un `curl --cookie`. Sirve contra un `npm run build && npm run start` local. Con esto, recargar `/diario` (incluso con las filas de prueba ya insertadas) devolvió 200 sin ningún rastro de error.
6. Se limpiaron las filas de prueba en `meal_entries` (no en `foods`, esas quedaron como catálogo real: "Huevos revueltos", "Frijoles negros cocidos", "Café negro").

**Conclusión**: el backend (Gemini, Supabase, RLS, migraciones, el render de `/diario` con datos reales) está descartado — todo funciona limpio por fuera de la app. El error solo puede estar en la interacción real navegador → Server Action (algo que no se puede replicar por curl, ya que requiere el protocolo `Next-Action` real del bundle del cliente) o en el render del Client Component en un caso puntual no cubierto por la revisión de código. **Siguiente paso al retomar**: reproducir con `npm run dev` (local, sin ocultar errores) y capturar el mensaje/stack trace completo que sí se muestra en modo desarrollo — eso da el diagnóstico exacto de inmediato.

### Resolución del bug de arriba — causa real: timeout de Vercel, no un bug de lógica
Con la extensión de Chrome reconectada, se reprodujo el flujo "Describir" en `npm run dev` (que sí muestra errores completos) con la descripción exacta del usuario. El log del servidor mostró la causa real:

```
⨯ Error: Gemini API error: 503 { "message": "This model is currently experiencing high demand..." }
    at callGemini (./lib/ai/gemini.ts:36:15)
POST /diario 500 in 48898ms
```

Gemini a veces tarda **hasta 49 segundos** en responder (más aún con un 503 transitorio de por medio) antes de que el propio `try/catch` de la app pueda mostrar un error legible. En Vercel (plan Hobby), las funciones serverless tienen un límite de **10 segundos por defecto** si no se configura `maxDuration` — Vercel mata la función a la fuerza antes de que el `catch` de la app llegue a ejecutarse, y eso es exactamente lo que produce el error genérico "Server Components render" sin detalle. En local (`npm run dev`) no existe ese límite de plataforma, por eso ahí sí se veía el error normal.

**Fix aplicado**:
- `lib/ai/gemini.ts`: `callGemini` ahora aborta la llamada a Gemini a los **20 segundos** (`AbortController`) y lanza un mensaje amigable ("Gemini está tardando más de lo normal... Intenta de nuevo en un momento.") en vez de dejar que cuelgue.
- `app/api/analyze-meal-photo/route.ts`, `app/api/analyze-label/route.ts` y `app/(dashboard)/diario/page.tsx`: se añadió `export const maxDuration = 30;` (30s, con margen sobre los 20s del timeout de Gemini) — necesario en la página de `diario` porque las Server Actions invocadas desde ahí (`analizarDescripcionComida`) heredan el límite de duración de la página que las llama, no el de `actions.ts`.
- **Verificado en el navegador**: tras el fix, se repitió el flujo "Describir" con la misma descripción — Gemini respondió a tiempo (los 503 son intermitentes) y el resultado se interpretó correctamente, incluyendo el override desde catálogo local (los valores de "Huevos revueltos" y "Café" coincidieron exactamente con los ya guardados). El caso de timeout/503 ya se había confirmado antes del fix que cae en el `catch` normal de la app cuando no hay corte de plataforma de por medio; con el `AbortController` a 20s ese mismo `catch` ahora se dispara siempre antes de que Vercel pudiera cortar la función.

### Post-MVP — Editar alimentos del diario (en vez de solo eliminar)
- **`updateMealEntry`** (Server Action nueva en `diario/actions.ts`): actualiza nombre/gramos/calorías/macros de una entrada existente ya guardada.
- **`MealEntryItem.tsx`** (nuevo componente): cada alimento del diario es clickeable — dice **"Editar"**, no "Eliminar", en la vista normal. Al hacer clic se expande a un detalle con los campos editables; cambiar los gramos **recalcula en vivo** calorías/proteína/carbos/grasas usando la densidad nutricional del registro original (kcal por gramo, etc., calculada desde los valores ya guardados, no desde el catálogo). "Eliminar alimento" quedó **dentro** del detalle (ya no es un botón de un clic en la lista principal, para evitar borrados accidentales).
- Esto **solo aplica viendo el día de hoy** — un día pasado sigue mostrando la lista plana sin interacción (ver la decisión de "solo lectura" de la Fase de tira semanal).
- **Verificado sirviendo `/diario` con sesión real** (mismo truco de cookie de arriba, sin navegador todavía): las 5 entradas reales de hoy mostraron "Editar", cero apariciones de "Eliminar" en el HTML inicial, sin errores de render.

### Post-MVP — Solo la cantidad es editable en el detalle de un alimento
El usuario pidió que al editar un alimento del diario **solo se pueda cambiar la cantidad**; calorías y macros ya no son campos de texto libres, siempre se calculan solos.
- `MealEntryItem.tsx`: el nombre pasó a ser texto fijo (no input) y calorías/proteína/carbos/grasas se muestran como tarjetas de solo lectura, no `<input>`. El único campo editable es la cantidad; al cambiarla, los demás valores se recalculan con la densidad nutricional del registro original (igual que antes, solo que ahora el usuario no puede desincronizarlos escribiendo encima).
- **Verificado en el navegador**: cambiar 100g→150g de "Huevos revueltos" recalculó 160→240 kcal y los 3 macros proporcionalmente; "Cancelar" restauró los valores originales sin guardar.

### Post-MVP — Cantidad dinámica por alimento: gramos o unidades
El usuario pidió que la cantidad se edite en la unidad natural de cada alimento — gramos para arroz/frijoles/carne, pero **unidades** para algo que se cuenta por piezas (huevo, uva, tortilla...), en vez de forzar todo a gramos.
- **Migración `0003_unidad_medida.sql`**: agrega `unidad_medida` (`'gramos' | 'unidad'`, default `'gramos'`) y `gramos_por_unidad` (nullable, el peso promedio de una pieza) a `foods` y a `meal_entries`. **El usuario ya la corrió** en el SQL Editor de Supabase. Todo lo existente antes de la migración queda en `'gramos'` por default — no se reclasificó el catálogo viejo retroactivamente.
- **Prompts de Gemini** (`PROMPT_ANALIZAR_PLATO` y el prompt de `analyzeTextWithGemini`): ahora piden, por cada alimento, `unidad_medida` y (si aplica) `gramos_por_unidad`, con la regla explícita "unidad si se cuenta por piezas discretas (huevo, uva, tortilla, rebanada), gramos para todo lo demás". El prompt de etiqueta nutricional no se tocó (una etiqueta ya trae su propia porción fija, no aplica el concepto de unidades sueltas).
- **`upsertFoodIfNew`, `addMealEntriesDesdeIA`, `analizarDescripcionComida`** (`diario/actions.ts`): ahora leen/escriben `unidad_medida`/`gramos_por_unidad` en `foods` y `meal_entries`. Cuando un alimento ya existe en el catálogo local, su `unidad_medida` guardada manda (no la de la nueva estimación de Gemini).
- **`AgregarComida.tsx`** (pantalla de revisión antes de guardar): el campo de cantidad muestra "Unidades" o "Gramos" según el alimento, y al cambiarlo recalcula calorías/macros con la densidad actual del ítem (misma lógica que el detalle de edición).
- **`MealEntryItem.tsx`** (edición de una entrada ya guardada): mismo comportamiento — "Cantidad (unidades)" vs "Cantidad (gramos)" según `entry.unidad_medida`, convirtiendo unidades↔gramos internamente (la base de datos siempre guarda `cantidad_gramos`).
- **`lib/utils/cantidad.ts`** (nuevo): `formatCantidad(entry)` centraliza cómo se muestra la cantidad ("3 unidades" vs "150g"), usado tanto en `MealEntryItem` como en la lista de solo lectura de días pasados en `diario/page.tsx`.
- **Verificado en el navegador**: descripción "200 gramos de arroz, 2 huevos duros y 8 uvas" → "Arroz cocido" quedó en gramos (200), "Huevo duro" y "Uvas" en unidades (2 y 8); cambiar "Huevo duro" de 2→3 en la pantalla de revisión recalculó 155→233 kcal. Se guardó una entrada real de "uva" (4 unidades) y se editó a 8 unidades desde el diario — recalculó 13.8→28 kcal correctamente. Se limpió la entrada de prueba al terminar (el alimento "uva" queda en el catálogo, igual que otras entradas de prueba anteriores).

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
