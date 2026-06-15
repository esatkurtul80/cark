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

  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseAdmin.from('spins').select('*');

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    const { data: spins, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process statistics
    const totalSpins = spins.length;

    // Calculate product frequency
    const productCounts = {};
    spins.forEach((spin) => {
      productCounts[spin.product_name] = (productCounts[spin.product_name] || 0) + 1;
    });

    // Calculate store frequency
    const storeCounts = {};
    spins.forEach((spin) => {
      const name = spin.store_name || 'Bilinmeyen Mağaza';
      storeCounts[name] = (storeCounts[name] || 0) + 1;
    });

    // Find most popular product
    let mostWonProduct = 'Yok';
    let maxWins = 0;
    Object.entries(productCounts).forEach(([name, count]) => {
      if (count > maxWins) {
        maxWins = count;
        mostWonProduct = name;
      }
    });

    return NextResponse.json({
      success: true,
      spins,
      stats: {
        totalSpins,
        mostWonProduct: maxWins > 0 ? `${mostWonProduct} (${maxWins} kez)` : 'Yok',
        productCounts,
        storeCounts
      }
    });
  } catch (err) {
    console.error('Reports API error:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    // Delete all spins in the table
    const { error } = await supabaseAdmin
      .from('spins')
      .delete()
      .gt('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete logs API error:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}
