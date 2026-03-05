import { NextResponse } from 'next/server';

/**
 * Consistent API response helpers.
 *
 * Success: { data: T }
 * Error:   { error: string }
 */

export function apiOk<T>(data: T, headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ data }, { status: 200, headers });
}

export function apiCreated<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function apiError(
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized(message = 'Unauthorized'): NextResponse {
  return apiError(message, 401);
}

export function apiNotFound(message = 'Not found'): NextResponse {
  return apiError(message, 404);
}

export function apiRateLimited(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Try again later.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
  );
}

/**
 * Wrap an async handler with standard error catching.
 * Prevents leaking internal error details to clients.
 */
export function withErrorHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (err) {
      console.error('[API Error]', err);
      return apiError('Internal server error', 500);
    }
  };
}
