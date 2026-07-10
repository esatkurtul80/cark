'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, orderBy, writeBatch, doc, onSnapshot, where, setDoc, getDoc } from 'firebase/firestore';
import { playClick, playTick, playWin, playApplause } from '../utils/audio';

const getRotationDegrees = (element) => {
  if (!element) return 0;
  const style = window.getComputedStyle(element);
  const transform = style.getPropertyValue('transform') || style.transform;
  if (!transform || transform === 'none') return 0;
  
  const values = transform.split('(')[1].split(')')[0].split(',');
  const a = parseFloat(values[0]);
  const b = parseFloat(values[1]);
  
  let angle = Math.atan2(b, a) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return angle;
};

export default function Wheel({ navigate, onLogout, isAdminPreview, onBackToAdmin }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [receiptNo, setReceiptNo] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [storeSpins, setStoreSpins] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [showPasswordPromptModal, setShowPasswordPromptModal] = useState(false);
  const [promptPassword, setPromptPassword] = useState('');
  const [promptError, setPromptError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [showReportSelectionModal, setShowReportSelectionModal] = useState(false);
  const [showStoreFormModal, setShowStoreFormModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formFields, setFormFields] = useState({
    turnover: '',
    counter_completion: '',
    cashier_completion: '',
    wheel_treat_amount: '',
    average_basket: '',
    customer_count: ''
  });
  const [activeField, setActiveField] = useState('turnover');


  const getTodayString = () => {
    const d = new Date();
    const dLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dLocal.toISOString().split('T')[0];
  };

  const [filterStartDate, setFilterStartDate] = useState(getTodayString());
  const [filterEndDate, setFilterEndDate] = useState(getTodayString());

  // Filter spins on client-side based on the selected date range
  const filteredSpins = storeSpins.filter((s) => {
    if (!s.created_at) return false;
    const spinDate = s.created_at.split('T')[0];
    if (filterStartDate && spinDate < filterStartDate) return false;
    if (filterEndDate && spinDate > filterEndDate) return false;
    return true;
  });

  const wheelRef = useRef(null);
  const canvasRef = useRef(null);
  const currentRotationRef = useRef(0);
  const animationFrameIdRef = useRef(null);
  const confettiParticlesRef = useRef([]);

  const defaultProducts = [
    { name: 'Antep Fıstığı', chance: 100, color: '#2A6B40', text_color: '#FBF3E4', is_active: true },
    { name: 'Gül Lokumu', chance: 20, color: '#D9A441', text_color: '#123A20', is_active: true },
    { name: 'Kavrulmuş Fındık', chance: 50, color: '#B3402F', text_color: '#FBF3E4', is_active: true },
    { name: 'Ay Çekirdeği', chance: 10, color: '#8A5A2B', text_color: '#FBF3E4', is_active: true },
    { name: 'Türk Kahvesi', chance: 30, color: '#E8A0A8', text_color: '#5A2430', is_active: true },
    { name: 'Kaju', chance: 80, color: '#2A6B40', text_color: '#FBF3E4', is_active: true },
    { name: 'Fıstıklı Lokum', chance: 25, color: '#D9A441', text_color: '#123A20', is_active: true },
    { name: 'Kabak Çekirdeği', chance: 10, color: '#B3402F', text_color: '#FBF3E4', is_active: true },
    { name: 'Çiğ Badem', chance: 60, color: '#8A5A2B', text_color: '#FBF3E4', is_active: true },
    { name: 'Sarı Leblebi', chance: 10, color: '#E8A0A8', text_color: '#5A2430', is_active: true },
    { name: 'Çifte Kavrulmuş Lokum', chance: 25, color: '#2A6B40', text_color: '#FBF3E4', is_active: true },
    { name: 'Kuru Kayısı', chance: 20, color: '#D9A441', text_color: '#123A20', is_active: true },
    { name: 'Ceviz İçi', chance: 60, color: '#B3402F', text_color: '#FBF3E4', is_active: true },
    { name: 'Tuzlu Fıstık', chance: 40, color: '#8A5A2B', text_color: '#FBF3E4', is_active: true },
    { name: 'Kuru İncir', chance: 20, color: '#E8A0A8', text_color: '#5A2430', is_active: true },
    { name: 'Karışık Kuruyemiş', chance: 15, color: '#2A6B40', text_color: '#FBF3E4', is_active: true },
    { name: 'Beyaz Leblebi', chance: 10, color: '#D9A441', text_color: '#123A20', is_active: true },
    { name: 'Çikolatalı Draje', chance: 30, color: '#B3402F', text_color: '#FBF3E4', is_active: true },
    { name: 'Kuru Üzüm', chance: 10, color: '#8A5A2B', text_color: '#FBF3E4', is_active: true },
    { name: 'Hurma', chance: 15, color: '#E8A0A8', text_color: '#5A2430', is_active: true }
  ];

  useEffect(() => {
    if (isAdminPreview) {
      setStore({ id: 'admin_preview', name: 'Yönetici (Önizleme)', min_limit: 1000 });
    } else {
      const sessionStr = localStorage.getItem('store_session');
      if (!sessionStr) {
        navigate('/');
        return;
      }
      try {
        const parsed = JSON.parse(sessionStr);
        setStore(parsed);
        // Fetch fresh store data (including name and min_limit)
        getDoc(doc(db, 'stores', parsed.id)).then(docSnap => {
          if (docSnap.exists()) {
            const freshData = docSnap.data();
            const updated = {
              ...parsed,
              name: freshData.name,
              min_limit: freshData.min_limit !== undefined ? freshData.min_limit : 1000
            };
            setStore(updated);
            localStorage.setItem('store_session', JSON.stringify(updated));
          }
        }).catch(err => console.error("Error fetching fresh store data:", err));
      } catch (e) {
        localStorage.removeItem('store_session');
        navigate('/');
        return;
      }
    }

    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('created_at', 'asc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      let list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (list.length === 0) {
        console.log('Seeding initial products into Firestore...');
        try {
          const batch = writeBatch(db);
          defaultProducts.forEach((item, idx) => {
            const newDocRef = doc(collection(db, 'products'));
            batch.set(newDocRef, {
              ...item,
              created_at: new Date(Date.now() + idx * 1000).toISOString()
            });
          });
          await batch.commit();
        } catch (err) {
          console.error('Error seeding products:', err);
        }
      } else {
        setProducts(list.filter(p => p.is_active));
        setLoading(false);
      }
    }, (err) => {
      console.error('Error listening to products:', err);
      setError('Çark ürünleri veritabanından çekilemedi.');
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [navigate, isAdminPreview]);

  // Fetch spins for the current logged-in store
  useEffect(() => {
    if (!store || !store.id || store.id === 'admin_preview') return;
    
    const spinsRef = collection(db, 'spins');
    const q = query(
      spinsRef,
      where('store_id', '==', store.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in-memory to bypass composite index requirement in Firestore
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setStoreSpins(list);
    }, (err) => {
      console.error('Error listening to store spins:', err);
    });
    
    return () => unsubscribe();
  }, [store]);

  const handleLogout = () => {
    playClick();
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('store_session');
      navigate('/');
    }
  };

  const handlePrintReceipt = () => {
    playClick();
    if (typeof fully !== 'undefined' && fully.print) {
      fully.print();
    } else {
      window.print();
    }
  };

  const handleStoreReportSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setFormSubmitting(true);
    setFormError('');
    setFormMessage('');

    try {
      const today = new Date();
      await addDoc(collection(db, 'store_reports'), {
        store_id: store?.id || '',
        store_name: store?.name || '',
        date: getTodayString(),
        created_at: today.toISOString(),
        turnover: Number(formFields.turnover) || 0,
        counter_completion: Number(formFields.counter_completion) || 0,
        cashier_completion: Number(formFields.cashier_completion) || 0,
        wheel_treat_amount: Number(formFields.wheel_treat_amount) || 0,
        average_basket: Number(formFields.average_basket) || 0,
        customer_count: Number(formFields.customer_count) || 0
      });

      setFormMessage('Günlük rapor başarıyla kaydedildi!');
      setFormFields({
        turnover: '',
        counter_completion: '',
        cashier_completion: '',
        wheel_treat_amount: '',
        average_basket: '',
        customer_count: ''
      });
      setTimeout(() => {
        setShowStoreFormModal(false);
        setFormMessage('');
      }, 1500);
    } catch (err) {
      console.error("Error saving daily report:", err);
      setFormError('Rapor kaydedilirken hata oluştu: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStoreReportKeypadPress = (val) => {
    playClick();
    setFormFields((prev) => {
      const currentVal = prev[activeField] || '';
      
      if (val === '⌫') {
        return { ...prev, [activeField]: currentVal.slice(0, -1) };
      }
      if (val === 'C') {
        return { ...prev, [activeField]: '' };
      }
      if (val === '.') {
        if (currentVal.includes('.')) return prev;
        return { ...prev, [activeField]: currentVal + '.' };
      }
      return { ...prev, [activeField]: currentVal + val };
    });
  };

  const handleStoreReportKeypadNext = () => {
    playClick();
    const order = ['turnover', 'counter_completion', 'cashier_completion', 'wheel_treat_amount', 'average_basket', 'customer_count'];
    const currentIndex = order.indexOf(activeField);
    const nextIndex = (currentIndex + 1) % order.length;
    setActiveField(order[nextIndex]);
  };



  const calculateWinnerIndex = () => {
    const DILIM = products.length;
    const weights = products.map((p) => (p.chance > 0 ? 1 / p.chance : 0));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    if (totalWeight === 0) {
      return Math.floor(Math.random() * DILIM);
    }

    let r = Math.random() * totalWeight;
    for (let i = 0; i < DILIM; i++) {
      r -= weights[i];
      if (r <= 0) {
        return i;
      }
    }
    return DILIM - 1;
  };

  const handleSpin = async () => {
    if (spinning || products.length === 0) return;
    
    // Receipt validation only applies to store page (when isAdminPreview is falsy)
    if (!isAdminPreview) {
      const cleanedReceipt = receiptNo.trim();
      if (!cleanedReceipt) {
        setKeypadOpen(true);
        setError('Lütfen fiş numarasını giriniz.');
        return;
      }

      const receiptNum = parseInt(cleanedReceipt, 10);
      const isValidFormat = /^\d{4}$/.test(cleanedReceipt);
      if (!isValidFormat || isNaN(receiptNum) || receiptNum < 1 || receiptNum > 500) {
        setErrorModalMessage('Lütfen geçerli bir fiş numarası giriniz (0001 - 0500 arası).');
        setShowErrorModal(true);
        setError('Geçersiz fiş numarası.');
        return;
      }
    }

    setKeypadOpen(false);
    playClick();
    setSpinning(true);
    setError('');

    try {
      const today = new Date();
      const winnerIndex = calculateWinnerIndex();
      const winProduct = products[winnerIndex];
      setWinner(winProduct);

      // Only save to Firestore if NOT admin/test preview
      if (!isAdminPreview) {
        await addDoc(collection(db, 'spins'), {
          store_id: store?.id || 'admin_preview',
          store_name: store?.name || 'Yönetici (Önizleme)',
          product_name: winProduct.name,
          receipt_no: receiptNo.trim(),
          created_at: today.toISOString()
        });
      }

      const DILIM = products.length;
      const ACI = 360 / DILIM;
      
      const targetAngle = 360 - (winnerIndex * ACI);
      const extraTurns = 360 * (5 + Math.floor(Math.random() * 3));
      const deviation = (Math.random() - 0.5) * (ACI * 0.6);

      const nextRotation = currentRotationRef.current + extraTurns + ((targetAngle - (currentRotationRef.current % 360) + 360) % 360) + deviation;
      currentRotationRef.current = nextRotation;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${nextRotation}deg)`;
      }

      // Continuous ticking animation loop synced with CSS transform
      let lastSegment = -1;
      const segmentWidth = 360 / DILIM;
      let isSpinningActive = true;

      const tickLoop = () => {
        if (!isSpinningActive || !wheelRef.current) return;
        const currentAngle = getRotationDegrees(wheelRef.current);
        const currentSegment = Math.floor(currentAngle / segmentWidth);

        if (currentSegment !== lastSegment) {
          playTick();
          lastSegment = currentSegment;
        }

        requestAnimationFrame(tickLoop);
      };

      // Start the frame tick loop
      requestAnimationFrame(tickLoop);

      setTimeout(() => {
        isSpinningActive = false; // Stop the tick loop
        setSpinning(false);
        setShowModal(true);
        triggerConfetti();
        playWin(); // Play synthesized winning chime!
        playApplause(); // Play applause sound!
        setReceiptNo('');
      }, 5400);

    } catch (err) {
      console.error(err);
      setError('Çekiliş kaydedilirken hata oluştu.');
      setSpinning(false);
    }
  };

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const colors = ["#D9A441", "#E8A0A8", "#2A6B40", "#B3402F", "#FBF3E4"];
    
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

  // Fix Fully Kiosk Browser: auto-reset scroll when soft keyboard closes
  useEffect(() => {
    const resetScroll = () => {
      // Small delay to wait for keyboard animation to complete
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 100);
    };

    // visualViewport API: fires when keyboard opens/closes
    if (window.visualViewport) {
      let prevHeight = window.visualViewport.height;
      const handleViewportResize = () => {
        const currentHeight = window.visualViewport.height;
        // Keyboard closed = viewport height increased back
        if (currentHeight > prevHeight) {
          resetScroll();
        }
        prevHeight = currentHeight;
      };
      window.visualViewport.addEventListener('resize', handleViewportResize);
      return () => window.visualViewport.removeEventListener('resize', handleViewportResize);
    }
  }, []);

  // Disable body scroll when reports modal is open
  useEffect(() => {
    if (showDataModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDataModal]);

  const renderWheelSegments = () => {
    const DILIM = products.length;
    if (DILIM === 0) return null;
    const ACI = 360 / DILIM;
    const R = 250, CX = 250, CY = 250;

    const segments = [];
    const texts = [];

    products.forEach((prod, i) => {
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

  const printStats = Object.entries(
    filteredSpins.reduce((acc, s) => {
      acc[s.product_name] = (acc[s.product_name] || 0) + 1;
      return acc;
    }, {})
  );
  const totalPrintSpins = filteredSpins.length;
  
  const storeNameForPrint = store?.name || 'Şube';
  const dateRangeForPrint = filterStartDate === filterEndDate 
    ? (filterStartDate ? new Date(filterStartDate).toLocaleDateString('tr-TR') : 'Bugün')
    : `${filterStartDate ? new Date(filterStartDate).toLocaleDateString('tr-TR') : ''} - ${filterEndDate ? new Date(filterEndDate).toLocaleDateString('tr-TR') : ''}`;

  return (
    <>
      <div style={styles.container} className="no-print">
      {/* Top Bar */}
      <div style={styles.navbar}>
        <div style={styles.navStoreInfo}>
          <span style={styles.storeBadge}>🏪</span>
          <strong>{store?.name || 'Mağaza'}</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!isAdminPreview && (
            <button
              onClick={() => {
                playClick();
                setPromptPassword('');
                setPromptError('');
                setShowPasswordPromptModal(true);
              }}
              style={styles.dataBtn}
            >
              📊 Veri & Rapor
            </button>
          )}
          {isAdminPreview && (
            <button
              onClick={() => { playClick(); if (onBackToAdmin) onBackToAdmin(); }}
              style={styles.adminPanelBtn}
            >
              ⚙️ Yönetim Paneli
            </button>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Çıkış Yap 🚪
          </button>
        </div>
      </div>



      <div className="wheel-split-layout">
        {/* LEFT COLUMN: THE GIANT WHEEL */}
        <div className="wheel-left-side">
          <div className="wheel-container-large">
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

          </div>
        </div>

        {/* RIGHT COLUMN: TEXTS AND CONTROLS */}
        <div className="wheel-right-side">
          <div className="wheel-branding">
            {!isAdminPreview && <div className="wheel-marka">Tuğba Kuruyemiş</div>}
            <img 
              src="/images/logo.png" 
              alt="Tuğba Kuruyemiş Logo" 
              className="wheel-logo" 
              style={{ maxHeight: isAdminPreview ? '42px' : '65px', width: 'auto' }} 
            />
            <h1 className="wheel-title">{isAdminPreview ? 'Test Çarkı' : 'Hediye Çarkı'}</h1>
            <div className="wheel-kosul">
              {isAdminPreview ? 'Test Modu · Kayıt yapılmaz' : `${store?.min_limit !== undefined ? store.min_limit : 1000} TL ve üzeri alışverişe özel · 1 çevirme hakkı`}
            </div>
          </div>


          <div className="wheel-input-area">
            <label className="wheel-input-label">
              {isAdminPreview ? 'Fiş Numarası (Test - İsteğe Bağlı)' : 'Fiş Numarası (Zorunlu)'}
            </label>
            <input
              type="text"
              placeholder="Örn: 0001"
              value={receiptNo}
              readOnly
              onClick={() => {
                if (!spinning) {
                  playClick();
                  setKeypadOpen((prev) => !prev);
                }
              }}
              style={{
                borderColor: error ? 'var(--kirmizi)' : 'rgba(255, 255, 255, 0.15)',
                boxShadow: error ? '0 0 10px rgba(179, 64, 47, 0.5)' : 'none',
                textAlign: 'center',
                fontSize: '24px',
                letterSpacing: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              className="glass-input wheel-receipt-input"
              disabled={spinning}
            />


            {/* Accordion Virtual Keypad */}
            <div className={`wheel-keypad-accordion ${keypadOpen ? 'open' : ''}`}>
              <div className="wheel-keypad-container" style={{ marginTop: 0 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (spinning) return;
                      playClick();
                      setReceiptNo((prev) => {
                        if (prev.length >= 4) return prev;
                        const next = prev + num.toString();
                        if (next.trim()) setError('');
                        if (next.length === 4) {
                          setTimeout(() => setKeypadOpen(false), 300);
                        }
                        return next;
                      });
                    }}
                    className="wheel-keypad-btn"
                    disabled={spinning}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (spinning) return;
                    playClick();
                    setReceiptNo('');
                  }}
                  className="wheel-keypad-btn action-btn clear-btn"
                  disabled={spinning}
                  title="Temizle"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (spinning) return;
                    playClick();
                    setReceiptNo((prev) => {
                      if (prev.length >= 4) return prev;
                      const next = prev + '0';
                      if (next.trim()) setError('');
                      if (next.length === 4) {
                        setTimeout(() => setKeypadOpen(false), 300);
                      }
                      return next;
                    });
                  }}
                  className="wheel-keypad-btn"
                  disabled={spinning}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (spinning) return;
                    playClick();
                    setReceiptNo((prev) => prev.slice(0, -1));
                  }}
                  className="wheel-keypad-btn action-btn backspace-btn"
                  disabled={spinning}
                  title="Geri"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>



          <button
            className="btn-primary wheel-spin-btn"
            onClick={handleSpin}
            disabled={spinning || products.length === 0 || (!isAdminPreview && !receiptNo.trim())}
          >
            {spinning ? 'ÇARK DÖNÜYOR...' : 'ÇARKI ÇEVİR'}
          </button>

        </div>
      </div>

      {/* Results Modal */}
      {showModal && winner && (
        <div className="modal-arka acik" style={styles.modalArka}>
          <div className="modal" style={styles.modal}>
            <div className="emoji" style={{ fontSize: '64px' }}>🎉</div>
            <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '12px 0 6px', color: 'var(--koyu-yesil)' }}>
              Tebrikler!
            </h2>
            <div style={styles.odul}>{winner.name}</div>
            <p style={styles.kasa}>
              Bu ekranı kasadaki görevlimize göstererek hediyenizi teslim alabilirsiniz. Afiyet olsun! 🌰
            </p>
            <button
              style={styles.kapatBtn}
              onClick={() => { playClick(); setShowModal(false); }}
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Custom Error Modal */}
      {showErrorModal && (
        <div className="modal-arka acik" style={styles.modalArka}>
          <div className="modal" style={{ ...styles.modal, border: '5px solid var(--kirmizi)' }}>
            <div className="emoji" style={{ fontSize: '64px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '12px 0 6px', color: 'var(--kirmizi)' }}>
              Çekiliş Yapılamaz!
            </h2>
            <p style={{ ...styles.kasa, margin: '10px 0 18px', fontSize: '15.5px', color: '#334155' }}>
              {errorModalMessage}
            </p>
            <button
              style={{ ...styles.kapatBtn, background: 'var(--kirmizi)', marginTop: '8px' }}
              onClick={() => { playClick(); setShowErrorModal(false); }}
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Password Verification Modal for Reports */}
      {showPasswordPromptModal && (
        <div className="modal-arka acik" style={styles.modalArka}>
          <div className="modal" style={{ ...styles.modal, maxWidth: '380px', width: '100%', padding: '30px 24px' }}>
            <div className="emoji" style={{ fontSize: '48px', marginBottom: '10px' }}>🔒</div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--koyu-yesil)', marginBottom: '8px' }}>
              Rapor Yetkisi
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.4' }}>
              Veri ve raporları görüntülemek için lütfen şube giriş şifrenizi giriniz.
            </p>
            
            {promptError && (
              <div style={{
                background: 'rgba(179, 64, 47, 0.1)',
                border: '1px solid var(--kirmizi)',
                color: 'var(--kirmizi)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13.5px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {promptError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              playClick();
              setVerifyingPassword(true);
              setPromptError('');
              try {
                // Fetch the store document to check the password in real-time
                const storeDocRef = doc(db, 'stores', store.id);
                const docSnap = await getDoc(storeDocRef);
                
                if (docSnap.exists()) {
                  const storeData = docSnap.data();
                  if (storeData.password === promptPassword.trim()) {
                    const updatedStore = {
                      ...store,
                      name: storeData.name,
                      min_limit: storeData.min_limit !== undefined ? storeData.min_limit : 1000
                    };
                    setStore(updatedStore);
                    localStorage.setItem('store_session', JSON.stringify(updatedStore));

                    setShowPasswordPromptModal(false);
                    setFilterStartDate(getTodayString());
                    setFilterEndDate(getTodayString());
                    setShowReportSelectionModal(true);
                  } else {
                    setPromptError('Hatalı şube şifresi.');
                  }
                } else {
                  setPromptError('Şube veritabanında bulunamadı.');
                }
              } catch (err) {
                setPromptError('Bağlantı hatası oluştu.');
              } finally {
                setVerifyingPassword(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <input
                type="password"
                placeholder=""
                value={promptPassword}
                readOnly
                className="glass-input"
                style={{ 
                  color: 'var(--text-dark)', 
                  borderColor: 'rgba(18, 58, 32, 0.2)',
                  textAlign: 'center',
                  fontSize: '18px',
                  letterSpacing: '4px',
                  fontWeight: 'bold',
                  cursor: 'default'
                }}
                disabled={verifyingPassword}
              />

              {/* Custom Numeric Keypad inside Password Modal */}
              <div className="wheel-keypad-container" style={{ margin: '4px auto 0 auto', maxWidth: '280px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      playClick();
                      setPromptPassword((prev) => prev + num.toString());
                    }}
                    className="wheel-keypad-btn"
                    style={{ 
                      height: '38px', 
                      fontSize: '16px', 
                      background: 'rgba(18, 58, 32, 0.05)', 
                      borderColor: 'rgba(18, 58, 32, 0.15)',
                      color: 'var(--koyu-yesil)'
                    }}
                    disabled={verifyingPassword}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPromptPassword('');
                  }}
                  className="wheel-keypad-btn action-btn"
                  style={{ 
                    height: '38px', 
                    fontSize: '13px', 
                    background: 'rgba(179, 64, 47, 0.08)', 
                    borderColor: 'rgba(179, 64, 47, 0.2)',
                    color: 'var(--kirmizi)'
                  }}
                  disabled={verifyingPassword}
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPromptPassword((prev) => prev + '0');
                  }}
                  className="wheel-keypad-btn"
                  style={{ 
                    height: '38px', 
                    fontSize: '16px', 
                    background: 'rgba(18, 58, 32, 0.05)', 
                    borderColor: 'rgba(18, 58, 32, 0.15)',
                    color: 'var(--koyu-yesil)'
                  }}
                  disabled={verifyingPassword}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPromptPassword((prev) => prev.slice(0, -1));
                  }}
                  className="wheel-keypad-btn action-btn"
                  style={{ 
                    height: '38px', 
                    fontSize: '13px', 
                    background: 'rgba(217, 164, 65, 0.12)', 
                    borderColor: 'rgba(217, 164, 65, 0.3)',
                    color: 'var(--altin)'
                  }}
                  disabled={verifyingPassword}
                >
                  ⌫
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { playClick(); setShowPasswordPromptModal(false); }}
                  style={{
                    flex: 1,
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                  disabled={verifyingPassword}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', margin: 0, boxShadow: 'none' }}
                  disabled={verifyingPassword || !promptPassword.trim()}
                >
                  {verifyingPassword ? 'Doğrulanıyor...' : 'GİRİŞ YAP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data and Reports Modal */}
      {showDataModal && (
        <div className="modal-arka acik" style={{ ...styles.modalArka, alignItems: 'flex-start', overflowY: 'auto', padding: '30px 20px' }}>
          <div className="modal" style={{ 
            ...styles.modal, 
            maxWidth: '800px', 
            width: '100%', 
            textAlign: 'left',
            padding: '24px',
            animation: 'popIn .4s cubic-bezier(.2,1.6,.4,1)'
          }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(18, 58, 32, 0.1)', paddingBottom: '12px', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--koyu-yesil)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                📊 Şube Veri & Rapor
              </h2>
              <button
                onClick={() => { playClick(); setShowDataModal(false); }}
                style={{
                  background: 'rgba(18, 58, 32, 0.08)',
                  color: 'var(--koyu-yesil)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                ✕
              </button>
            </div>

            {/* Date Range Selectors */}
            <div style={styles.dateFilterContainer}>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>Başlangıç</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => { playClick(); setFilterStartDate(e.target.value); }}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>Bitiş</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => { playClick(); setFilterEndDate(e.target.value); }}
                  style={styles.dateInput}
                />
              </div>
            </div>

            {/* Distribution List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--koyu-yesil)', textAlign: 'left', margin: 0, fontWeight: '800' }}>
                🎁 Hangi Üründen Kaç Adet Verildi? <span style={{ color: 'var(--altin)', marginLeft: '6px' }}>(Toplam: {filteredSpins.length} adet)</span>
              </h3>
              <button
                onClick={handlePrintReceipt}
                style={{
                  background: 'var(--yesil)',
                  color: 'var(--krem)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                🖨️ Raporu Yazdır
              </button>
            </div>
            <div style={styles.statsListContainer}>
              {Object.entries(
                filteredSpins.reduce((acc, s) => {
                  acc[s.product_name] = (acc[s.product_name] || 0) + 1;
                  return acc;
                }, {})
              ).map(([prodName, count]) => (
                <div key={prodName} style={styles.statsListItem}>
                  <span style={{ fontWeight: '700' }}>{prodName}</span>
                  <span style={{ background: 'var(--yesil)', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 'bold' }}>
                    {count} adet
                  </span>
                </div>
              ))}
              {filteredSpins.length === 0 && (
                <div style={{ color: '#64748B', fontStyle: 'italic', fontSize: '13.5px', padding: '10px 0' }}>
                  Seçilen tarih aralığında veri bulunmamaktadır.
                </div>
              )}
            </div>

            {/* Spin History Table */}
            <h3 style={{ fontSize: '15px', color: 'var(--koyu-yesil)', textAlign: 'left', margin: '6px 0 2px', fontWeight: '800' }}>
              📋 Çevirme Geçmişi
            </h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Ürün</th>
                    <th style={styles.th}>Fiş No</th>
                    <th style={styles.th}>Tarih</th>
                    <th style={styles.th}>Saat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpins.slice(0, 50).map((s) => {
                    const dateObj = new Date(s.created_at);
                    const dateStr = dateObj.toLocaleDateString('tr-TR');
                    const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <tr key={s.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: '700' }}>{s.product_name}</td>
                        <td style={styles.td}><code>{s.receipt_no || '-'}</code></td>
                        <td style={styles.td}>{dateStr}</td>
                        <td style={styles.td}>{timeStr}</td>
                      </tr>
                    );
                  })}
                  {filteredSpins.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                        Çevirme kaydı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => { playClick(); setShowDataModal(false); }}
              style={{
                marginTop: '12px',
                background: 'var(--koyu-yesil)',
                color: 'var(--krem)',
                border: 'none',
                fontSize: '16px',
                fontWeight: '800',
                padding: '12px 32px',
                borderRadius: '999px',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(18, 58, 32, 0.15)',
                transition: 'background 0.2s',
              }}
            >
              Geri Dön ↩
            </button>
          </div>
        </div>
      )}

      {/* Report Selection Modal */}
      {showReportSelectionModal && (
        <div className="modal-arka acik" style={styles.modalArka}>
          <div className="modal" style={{ ...styles.modal, maxWidth: '400px', width: '100%', padding: '30px 24px' }}>
            <div className="emoji" style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--koyu-yesil)', marginBottom: '8px' }}>
              İşlem Seçiniz
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.4' }}>
              Lütfen yapmak istediğiniz işlemi seçiniz.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                onClick={() => {
                  playClick();
                  setShowReportSelectionModal(false);
                  setShowStoreFormModal(true);
                }}
                className="btn-primary"
                style={{ 
                  padding: '14px', 
                  margin: 0, 
                  boxShadow: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '16px'
                }}
              >
                📝 Form Doldur
              </button>
              <button
                onClick={() => {
                  playClick();
                  setShowReportSelectionModal(false);
                  setShowDataModal(true);
                }}
                className="btn-primary"
                style={{ 
                  padding: '14px', 
                  margin: 0, 
                  boxShadow: 'none',
                  background: 'var(--altin)',
                  borderColor: 'var(--altin)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '16px'
                }}
              >
                📊 Rapor Al
              </button>
              <button
                onClick={() => { playClick(); setShowReportSelectionModal(false); }}
                style={{
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Store Report Form Modal */}
      {showStoreFormModal && (
        <div className="modal-arka acik" style={styles.modalArka}>
          <div className="modal" style={{ ...styles.modal, maxWidth: '720px', width: '100%', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--koyu-yesil)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📝 Günlük Veri Giriş Formu
            </h2>
            
            {formError && (
              <div style={{
                background: 'rgba(179, 64, 47, 0.1)',
                border: '1px solid var(--kirmizi)',
                color: 'var(--kirmizi)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13.5px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {formError}
              </div>
            )}

            {formMessage && (
              <div style={{
                background: 'rgba(30, 86, 49, 0.1)',
                border: '1px solid var(--yesil)',
                color: 'var(--yesil)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13.5px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {formMessage}
              </div>
            )}

            <form onSubmit={handleStoreReportSubmit} style={{ width: '100%' }}>
              <div className="wheel-form-grid" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                {/* Left Column - Inputs */}
                <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  
                  {[
                    { key: 'turnover', label: '1. Mağaza Cirosu (TL)', placeholder: '0.00' },
                    { key: 'counter_completion', label: '2. Tezgahtan Müşteri Tamamlama Adeti', placeholder: '0' },
                    { key: 'cashier_completion', label: '3. Kasadan Müşteri Tamamlama Adeti', placeholder: '0' },
                    { key: 'wheel_treat_amount', label: '4. Çark İkramlık Tutarı (TL)', placeholder: '0.00' },
                    { key: 'average_basket', label: '5. Sepet Ortalaması (TL)', placeholder: '0.00' },
                    { key: 'customer_count', label: '6. Müşteri Sayısı', placeholder: '0' }
                  ].map((field) => {
                    const isActive = activeField === field.key;
                    return (
                      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--koyu-yesil)' }}>{field.label}</label>
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={formFields[field.key]}
                          readOnly
                          onFocus={() => setActiveField(field.key)}
                          onClick={() => setActiveField(field.key)}
                          className="glass-input"
                          style={{
                            color: 'var(--text-dark)',
                            borderColor: isActive ? 'var(--altin)' : 'rgba(18, 58, 32, 0.2)',
                            borderWidth: isActive ? '2px' : '1px',
                            boxShadow: isActive ? '0 0 0 3px rgba(217, 164, 65, 0.15)' : 'none',
                            background: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: isActive ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Right Column - Numeric Keypad */}
                <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', margin: '0 auto' }}>
                  <div style={{ 
                    background: 'rgba(18, 58, 32, 0.08)', 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '10px', 
                    marginBottom: '12px', 
                    textAlign: 'center', 
                    fontSize: '13.5px', 
                    fontWeight: 'bold', 
                    color: 'var(--koyu-yesil)',
                    border: '1px solid rgba(18, 58, 32, 0.15)'
                  }}>
                    ✍️ Aktif Alan: <span style={{ color: 'var(--altin)' }}>{
                      activeField === 'turnover' ? '1. Mağaza Cirosu' :
                      activeField === 'counter_completion' ? '2. Tezgah Tamamlama' :
                      activeField === 'cashier_completion' ? '3. Kasa Tamamlama' :
                      activeField === 'wheel_treat_amount' ? '4. Çark İkramlık' :
                      activeField === 'average_basket' ? '5. Sepet Ortalaması' :
                      activeField === 'customer_count' ? '6. Müşteri Sayısı' : ''
                    }</span>
                  </div>

                  <div className="wheel-keypad-container" style={{ margin: '0 auto', maxWidth: '280px', width: '100%' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleStoreReportKeypadPress(num.toString())}
                        className="wheel-keypad-btn"
                        style={{ 
                          height: '42px', 
                          fontSize: '18px', 
                          background: 'rgba(18, 58, 32, 0.05)', 
                          borderColor: 'rgba(18, 58, 32, 0.15)',
                          color: 'var(--koyu-yesil)'
                        }}
                        disabled={formSubmitting}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleStoreReportKeypadPress('.')}
                      className="wheel-keypad-btn"
                      style={{ 
                        height: '42px', 
                        fontSize: '18px', 
                        background: 'rgba(18, 58, 32, 0.05)', 
                        borderColor: 'rgba(18, 58, 32, 0.15)',
                        color: 'var(--koyu-yesil)',
                        fontWeight: 'bold'
                      }}
                      disabled={formSubmitting}
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStoreReportKeypadPress('0')}
                      className="wheel-keypad-btn"
                      style={{ 
                        height: '42px', 
                        fontSize: '18px', 
                        background: 'rgba(18, 58, 32, 0.05)', 
                        borderColor: 'rgba(18, 58, 32, 0.15)',
                        color: 'var(--koyu-yesil)'
                      }}
                      disabled={formSubmitting}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStoreReportKeypadPress('⌫')}
                      className="wheel-keypad-btn action-btn"
                      style={{ 
                        height: '42px', 
                        fontSize: '14px', 
                        background: 'rgba(217, 164, 65, 0.12)', 
                        borderColor: 'rgba(217, 164, 65, 0.3)',
                        color: 'var(--altin)'
                      }}
                      disabled={formSubmitting}
                    >
                      ⌫
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStoreReportKeypadPress('C')}
                      className="wheel-keypad-btn action-btn"
                      style={{ 
                        height: '40px', 
                        fontSize: '14px', 
                        background: 'rgba(179, 64, 47, 0.08)', 
                        borderColor: 'rgba(179, 64, 47, 0.2)',
                        color: 'var(--kirmizi)',
                        gridColumn: 'span 1'
                      }}
                      disabled={formSubmitting}
                    >
                      C
                    </button>
                    <button
                      type="button"
                      onClick={handleStoreReportKeypadNext}
                      className="wheel-keypad-btn action-btn"
                      style={{ 
                        height: '40px', 
                        fontSize: '13px', 
                        background: 'rgba(18, 58, 32, 0.08)', 
                        borderColor: 'rgba(18, 58, 32, 0.2)',
                        color: 'var(--koyu-yesil)',
                        gridColumn: 'span 2',
                        fontWeight: 'bold'
                      }}
                      disabled={formSubmitting}
                    >
                      SONRAKİ ➔
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => { playClick(); setShowStoreFormModal(false); }}
                  style={{
                    flex: 1,
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                  disabled={formSubmitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', margin: 0, boxShadow: 'none' }}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Kaydediliyor...' : 'KAYDET'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confetti overlay */}
      <canvas ref={canvasRef} style={styles.confettiCanvas}></canvas>
    </div>

      {/* Printable Receipt Container */}
      <div id="printable-receipt" className="print-only">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--yesil)', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--yesil)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>TUĞBA KURUYEMİŞ</h1>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#475569', margin: '4px 0 0 0', fontFamily: "'Outfit', sans-serif" }}>Hediye Çarkı Şube Raporu</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>
            <div><strong>Sistem Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')}</div>
            <div><strong>Sistem Saati:</strong> {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ marginBottom: '8px' }}><strong>Şube:</strong> {storeNameForPrint}</div>
            <div><strong>Rapor Dönemi:</strong> {dateRangeForPrint}</div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Toplam Dağıtılan Hediye</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--yesil)', fontFamily: "'Outfit', sans-serif" }}>{totalPrintSpins} Adet</div>
          </div>
        </div>

        {/* Table Title */}
        <h3 style={{ fontSize: '16px', color: 'var(--yesil)', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginBottom: '15px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>
          🎁 Hediye Dağılım Detayları
        </h3>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #CBD5E1', textAlign: 'left', background: '#F1F5F9' }}>
              <th style={{ padding: '10px 15px', fontWeight: '700', color: '#1E293B' }}>Hediye Edilen Ürün</th>
              <th style={{ padding: '10px 15px', fontWeight: '700', color: '#1E293B', textAlign: 'right', width: '150px' }}>Miktar (Adet)</th>
            </tr>
          </thead>
          <tbody>
            {printStats.map(([name, count]) => (
              <tr key={name} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px 15px', color: '#334155', fontWeight: '600' }}>{name}</td>
                <td style={{ padding: '10px 15px', color: '#334155', fontWeight: '700', textAlign: 'right' }}>{count} Adet</td>
              </tr>
            ))}
            {printStats.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: '15px', color: '#64748B', textAlign: 'center', fontStyle: 'italic' }}>
                  Bu tarih aralığında dağıtılmış hediye bulunmamaktadır.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '50px', borderTop: '1px solid #E2E8F0', paddingTop: '15px', textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>
          Tuğba Kuruyemiş Bilgi İşlem Departmanı · Bu rapor sistem tarafından otomatik oluşturulmuştur.
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '60px 20px 20px 20px',
    position: 'relative',
  },
  dateFilterContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'flex-end',
    background: 'rgba(18, 58, 32, 0.04)',
    border: '1px solid rgba(18, 58, 32, 0.08)',
    borderRadius: '14px',
    padding: '8px 12px',
    marginBottom: '10px',
    justifyContent: 'space-between',
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    flex: 1,
  },
  dateLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--koyu-yesil)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  dateInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearFilterBtn: {
    background: '#64748B',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 14px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
    height: '35px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
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
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    zIndex: 100,
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
  dataBtn: {
    background: 'rgba(251, 243, 228, 0.1)',
    border: '1px solid rgba(251, 243, 228, 0.3)',
    borderRadius: '8px',
    color: 'var(--krem)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 14px',
    transition: 'all 0.2s',
  },
  adminPanelBtn: {
    background: 'rgba(217, 164, 65, 0.15)',
    border: '1px solid var(--altin)',
    borderRadius: '8px',
    color: 'var(--altin)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 14px',
    transition: 'all 0.2s',
  },
  statsSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '14px',
  },
  statSummaryCard: {
    background: 'rgba(18, 58, 32, 0.05)',
    border: '1px solid rgba(18, 58, 32, 0.1)',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statSummaryVal: {
    fontSize: '24px',
    fontWeight: '900',
    color: 'var(--yesil)',
  },
  statSummaryLbl: {
    fontSize: '12px',
    color: 'rgba(18, 58, 32, 0.7)',
    fontWeight: '600',
    marginTop: '2px',
  },
  statsListContainer: {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statsListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12.5px',
    padding: '4px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  tableWrapper: {
    overflowX: 'auto',
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    textAlign: 'left',
  },
  th: {
    background: 'rgba(18, 58, 32, 0.05)',
    color: 'var(--koyu-yesil)',
    padding: '6px 10px',
    fontWeight: '800',
    position: 'sticky',
    top: 0,
    borderBottom: '1px solid #E2E8F0',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '5px 10px',
    color: '#334155',
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
    zIndex: 1000,
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
    zIndex: 1050,
  },
};
