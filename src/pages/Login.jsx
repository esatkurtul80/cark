import { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Login({ navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Query stores collection in Firestore
      const q = query(
        collection(db, 'stores'),
        where('username', '==', username.trim().toLowerCase()),
        where('password', '==', password)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Geçersiz kullanıcı kodu veya şifre.');
      }

      const storeDoc = querySnapshot.docs[0];
      const storeData = storeDoc.data();

      // Store session in localStorage
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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.marka}>Tuğba Kuruyemiş</div>
        <h1 style={styles.title}>🎡 Hediye Çarkı</h1>
      </header>

      <div className="glass-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Mağaza Girişi</h2>
        <p style={styles.cardSubtitle}>Lütfen şubenizin kullanıcı kodu ve şifresini giriniz.</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
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
      </div>

      <div style={styles.footer}>
        <button onClick={() => navigate('/admin/login')} style={styles.adminLink}>
          ⚙️ Yönetici Girişi
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
  adminLink: {
    background: 'none',
    border: 'none',
    color: 'var(--krem)',
    opacity: 0.6,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};
