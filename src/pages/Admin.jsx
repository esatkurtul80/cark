import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  where,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { playClick } from '../utils/audio';

const getTodayString = () => {
  const d = new Date();
  const dLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return dLocal.toISOString().split('T')[0];
};

export default function Admin({ navigate, onLogout, onPreviewWheel }) {
  const [activeTab, setActiveTab] = useState('raporlar'); // 'raporlar' | 'urunler' | 'magazalar'
  const [reportSubTab, setReportSubTab] = useState('detay'); // 'detay' | 'toplu'
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [spins, setSpins] = useState([]);
  const [filteredSpins, setFilteredSpins] = useState([]);
  const [stats, setStats] = useState({ totalSpins: 0, mostWonProduct: 'Yok' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const triggerConfirm = (title, message, onConfirmAction) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirmAction();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filtering States
  const [filterStore, setFilterStore] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState(getTodayString());
  const [filterEndDate, setFilterEndDate] = useState(getTodayString());

  const [globalScreensaver, setGlobalScreensaver] = useState(true);

  // CRUD Forms States
  const [storeForm, setStoreForm] = useState({ id: '', name: '', username: '', password: '', min_limit: '1000', screensaver_enabled: true });
  const [storeReports, setStoreReports] = useState([]);
  const [filteredStoreReports, setFilteredStoreReports] = useState([]);
  const [productForm, setProductForm] = useState({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true });

  const [editingReport, setEditingReport] = useState(null);
  const [reportForm, setReportForm] = useState({
    id: '',
    turnover: '',
    counter_completion: '',
    cashier_completion: '',
    wheel_treat_amount: '',
    average_basket: '',
    customer_count: '',
    spin_count: ''
  });

  useEffect(() => {
    // Check admin session
    if (localStorage.getItem('admin_session') !== 'true') {
      navigate('/admin/login');
      return;
    }

    fetchData();
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [spins, storeReports, filterStore, filterProduct, filterStartDate, filterEndDate]);

  const fetchGlobalScreensaver = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'screensaver'));
      if (docSnap.exists()) {
        setGlobalScreensaver(docSnap.data().enabled !== false);
      } else {
        setGlobalScreensaver(true);
      }
    } catch (err) {
      console.error('Error fetching global screensaver:', err);
    }
  };

  const handleToggleGlobalScreensaver = async () => {
    playClick();
    const newValue = !globalScreensaver;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'screensaver'), { enabled: newValue });
      setGlobalScreensaver(newValue);
      setMessage(`Görsel dönüşü (screensaver) tüm şubeler için ${newValue ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
    } catch (err) {
      console.error(err);
      setError('Genel ayar güncellenirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchStores(),
        fetchProducts(),
        fetchSpins(),
        fetchStoreReports(),
        fetchGlobalScreensaver()
      ]);
    } catch (err) {
      console.error(err);
      setError('Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'stores'), orderBy('created_at', 'desc')));
    const data = [];
    const batch = writeBatch(db);
    let hasUpdates = false;

    querySnapshot.docs.forEach(docSnap => {
      const docData = docSnap.data();
      if (docData.email !== undefined) {
        batch.update(docSnap.ref, { email: deleteField() });
        hasUpdates = true;
        const { email, ...rest } = docData;
        data.push({ id: docSnap.id, ...rest });
      } else {
        data.push({ id: docSnap.id, ...docData });
      }
    });

    if (hasUpdates) {
      await batch.commit();
      console.log('Cleaned up email fields from Firestore stores.');
    }

    setStores(data);
  };

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'products'), orderBy('created_at', 'asc')));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(data);
  };

  const fetchSpins = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'spins'), orderBy('created_at', 'desc')));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSpins(data);
  };

  const fetchStoreReports = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, 'store_reports'), orderBy('created_at', 'desc')));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStoreReports(data);
    } catch (err) {
      console.error('Error fetching store reports:', err);
    }
  };

  const applyFilters = () => {
    let result = [...spins];

    // 1. Filter by Store
    if (filterStore !== 'all') {
      result = result.filter(s => s.store_id === filterStore);
    }

    // 1.5 Filter by Product
    if (filterProduct !== 'all') {
      result = result.filter(s => s.product_name === filterProduct);
    }

    // 2. Filter by Date
    if (filterStartDate) {
      result = result.filter(s => s.created_at.split('T')[0] >= filterStartDate);
    }
    if (filterEndDate) {
      result = result.filter(s => s.created_at.split('T')[0] <= filterEndDate);
    }

    setFilteredSpins(result);

    // Filter store reports
    let reportResult = [...storeReports];
    if (filterStore !== 'all') {
      reportResult = reportResult.filter(r => r.store_id === filterStore);
    }
    if (filterStartDate) {
      reportResult = reportResult.filter(r => r.created_at.split('T')[0] >= filterStartDate);
    }
    if (filterEndDate) {
      reportResult = reportResult.filter(r => r.created_at.split('T')[0] <= filterEndDate);
    }
    setFilteredStoreReports(reportResult);

    // 3. Process Statistics
    const totalSpins = result.length;
    const productCounts = {};
    
    result.forEach((spin) => {
      productCounts[spin.product_name] = (productCounts[spin.product_name] || 0) + 1;
    });

    let mostWonProduct = 'Yok';
    let maxWins = 0;
    Object.entries(productCounts).forEach(([name, count]) => {
      if (count > maxWins) {
        maxWins = count;
        mostWonProduct = name;
      }
    });

    setStats({
      totalSpins,
      mostWonProduct: maxWins > 0 ? `${mostWonProduct} (${maxWins} kez)` : 'Yok'
    });
  };

  const handleAdminLogout = () => {
    playClick();
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
    }
  };

  // --- STORES CRUD ---
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const isEdit = !!storeForm.id;
      const cleanUsername = storeForm.username.trim().toLowerCase();

      if (!/^\d+$/.test(storeForm.password.trim())) {
        throw new Error('Mağaza şifresi sadece rakamlardan oluşmalıdır.');
      }

      // Check username conflicts in Firestore
      const conflictQuery = query(
        collection(db, 'stores'),
        where('username', '==', cleanUsername)
      );
      const conflictSnapshot = await getDocs(conflictQuery);
      
      const hasConflict = conflictSnapshot.docs.some(d => d.id !== storeForm.id);
      if (hasConflict) {
        throw new Error('Bu kullanıcı adı zaten kullanımda.');
      }

      if (isEdit) {
        const docRef = doc(db, 'stores', storeForm.id);
        await updateDoc(docRef, {
          name: storeForm.name.trim(),
          username: cleanUsername,
          password: storeForm.password.trim(),
          min_limit: Number(storeForm.min_limit) || 1000,
          screensaver_enabled: storeForm.screensaver_enabled !== false
        });
        setMessage('Şube başarıyla güncellendi!');
      } else {
        await addDoc(collection(db, 'stores'), {
          name: storeForm.name.trim(),
          username: cleanUsername,
          password: storeForm.password.trim(),
          min_limit: Number(storeForm.min_limit) || 1000,
          screensaver_enabled: storeForm.screensaver_enabled !== false,
          created_at: new Date().toISOString()
        });
        setMessage('Yeni şube başarıyla eklendi!');
      }

      setStoreForm({ id: '', name: '', username: '', password: '', min_limit: '1000', screensaver_enabled: true });
      fetchStores();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportDelete = (id) => {
    playClick();
    triggerConfirm(
      'Rapor Silme Onayı',
      'Bu günlük veri raporunu silmek istediğinizden emin misiniz?',
      async () => {
        setError('');
        setMessage('');
        try {
          await deleteDoc(doc(db, 'store_reports', id));
          setMessage('Günlük rapor başarıyla silindi!');
          fetchStoreReports();
        } catch (err) {
          setError('Rapor silinirken hata oluştu.');
        }
      }
    );
  };

  const handleReportEditClick = (report) => {
    playClick();
    const defaultSpinCount = spins.filter(
      s => s.store_id === report.store_id && 
      s.created_at?.split('T')[0] === report.created_at?.split('T')[0]
    ).length;

    setEditingReport(report);
    setReportForm({
      id: report.id,
      turnover: report.turnover !== undefined ? String(report.turnover) : '0',
      counter_completion: report.counter_completion !== undefined ? String(report.counter_completion) : '0',
      cashier_completion: report.cashier_completion !== undefined ? String(report.cashier_completion) : '0',
      wheel_treat_amount: report.wheel_treat_amount !== undefined ? String(report.wheel_treat_amount) : '0',
      average_basket: report.average_basket !== undefined ? String(report.average_basket) : '0',
      customer_count: report.customer_count !== undefined ? String(report.customer_count) : '0',
      spin_count: report.spin_count !== undefined ? String(report.spin_count) : String(defaultSpinCount)
    });
  };

  const handleReportEditSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const docRef = doc(db, 'store_reports', reportForm.id);
      await updateDoc(docRef, {
        turnover: Number(reportForm.turnover) || 0,
        counter_completion: Number(reportForm.counter_completion) || 0,
        cashier_completion: Number(reportForm.cashier_completion) || 0,
        wheel_treat_amount: Number(reportForm.wheel_treat_amount) || 0,
        average_basket: Number(reportForm.average_basket) || 0,
        customer_count: Number(reportForm.customer_count) || 0,
        spin_count: Number(reportForm.spin_count) || 0
      });
      setMessage('Günlük rapor başarıyla güncellendi!');
      setEditingReport(null);
      fetchStoreReports();
    } catch (err) {
      console.error(err);
      setError('Rapor güncellenirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReportEdit = () => {
    playClick();
    setEditingReport(null);
  };

  const handleStoreDelete = (id) => {
    playClick();
    triggerConfirm(
      'Şube Silme Onayı',
      'Bu şubeyi silmek istediğinizden emin misiniz?',
      async () => {
        setError('');
        setMessage('');
        try {
          await deleteDoc(doc(db, 'stores', id));
          setMessage('Şube silindi.');
          fetchStores();
        } catch (err) {
          setError('Şube silinirken hata oluştu.');
        }
      }
    );
  };

  // --- PRODUCTS CRUD ---
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const isEdit = !!productForm.id;

      if (isEdit) {
        const docRef = doc(db, 'products', productForm.id);
        await updateDoc(docRef, {
          name: productForm.name.trim(),
          chance: productForm.chance,
          color: productForm.color,
          text_color: productForm.text_color,
          is_active: productForm.is_active
        });
        setMessage('Ürün başarıyla güncellendi!');
      } else {
        await addDoc(collection(db, 'products'), {
          name: productForm.name.trim(),
          chance: productForm.chance,
          color: productForm.color,
          text_color: productForm.text_color,
          is_active: productForm.is_active,
          created_at: new Date().toISOString()
        });
        setMessage('Yeni ürün başarıyla eklendi!');
      }

      setProductForm({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true });
      fetchProducts();
    } catch (err) {
      setError('Ürün kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductDelete = (id) => {
    playClick();
    triggerConfirm(
      'Ürün Silme Onayı',
      'Bu ürünü silmek istediğinizden emin misiniz? Çark dilim sayısı azalacaktır.',
      async () => {
        setError('');
        setMessage('');
        try {
          await deleteDoc(doc(db, 'products', id));
          setMessage('Ürün silindi.');
          fetchProducts();
        } catch (err) {
          setError('Ürün silinirken hata oluştu.');
        }
      }
    );
  };

  // --- RESET HISTORY ---
  const handleResetSpins = () => {
    playClick();
    triggerConfirm(
      'Tüm Geçmişi Sıfırlama Onayı',
      'DİKKAT! Tüm hediye çarkı çevrilme geçmişi (raporlar) kalıcı olarak sıfırlanacaktır. Bu işlem geri alınamaz. Emin misiniz?',
      async () => {
        setError('');
        setMessage('');
        try {
          const spinsSnapshot = await getDocs(collection(db, 'spins'));
          const batch = writeBatch(db);
          
          spinsSnapshot.docs.forEach(d => {
            batch.delete(d.ref);
          });

          await batch.commit();
          setMessage('Tüm geçmiş başarıyla sıfırlandı.');
          fetchSpins();
        } catch (err) {
          setError('Geçmiş sıfırlanamadı.');
        }
      }
    );
  };

  const handleSingleSpinDelete = (id) => {
    playClick();
    triggerConfirm(
      'Kayıt Silme Onayı',
      'Bu hediye kaydını kalıcı olarak silmek istediğinizden emin misiniz?',
      async () => {
        setError('');
        setMessage('');
        try {
          await deleteDoc(doc(db, 'spins', id));
          setMessage('Hediye kaydı silindi.');
          fetchSpins();
        } catch (err) {
          console.error(err);
          setError('Hediye kaydı silinirken hata oluştu.');
        }
      }
    );
  };

  // --- EXPORT TO EXCEL/CSV ---
  const exportToCSV = () => {
    playClick();
    if (filteredSpins.length === 0) return;
    const headers = ['Şube Kodu/Adı', 'Kazanılan Hediye', 'Fiş No', 'Tarih & Saat'];
    const rows = filteredSpins.map(spin => [
      spin.store_name,
      spin.product_name,
      spin.receipt_no || '-',
      new Date(spin.created_at).toLocaleString('tr-TR')
    ]);

    let csvContent = "\uFEFF"; // UTF-8 BOM
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

  // --- EXPORT DISTRIBUTION TO EXCEL/CSV ---
  const exportDistributionToCSV = () => {
    playClick();
    if (filteredSpins.length === 0) return;

    const distribution = filteredSpins.reduce((acc, spin) => {
      acc[spin.product_name] = (acc[spin.product_name] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

    const headers = ['Ürün Hediye Adı', 'Toplam Kazanılan Adet', 'Dağılım Oranı (%)'];
    const rows = sorted.map(([prodName, count]) => {
      const percent = ((count / filteredSpins.length) * 100).toFixed(1) + '%';
      return [prodName, count.toString(), percent];
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += headers.join(';') + '\n';
    rows.forEach(row => {
      const escapedRow = row.map(val => `"${val.replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tugba_cark_urun_dagilimi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EXPORT STORE DAILY REPORTS TO EXCEL/CSV ---
  const exportStoreReportsToCSV = () => {
    playClick();
    if (filteredStoreReports.length === 0) return;

    const headers = [
      'Şube Adı',
      'Tarih',
      'Mağaza Cirosu (TL)',
      'Tezgah Tamamlama (adet)',
      'Kasa Tamamlama (adet)',
      'Çark İkramlık (TL)',
      'Ortalama Sepet (TL)',
      'Müşteri Sayısı',
      'Çark Çevrim Adeti'
    ];

    const rows = filteredStoreReports.map(report => {
      const defaultSpinCount = spins.filter(
        s => s.store_id === report.store_id &&
        s.created_at?.split('T')[0] === report.created_at?.split('T')[0]
      ).length;
      const displaySpinCount = report.spin_count !== undefined ? report.spin_count : defaultSpinCount;
      const dateStr = new Date(report.created_at).toLocaleDateString('tr-TR');

      return [
        report.store_name,
        dateStr,
        String(report.turnover ?? 0),
        String(report.counter_completion ?? 0),
        String(report.cashier_completion ?? 0),
        String(report.wheel_treat_amount ?? 0),
        String(report.average_basket ?? 0),
        String(report.customer_count ?? 0),
        String(displaySpinCount)
      ];
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += headers.join(';') + '\n';
    rows.forEach(row => {
      const escapedRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tugba_sube_gunluk_veriler_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <strong className="admin-navbar-title">Hediye Çarkı Yönetim Paneli</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { playClick(); if (onPreviewWheel) onPreviewWheel(); }} style={styles.liveLink} className="admin-nav-live-btn">
            🧪 Test Çarkı
          </button>
          <button onClick={handleAdminLogout} style={styles.logoutBtn} className="admin-nav-logout-btn">
            Çıkış 🚪
          </button>
        </div>
      </div>

      <div className="container" style={{ width: '100%', marginTop: '30px' }}>
        {error && <div style={styles.errorBox}>{error}</div>}
        {message && <div style={styles.successBox}>{message}</div>}

        {/* Tabs Headers */}
        <div className="glass-card" style={styles.tabsHeader}>
          <button
            className="admin-tab-btn"
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'raporlar' ? '3px solid var(--altin)' : '3px solid transparent',
              color: activeTab === 'raporlar' ? 'var(--altin)' : 'var(--krem)',
              opacity: activeTab === 'raporlar' ? 1 : 0.7
            }}
            onClick={() => { playClick(); setActiveTab('raporlar'); }}
          >
            📊 Raporlar
          </button>
          <button
            className="admin-tab-btn"
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'urunler' ? '3px solid var(--altin)' : '3px solid transparent',
              color: activeTab === 'urunler' ? 'var(--altin)' : 'var(--krem)',
              opacity: activeTab === 'urunler' ? 1 : 0.7
            }}
            onClick={() => {
              playClick();
              setActiveTab('urunler');
              setProductForm({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true });
            }}
          >
            🎡 Ürünler
          </button>
          <button
            className="admin-tab-btn"
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'magazalar' ? '3px solid var(--altin)' : '3px solid transparent',
              color: activeTab === 'magazalar' ? 'var(--altin)' : 'var(--krem)',
              opacity: activeTab === 'magazalar' ? 1 : 0.7
            }}
            onClick={() => {
              playClick();
              setActiveTab('magazalar');
              setStoreForm({ id: '', name: '', username: '', password: '', min_limit: '1000', screensaver_enabled: true });
            }}
          >
            🏪 Şubeler
          </button>
        </div>

        {/* TAB 1: REPORTS */}
        {activeTab === 'raporlar' && (
          <div>
            <div className="glass-card admin-filter-card" style={styles.filterCard}>
              <h3 style={{ marginBottom: '16px', color: 'var(--altin)' }}>Rapor Filtreleri</h3>
              <div style={styles.filterGrid} className="admin-filter-grid">
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Mağaza Şubesi</label>
                  <select
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all" style={styles.option}>Tüm Şubeler</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id} style={styles.option}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Kazanılan Hediye</label>
                  <select
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all" style={styles.option}>Tüm Hediyeler</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name} style={styles.option}>{p.name}</option>
                    ))}
                  </select>
                </div>

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

                <div style={{ ...styles.filterGroup, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      playClick();
                      setFilterStartDate(getTodayString());
                      setFilterEndDate(getTodayString());
                      setFilterStore('all');
                      setFilterProduct('all');
                    }}
                    style={styles.clearFilterBtn}
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.summaryGrid}>
              <div className="glass-card" style={styles.summaryCard}>
                <div style={styles.summaryNumber} className="admin-summary-number">{stats.totalSpins}</div>
                <div style={styles.summaryLabel}>Toplam Çark Çevirme</div>
              </div>
              <div className="glass-card" style={styles.summaryCard}>
                <div style={styles.summaryNumberText} className="admin-summary-text">{stats.mostWonProduct}</div>
                <div style={styles.summaryLabel}>En Çok Çıkan Hediye</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
              {/* Sub-tabs for Details vs Toplu */}
              <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '20px' }}>
                <button
                  className="admin-subtab-btn"
                  onClick={() => { playClick(); setReportSubTab('detay'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: reportSubTab === 'detay' ? 'var(--altin)' : 'var(--krem)',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    cursor: 'pointer',
                    borderBottom: reportSubTab === 'detay' ? '3px solid var(--altin)' : '3px solid transparent',
                    paddingBottom: '8px',
                    opacity: reportSubTab === 'detay' ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                >
                  📋 Spin Kayıt Detayları
                </button>
                <button
                  className="admin-subtab-btn"
                  onClick={() => { playClick(); setReportSubTab('toplu'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: reportSubTab === 'toplu' ? 'var(--altin)' : 'var(--krem)',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    cursor: 'pointer',
                    borderBottom: reportSubTab === 'toplu' ? '3px solid var(--altin)' : '3px solid transparent',
                    paddingBottom: '8px',
                    opacity: reportSubTab === 'toplu' ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                >
                  📊 Ürün Dağılımı (Toplu)
                </button>
                <button
                  className="admin-subtab-btn"
                  onClick={() => { playClick(); setReportSubTab('magaza_verileri'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: reportSubTab === 'magaza_verileri' ? 'var(--altin)' : 'var(--krem)',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    cursor: 'pointer',
                    borderBottom: reportSubTab === 'magaza_verileri' ? '3px solid var(--altin)' : '3px solid transparent',
                    paddingBottom: '8px',
                    opacity: reportSubTab === 'magaza_verileri' ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                >
                  📝 Şube Günlük Verileri
                </button>
              </div>

              {reportSubTab === 'detay' && (
                <>
                  <div style={styles.tableHeaderSection} className="admin-table-header">
                    <h3 style={{ color: 'var(--altin)' }}>Spin Kayıt Detayları</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={exportToCSV}
                        style={styles.csvBtn}
                        disabled={filteredSpins.length === 0}
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

                  {filteredSpins.length > 0 ? (
                    <div className="admin-table-wrap">
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.tableTh}>Şube</th>
                          <th style={styles.tableTh}>Kazanılan Hediye</th>
                          <th style={styles.tableTh}>Fiş No</th>
                          <th style={styles.tableTh}>Tarih & Saat</th>
                          <th style={{ ...styles.tableTh, textAlign: 'center' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSpins.map((spin) => (
                          <tr key={spin.id} style={styles.tableRow}>
                            <td style={styles.tableTd}>{spin.store_name}</td>
                            <td style={styles.tableTd}>
                              <span style={styles.winBadge} className="admin-win-badge">{spin.product_name}</span>
                            </td>
                            <td style={styles.tableTd}>
                              <code>{spin.receipt_no || '-'}</code>
                            </td>
                            <td style={styles.tableTd}>
                              {new Date(spin.created_at).toLocaleString('tr-TR')}
                            </td>
                            <td style={{ ...styles.tableTd, textAlign: 'center' }}>
                              <button
                                onClick={() => handleSingleSpinDelete(spin.id)}
                                style={styles.rowDelBtn}
                                title="Kaydı Sil"
                              >
                                🗑️ Sil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  ) : (
                    <div style={styles.noDataBox}>
                      Kayıt bulunamadı.
                    </div>
                  )}
                </>
              )}

              {reportSubTab === 'toplu' && (
                <>
                  <div style={styles.tableHeaderSection} className="admin-table-header">
                    <h3 style={{ color: 'var(--altin)' }}>Filtrelenen Ürünlerin Dağılımı</h3>
                    <button
                      onClick={exportDistributionToCSV}
                      style={styles.csvBtn}
                      disabled={filteredSpins.length === 0}
                    >
                      📊 CSV / Excel Olarak İndir
                    </button>
                  </div>

                  {filteredSpins.length > 0 ? (
                    <div className="admin-table-wrap">
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.tableTh}>Ürün Hediye Adı</th>
                          <th style={styles.tableTh}>Toplam Kazanılan Adet</th>
                          <th style={styles.tableTh}>Dağılım Oranı (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const distribution = filteredSpins.reduce((acc, spin) => {
                            acc[spin.product_name] = (acc[spin.product_name] || 0) + 1;
                            return acc;
                          }, {});
                          const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
                          return sorted.map(([prodName, count]) => {
                            const percent = ((count / filteredSpins.length) * 100).toFixed(1);
                            return (
                              <tr key={prodName} style={styles.tableRow}>
                                <td style={{ ...styles.tableTd, fontWeight: 'bold' }}>{prodName}</td>
                                <td style={styles.tableTd}>
                                  <span style={{ ...styles.winBadge, background: 'var(--yesil)', color: '#fff', padding: '4px 12px', borderRadius: '12px' }}>
                                    {count} adet
                                  </span>
                                </td>
                                <td style={styles.tableTd}>{percent}%</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    </div>
                  ) : (
                    <div style={styles.noDataBox}>
                      Filtrelenen aralıkta veri bulunmamaktadır.
                    </div>
                  )}
                </>
              )}

              {reportSubTab === 'magaza_verileri' && (
                <>
                  <div style={styles.tableHeaderSection} className="admin-table-header">
                    <h3 style={{ color: 'var(--altin)' }}>Şube Günlük Veri Girişleri</h3>
                    <button
                      onClick={exportStoreReportsToCSV}
                      style={styles.csvBtn}
                      disabled={filteredStoreReports.length === 0}
                    >
                      📊 CSV / Excel Olarak İndir
                    </button>
                  </div>

                  {filteredStoreReports.length > 0 ? (
                    <div className="admin-table-wrap">
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={styles.tableTh}>Şube Adı</th>
                            <th style={styles.tableTh}>Tarih</th>
                            <th style={styles.tableTh}>Mağaza Cirosu</th>
                            <th style={styles.tableTh}>Tezgah Tamamlama</th>
                            <th style={styles.tableTh}>Kasa Tamamlama</th>
                            <th style={styles.tableTh}>Çark İkramlık</th>
                            <th style={styles.tableTh}>Sepet Ort.</th>
                            <th style={styles.tableTh}>Müşteri Sayısı</th>
                            <th style={styles.tableTh}>Çark Çevrim Adeti</th>
                            <th style={styles.tableTh}>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStoreReports.map((report) => {
                            const dateObj = new Date(report.created_at);
                            const dateStr = dateObj.toLocaleDateString('tr-TR');
                            const defaultSpinCount = spins.filter(
                              s => s.store_id === report.store_id && 
                              s.created_at?.split('T')[0] === report.created_at?.split('T')[0]
                            ).length;
                            const displaySpinCount = report.spin_count !== undefined ? report.spin_count : defaultSpinCount;

                            return (
                              <tr key={report.id} style={styles.tableRow}>
                                <td style={{ ...styles.tableTd, fontWeight: 'bold' }}>{report.store_name}</td>
                                <td style={styles.tableTd}>{dateStr}</td>
                                <td style={styles.tableTd}>{report.turnover} TL</td>
                                <td style={styles.tableTd}>{report.counter_completion} adet</td>
                                <td style={styles.tableTd}>{report.cashier_completion} adet</td>
                                <td style={styles.tableTd}>{report.wheel_treat_amount} TL</td>
                                <td style={styles.tableTd}>{report.average_basket} TL</td>
                                <td style={styles.tableTd}>{report.customer_count || 0} kişi</td>
                                <td style={styles.tableTd}>
                                  <span style={{ ...styles.winBadge, background: 'rgba(217, 164, 65, 0.1)', color: 'var(--altin)', border: '1px solid var(--altin)' }}>
                                    {displaySpinCount} adet
                                  </span>
                                </td>
                                <td style={styles.tableTd}>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      onClick={() => handleReportEditClick(report)}
                                      style={styles.editBtn}
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={() => handleReportDelete(report.id)}
                                      style={styles.delBtn}
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={styles.noDataBox}>
                      Filtrelenen aralıkta şube günlük veri girişi bulunmamaktadır.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS CRUD */}
        {activeTab === 'urunler' && (
          <div style={styles.crudContainer} className="admin-crud-grid">
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
                    Örn: <strong>10</strong> → 10 çevirmede 1 kez çıkar. <strong>0</strong> → çarkta görünür fakat hiç çıkmaz.
                  </small>
                </div>

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

                <div style={styles.presetSection}>
                  <span style={styles.presetLabel}>Renk Şablonları:</span>
                  <div style={styles.presetGrid}>
                    {colorPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        style={{ ...styles.presetBox, backgroundColor: p.bg, border: `2px solid ${p.text}` }}
                        onClick={() => setProductForm({ ...productForm, color: p.bg, text_color: p.text })}
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
                      onClick={() => { playClick(); setProductForm({ id: '', name: '', chance: 20, color: '#2A6B40', text_color: '#FBF3E4', is_active: true }); }}
                      style={styles.cancelBtn}
                    >
                      Vazgeç
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="glass-card" style={styles.crudListCard}>
              <h3 style={{ color: 'var(--altin)', marginBottom: '20px' }}>
                Hediye Ürün Listesi ({products.length} adet)
              </h3>
              {products.length > 0 ? (() => {
                const activeProducts = products.filter(p => p.is_active);
                const totalWeight = activeProducts.reduce((acc, p) => acc + (p.chance > 0 ? 1 / p.chance : 0), 0);
                return (
                  <div style={styles.scrollableList}>
                    {products.map((p) => {
                      const weight = p.chance > 0 ? 1 / p.chance : 0;
                      const realPercent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '0.0';
                      return (
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
                                <span>Olasılık: 1/{p.chance} {p.is_active && `(Net Şans: %${realPercent})`}</span>
                                <span style={{ margin: '0 6px' }}>•</span>
                                <span style={{ color: p.is_active ? 'var(--yesil-isik)' : '#94A3B8' }}>
                                  {p.is_active ? 'Aktif' : 'Pasif'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => { playClick(); setProductForm(p); }}
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
                      );
                    })}
                  </div>
                );
              })() : (
                <div style={styles.noDataBox}>
                  Sistemde hediye tanımlanmamış.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORES CRUD */}
        {activeTab === 'magazalar' && (
          <div>
            {/* Global Screensaver Setting Card */}
            <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ color: 'var(--altin)', margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🖼️ Görsel Dönüşü (Screensaver) Genel Yönetimi
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
                  Tüm mağazalarda 30 saniye boyunca işlem yapılmadığında ürün görsellerinin dönmesini tek tıkla açıp kapatabilirsiniz.
                </p>
              </div>
              <button
                onClick={handleToggleGlobalScreensaver}
                style={{
                  padding: '10px 20px',
                  fontWeight: '700',
                  fontSize: '13px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: globalScreensaver ? 'var(--yesil)' : 'var(--kirmizi)',
                  color: 'var(--krem)',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                disabled={submitting}
              >
                {globalScreensaver ? 'TÜMÜNDE AKTİF (KAPAT)' : 'TÜMÜNDE PASİF (AÇ)'}
              </button>
            </div>

            <div style={styles.crudContainer} className="admin-crud-grid">
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
                    <label style={styles.formLabel}>Giriş Şifresi (Sadece Rakam)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Örn: 12345"
                      value={storeForm.password}
                      onChange={(e) => setStoreForm({ ...storeForm, password: e.target.value.replace(/[^0-9]/g, '') })}
                      className="glass-input"
                      required
                    />
                    <small style={{ ...styles.formHelp, color: 'var(--pembe)' }}>
                      * Mağaza şifresi sadece rakamlardan oluşmalıdır.
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Minimum Çark Çevirme Limiti (TL)</label>
                    <input
                      type="number"
                      placeholder="Örn: 1000"
                      value={storeForm.min_limit || ''}
                      onChange={(e) => setStoreForm({ ...storeForm, min_limit: e.target.value })}
                      className="glass-input"
                      required
                    />
                    <small style={{ ...styles.formHelp, color: 'var(--krem)', opacity: 0.6 }}>
                      * Müşterinin çarkı çevirebilmesi için gereken minimum fatura tutarı.
                    </small>
                  </div>

                  <div style={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="screensaverEnabled"
                      checked={storeForm.screensaver_enabled !== false}
                      onChange={(e) => setStoreForm({ ...storeForm, screensaver_enabled: e.target.checked })}
                      style={styles.checkbox}
                    />
                    <label htmlFor="screensaverEnabled" style={styles.checkboxLabel}>
                      Görsel Dönüşü (Screensaver) Aktif
                    </label>
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
                        onClick={() => { playClick(); setStoreForm({ id: '', name: '', username: '', password: '', min_limit: '1000', screensaver_enabled: true }); }}
                        style={styles.cancelBtn}
                      >
                        Vazgeç
                      </button>
                    )}
                  </div>
                </form>
              </div>

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
                            <span style={{ margin: '0 6px' }}>•</span>
                            <span>Limit: <code>{s.min_limit !== undefined ? s.min_limit : 1000} TL</code></span>
                            <span style={{ margin: '0 6px' }}>•</span>
                            <span style={{ color: s.screensaver_enabled !== false ? 'var(--yesil-isik)' : 'var(--pembe)' }}>
                              Görsel Dönüşü: {s.screensaver_enabled !== false ? 'Aktif 🖼️' : 'Pasif 🚫'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => { playClick(); setStoreForm({ id: s.id, name: s.name, username: s.username, password: s.password, min_limit: s.min_limit !== undefined ? String(s.min_limit) : '1000', screensaver_enabled: s.screensaver_enabled !== false }); }}
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
                    Sistemde şube tanımlanmamış.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={styles.confirmModalArka}>
          <div style={styles.confirmModal}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--kirmizi)', marginBottom: '8px' }}>
              {confirmModal.title}
            </h2>
            <p style={{ fontSize: '14.5px', color: '#475569', marginBottom: '24px', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={() => { playClick(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
                style={styles.confirmCancelBtn}
              >
                İptal Et
              </button>
              <button
                onClick={() => { playClick(); confirmModal.onConfirm(); }}
                style={styles.confirmConfirmBtn}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Edit Modal */}
      {editingReport && (
        <div style={styles.confirmModalArka}>
          <div style={{ ...styles.confirmModal, maxWidth: '480px', border: '3px solid var(--altin)', textAlign: 'left', background: '#fff' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--altin)', marginBottom: '4px', textAlign: 'center' }}>
              📝 Günlük Rapor Düzenle
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', textAlign: 'center', fontWeight: '600' }}>
              {editingReport.store_name} - {new Date(editingReport.created_at).toLocaleDateString('tr-TR')}
            </p>
            <form onSubmit={handleReportEditSubmit} style={{ ...styles.form, gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={{ ...styles.formLabel, color: '#1e293b' }}>Mağaza Cirosu (TL)</label>
                <input
                  type="number"
                  value={reportForm.turnover}
                  onChange={(e) => setReportForm({ ...reportForm, turnover: e.target.value })}
                  style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, color: '#1e293b' }}>Tezgah Tamamlama (Adet)</label>
                  <input
                    type="number"
                    value={reportForm.counter_completion}
                    onChange={(e) => setReportForm({ ...reportForm, counter_completion: e.target.value })}
                    style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, color: '#1e293b' }}>Kasa Tamamlama (Adet)</label>
                  <input
                    type="number"
                    value={reportForm.cashier_completion}
                    onChange={(e) => setReportForm({ ...reportForm, cashier_completion: e.target.value })}
                    style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, color: '#1e293b' }}>Çark İkramlık (TL)</label>
                  <input
                    type="number"
                    value={reportForm.wheel_treat_amount}
                    onChange={(e) => setReportForm({ ...reportForm, wheel_treat_amount: e.target.value })}
                    style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, color: '#1e293b' }}>Sepet Ortalaması (TL)</label>
                  <input
                    type="number"
                    value={reportForm.average_basket}
                    onChange={(e) => setReportForm({ ...reportForm, average_basket: e.target.value })}
                    style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, color: '#1e293b' }}>Müşteri Sayısı (Kişi)</label>
                  <input
                    type="number"
                    value={reportForm.customer_count}
                    onChange={(e) => setReportForm({ ...reportForm, customer_count: e.target.value })}
                    style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={{ ...styles.formLabel, color: '#1e293b' }}>Çevrim Adeti (Otomatik)</label>
                  <input
                    type="number"
                    value={reportForm.spin_count}
                    onChange={(e) => setReportForm({ ...reportForm, spin_count: e.target.value })}
                    style={{ ...styles.select, background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleCancelReportEdit}
                  style={styles.confirmCancelBtn}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ ...styles.confirmConfirmBtn, background: '#123A20', color: '#FBF3E4' }}
                >
                  {submitting ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    background: 'rgba(217, 164, 65, 0.1)',
    border: '1px solid var(--altin)',
    color: 'var(--altin)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
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
    width: '100%',
    boxSizing: 'border-box',
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
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'var(--krem)',
    borderRadius: '10px',
    padding: '9px',
    outline: 'none',
    fontSize: '14px',
  },
  option: {
    background: '#123A20',
    color: '#FBF3E4',
  },
  clearFilterBtn: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'var(--krem)',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
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
    // mobile override via .admin-crud-grid class
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
  },
  rowDelBtn: {
    background: 'rgba(179, 64, 47, 0.1)',
    border: '1px solid var(--kirmizi)',
    color: 'var(--krem)',
    fontWeight: '700',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  confirmModalArka: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  confirmModal: {
    background: '#fff',
    borderRadius: '20px',
    padding: '30px 24px',
    maxWidth: '380px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    border: '3px solid var(--kirmizi)',
    animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  confirmCancelBtn: {
    flex: 1,
    background: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: '999px',
    padding: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  confirmConfirmBtn: {
    flex: 1,
    background: 'var(--kirmizi)',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    padding: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
};
