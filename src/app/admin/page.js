'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('raporlar'); // 'raporlar' | 'urunler' | 'magazalar'
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [spins, setSpins] = useState([]);
  const [stats, setStats] = useState({ totalSpins: 0, mostWonProduct: 'Yok' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filtering States
  const [filterStore, setFilterStore] = useState('all');
  const [filterDatePreset, setFilterDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'custom'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // CRUD Forms States
  const [storeForm, setStoreForm] = useState({ id: '', name: '', username: '', password: '' });
  const [productForm, setProductForm] = useState({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true });

  const router = useRouter();

  // Load all initial data
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch reports when filters change
  useEffect(() => {
    if (activeTab === 'raporlar') {
      fetchReports();
    }
  }, [filterStore, filterDatePreset, filterStartDate, filterEndDate, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/admin/login');
        return;
      }
      const authData = await authRes.json();
      if (authData.role !== 'admin') {
        router.push('/');
        return;
      }

      await Promise.all([fetchStores(), fetchProducts(), fetchReports()]);
    } catch (err) {
      console.error(err);
      setError('Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    const res = await fetch('/api/admin/stores');
    if (res.ok) {
      const data = await res.json();
      setStores(data);
    }
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/admin/products');
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
    }
  };

  const fetchReports = async () => {
    let url = `/api/admin/reports?store_id=${filterStore}`;

    // Handle date presets
    let start = '';
    let end = '';
    const todayStr = new Date().toISOString().split('T')[0];

    if (filterDatePreset === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (filterDatePreset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];
      start = yestStr;
      end = yestStr;
    } else if (filterDatePreset === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      start = lastWeek.toISOString().split('T')[0];
      end = todayStr;
    } else if (filterDatePreset === 'custom') {
      start = filterStartDate;
      end = filterEndDate;
    }

    if (start) url += `&start_date=${start}`;
    if (end) url += `&end_date=${end}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setSpins(data.spins);
      setStats(data.stats);
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  // --- STORES CRUD ---
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const isEdit = !!storeForm.id;
      const res = await fetch('/api/admin/stores', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şube kaydedilemedi.');

      setMessage(isEdit ? 'Şube başarıyla güncellendi!' : 'Yeni şube başarıyla eklendi!');
      setStoreForm({ id: '', name: '', username: '', password: '' });
      fetchStores();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStoreDelete = async (id) => {
    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz? Şube oturumu sonlandırılacaktır.')) return;
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/stores?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şube silinemedi.');

      setMessage('Şube silindi.');
      fetchStores();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- PRODUCTS CRUD ---
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const isEdit = !!productForm.id;
      const res = await fetch('/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ürün kaydedilemedi.');

      setMessage(isEdit ? 'Ürün başarıyla güncellendi!' : 'Yeni ürün başarıyla eklendi!');
      setProductForm({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true });
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz? Çark dilim sayısı azalacaktır.')) return;
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ürün silinemedi.');

      setMessage('Ürün silindi.');
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- RESET HISTORY ---
  const handleResetSpins = async () => {
    if (!confirm('DİKKAT! Tüm hediye çarkı çevrilme geçmişi (raporlar) kalıcı olarak sıfırlanacaktır. Bu işlem geri alınamaz. Emin misiniz?')) return;
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/reports', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Geçmiş sıfırlanamadı.');

      setMessage('Tüm geçmiş başarıyla sıfırlandı.');
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- EXPORT TO EXCEL/CSV (TURKISH CHARS COMPATIBLE) ---
  const exportToCSV = () => {
    if (spins.length === 0) return;
    const headers = ['Şube Kodu/Adı', 'Kazanılan Hediye', 'Fiş No', 'Tarih & Saat'];
    const rows = spins.map(spin => [
      spin.store_name,
      spin.product_name,
      spin.receipt_no || '-',
      new Date(spin.created_at).toLocaleString('tr-TR')
    ]);

    // Use UTF-8 BOM (\uFEFF) to make sure MS Excel decodes Turkish characters correctly
    let csvContent = "\uFEFF";
    csvContent += headers.join(';') + '\n';
    rows.forEach(row => {
      const escapedRow = row.map(val => `"${val.replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tugba_cark_raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-configured brand colors for products
  const colorPresets = [
    { bg: '#2A6B40', text: '#FBF3E4' },
    { bg: '#D9A441', text: '#123A20' },
    { bg: '#B3402F', text: '#FBF3E4' },
    { bg: '#8A5A2B', text: '#FBF3E4' },
    { bg: '#E8A0A8', text: '#5A2430' },
    { bg: '#1E5631', text: '#FBF3E4' },
    { bg: '#123A20', text: '#FBF3E4' },
    { bg: '#FBF3E4', text: '#123A20' }
  ];

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', fontWeight: '600' }}>Admin Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Navbar */}
      <div style={styles.navbar}>
        <div style={styles.navStoreInfo}>
          <span style={styles.storeBadge}>⚙️</span>
          <strong>Hediye Çarkı Yönetim Paneli</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/" target="_blank" style={styles.liveLink}>
            👁️ Canlı Çark Ekranı
          </Link>
          <button onClick={handleAdminLogout} style={styles.logoutBtn}>
            Güvenli Çıkış 🚪
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="container" style={{ width: '100%', marginTop: '30px' }}>
        {/* Alerts */}
        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        {/* Glass Tabs */}
        <div className="glass-card" style={styles.tabsHeader}>
          <button
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'raporlar' ? '3px solid var(--altin)' : '3px solid transparent',
              color: activeTab === 'raporlar' ? 'var(--altin)' : 'var(--krem)',
              opacity: activeTab === 'raporlar' ? 1 : 0.7
            }}
            onClick={() => setActiveTab('raporlar')}
          >
            📊 Spin Raporları
          </button>
          <button
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'urunler' ? '3px solid var(--altin)' : '3px solid transparent',
              color: activeTab === 'urunler' ? 'var(--altin)' : 'var(--krem)',
              opacity: activeTab === 'urunler' ? 1 : 0.7
            }}
            onClick={() => {
              setActiveTab('urunler');
              setProductForm({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true });
            }}
          >
            🎡 Çark Ürünleri
          </button>
          <button
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'magazalar' ? '3px solid var(--altin)' : '3px solid transparent',
              color: activeTab === 'magazalar' ? 'var(--altin)' : 'var(--krem)',
              opacity: activeTab === 'magazalar' ? 1 : 0.7
            }}
            onClick={() => {
              setActiveTab('magazalar');
              setStoreForm({ id: '', name: '', username: '', password: '' });
            }}
          >
            🏪 Mağaza Şubeleri
          </button>
        </div>

        {/* TAB 1: REPORTS */}
        {activeTab === 'raporlar' && (
          <div>
            {/* Filter Dashboard */}
            <div className="glass-card" style={styles.filterCard}>
              <h3 style={{ marginBottom: '16px', color: 'var(--altin)' }}>Rapor Filtreleri</h3>
              <div style={styles.filterGrid}>
                {/* Store Filter */}
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Mağaza Şubesi</label>
                  <select
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all">Tüm Şubeler</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date Preset Filter */}
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Zaman Aralığı</label>
                  <select
                    value={filterDatePreset}
                    onChange={(e) => setFilterDatePreset(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all">Tüm Zamanlar</option>
                    <option value="today">Bugün</option>
                    <option value="yesterday">Dün</option>
                    <option value="week">Son 7 Gün</option>
                    <option value="custom">Özel Tarih...</option>
                  </select>
                </div>

                {/* Custom Dates */}
                {filterDatePreset === 'custom' && (
                  <>
                    <div style={styles.filterGroup}>
                      <label style={styles.filterLabel}>Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        style={styles.dateInput}
                      />
                    </div>
                    <div style={styles.filterGroup}>
                      <label style={styles.filterLabel}>Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        style={styles.dateInput}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div style={styles.summaryGrid}>
              <div className="glass-card" style={styles.summaryCard}>
                <div style={styles.summaryNumber}>{stats.totalSpins}</div>
                <div style={styles.summaryLabel}>Toplam Çark Çevirme</div>
              </div>
              <div className="glass-card" style={styles.summaryCard}>
                <div style={styles.summaryNumberText}>{stats.mostWonProduct}</div>
                <div style={styles.summaryLabel}>En Çok Çıkan Hediye</div>
              </div>
            </div>

            {/* Logs Table Area */}
            <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
              <div style={styles.tableHeaderSection}>
                <h3 style={{ color: 'var(--altin)' }}>Spin Kayıt Detayları</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={exportToCSV}
                    style={styles.csvBtn}
                    disabled={spins.length === 0}
                  >
                    📊 CSV / Excel Olarak İndir
                  </button>
                  <button
                    onClick={handleResetSpins}
                    style={styles.resetBtn}
                  >
                    🗑️ Tüm Verileri Sıfırla
                  </button>
                </div>
              </div>

              {spins.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableTh}>Şube</th>
                      <th style={styles.tableTh}>Kazanılan Hediye</th>
                      <th style={styles.tableTh}>Fiş No</th>
                      <th style={styles.tableTh}>Tarih & Saat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spins.map((spin) => (
                      <tr key={spin.id} style={styles.tableRow}>
                        <td style={styles.tableTd}>{spin.store_name}</td>
                        <td style={styles.tableTd}>
                          <span style={styles.winBadge}>{spin.product_name}</span>
                        </td>
                        <td style={styles.tableTd}>
                          <code>{spin.receipt_no || '-'}</code>
                        </td>
                        <td style={styles.tableTd}>
                          {new Date(spin.created_at).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={styles.noDataBox}>
                  Seçili filtrelerde kayıt bulunamadı. Mağazalar çarkı çevirdikçe veriler anlık buraya düşecektir.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS CRUD */}
        {activeTab === 'urunler' && (
          <div style={styles.crudContainer}>
            {/* Form */}
            <div className="glass-card" style={styles.crudFormCard}>
              <h3 style={{ color: 'var(--altin)', marginBottom: '20px' }}>
                {productForm.id ? 'Ürünü Düzenle' : 'Yeni Hediye Ekle'}
              </h3>
              <form onSubmit={handleProductSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Ürün Hediye Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Antep Fıstığı"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Olasılık Değeri (1 / Kaç Çevirme)</label>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={productForm.chance}
                    onChange={(e) => setProductForm({ ...productForm, chance: parseInt(e.target.value) || 0 })}
                    className="glass-input"
                    required
                  />
                  <small style={styles.formHelp}>
                    Örn: <strong>10</strong> girilirse ortalama her 10 çevirmede bir gelir. <strong>0</strong> girilirse çarkta görünür fakat hiç çıkmaz.
                  </small>
                </div>

                {/* Colors picker */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Dilim Arka Plan</label>
                    <input
                      type="color"
                      value={productForm.color}
                      onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                      style={styles.colorInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Yazı Rengi</label>
                    <input
                      type="color"
                      value={productForm.text_color}
                      onChange={(e) => setProductForm({ ...productForm, text_color: e.target.value })}
                      style={styles.colorInput}
                    />
                  </div>
                </div>

                {/* Presets color boxes */}
                <div style={styles.presetSection}>
                  <span style={styles.presetLabel}>Renk Şablonları:</span>
                  <div style={styles.presetGrid}>
                    {colorPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        style={{ ...styles.presetBox, backgroundColor: p.bg, border: `2px solid ${p.text}` }}
                        onClick={() => setProductForm({ ...productForm, color: p.bg, text_color: p.text })}
                        title={`bg: ${p.bg}, text: ${p.text}`}
                      />
                    ))}
                  </div>
                </div>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <label htmlFor="isActive" style={styles.checkboxLabel}>
                    Çarkta Aktif Olsun (Gösterilsin)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Kaydediliyor...' : 'KAYDET'}
                  </button>
                  {productForm.id && (
                    <button
                      type="button"
                      onClick={() => setProductForm({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true })}
                      style={styles.cancelBtn}
                    >
                      Vazgeç
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="glass-card" style={styles.crudListCard}>
              <h3 style={{ color: 'var(--altin)', marginBottom: '20px' }}>
                Hediye Ürün Listesi ({products.length} adet)
              </h3>
              {products.length > 0 ? (
                <div style={styles.scrollableList}>
                  {products.map((p) => (
                    <div key={p.id} style={styles.listItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: p.color,
                            border: `2px solid ${p.text_color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: p.text_color,
                            fontWeight: 'bold'
                          }}
                        >
                          Aa
                        </div>
                        <div>
                          <strong>{p.name}</strong>
                          <div style={styles.itemMeta}>
                            <span>Olasılık: 1/{p.chance}</span>
                            <span style={{ margin: '0 6px' }}>•</span>
                            <span style={{ color: p.is_active ? 'var(--yesil-isik)' : '#94A3B8' }}>
                              {p.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setProductForm(p)}
                          style={styles.editBtn}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleProductDelete(p.id)}
                          style={styles.delBtn}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noDataBox}>
                  Sistemde hediye tanımlanmamış. Sol taraftan hediye ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORES CRUD */}
        {activeTab === 'magazalar' && (
          <div style={styles.crudContainer}>
            {/* Form */}
            <div className="glass-card" style={styles.crudFormCard}>
              <h3 style={{ color: 'var(--altin)', marginBottom: '20px' }}>
                {storeForm.id ? 'Şubeyi Düzenle' : 'Yeni Şube Ekle'}
              </h3>
              <form onSubmit={handleStoreSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Şube Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Aydın Mimar Sinan Şubesi"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Kullanıcı Giriş Kodu</label>
                  <input
                    type="text"
                    placeholder="Örn: magaza_mimarsinan"
                    value={storeForm.username}
                    onChange={(e) => setStoreForm({ ...storeForm, username: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Giriş Şifresi</label>
                  <input
                    type="text"
                    placeholder="Örn: ms12345"
                    value={storeForm.password}
                    onChange={(e) => setStoreForm({ ...storeForm, password: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Kaydediliyor...' : 'KAYDET'}
                  </button>
                  {storeForm.id && (
                    <button
                      type="button"
                      onClick={() => setStoreForm({ id: '', name: '', username: '', password: '' })}
                      style={styles.cancelBtn}
                    >
                      Vazgeç
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="glass-card" style={styles.crudListCard}>
              <h3 style={{ color: 'var(--altin)', marginBottom: '20px' }}>
                Aktif Şube Listesi ({stores.length} adet)
              </h3>
              {stores.length > 0 ? (
                <div style={styles.scrollableList}>
                  {stores.map((s) => (
                    <div key={s.id} style={styles.listItem}>
                      <div style={{ flex: 1 }}>
                        <strong>{s.name}</strong>
                        <div style={styles.itemMeta}>
                          <span>Kod: <code>{s.username}</code></span>
                          <span style={{ margin: '0 6px' }}>•</span>
                          <span>Şifre: <code>{s.password}</code></span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setStoreForm(s)}
                          style={styles.editBtn}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleStoreDelete(s.id)}
                          style={styles.delBtn}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noDataBox}>
                  Sistemde şube tanımlanmamış. Sol taraftan ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '70px 0 30px 0',
    color: 'var(--krem)',
  },
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid var(--altin)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    zIndex: 10,
  },
  navStoreInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
  },
  storeBadge: {
    fontSize: '20px',
  },
  liveLink: {
    color: 'var(--altin)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(217, 164, 65, 0.1)',
    border: '1px solid var(--altin)',
    padding: '6px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--krem)',
    opacity: 0.8,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'opacity 0.2s',
  },
  errorBox: {
    background: 'rgba(179, 64, 47, 0.2)',
    border: '1px solid var(--kirmizi)',
    color: 'var(--krem)',
    padding: '12px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  successBox: {
    background: 'rgba(30, 86, 49, 0.3)',
    border: '1px solid var(--yesil-isik)',
    color: 'var(--krem)',
    padding: '12px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  tabsHeader: {
    display: 'flex',
    padding: '8px',
    gap: '8px',
    marginBottom: '24px',
    borderRadius: '16px',
  },
  tabBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    padding: '12px',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterCard: {
    padding: '24px',
    marginBottom: '20px',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '700',
    opacity: 0.9,
  },
  select: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'var(--krem)',
    borderRadius: '10px',
    padding: '10px',
    outline: 'none',
    fontSize: '14px',
    cursor: 'pointer',
  },
  dateInput: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'var(--krem)',
    borderRadius: '10px',
    padding: '9px',
    outline: 'none',
    fontSize: '14px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    padding: '30px 20px',
    textAlign: 'center',
  },
  summaryNumber: {
    fontSize: '48px',
    fontWeight: '900',
    color: 'var(--altin)',
    lineHeight: '1',
  },
  summaryNumberText: {
    fontSize: '24px',
    fontWeight: '900',
    color: 'var(--altin)',
    lineHeight: '1.2',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: '13px',
    fontWeight: '700',
    opacity: 0.75,
    marginTop: '10px',
  },
  tableHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  csvBtn: {
    background: 'var(--yesil)',
    border: 'none',
    color: 'var(--krem)',
    fontWeight: '700',
    padding: '8px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  resetBtn: {
    background: 'var(--kirmizi)',
    border: 'none',
    color: 'var(--krem)',
    fontWeight: '700',
    padding: '8px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeaderRow: {
    borderBottom: '2px solid rgba(255, 255, 255, 0.15)',
    textAlign: 'left',
  },
  tableTh: {
    padding: '12px',
    fontWeight: '700',
    color: 'var(--altin)',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'background 0.2s',
    '&:hover': {
      background: 'rgba(255,255,255,0.02)'
    }
  },
  tableTd: {
    padding: '14px 12px',
    verticalAlign: 'middle',
  },
  winBadge: {
    background: 'rgba(30, 86, 49, 0.4)',
    color: 'var(--krem)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '13px',
    border: '1px solid var(--yesil-isik)',
  },
  noDataBox: {
    textAlign: 'center',
    padding: '40px 20px',
    opacity: 0.6,
    fontSize: '14px',
  },
  crudContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.3fr',
    gap: '24px',
    alignItems: 'start',
  },
  crudFormCard: {
    padding: '30px 24px',
  },
  crudListCard: {
    padding: '30px 24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '700',
  },
  formHelp: {
    fontSize: '11px',
    opacity: 0.8,
    marginTop: '2px',
  },
  colorInput: {
    width: '100%',
    height: '42px',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '4px',
  },
  presetSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  presetLabel: {
    fontSize: '11px',
    fontWeight: '700',
    opacity: 0.8,
  },
  presetGrid: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  presetBox: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    userSelect: 'none',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'var(--krem)',
    borderRadius: '10px',
    padding: '12px 20px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
  },
  scrollableList: {
    maxHeight: '500px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingRight: '6px',
  },
  listItem: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  itemMeta: {
    fontSize: '12px',
    opacity: 0.7,
    marginTop: '4px',
  },
  editBtn: {
    background: 'none',
    border: '1px solid var(--altin)',
    color: 'var(--altin)',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
    '&:hover': {
      background: 'rgba(217, 164, 65, 0.1)'
    }
  },
  delBtn: {
    background: 'none',
    border: '1px solid var(--kirmizi)',
    color: 'var(--krem)',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
    '&:hover': {
      background: 'rgba(179, 64, 47, 0.1)'
    }
  },
};
