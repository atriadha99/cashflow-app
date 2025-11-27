import { NextResponse } from "next/server";

export const maxDuration = 60; 

export async function POST(req: Request) {
  console.log("🚀 API Scan Dipanggil...");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key Server Hilang" }, { status: 500 });
    }

    const body = await req.json();
    const { imageBase64 } = body;
    if (!imageBase64) {
      return NextResponse.json({ error: "Gambar tidak diterima" }, { status: 400 });
    }
    
    // Bersihkan data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // --- PERBAIKAN DI SINI (Hapus '-latest') ---
    // Gunakan nama model standar 'gemini-1.5-flash' yang pasti ada di v1beta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          { text: "Extract data JSON: { \"amount\": number, \"text\": \"merchant name\", \"date\": \"YYYY-MM-DD\" }. Return ONLY JSON." },
          { inline_data: { mime_type: "image/jpeg", data: base64Data } }
        ]
      }]
    };

    console.log("⏳ Mengirim ke Google...");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔥 GOOGLE ERROR:", response.status, errorText);
      // Lempar error biar ketangkap catch di bawah
      throw new Error(`Google Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Google menjawab!");

    let textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("AI tidak memberikan teks jawaban.");

    // Bersihkan JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) textResponse = jsonMatch[0];

    // Parsing
    let data;
    try {
        data = JSON.parse(textResponse);
        data.amount = Math.abs(Number(data.amount) || 0);
    } catch (e) {
        console.error("Gagal Parse:", textResponse);
        data = { amount: 0, text: "Gagal Baca", date: "-" };
    }
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("💥 CRITICAL SERVER ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}