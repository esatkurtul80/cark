-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    chance INTEGER NOT NULL DEFAULT 20,
    color TEXT NOT NULL DEFAULT '#2A6B40',
    text_color TEXT NOT NULL DEFAULT '#FBF3E4',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create spins table
CREATE TABLE IF NOT EXISTS spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    store_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    receipt_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE spins ENABLE ROW LEVEL SECURITY;

-- Create policies for stores table
-- Allow all operations for service role only (server api routes)
CREATE POLICY "Allow all operations for service role on stores" ON stores
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create policies for products table
-- Allow everyone to read products (stores/clients need this to render the wheel in real-time)
CREATE POLICY "Allow read products for everyone" ON products
    FOR SELECT USING (true);

-- Allow all operations for service role only (admin client)
CREATE POLICY "Allow all operations for service role on products" ON products
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create policies for spins table
-- Allow all operations for service role (admin client to read reports & delete)
CREATE POLICY "Allow all operations for service role on spins" ON spins
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed initial products (Tuğba Kuruyemiş default 20 items)
INSERT INTO products (name, chance, color, text_color) VALUES
('Antep Fıstığı', 100, '#2A6B40', '#FBF3E4'),
('Gül Lokumu', 20, '#D9A441', '#123A20'),
('Kavrulmuş Fındık', 50, '#B3402F', '#FBF3E4'),
('Ay Çekirdeği', 10, '#8A5A2B', '#FBF3E4'),
('Türk Kahvesi', 30, '#E8A0A8', '#5A2430'),
('Kaju', 80, '#2A6B40', '#FBF3E4'),
('Fıstıklı Lokum', 25, '#D9A441', '#123A20'),
('Kabak Çekirdeği', 10, '#B3402F', '#FBF3E4'),
('Çiğ Badem', 60, '#8A5A2B', '#FBF3E4'),
('Sarı Leblebi', 10, '#E8A0A8', '#5A2430'),
('Çifte Kavrulmuş Lokum', 25, '#2A6B40', '#FBF3E4'),
('Kuru Kayısı', 20, '#D9A441', '#123A20'),
('Ceviz İçi', 60, '#B3402F', '#FBF3E4'),
('Tuzlu Fıstık', 40, '#8A5A2B', '#FBF3E4'),
('Kuru İncir', 20, '#E8A0A8', '#5A2430'),
('Karışık Kuruyemiş', 15, '#2A6B40', '#FBF3E4'),
('Beyaz Leblebi', 10, '#D9A441', '#123A20'),
('Çikolatalı Draje', 30, '#B3402F', '#FBF3E4'),
('Kuru Üzüm', 10, '#8A5A2B', '#FBF3E4'),
('Hurma', 15, '#E8A0A8', '#5A2430')
ON CONFLICT DO NOTHING;
