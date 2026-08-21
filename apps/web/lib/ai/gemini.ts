// Wrapper mínimo para llamar a Gemini (modelo Flash) con una imagen + prompt,
// pidiendo respuesta en JSON estructurado. Se usa solo desde API routes
// (nunca desde el cliente) porque necesita GEMINI_API_KEY.

// Alias "latest" en vez de una versión fija: Google retira versiones viejas
// periódicamente (nos pasó con gemini-2.0-flash), y este proyecto prioriza
// bajo mantenimiento sobre fijar un modelo exacto.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
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
