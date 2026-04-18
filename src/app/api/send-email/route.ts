import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { ApiResponseHandler } from '@/lib/apiResponse';
import { isRateLimited, getRateLimitKey, getRateLimitInfo } from '@/lib/rateLimiter';

// Paksa mode dinamis agar tidak dijalankan saat Build
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get client IP untuk rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = getRateLimitKey(clientIp, '/api/send-email');

    // Check rate limit
    if (isRateLimited(rateLimitKey)) {
      const rateLimitInfo = getRateLimitInfo(rateLimitKey);
      return ApiResponseHandler.rateLimited(rateLimitInfo.resetTime);
    }

    const { email, fileBase64, fileName, period } = await req.json();

    // Validation
    if (!email || !fileBase64) {
      return ApiResponseHandler.badRequest('Email dan fileBase64 harus disediakan');
    }

    // Email validation
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return ApiResponseHandler.badRequest('Format email tidak valid');
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      return ApiResponseHandler.error('Konfigurasi server tidak lengkap', 500, 'CONFIG_ERROR');
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: 'TemuCashflow <onboarding@resend.dev>',
      to: [email],
      subject: `Laporan Keuangan - ${period || 'Bulanan'}`,
      html: `
        <h1>Halo! 👋</h1>
        <p>Berikut adalah laporan keuangan Anda untuk periode <strong>${period || 'Bulanan'}</strong>.</p>
        <p>Silakan unduh lampiran di bawah ini.</p>
        <br/>
        <p><em>Terima kasih telah menggunakan TemuCashflow-app.</em></p>
      `,
      attachments: [
        {
          content: fileBase64,
          filename: fileName || 'laporan_keuangan.pdf',
        },
      ],
    });

    if (error) {
      console.error('Resend Error:', error);
      return ApiResponseHandler.error(
        `Gagal mengirim email: ${error.message}`,
        500,
        'EMAIL_ERROR'
      );
    }

    return ApiResponseHandler.success(
      { messageId: data?.id },
      'Email berhasil dikirim!',
      200
    );
  } catch (err: any) {
    console.error('Send Email Error:', err);
    
    if (err instanceof SyntaxError) {
      return ApiResponseHandler.badRequest('Request body tidak valid');
    }
    
    return ApiResponseHandler.error(
      err.message || 'Terjadi kesalahan saat mengirim email',
      500,
      'INTERNAL_ERROR'
    );
  }
}