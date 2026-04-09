import { NextResponse, type NextRequest } from 'next/server';
// import { updateSession } from '@/lib/supabase-middleware';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/reset', '/update-password'];

// AUTH BYPASSED — re-enable when ready for production
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth routes through
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Skip login page — redirect straight to dashboard
  if (pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
