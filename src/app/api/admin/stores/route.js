import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/auth';

async function checkAdmin(request) {
  const adminToken = request.cookies.get('admin_token')?.value;
  const admin = adminToken ? await verifyJWT(adminToken) : null;
  return admin && admin.isAdmin;
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const { name, username, password } = await request.json();

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if store username exists
    const { data: existing } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanımda.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('stores')
      .insert([{ name, username: cleanUsername, password }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Hata oluştu.' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const { id, name, username, password } = await request.json();

    if (!id || !name || !username || !password) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if store username exists on another store
    const { data: existing } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('username', cleanUsername)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanımda.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('stores')
      .update({ name, username: cleanUsername, password })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Hata oluştu.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID belirtilmedi.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('stores').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Hata oluştu.' }, { status: 500 });
  }
}
