import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("🚀 Memulai proses Scan Struk...");

  try {
    // 1. CEK API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ ERROR FATAL: API Key tidak terbaca! Cek file .env.local");
      return NextResponse.json({ error: "API Key Server Hilang" }, { status: 500 });
    }
    console.log("✅ API Key terdeteksi (Aman)");

    // 2. TERIMA GAMBAR
    const body = await req.json();
    const { imageBase64 } = body;
    
    if (!imageBase64) {
      console.error("❌ ERROR: Gambar tidak diterima oleh backend");
      return NextResponse.json({ error: "Gambar tidak sampai ke server" }, { status: 400 });
    }
    console.log("✅ Gambar diterima. Panjang data:", imageBase64.length, "karakter");

    // 3. PROSES KE GOOGLE
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Baca struk ini. Ambil: 1. Total (angka), 2. Merchant, 3. Tanggal.
      Jawab JSON Murni: { "amount": 0, "text": "string", "date": "string" }
    `;

    console.log("⏳ Sedang menghubungi Google Gemini...");
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }]
      })
    });

    // 4. CEK RESPON GOOGLE
    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔥 GOOGLE MENOLAK REQUEST:", errorText);
      throw new Error(`Google Error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Google menjawab. Memproses data...");

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("AI tidak memberikan teks jawaban.");

    // Bersihkan JSON
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson);

    console.log("🎉 SUKSES! Hasil:", data);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("💥 ERROR TERJADI:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}