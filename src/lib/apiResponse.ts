// src/lib/apiResponse.ts
// Standardized API response handler

import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export const ApiResponseHandler = {
  success: <T = any>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ) => {
    return NextResponse.json(
      { success: true, data, message } as ApiResponse<T>,
      { status: statusCode }
    );
  },

  error: (
    error: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) => {
    return NextResponse.json(
      { success: false, error, code } as ApiResponse,
      { status: statusCode }
    );
  },

  rateLimited: (resetTime: number) => {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
      } as ApiResponse,
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  },

  badRequest: (error: string) => {
    return NextResponse.json(
      { success: false, error, code: 'BAD_REQUEST' } as ApiResponse,
      { status: 400 }
    );
  },

  unauthorized: (error: string = 'Unauthorized') => {
    return NextResponse.json(
      { success: false, error, code: 'UNAUTHORIZED' } as ApiResponse,
      { status: 401 }
    );
  },

  forbidden: (error: string = 'Forbidden') => {
    return NextResponse.json(
      { success: false, error, code: 'FORBIDDEN' } as ApiResponse,
      { status: 403 }
    );
  },

  notFound: (error: string = 'Not found') => {
    return NextResponse.json(
      { success: false, error, code: 'NOT_FOUND' } as ApiResponse,
      { status: 404 }
    );
  },
};
