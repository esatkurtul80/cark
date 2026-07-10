import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { playClick } from '../utils/audio';

export default function Login({ navigate, onLogin, onAdminLogin }) {
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Check Admin Credentials
      const adminDocRef = doc(db, 'settings', 'admin');
      const adminDoc = await getDoc(adminDocRef);

      let expectedUsername = 'admin';
      let expectedPassword = 'tugba123admin';

      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        expectedUsername = (adminData.username || 'admin').trim().toLowerCase();
        expectedPassword = (adminData.password || 'tugba123admin').trim();
      } else {
        // Auto-seed admin credentials if missing
        await setDoc(adminDocRef, {
          username: expectedUsername,
          password: expectedPassword,
          created_at: new Date().toISOString(),
        });
      }

      if (cleanUsername === expectedUsername && cleanPassword === expectedPassword) {
        if (onAdminLogin) onAdminLogin();
        navigate('/admin');
        return;
      }

      // 2. Check Store Credentials
      const q = query(
        collection(db, 'stores'),
        where('username', '==', cleanUsername),
        where('password', '==', cleanPassword)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Geçersiz kullanıcı adı/kodu veya şifre.');
      }

      const storeDoc = querySnapshot.docs[0];
      const storeData = storeDoc.data();

      localStorage.setItem(
        'store_session',
        JSON.stringify({
          id: storeDoc.id,
          username: storeData.username,
          name: storeData.name,
          min_limit: storeData.min_limit !== undefined ? storeData.min_limit : 1000
        })
      );

      if (onLogin) onLogin();
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
        <h1 style={styles.title}>Hediye Çarkı</h1>
      </header>

      <div className="glass-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Sisteme Giriş</h2>
        <p style={styles.cardSubtitle}>
          Şube kodu veya yönetici kullanıcı adınızı kullanarak giriş yapın.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLoginSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Kullanıcı Adı / Şube Kodu</label>
            <input
              type="text"
              placeholder="Örn: magaza_aydin veya admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Giriş Şifresi</label>
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
