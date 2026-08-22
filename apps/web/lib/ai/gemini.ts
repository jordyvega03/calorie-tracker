// Wrapper mínimo para llamar a Gemini (modelo Flash), pidiendo respuesta en
// JSON estructurado. Se usa solo desde el servidor (API routes / Server
// Actions, nunca desde el cliente) porque necesita GEMINI_API_KEY.

// Alias "latest" en vez de una versión fija: Google retira versiones viejas
// periódicamente (nos pasó con gemini-2.0-flash), y este proyecto prioriza
// bajo mantenimiento sobre fijar un modelo exacto.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Vercel corta las funciones serverless a la fuerza si se pasan de su
// límite de tiempo (10s en el plan Hobby sin configurar maxDuration) —
// eso se ve del lado del usuario como un error genérico de plataforma,
// no como el mensaje de error normal de la app. Por eso abortamos la
// llamada a Gemini nosotros mismos, más rápido que ese límite, para
// poder mostrar un mensaje entendible ("tardó mucho, intenta de nuevo")
// en vez de dejar que la plataforma mate la función a medias.
const GEMINI_TIMEOUT_MS = 20_000;

async function callGemini(parts: Record<string, unknown>[]): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Gemini está tardando más de lo normal (posible alta demanda). Intenta de nuevo en un momento."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Respuesta de Gemini sin contenido");

  return JSON.parse(text);
}

type GeminiImageAnalysisInput = {
  imageBase64: string;
  mimeType: string;
  prompt: string;
};

export async function analyzeImageWithGemini({
  imageBase64,
  mimeType,
  prompt,
}: GeminiImageAnalysisInput): Promise<unknown> {
  return callGemini([
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: imageBase64 } },
  ]);
}

export const PROMPT_ANALIZAR_PLATO = `
Analiza esta foto de un plato de comida. Identifica cada alimento visible y
estima su cantidad en gramos y su información nutricional.

Para cada alimento indica también cómo se mide naturalmente al comerlo:
- "unidad" si se cuenta por piezas discretas (ej. huevo, uva, tortilla,
  rebanada de pan) — en ese caso incluye "gramos_por_unidad" con el peso
  promedio de una sola pieza.
- "gramos" para todo lo demás (ej. arroz, frijoles, carne, ensalada) — en
  ese caso "gramos_por_unidad" va en null.

Responde ÚNICAMENTE con un JSON con esta forma exacta:
{
  "alimentos": [
    {
      "nombre": string,
      "cantidad_gramos": number,
      "calorias": number,
      "proteina_g": number,
      "carbos_g": number,
      "grasas_g": number,
      "unidad_medida": "gramos" | "unidad",
      "gramos_por_unidad": number | null
    }
  ],
  "confianza": "alta" | "media" | "baja"
}
`.trim();

export const PROMPT_ANALIZAR_ETIQUETA = `
Lee esta foto de una etiqueta de información nutricional y extrae los datos
exactos impresos (no estimes, usa los valores literales de la etiqueta).

Responde ÚNICAMENTE con un JSON con esta forma exacta:
{
  "nombre_producto": string | null,
  "tamano_porcion_g": number | null,
  "calorias_por_porcion": number,
  "proteina_g": number,
  "carbos_g": number,
  "grasas_g": number
}
`.trim();


export type AlimentoDeTexto = {
  nombre: string;
  cantidad_gramos: number;
  calorias: number;
  proteina_g: number;
  carbos_g: number;
  grasas_g: number;
  unidad_medida: "gramos" | "unidad";
  gramos_por_unidad: number | null;
};

// Interpreta una descripción libre de una comida completa ("2 huevos
// revueltos con media taza de frijol, 1 cucharada de queso fresco y 1 taza
// de café") y la separa en alimentos individuales, convirtiendo medidas
// caseras a gramos. Es el equivalente en texto de PROMPT_ANALIZAR_PLATO
// (foto), para cuando el usuario prefiere escribir en vez de tomar una foto.
export async function analyzeTextWithGemini(
  descripcion: string
): Promise<{ alimentos: AlimentoDeTexto[] }> {
  const prompt = `
Un usuario describe en lenguaje natural (español, con medidas caseras
comunes en Guatemala como taza, cucharada, unidad, rebanada) los alimentos
de una comida.

Descripción: "${descripcion}"

Identifica cada alimento por separado y estima su cantidad en gramos
(convierte medidas caseras como "media taza", "1 cucharada", "una unidad" a
gramos usando equivalencias típicas para ese alimento) y su información
nutricional para esa cantidad.

Para cada alimento indica también cómo se mide naturalmente al comerlo:
- "unidad" si se cuenta por piezas discretas (ej. huevo, uva, tortilla,
  rebanada de pan) — en ese caso incluye "gramos_por_unidad" con el peso
  promedio de una sola pieza.
- "gramos" para todo lo demás (ej. arroz, frijoles, carne, café) — en ese
  caso "gramos_por_unidad" va en null.

Responde ÚNICAMENTE con este JSON:
{
  "alimentos": [
    {
      "nombre": string,
      "cantidad_gramos": number,
      "calorias": number,
      "proteina_g": number,
      "carbos_g": number,
      "grasas_g": number,
      "unidad_medida": "gramos" | "unidad",
      "gramos_por_unidad": number | null
    }
  ]
}

Si no logras identificar ningún alimento en la descripción, responde
{ "alimentos": [] }.
`.trim();

  const resultado = await callGemini([{ text: prompt }]);
  return resultado as { alimentos: AlimentoDeTexto[] };
}
