import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gereklidir.' },
        { status: 400 }
      );
    }

    // Search in stores table
    const { data: store, error } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !store || store.password !== password) {
      return NextResponse.json(
        { error: 'Geçersiz kullanıcı adı veya şifre.' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signJWT({
      id: store.id,
      username: store.username,
      name: store.name,
    });

    const response = NextResponse.json({
      success: true,
      store: { id: store.id, username: store.username, name: store.name }
    });
    
    // Set HTTP-only cookie
    response.cookies.set('store_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}
