import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key tidak ditemukan." }, { status: 500 });
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "Data gambar tidak ada." }, { status: 400 });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      ANALISIS STRUK BELANJA:
      Ekstrak informasi berikut dari struk ini:
      - Total amount (hanya angka, tanpa simbol)
      - Nama merchant/toko
      - Tanggal transaksi
      
      JAWABAN HANYA DALAM FORMAT JSON:
      {"amount": 0, "text": "nama toko", "date": "tanggal"}
    `;

    // --- SOLUSI PASTI: PAKAI MODEL YANG SUDAH TERBUKTI ---
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    console.log("Menggunakan URL:", url); // Debug log

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google API Error Details:", errorData);
      
      // Coba alternatif model jika gagal
      return await tryAlternativeModel(apiKey, base64Data, prompt);
    }

    const result = await response.json();
    let textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!textResponse) {
      throw new Error("Tidak ada response dari Gemini.");
    }

    // Extract JSON
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const cleanedResponse = jsonMatch ? jsonMatch[0] : textResponse;

    let data;
    try {
      data = JSON.parse(cleanedResponse);
    } catch (err) {
      console.error("Raw response untuk debug:", textResponse);
      data = { 
        amount: 0, 
        text: "Format response tidak valid", 
        date: "-" 
      };
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Server Error:", error.message);
    return NextResponse.json({ 
      error: "Gagal memproses struk. Silakan input manual.",
      debug: error.message 
    }, { status: 500 });
  }
}

// FUNCTION FALLBACK UNTUK MODEL ALTERNATIF
async function tryAlternativeModel(apiKey: string, base64Data: string, prompt: string) {
  console.log("Mencoba model alternatif...");
  
  const alternativeModels = [
    "gemini-1.5-pro-latest",
    "gemini-pro-vision", 
    "gemini-pro"
  ];

  for (const model of alternativeModels) {
    try {
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`;
      console.log(`Mencoba model: ${model}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg", 
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (textResponse) {
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          const cleanedResponse = jsonMatch ? jsonMatch[0] : textResponse;
          
          return NextResponse.json(JSON.parse(cleanedResponse));
        }
      }
    } catch (error) {
      console.log(`Model ${model} gagal, mencoba berikutnya...`);
      continue;
    }
  }
  
  throw new Error("Semua model Gemini gagal. Periksa API Key dan quota.");
}