import { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AdminLogin({ navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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
        // Auto-seed admin credentials if they don't exist yet in the database
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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.marka}>Tuğba Kuruyemiş</div>
        <h1 style={styles.title}>🎡 Hediye Çarkı</h1>
      </header>

      <div className="glass-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Yönetici Girişi</h2>
        <p style={styles.cardSubtitle}>Sistem ayarları ve raporlar için yönetici bilgilerinizi girin.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
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
      </div>

      <div style={styles.footer}>
        <button onClick={() => navigate('/login')} style={styles.storeLink}>
          🏪 Mağaza Giriş Ekranına Dön
        </button>
      </div>
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
    marginBottom: '24px',
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
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px 30px',
    animation: 'popIn 0.4s cubic-bezier(0.2, 1, 0.4, 1)',
    border: '2px solid var(--altin)',
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
    background: 'none',
    border: 'none',
    color: 'var(--krem)',
    opacity: 0.6,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};
