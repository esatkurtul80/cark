import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect store panel (root path)
  if (pathname === '/') {
    const storeToken = request.cookies.get('store_token')?.value;
    const isStore = storeToken ? await verifyJWT(storeToken) : null;
    
    if (!isStore) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin panel
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminToken = request.cookies.get('admin_token')?.value;
    const isAdmin = adminToken ? await verifyJWT(adminToken) : null;

    if (!isAdmin || !isAdmin.isAdmin) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect to dashboard/home if already authenticated
  if (pathname === '/login') {
    const storeToken = request.cookies.get('store_token')?.value;
    const isStore = storeToken ? await verifyJWT(storeToken) : null;
    
    if (isStore) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname === '/admin/login') {
    const adminToken = request.cookies.get('admin_token')?.value;
    const isAdmin = adminToken ? await verifyJWT(adminToken) : null;

    if (isAdmin && isAdmin.isAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*'],
};
