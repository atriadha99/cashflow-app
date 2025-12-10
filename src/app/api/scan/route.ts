import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 1. Ambil API Key Groq
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key Server Hilang" }, { status: 500 });
    }

    const body = await req.json();
    const { imageBase64 } = body;
    if (!imageBase64) {
      return NextResponse.json({ error: "Gambar tidak diterima" }, { status: 400 });
    }

    // 2. Format Base64 untuk Groq
    // Groq membutuhkan format Data URL lengkap (data:image/jpeg;base64,...)
    // Jika input sudah ada headernya, pakai langsung. Jika belum, tambahkan.
    const base64Content = imageBase64.startsWith("data:") 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    // 3. Kirim ke Groq API (Llama 3.2 Vision)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // Model Vision Preview yang Gratis & Cepat
        model: "llama-3.2-11b-vision-preview", 
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze this receipt image. Extract data into this JSON format: { \"amount\": number, \"text\": \"merchant name\", \"date\": \"YYYY-MM-DD\" }. Return ONLY the raw JSON string. Do not use markdown blocks." 
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: base64Content 
                } 
              }
            ]
          }
        ],
        temperature: 0.1, // Agar jawaban konsisten/pasti
        max_tokens: 1024,
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Groq Error:", JSON.stringify(err));
      throw new Error(err.error?.message || "Gagal kontak Groq");
    }

    const result = await response.json();
    let textResponse = result.choices[0]?.message?.content;

    if (!textResponse) throw new Error("AI tidak memberikan jawaban.");

    // 4. Bersihkan JSON
    // Kadang AI menambahkan ```json ... ```, kita hapus biar bersih
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) textResponse = jsonMatch[0];

    // 5. Parsing Data
    let data;
    try {
      data = JSON.parse(textResponse);
      // Pastikan amount angka positif
      data.amount = Math.abs(Number(data.amount) || 0);
      // Validasi tanggal sederhana
      if (!data.date || data.date === "null") data.date = new Date().toISOString().split('T')[0];
    } catch (e) {
      console.error("Gagal Parse JSON:", textResponse);
      // Fallback jika gagal baca
      data = { 
        amount: 0, 
        text: "Gagal Baca Struk", 
        date: new Date().toISOString().split('T')[0] 
      };
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}