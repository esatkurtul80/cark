import { useEffect } from 'react';
import { initAudio, playClick } from '../utils/audio';

export default function Welcome({ onStart }) {
  // Float items data
  const floatItems = [
    { name: 'Antep Fıstığı', emoji: '🥜', top: '15%', left: '10%', delay: '0s', duration: '9s' },
    { name: 'Kavrulmuş Fındık', emoji: '🌰', top: '25%', right: '12%', delay: '1.5s', duration: '11s' },
    { name: 'Türk Kahvesi', emoji: '☕', top: '65%', left: '15%', delay: '0.5s', duration: '10s' },
    { name: 'Gül Lokumu', emoji: '🍬', top: '75%', right: '18%', delay: '2s', duration: '12s' },
    { name: 'Duble Kaju', emoji: '🥜', top: '45%', left: '8%', delay: '3s', duration: '8s' },
    { name: 'Kuru İncir', emoji: '🍑', top: '10%', right: '25%', delay: '1s', duration: '13s' },
    { name: 'Sarı Leblebi', emoji: '🥜', top: '55%', right: '8%', delay: '2.5s', duration: '9.5s' },
    { name: 'Ceviz İçi', emoji: '🌰', top: '80%', left: '35%', delay: '3.5s', duration: '11.5s' },
  ];

  const handleStart = () => {
    initAudio();
    playClick();
    onStart();
  };

  return (
    <div style={styles.container} onClick={handleStart}>
      {/* Floating Background Products */}
      <div style={styles.floatingArea}>
        {floatItems.map((item, idx) => (
          <div
            key={idx}
            className="floating-bg-card animate-float-drift"
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              animationDelay: item.delay,
              animationDuration: item.duration,
              position: 'absolute',
            }}
          >
            <span style={styles.emoji}>{item.emoji}</span>
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {/* Center Landing Card */}
      <div className="glass-card" style={styles.card}>
        <div style={styles.brand}>TUĞBA KURUYEMİŞ</div>
        <h1 style={styles.title}>Hediye Çarkı</h1>
        <p style={styles.subtitle}>
          Şubelerimize özel müşteri hediye çekiliş portalı
        </p>

        <div style={styles.actionArea}>
          <div style={styles.rippleButton}>
            <div style={styles.rippleOuter}></div>
            <div style={styles.rippleInner}>
              <span style={styles.touchIcon}>🎯</span>
            </div>
          </div>
          <span style={styles.touchText}>BAŞLAMAK İÇİN DOKUNUN</span>
        </div>
      </div>

      {/* Footer Branding */}
      <div style={styles.footer}>
        Tuğba Kuruyemiş © {new Date().getFullYear()} · Her Hakkı Saklıdır.
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
    width: '100vw',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    userSelect: 'none',
  },
  floatingArea: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  emoji: {
    fontSize: '20px',
  },
  card: {
    padding: '50px 40px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center',
    zIndex: 5,
    border: '2px solid rgba(217, 164, 65, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 20px 80px rgba(0, 0, 0, 0.5)',
  },
  brand: {
    fontSize: '14px',
    letterSpacing: '5px',
    color: 'var(--altin)',
    fontWeight: '800',
  },
  title: {
    fontSize: 'clamp(38px, 6vw, 48px)',
    fontWeight: '900',
    lineHeight: '1.1',
    textShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
    margin: 0,
  },
  subtitle: {
    fontSize: '15px',
    opacity: 0.8,
    maxWidth: '380px',
    lineHeight: '1.4',
    margin: '0 0 10px 0',
  },
  actionArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    marginTop: '15px',
  },
  rippleButton: {
    position: 'relative',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleOuter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'rgba(217, 164, 65, 0.2)',
    animation: 'ripple 2s infinite ease-out',
  },
  rippleInner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #E9B65A, var(--altin))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(217, 164, 65, 0.4)',
    zIndex: 2,
  },
  touchIcon: {
    fontSize: '28px',
  },
  touchText: {
    fontSize: '14px',
    letterSpacing: '2px',
    fontWeight: '800',
    color: 'var(--altin)',
    animation: 'pulseText 2s infinite ease-in-out',
  },
  footer: {
    position: 'absolute',
    bottom: '24px',
    fontSize: '12px',
    opacity: 0.5,
    zIndex: 5,
    textAlign: 'center',
  },
};
