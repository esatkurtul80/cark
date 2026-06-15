import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  const storeToken = request.cookies.get('store_token')?.value;
  const adminToken = request.cookies.get('admin_token')?.value;

  if (adminToken) {
    const admin = await verifyJWT(adminToken);
    if (admin && admin.isAdmin) {
      return NextResponse.json({ authenticated: true, role: 'admin' });
    }
  }

  if (storeToken) {
    const store = await verifyJWT(storeToken);
    if (store) {
      return NextResponse.json({ authenticated: true, role: 'store', user: store });
    }
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
