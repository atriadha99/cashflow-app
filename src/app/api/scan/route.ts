import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const { imageBase64 } = await req.json();
    
    // Membersihkan format base64 (menghapus data:image/jpeg;base64,)
    const base64Data = imageBase64.split(",")[1];

    const prompt = "Ekstrak data dari struk ini. Berikan jawaban HANYA dalam format JSON mentah: { \"nominal\": number, \"keterangan\": \"string\", \"kategori\": \"Makan|Transport|Belanja|Tagihan|Hiburan|Jajan|Lainnya\" }";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanedJson = text.replace(/```json|```/g, "").trim();
    
    return NextResponse.json(JSON.parse(cleanedJson));
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    return NextResponse.json({ error: "Gagal memproses gambar dengan Gemini" }, { status: 500 });
  }
}