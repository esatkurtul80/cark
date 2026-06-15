import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

export default function Login({ navigate, defaultView = 'select' }) {
  const [view, setView] = useState(defaultView); // 'select' | 'store' | 'admin'
  
  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Store login form submit handler
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const q = query(
        collection(db, 'stores'),
        where('username', '==', username.trim().toLowerCase()),
        where('password', '==', password.trim())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Geçersiz kullanıcı kodu veya şifre.');
      }

      const storeDoc = querySnapshot.docs[0];
      const storeData = storeDoc.data();

      localStorage.setItem(
        'store_session',
        JSON.stringify({
          id: storeDoc.id,
          username: storeData.username,
          name: storeData.name,
        })
      );

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin login form submit handler
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const adminDocRef = doc(db, 'settings', 'admin');
      const adminDoc = await getDoc(adminDocRef);

      let expectedUsername = 'admin';
      let expectedPassword = 'tugba123admin';

      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        expectedUsername = adminData.username;
        expectedPassword = adminData.password;
      } else {
        // Auto-seed admin credentials if missing
        await setDoc(adminDocRef, {
          username: expectedUsername,
          password: expectedPassword,
          created_at: new Date().toISOString(),
        });
      }

      if (
        username.trim() === expectedUsername &&
        password === expectedPassword
      ) {
        localStorage.setItem('admin_session', 'true');
        navigate('/admin');
      } else {
        throw new Error('Geçersiz yönetici adı veya şifre.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('select');
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.marka}>Tuğba Kuruyemiş</div>
        <h1 style={styles.title}>Hediye Çarkı</h1>
      </header>

      {/* VIEW 1: GATEWAY SELECTION */}
      {view === 'select' && (
        <div style={styles.selectContainer}>
          <p style={styles.selectSubtitle}>Giriş yapmak istediğiniz paneli seçiniz.</p>
          <div className="select-gateway-grid">
            {/* Store Login Button (Left) */}
            <div className="glass-card gateway-card" onClick={() => setView('store')}>
              <div className="gateway-icon">🏪</div>
              <h2 style={styles.gatewayTitle}>Mağaza Girişi</h2>
              <p style={styles.gatewayDesc}>Şubeler için hediye çarkı çevirme ekranı</p>
            </div>
            {/* Admin Login Button (Right) */}
            <div className="glass-card gateway-card" onClick={() => setView('admin')}>
              <div className="gateway-icon">⚙️</div>
              <h2 style={styles.gatewayTitle}>Yönetici Girişi</h2>
              <p style={styles.gatewayDesc}>Raporlar, olasılıklar ve ürün tanımlamaları</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: STORE LOGIN FORM */}
      {view === 'store' && (
        <div className="glass-card" style={styles.card}>
          <h2 style={styles.cardTitle}>Mağaza Girişi</h2>
          <p style={styles.cardSubtitle}>Şubenizin kullanıcı kodu ve şifresini giriniz.</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleStoreSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Kullanıcı Kodu</label>
              <input
                type="text"
                placeholder="Örn: magaza_aydin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
            </button>
          </form>

          <button onClick={handleBack} style={styles.backBtn}>
            ← Giriş Seçimine Geri Dön
          </button>
        </div>
      )}

      {/* VIEW 3: ADMIN LOGIN FORM */}
      {view === 'admin' && (
        <div className="glass-card" style={{ ...styles.card, border: '2px solid var(--altin)' }}>
          <h2 style={styles.cardTitle}>Yönetici Girişi</h2>
          <p style={styles.cardSubtitle}>Sistem ayarları ve raporlar için bilgilerinizi giriniz.</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleAdminSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Yönetici Kullanıcı Adı</label>
              <input
                type="text"
                placeholder="Örn: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Yönetici Şifresi</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Giriş Yapılıyor...' : 'YÖNETİCİ GİRİŞİ YAP'}
            </button>
          </form>

          <button onClick={handleBack} style={styles.backBtn}>
            ← Giriş Seçimine Geri Dön
          </button>
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
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '10px',
  },
  marka: {
    fontSize: '14px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: 'var(--altin)',
    fontWeight: '700',
    marginBottom: '4px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '900',
    textShadow: '0 3px 0 rgba(0,0,0,.25)',
  },
  selectContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    animation: 'popIn 0.4s cubic-bezier(0.2, 1, 0.4, 1)',
  },
  selectSubtitle: {
    fontSize: '15px',
    opacity: 0.8,
    marginBottom: '10px',
  },
  gatewayTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--altin)',
  },
  gatewayDesc: {
    fontSize: '13px',
    opacity: 0.75,
    lineHeight: '1.4',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px 30px',
    animation: 'popIn 0.4s cubic-bezier(0.2, 1, 0.4, 1)',
    position: 'relative',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    textAlign: 'center',
    color: 'var(--altin)',
    marginBottom: '8px',
  },
  cardSubtitle: {
    fontSize: '14px',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: '24px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--krem)',
  },
  submitBtn: {
    padding: '14px',
    fontSize: '16px',
    marginTop: '10px',
    width: '100%',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--krem)',
    opacity: 0.6,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '20px',
    width: '100%',
    textAlign: 'center',
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1
    }
  },
  error: {
    background: 'rgba(179, 64, 47, 0.2)',
    border: '1px solid var(--kirmizi)',
    color: 'var(--krem)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '16px',
    fontWeight: '600',
  },
  footer: {
    marginTop: '24px',
  },
  storeLink: {
    color: 'var(--krem)',
    opacity: 0.6,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
};
