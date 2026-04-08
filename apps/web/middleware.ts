import { NextResponse, type NextRequest } from 'next/server';
// import { updateSession } from '@/lib/supabase-middleware';

// AUTH BYPASSED — re-enable when ready for production
export async function middleware(request: NextRequest) {
  // Skip login page — redirect straight to dashboard
  if (request.nextUrl.pathname === '/login') {
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
