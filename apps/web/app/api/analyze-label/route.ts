import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { analyzeImageWithGemini, PROMPT_ANALIZAR_ETIQUETA } from "@/lib/ai/gemini";

// Igual que /api/analyze-meal-photo pero para fotos de etiquetas
// nutricionales (OCR estructurado en vez de estimación visual).
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req.headers.get("authorization"));
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { storagePath, mimeType } = await req.json();
    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "storagePath requerido" }, { status: 400 });
    }
    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "No autorizado para esta imagen" }, { status: 403 });
    }

    const { data: file, error } = await supabase.storage
      .from("meal-photos")
      .download(storagePath);

    if (error || !file) {
      return NextResponse.json({ error: "No se pudo leer la imagen" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");

    const resultado = await analyzeImageWithGemini({
      imageBase64,
      mimeType: mimeType ?? "image/webp",
      prompt: PROMPT_ANALIZAR_ETIQUETA,
    });

    return NextResponse.json({ resultado });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error analizando la etiqueta" }, { status: 500 });
  }
}
