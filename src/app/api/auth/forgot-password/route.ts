import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponseHandler } from '@/lib/apiResponse';
import { isRateLimited, getRateLimitKey, getRateLimitInfo } from '@/lib/rateLimiter';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = getRateLimitKey(clientIp, '/api/auth/forgot-password');

    if (isRateLimited(rateLimitKey)) {
      const rateLimitInfo = getRateLimitInfo(rateLimitKey);
      return ApiResponseHandler.rateLimited(rateLimitInfo.resetTime);
    }

    const { email } = await req.json();

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return ApiResponseHandler.badRequest('Email tidak valid');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Cek apakah user ada
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserByEmail(trimmedEmail);

    if (!user) {
      // Security: Don't reveal if email exists or not
      // Selalu return success untuk prevent email enumeration
      return ApiResponseHandler.success(
        { message: 'Jika email terdaftar, link reset akan dikirim' },
        'Silakan cek email Anda untuk link reset password',
        200
      );
    }

    // Generate reset link menggunakan Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
      console.error('Reset password email error:', error);
      return ApiResponseHandler.error(
        'Gagal mengirim email reset password',
        500,
        'EMAIL_ERROR'
      );
    }

    return ApiResponseHandler.success(
      { email: trimmedEmail },
      'Link reset password telah dikirim ke email Anda',
      200
    );
  } catch (err: any) {
    console.error('Forgot password error:', err);
    
    if (err instanceof SyntaxError) {
      return ApiResponseHandler.badRequest('Request body tidak valid');
    }

    return ApiResponseHandler.error(
      'Terjadi kesalahan, silakan coba lagi',
      500,
      'INTERNAL_ERROR'
    );
  }
}
