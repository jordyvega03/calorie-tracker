# Plan de Desarrollo — Contador de Calorías y Entrenamientos

> App web (Next.js/PWA) para registrar comidas por día y por tipo de comida (desayuno, almuerzo, cena, snacks), registrar sesiones de entrenamiento, y analizar fotos de comida/etiquetas nutricionales con IA de bajo costo. Stack elegido para costo de infraestructura = $0/mes en uso personal/bajo volumen.

> **Estado actual: Fases 0-2 completas y probadas.** Ver [`docs/progreso.md`](./docs/progreso.md) para el detalle de qué se hizo, decisiones tomadas en el camino, y cómo retomar con la Fase 3.

---

## 1. Resumen ejecutivo

| Decisión | Elección | Por qué |
|---|---|---|
| Plataforma | Web app (Next.js, App Router) + PWA instalable | Un solo deploy, sin fricción de tiendas de apps, funciona en cualquier celular como app |
| Hosting front + API | Vercel (plan Hobby, gratis) | Next.js corre nativo ahí, incluye las API routes (BFF), CI/CD automático desde git |
| Backend de datos | Supabase (plan Free) | Postgres + Auth + Storage + RLS en un solo servicio gratis, sin servidor propio que mantener |
| Autenticación | Supabase Auth (email/password + magic link) | Incluido en el free tier, sin costo extra |
| Storage de imágenes | Supabase Storage (bucket privado, 1GB free) | Ya incluido en el mismo proyecto, sin cuenta adicional |
| Análisis de imágenes | Google Gemini 2.0/2.5 Flash (API multimodal) | El modelo de visión más barato del mercado actualmente, con tier gratuito generoso para uso bajo/personal |
| ORM/acceso a datos | Supabase JS client + SQL directo en migraciones | Evita capas extra; RLS hace de "seguridad" en vez de lógica de backend compleja |

**Costo estimado mensual para uso personal (1 usuario, uso diario normal): $0.** Ver sección 7 para el detalle de límites y cuándo empezarías a pagar.

---

## 2. Requerimientos

### 2.1 Funcionales

**Alimentación**
- Registrar alimentos consumidos, agrupados por día y por tipo de comida: `desayuno`, `almuerzo`, `cena`, `snack` (puede haber varios snacks al día).
- Cada registro tiene: nombre del alimento, cantidad (g/ml o unidades), calorías, macros (proteína/carbos/grasas), hora, y opcionalmente una foto.
- Poder registrar un alimento manualmente (buscando en un catálogo propio o escribiendo libre) o vía foto + IA.
- Ver resumen del día: calorías totales consumidas vs. objetivo, desglose por comida, macros.
- Historial por rango de fechas (semana, mes) con gráficas simples.

**Entrenamientos**
- Registrar sesiones de entrenamiento: tipo (cardio, fuerza, otro), duración, calorías estimadas quemadas, notas.
- Para entrenamientos de fuerza, poder detallar ejercicios (nombre, series, repeticiones, peso) — opcional, no bloquea el registro rápido.
- Ver historial de entrenamientos y su impacto en el balance calórico del día.

**Análisis de imágenes (dos modos, el usuario elige)**
1. **Foto del plato/comida** → la IA identifica los alimentos visibles y estima cantidad/calorías/macros. El usuario **siempre revisa y puede editar** el resultado antes de guardarlo (la IA nunca guarda directo, por precisión y para evitar registros erróneos silenciosos).
2. **Foto de etiqueta nutricional** → OCR estructurado que extrae los valores exactos impresos (calorías, proteína, carbos, grasas, tamaño de porción). Mayor precisión porque son datos impresos, no estimación visual.

**Perfil**
- Datos básicos (peso, altura, sexo, fecha de nacimiento, objetivo calórico diario) para poder calcular el balance.

### 2.2 No funcionales
- **Costo de infraestructura ≈ $0/mes** en uso personal/bajo volumen (ver sección 7).
- **Bajo esfuerzo de mantenimiento**: sin servidores propios, sin contenedores, sin colas — todo administrado (Supabase + Vercel).
- **Responsive / mobile-first**, instalable como PWA (ícono en home screen, funciona casi como app nativa).
- Datos privados por usuario (Row Level Security en Postgres: cada quien solo ve lo suyo).

---

## 3. Arquitectura

```
┌─────────────────────────────┐
│   Next.js App (Vercel)      │
│                              │
│  ┌────────────┐  ┌────────┐ │
│  │  Front-end  │  │  API   │ │   API routes = "backend for frontend"
│  │  (App Router│  │ routes │ │   Únicas que conocen la API key de Gemini
│  │  + React)   │  │ (BFF)  │ │   (nunca se expone al cliente)
│  └──────┬──────┘  └───┬────┘ │
└─────────┼──────────────┼─────┘
          │ supabase-js  │ fetch (server-side)
          ▼              ▼
   ┌─────────────┐  ┌───────────────┐
   │  Supabase   │  │  Gemini API   │
   │  - Postgres │  │  (Flash,     │
   │  - Auth     │  │   visión)     │
   │  - Storage  │  └───────────────┘
   │  - RLS      │
   └─────────────┘
```

**Por qué no un backend separado (Node/Express, etc.)**: agregaría un servicio más que hostear, versionar y pagar. Las API routes de Next.js ya cubren el único caso que necesita un secreto server-side (llamar a Gemini con la API key). Todo lo demás (leer/escribir comidas, entrenamientos) el front lo hace directo contra Supabase usando el cliente JS + RLS, que es más simple y con menos latencia (un salto menos).

**Flujo de análisis de foto de plato:**
1. Usuario toma/sube foto → se comprime en el navegador (resize a ~1024px, WebP) antes de subir, para ahorrar storage.
2. Se sube a Supabase Storage (bucket privado `meal-photos/{user_id}/...`).
3. El front llama a `POST /api/analyze-meal-photo` con el path del storage.
4. La API route genera una URL firmada, la envía a Gemini con un prompt que pide **JSON estructurado**: lista de alimentos detectados, gramos estimados, calorías y macros por alimento.
5. El resultado se muestra al usuario en un formulario editable — nada se guarda hasta que confirma.
6. Al confirmar, se inserta en `meal_entries`. La foto original se puede descartar o conservar como thumbnail (configurable) para no consumir el 1GB gratis rápido.

**Flujo de análisis de etiqueta:** igual, pero el prompt a Gemini pide extraer campos exactos de una etiqueta nutricional (calorías por porción, tamaño de porción, macros) en vez de estimar visualmente.

---

## 4. Modelo de datos (Postgres / Supabase)

```
profiles            -- 1:1 con auth.users
  id (uuid, PK, = auth.users.id)
  full_name
  sexo
  fecha_nacimiento
  altura_cm
  peso_kg
  objetivo_calorico_diario
  created_at

foods                -- catálogo de alimentos (propio, crece con el uso)
  id (uuid, PK)
  nombre
  marca (nullable)
  calorias_100g
  proteina_100g
  carbos_100g
  grasas_100g
  fuente  enum: manual | ia_foto | ia_etiqueta | seed
  created_by (uuid, FK -> auth.users, nullable si es seed global)
  created_at

meal_entries          -- cada alimento registrado en una comida
  id (uuid, PK)
  user_id (uuid, FK -> auth.users)
  food_id (uuid, FK -> foods, nullable)   -- null si fue "texto libre"
  nombre_libre (text, nullable)
  tipo_comida  enum: desayuno | almuerzo | cena | snack
  cantidad_gramos
  calorias
  proteina
  carbos
  grasas
  fecha (date)
  hora (time, default now())
  origen  enum: manual | foto_plato | foto_etiqueta
  foto_url (nullable)
  created_at

workouts
  id (uuid, PK)
  user_id (uuid, FK -> auth.users)
  tipo  enum: cardio | fuerza | otro
  nombre
  duracion_min
  calorias_quemadas
  fecha (date)
  notas (nullable)
  created_at

workout_exercises     -- detalle opcional para entrenamientos de fuerza
  id (uuid, PK)
  workout_id (uuid, FK -> workouts)
  nombre_ejercicio
  series
  repeticiones
  peso_kg
  orden

-- Vista de conveniencia:
daily_summary (view)  -- por user_id + fecha: total calorías consumidas,
                       -- total quemadas, macros totales, neto
```

Ver `supabase/migrations/0001_init.sql` para el SQL completo con políticas RLS (cada tabla con `user_id` tiene policy `auth.uid() = user_id` para select/insert/update/delete).

---

## 5. Estructura de carpetas del proyecto

```
calorie-tracker/
├── PLAN.md                        ← este archivo
├── README.md                      ← guía rápida para levantar el proyecto
├── .env.example                   ← variables de entorno necesarias
├── docs/
│   └── decisiones-tecnicas.md     ← ADRs cortos, por qué se eligió cada cosa
├── supabase/
│   ├── config.toml                ← config del CLI de Supabase (dev local)
│   ├── migrations/
│   │   └── 0001_init.sql          ← schema completo + RLS
│   └── functions/                 ← (futuro) Edge Functions si se necesitan
└── apps/
    └── web/                       ← Next.js: front-end + API routes
        ├── package.json
        ├── next.config.js
        ├── tsconfig.json
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx                        ← landing / redirect a /diario
        │   ├── globals.css
        │   ├── (auth)/
        │   │   └── login/page.tsx
        │   ├── (dashboard)/
        │   │   ├── diario/page.tsx              ← registro diario de comidas
        │   │   ├── entrenamientos/page.tsx
        │   │   ├── reportes/page.tsx            ← históricos/gráficas
        │   │   └── perfil/page.tsx
        │   └── api/
        │       ├── analyze-meal-photo/route.ts  ← llama a Gemini (foto plato)
        │       ├── analyze-label/route.ts       ← llama a Gemini (etiqueta)
        │       ├── meal-entries/route.ts         ← opcional: validación server-side
        │       └── workouts/route.ts
        ├── components/
        │   ├── ui/                              ← botones, inputs, cards genéricos
        │   ├── diario/                          ← formularios y listas de comidas
        │   └── entrenamientos/
        ├── lib/
        │   ├── supabase/
        │   │   ├── client.ts                    ← cliente para uso en browser
        │   │   └── server.ts                    ← cliente para uso en API routes (service role)
        │   ├── ai/
        │   │   └── gemini.ts                     ← wrapper de llamadas a Gemini + prompts
        │   └── utils/
        │       └── image.ts                      ← compresión/resize de imágenes en cliente
        ├── types/
        │   └── database.ts                       ← tipos generados desde el schema de Supabase
        └── public/
            ├── manifest.json                     ← manifest de PWA
            └── icons/
```

---

## 6. Fases de desarrollo (roadmap)

1. ✅ **Fase 0 — Setup**: crear proyecto Supabase, correr migración inicial, crear proyecto Next.js, conectar variables de entorno. *(deploy en Vercel queda pendiente, se sigue probando en local)*
2. ✅ **Fase 1 — MVP registro manual**: auth, perfil, CRUD de `meal_entries` (manual, sin IA), CRUD de `workouts`, resumen del día. **Esto ya es un app usable.**
3. ✅ **Fase 2 — Análisis de imágenes**: subir foto de plato → Gemini → confirmar → guardar. Subir foto de etiqueta → Gemini OCR → confirmar → guardar.
4. ✅ **Fase 3 — Reportes**: gráficas 7/30 días, calorías vs. meta, balance neto diario. *(tendencia de peso a lo largo del tiempo queda pendiente, no hay historial de peso, solo el valor actual en el perfil)*
5. ✅ **Fase 4 — PWA + pulido**: manifest, íconos, instalación, offline básico (cache de la última vista del diario), accesibilidad básica de formularios.

**Con esto, el roadmap original está completo.** Queda pendiente el deploy a producción (Vercel) y algunas decisiones de pulido opcional — ver [`docs/progreso.md`](./docs/progreso.md) para el detalle y los próximos pasos sugeridos.

No conviene empezar por el análisis de imágenes: el registro manual es el corazón del producto y sirve de fallback siempre (la IA puede fallar o no tener conexión).

---

## 7. Análisis de costos (por qué se mantiene en $0)

| Servicio | Free tier | Límite relevante | Qué pasa si se excede |
|---|---|---|---|
| **Supabase** | Plan Free | 500MB Postgres, 1GB Storage, 5GB egress/mes, 50k usuarios activos/mes, proyecto se pausa tras 1 semana sin uso (se reactiva con un click) | Se sube a plan Pro ($25/mes) — muy lejos para uso personal |
| **Vercel** | Plan Hobby | 100GB bandwidth/mes, builds ilimitados razonables | Suficiente por años para un app personal |
| **Gemini API (Flash)** | Tier gratuito de Google AI Studio | Límite de requests/día generoso para uso personal (verificar límite vigente al implementar, cambia con el tiempo) | Aun pagando, Flash cuesta fracciones de centavo por imagen — decenas de análisis al mes serían céntimos de dólar |

**Recomendaciones para no acercarse a los límites:**
- Comprimir imágenes en el cliente antes de subir (WebP, ~200-400KB en vez de 3-5MB de una foto original) — estira mucho el 1GB de Storage.
- No guardar la foto original después de extraer los datos, a menos que el usuario explícitamente quiera conservarla (guardar solo un thumbnail pequeño si la quiere).
- Cachear/reusar entradas del catálogo `foods` en vez de volver a llamar a la IA para el mismo alimento repetido.

---

## 8. Seguridad

- **RLS en todas las tablas de usuario**: nadie puede leer/escribir datos de otro usuario, ni siquiera con la anon key expuesta en el cliente.
- **API keys sensibles (Gemini, Supabase service role) solo viven en variables de entorno server-side** (Vercel), nunca en código del cliente ni en el bundle del front.
- **Rate limiting básico** en `/api/analyze-*` (por usuario, ej. máx N análisis por hora) para evitar abuso que dispare costos si el link se filtra o hay un bug en el front.
- Passwords y sesiones los maneja Supabase Auth (no se implementa nada custom de auth).

---

## 9. Próximos pasos inmediatos

1. Crear proyecto en [supabase.com](https://supabase.com) (free) y correr `supabase/migrations/0001_init.sql`.
2. Conseguir API key de Gemini en Google AI Studio.
3. `cd apps/web && npm install` (después de completar `package.json` con las dependencias reales) y correr `npm run dev`.
4. Copiar `.env.example` a `.env.local` y completar las llaves.
5. Empezar por Fase 1 (registro manual) antes de tocar IA.
