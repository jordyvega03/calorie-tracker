# Decisiones técnicas (ADRs cortos)

## 1. Next.js único (front + API routes) en vez de front y backend separados
Un solo repo, un solo deploy en Vercel. Las API routes solo existen para las
dos cosas que necesitan un secreto server-side: llamar a Gemini y (si hiciera
falta) usar la service role key de Supabase. Todo lo demás va directo
front → Supabase con RLS. Menos piezas que mantener, menos costo.

## 2. Supabase en vez de backend propio (Node/Express + Postgres administrado)
Supabase free tier ya da Postgres + Auth + Storage + RLS en un solo lugar.
Montar esto uno mismo implicaría hostear una API, una base de datos y un
servicio de auth por separado — más piezas, más costo, más mantenimiento.

## 3. Gemini Flash para análisis de imágenes
Es de los modelos multimodales más baratos disponibles y soporta salida JSON
estructurada directamente, lo que evita tener que parsear texto libre.
Alternativas evaluadas y descartadas por costo/complejidad: APIs
especializadas de reconocimiento de comida (LogMeal, CalorieMama) — tienen
tiers pagos desde el inicio y cubren un solo caso de uso (foto de plato),
mientras que Gemini cubre los dos casos (plato + etiqueta) con el mismo
proveedor.

## 4. Confirmación manual obligatoria tras análisis de IA
Ni la foto de plato ni la de etiqueta se guardan automáticamente: el
resultado de Gemini siempre pasa por una pantalla de confirmación/edición.
Motivo: la estimación visual de un plato puede tener errores importantes, y
un registro erróneo silencioso rompe la confianza en el conteo total del día.

## 5. Comprimir imágenes en el cliente antes de subir
Reduce el consumo del 1GB gratis de Storage y el tamaño (= costo/latencia) de
lo que se envía a Gemini. Se hace con Canvas API en el navegador, sin
librerías externas.

## 6. Zona horaria fija a Guatemala en vez de usar UTC o la del servidor
Next.js/Node y Postgres (Supabase) usan UTC por defecto. Como la app es de un
solo usuario en Guatemala (UTC-6, sin horario de verano), calcular "hoy" en
UTC hacía que el día cambiara varias horas antes de medianoche real —
confirmado durante las pruebas (8pm en Guatemala ya era el día siguiente en
UTC). La fecha/hora de cada registro y el "hoy" del diario y reportes ahora
se calculan explícitamente con `Intl.DateTimeFormat(..., { timeZone:
"America/Guatemala" })` (`lib/utils/date.ts`) en vez de dejarlo al default
del servidor o de Postgres. Si algún día hay usuarios fuera de Guatemala,
esto tendría que volverse un campo del perfil en vez de una constante.
