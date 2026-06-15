'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreHome() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [receiptNo, setReceiptNo] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const wheelRef = useRef(null);
  const canvasRef = useRef(null);
  const currentRotationRef = useRef(0);
  const animationFrameIdRef = useRef(null);
  const confettiParticlesRef = useRef([]);

  const router = useRouter();

  // Fetch store authentication details & active products
  useEffect(() => {
    async function loadData() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/login');
          return;
        }
        const authData = await authRes.json();
        setStore(authData.user);

        const productsRes = await fetch('/api/admin/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.filter(p => p.is_active));
        }
      } catch (err) {
        console.error('Data loading error:', err);
        setError('Veriler yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    }
    loadData();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [router]);

  // Handle store logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Securely trigger the wheel spin
  const handleSpin = async () => {
    if (spinning || products.length === 0) return;
    setSpinning(true);
    setError('');

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_no: receiptNo }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Çekiliş sırasında bir hata oluştu.');
      }

      const { winnerIndex, winner: winProduct } = data;
      setWinner(winProduct);

      // Spin rotation math
      const DILIM = products.length;
      const ACI = 360 / DILIM;
      
      // Calculate target angle based on index
      const targetAngle = 360 - (winnerIndex * ACI);
      // Extra spins (5 to 7 full circles)
      const extraTurns = 360 * (5 + Math.floor(Math.random() * 3));
      // Subtle deviation from the exact center of slice
      const deviation = (Math.random() - 0.5) * (ACI * 0.6);

      const nextRotation = currentRotationRef.current + extraTurns + ((targetAngle - (currentRotationRef.current % 360) + 360) % 360) + deviation;
      currentRotationRef.current = nextRotation;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${nextRotation}deg)`;
      }

      // Wait for spin animation (5.2s transition)
      setTimeout(() => {
        setSpinning(false);
        setShowModal(true);
        triggerConfetti();
        setReceiptNo(''); // Clear receipt input for next customer
      }, 5400);

    } catch (err) {
      setError(err.message);
      setSpinning(false);
    }
  };

  // HTML5 Canvas Confetti animation
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adjust canvas resolution
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const colors = ["#D9A441", "#E8A0A8", "#2A6B40", "#B3402F", "#FBF3E4"];
    
    // Generate particles
    const particles = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 12 - 4,
        gravity: 0.3 + Math.random() * 0.15,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        life: 120 + Math.random() * 60,
      });
    }

    confettiParticlesRef.current = particles;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      confettiParticlesRef.current.forEach((p) => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += 0.2;
        p.life--;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (alive) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animate();
  };

  // Resize canvas event handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate SVG segments dynamically
  const renderWheelSegments = () => {
    const DILIM = products.length;
    if (DILIM === 0) return null;
    const ACI = 360 / DILIM;
    const R = 250, CX = 250, CY = 250;

    const segments = [];
    const texts = [];

    products.forEach((prod, i) => {
      // Draw segment path
      const a1 = (i * ACI - 90 - ACI / 2) * Math.PI / 180;
      const a2 = ((i + 1) * ACI - 90 - ACI / 2) * Math.PI / 180;
      const x1 = CX + R * Math.cos(a1);
      const y1 = CY + R * Math.sin(a1);
      const x2 = CX + R * Math.cos(a2);
      const y2 = CY + R * Math.sin(a2);
      
      segments.push(
        <path
          key={`seg-${i}`}
          d={`M ${CX} ${CY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
          fill={prod.color}
          stroke="#FBF3E4"
          strokeWidth="2"
        />
      );

      // Render segment text
      const midAngle = i * ACI - 90;
      const displayLength = prod.name.length;
      const fontSize = displayLength > 16 ? 11.5 : (displayLength > 12 ? 13 : 15);
      
      texts.push(
        <text
          key={`text-${i}`}
          x="240"
          y="0"
          fill={prod.text_color}
          fontSize={fontSize}
          fontWeight="800"
          textAnchor="end"
          dominantBaseline="middle"
          transform={`rotate(${midAngle} 250 250) translate(250 250)`}
          fontFamily="'Outfit', sans-serif"
        >
          {prod.name}
        </text>
      );
    });

    return (
      <svg viewBox="0 0 500 500" style={{ display: 'block', width: '100%', height: '100%' }}>
        {segments}
        {texts}
      </svg>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', fontWeight: '600' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.navbar}>
        <div style={styles.navStoreInfo}>
          <span style={styles.storeBadge}>🏪</span>
          <strong>{store?.name || 'Mağaza'}</strong>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Çıkış Yap 🚪
        </button>
      </div>

      <header style={styles.header}>
        <div className="marka">Tuğba Kuruyemiş</div>
        <h1 style={styles.title}>Hediye Çarkı</h1>
        <div className="kosul" style={styles.kosul}>
          500 TL ve üzeri alışverişe özel · 1 çevirme hakkı
        </div>
      </header>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Inputs area */}
      <div style={styles.inputArea}>
        <label style={styles.inputLabel}>Fiş Numarası (Opsiyonel)</label>
        <input
          type="text"
          placeholder="Örn: TR-12345"
          value={receiptNo}
          onChange={(e) => setReceiptNo(e.target.value)}
          className="glass-input"
          style={styles.receiptInput}
          disabled={spinning}
        />
      </div>

      {/* Wheel Area */}
      <div style={styles.carkAlani}>
        <div style={styles.ibre}></div>
        <div
          id="carkSarici"
          ref={wheelRef}
          style={{
            ...styles.carkSarici,
            transition: spinning ? 'transform 5.2s cubic-bezier(0.12, 0.65, 0.06, 1)' : 'none'
          }}
        >
          {products.length > 0 ? (
            renderWheelSegments()
          ) : (
            <div style={styles.noProducts}>
              Çarkta aktif ürün bulunamadı.
            </div>
          )}
        </div>
        <div className="gobek" style={styles.gobek} onClick={handleSpin}>
          ÇEVİR!
        </div>
      </div>

      <button
        className="btn-primary"
        style={styles.cevirBtn}
        onClick={handleSpin}
        disabled={spinning || products.length === 0}
      >
        {spinning ? 'ÇARK DÖNÜYOR...' : 'ÇARKI ÇEVİR'}
      </button>

      <p className="alt-not">
        Çarkta çıkan üründen <strong>250 g'lık 1 paket</strong> hediye kazanırsınız.
      </p>

      {/* Results Modal */}
      {showModal && winner && (
        <div className="modal-arka acik" style={styles.modalArka}>
          <div className="modal" style={styles.modal}>
            <div className="emoji" style={{ fontSize: '64px' }}>🎉</div>
            <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '12px 0 6px', color: 'var(--koyu-yesil)' }}>
              Tebrikler!
            </h2>
            <div style={styles.odul}>{winner.name}</div>
            <div style={styles.gramaj}>250 g · 1 Paket Hediye</div>
            <p style={styles.kasa}>
              Bu ekranı kasadaki görevlimize göstererek hediyenizi teslim alabilirsiniz. Afiyet olsun! 🌰
            </p>
            <button
              style={styles.kapatBtn}
              onClick={() => setShowModal(false)}
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Confetti overlay */}
      <canvas ref={canvasRef} style={styles.confettiCanvas}></canvas>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '70px 20px 20px 20px',
    position: 'relative',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'rgba(0,0,0,0.25)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navStoreInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
  },
  storeBadge: {
    fontSize: '18px',
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
  header: {
    textAlign: 'center',
    padding: '10px 16px 8px',
  },
  title: {
    fontSize: 'clamp(28px, 6vw, 44px)',
    fontWeight: '900',
    marginTop: '4px',
    textShadow: '0 3px 0 rgba(0,0,0,.25)',
  },
  kosul: {
    marginTop: '10px',
  },
  errorBox: {
    background: 'rgba(179, 64, 47, 0.2)',
    border: '1px solid var(--kirmizi)',
    color: 'var(--krem)',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '10px',
    textAlign: 'center',
    maxWidth: '460px',
    width: '100%',
  },
  inputArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '16px',
    width: '100%',
    maxWidth: '280px',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '12px',
    fontWeight: '700',
    opacity: 0.9,
    letterSpacing: '0.5px',
  },
  receiptInput: {
    width: '100%',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '16px',
    letterSpacing: '1px',
  },
  carkAlani: {
    position: 'relative',
    width: 'min(86vw, 450px)',
    height: 'min(86vw, 450px)',
    margin: '20px 0 10px',
  },
  ibre: {
    position: 'absolute',
    top: '-6px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 5,
    width: 0,
    height: 0,
    borderLeft: '18px solid transparent',
    borderRight: '18px solid transparent',
    borderTop: '34px solid var(--kirmizi)',
    filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.4))',
  },
  carkSarici: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    boxShadow: '0 0 0 10px var(--altin), 0 0 0 14px var(--koyu-yesil), 0 18px 50px rgba(0,0,0,.5)',
    willChange: 'transform',
    position: 'relative',
    overflow: 'hidden',
  },
  gobek: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '21%',
    height: '21%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #F0C679, var(--altin) 65%, #A87B27)',
    border: '4px solid var(--krem)',
    zIndex: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '900',
    color: 'var(--koyu-yesil)',
    fontSize: 'clamp(11px, 2.6vw, 15px)',
    textAlign: 'center',
    lineHeight: 1.1,
    cursor: 'pointer',
    userSelect: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,.4)',
    transition: 'transform 0.1s',
  },
  cevirBtn: {
    margin: '12px 0 6px',
    fontSize: 'clamp(18px, 4.5vw, 22px)',
    letterSpacing: '2px',
    padding: '14px 48px',
  },
  noProducts: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'var(--koyu-yesil)',
    color: 'var(--krem)',
    fontWeight: '600',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  modalArka: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '20px',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--krem)',
    color: 'var(--koyu-yesil)',
    borderRadius: '24px',
    padding: '30px 24px',
    maxWidth: '380px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,.5)',
    border: '5px solid var(--altin)',
    animation: 'popIn .4s cubic-bezier(.2,1.6,.4,1)',
  },
  odul: {
    fontSize: 'clamp(22px, 5.5vw, 28px)',
    fontWeight: '900',
    color: 'var(--kirmizi)',
    margin: '6px 0',
  },
  gramaj: {
    display: 'inline-block',
    background: 'var(--yesil)',
    color: 'var(--krem)',
    fontWeight: '800',
    padding: '6px 16px',
    borderRadius: '999px',
    fontSize: '14px',
    margin: '6px 0 12px',
  },
  kasa: {
    fontSize: '13.5px',
    opacity: 0.9,
    lineHeight: '1.5',
    fontWeight: '600',
  },
  kapatBtn: {
    marginTop: '18px',
    background: 'var(--yesil)',
    color: 'var(--krem)',
    border: 'none',
    fontSize: '15px',
    fontWeight: '800',
    padding: '10px 32px',
    borderRadius: '999px',
    cursor: 'pointer',
    width: '100%',
  },
  confettiCanvas: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 55,
  },
};
