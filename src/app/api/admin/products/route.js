import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/auth';

async function checkAdmin(request) {
  const adminToken = request.cookies.get('admin_token')?.value;
  const admin = adminToken ? await verifyJWT(adminToken) : null;
  return admin && admin.isAdmin;
}

export async function GET(request) {
  const storeToken = request.cookies.get('store_token')?.value;
  const adminToken = request.cookies.get('admin_token')?.value;

  const isStore = storeToken ? await verifyJWT(storeToken) : null;
  const isAdmin = adminToken ? await verifyJWT(adminToken) : null;

  if (!isStore && (!isAdmin || !isAdmin.isAdmin)) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  // If store, select only active. If admin, select all.
  let query = supabaseAdmin.from('products').select('*');
  
  if (isStore && !isAdmin) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

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
    const { name, chance, color, text_color, is_active } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Ürün adı zorunludur.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          name,
          chance: typeof chance === 'number' ? chance : 20,
          color: color || '#2A6B40',
          text_color: text_color || '#FBF3E4',
          is_active: typeof is_active === 'boolean' ? is_active : true,
        },
      ])
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
    const { id, name, chance, color, text_color, is_active } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Kimlik (ID) ve ürün adı zorunludur.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        name,
        chance: typeof chance === 'number' ? chance : 20,
        color: color || '#2A6B40',
        text_color: text_color || '#FBF3E4',
        is_active: typeof is_active === 'boolean' ? is_active : true,
      })
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

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Hata oluştu.' }, { status: 500 });
  }
}
