// Wrapper mínimo para llamar a Gemini (modelo Flash), pidiendo respuesta en
// JSON estructurado. Se usa solo desde el servidor (API routes / Server
// Actions, nunca desde el cliente) porque necesita GEMINI_API_KEY.

// Alias "latest" en vez de una versión fija: Google retira versiones viejas
// periódicamente (nos pasó con gemini-2.0-flash), y este proyecto prioriza
// bajo mantenimiento sobre fijar un modelo exacto.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(parts: Record<string, unknown>[]): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

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

Responde ÚNICAMENTE con un JSON con esta forma exacta:
{
  "alimentos": [
    {
      "nombre": string,
      "cantidad_gramos": number,
      "calorias": number,
      "proteina_g": number,
      "carbos_g": number,
      "grasas_g": number
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

export type EstimacionNutricional = {
  encontrado: boolean;
  nombre_normalizado: string;
  calorias_100g: number;
  proteina_100g: number;
  carbos_100g: number;
  grasas_100g: number;
};

// Estimación por texto (sin imagen) para cuando el usuario escribe un
// alimento que no está en su catálogo local (tabla `foods`). Pensado para
// alimentos genéricos/caseros (incluida comida guatemalteca) en vez de
// productos de marca — para eso ya está "Foto de etiqueta".
export async function estimateFoodNutrition(nombre: string): Promise<EstimacionNutricional> {
  const prompt = `
Da la información nutricional de referencia por cada 100 gramos del siguiente
alimento: "${nombre}".

Es un alimento genérico, no un producto de marca — usa valores nutricionales
típicos de tablas de composición de alimentos (ej. USDA, INCAP) para ese
alimento tal como se come normalmente. Si el nombre describe una preparación
conocida (ej. "frijoles negros molidos", "tortilla de maíz", "plátano frito"),
considérala tal cual.

Responde ÚNICAMENTE con este JSON:
{
  "encontrado": boolean,
  "nombre_normalizado": string,
  "calorias_100g": number,
  "proteina_100g": number,
  "carbos_100g": number,
  "grasas_100g": number
}

Si "${nombre}" no es un alimento identificable, responde con "encontrado": false
y el resto de los campos en 0.
`.trim();

  const resultado = await callGemini([{ text: prompt }]);
  return resultado as EstimacionNutricional;
}
