import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponseHandler } from '@/lib/apiResponse';
import { isRateLimited, getRateLimitKey, getRateLimitInfo } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = getRateLimitKey(clientIp, '/api/auth/reset-password');

    if (isRateLimited(rateLimitKey)) {
      const rateLimitInfo = getRateLimitInfo(rateLimitKey);
      return ApiResponseHandler.rateLimited(rateLimitInfo.resetTime);
    }

    const { token, newPassword, confirmPassword } = await req.json();

    // Validation
    if (!token) {
      return ApiResponseHandler.badRequest('Token reset password tidak ditemukan');
    }

    if (!newPassword || newPassword.length < 6) {
      return ApiResponseHandler.badRequest('Password minimal 6 karakter');
    }

    if (newPassword !== confirmPassword) {
      return ApiResponseHandler.badRequest('Password tidak sama');
    }

    // Update password menggunakan token
    const { data, error } = await supabase.auth.updateUser(
      { password: newPassword },
      { accessToken: token }
    );

    if (error) {
      console.error('Reset password error:', error);
      
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        return ApiResponseHandler.error(
          'Token reset password tidak valid atau telah kadaluarsa',
          400,
          'INVALID_TOKEN'
        );
      }

      return ApiResponseHandler.error(
        'Gagal reset password, silakan coba lagi',
        500,
        'RESET_ERROR'
      );
    }

    return ApiResponseHandler.success(
      { userId: data?.user?.id },
      'Password berhasil direset, silakan login',
      200
    );
  } catch (err: any) {
    console.error('Reset password handler error:', err);
    
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
