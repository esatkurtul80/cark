import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    // 1. Authenticate store
    const storeToken = request.cookies.get('store_token')?.value;
    const store = storeToken ? await verifyJWT(storeToken) : null;

    if (!store) {
      return NextResponse.json(
        { error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    // 2. Parse body for optional receipt_no
    const body = await request.json().catch(() => ({}));
    const receiptNo = body.receipt_no?.trim() || null;

    // 3. Fetch active products, ordered by created_at ascending
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: 'Ürün listesi alınamadı.' }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'Çark üzerinde aktif ürün bulunmuyor. Lütfen yöneticiye başvurun.' },
        { status: 400 }
      );
    }

    const DILIM = products.length;

    // 4. Secure lottery algorithm based on weights (1 / chance)
    const weights = products.map((p) => (p.chance > 0 ? 1 / p.chance : 0));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let winnerIndex = 0;
    if (totalWeight > 0) {
      let r = Math.random() * totalWeight;
      for (let i = 0; i < DILIM; i++) {
        r -= weights[i];
        if (r <= 0) {
          winnerIndex = i;
          break;
        }
      }
    } else {
      // Fallback if all weights are 0
      winnerIndex = Math.floor(Math.random() * DILIM);
    }

    const winner = products[winnerIndex];

    // 5. Save spin history log
    const { error: spinError } = await supabaseAdmin.from('spins').insert([
      {
        store_id: store.id,
        store_name: store.name,
        product_name: winner.name,
        receipt_no: receiptNo
      }
    ]);

    if (spinError) {
      console.error('Error saving spin log:', spinError);
    }

    // 6. Return winner details to frontend
    return NextResponse.json({
      success: true,
      winnerIndex,
      winner: {
        name: winner.name,
        color: winner.color,
        text_color: winner.text_color
      }
    });
  } catch (err) {
    console.error('Spin API error:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}
