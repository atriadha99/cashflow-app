import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiResponseHandler } from "@/lib/apiResponse";
import { isRateLimited, getRateLimitKey, getRateLimitInfo } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // Get client IP untuk rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = getRateLimitKey(clientIp, '/api/scan');

    // Check rate limit
    if (isRateLimited(rateLimitKey)) {
      const rateLimitInfo = getRateLimitInfo(rateLimitKey);
      return ApiResponseHandler.rateLimited(rateLimitInfo.resetTime);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return ApiResponseHandler.error("Konfigurasi server tidak lengkap", 500, 'CONFIG_ERROR');
    }

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return ApiResponseHandler.badRequest("imageBase64 tidak boleh kosong");
    }

    // Membersihkan format base64 (menghapus data:image/jpeg;base64,)
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const parsedData = JSON.parse(cleanedJson);
    
    return ApiResponseHandler.success(parsedData, "Scan berhasil", 200);
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    
    if (error instanceof SyntaxError) {
      return ApiResponseHandler.error("Format respons tidak valid", 400, 'PARSE_ERROR');
    }
    
    return ApiResponseHandler.error(
      "Gagal memproses gambar dengan Gemini",
      500,
      'GEMINI_ERROR'
    );
  }
}