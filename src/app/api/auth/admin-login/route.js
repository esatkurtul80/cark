import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'tugba123admin';

    if (
      username?.trim() === expectedUsername &&
      password === expectedPassword
    ) {
      const token = await signJWT({ isAdmin: true });
      const response = NextResponse.json({ success: true });
      
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Geçersiz admin kullanıcı adı veya şifre.' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}
