import { useState, useEffect, useRef } from 'react';
import { playClick } from '../utils/audio';

const SLIDES = [
  {
    image: '/images/antep_fistigi.png',
    title: 'Antep Fıstığı',
    tagline: 'Tuğba Kuruyemiş Spesiyali',
    desc: "Gaziantep'in en özel bahçelerinden özenle seçilen, taptaze kavrulmuş çıtır lezzet.",
  },
  {
    image: '/images/turk_kahvesi.png',
    title: 'Geleneksel Türk Kahvesi',
    tagline: 'Tarihten Gelen Eşsiz Aromalar',
    desc: 'Özenle kavrulup taş değirmenlerde çekilen taze kahve çekirdeklerinin bol köpüklü hikayesi.',
  },
  {
    image: '/images/karisik_kuruyemis.png',
    title: 'Gurme Karışık Kuruyemiş',
    tagline: 'En Kaliteli Çerezler Bir Arada',
    desc: 'Özenle seçilmiş fındık, badem, ceviz ve kaju taneleriyle enerji dolu gurme karışım.',
  },
  {
    image: '/images/gul_lokumu.png',
    title: 'Gül Yapraklı Lokum',
    tagline: 'Saray Lezzeti Geleneksel Tat',
    desc: 'Gül bahçelerinin büyüleyici kokusunu barındıran pudra şekerli saray lokumu.',
  },
];

const SHOW_DURATION  = 10000; // ms each slide stays fully visible
const FADE_DURATION  = 1000;  // ms for each cross-fade

export default function Screensaver({ onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);

  // Transition trigger: every SHOW_DURATION ms, advance current index and set previous index
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevIndex(currentIndex);
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, SHOW_DURATION);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Clean up prevIndex after the fade transition finishes
  useEffect(() => {
    if (prevIndex !== null) {
      const timer = setTimeout(() => {
        setPrevIndex(null);
      }, FADE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [prevIndex]);

  const handleDismiss = () => {
    playClick();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleDismiss}>
      {SLIDES.map((slide, index) => {
        const isActive = index === currentIndex;
        const isPrev = index === prevIndex;
        const isKenBurnsActive = isActive || isPrev;

        return (
          <div
            key={index}
            style={{
              ...styles.slide,
              opacity: isActive ? 1 : 0,
              filter: isActive ? 'blur(0px)' : 'blur(20px)',
              transform: isActive ? 'scale(1)' : 'scale(1.03)',
              zIndex: isActive ? 10 : 5,
              pointerEvents: isActive ? 'auto' : 'none',
              transition: `opacity ${FADE_DURATION}ms ease-in-out,
                           filter ${FADE_DURATION}ms ease-in-out,
                           transform ${FADE_DURATION}ms ease-in-out`,
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              style={styles.image}
              className={isKenBurnsActive ? "ss-ken-burns" : ""}
            />
            <div style={styles.textOverlay}>
              <div style={styles.textContainer}>
                <span style={styles.tagline}>{slide.tagline}</span>
                <h2 style={styles.title}>{slide.title}</h2>
                <p style={styles.desc}>{slide.desc}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Kiosk Resume Callout */}
      <div style={styles.callout}>
        <div style={styles.touchCircle}>
          <span style={styles.touchEmoji}>🎯</span>
        </div>
        <span style={styles.touchText}>DEVAM ETMEK İÇİN EKRANA DOKUNUN</span>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000',
    zIndex: 9999,
    cursor: 'pointer',
    userSelect: 'none',
    overflow: 'hidden',
  },
  slide: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    position: 'absolute',
    inset: 0,
  },
  textOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(to top, rgba(18,58,32,0.95) 0%, rgba(18,58,32,0.4) 40%, rgba(0,0,0,0.6) 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '80px 40px',
  },
  textContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  tagline: {
    color: 'var(--altin)',
    fontSize: '14px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  title: {
    color: '#FFF',
    fontSize: 'clamp(32px, 6vw, 64px)',
    fontWeight: '900',
    margin: 0,
    lineHeight: '1.1',
    textShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  desc: {
    color: 'var(--krem)',
    fontSize: 'clamp(15px, 2.5vw, 20px)',
    opacity: 0.9,
    margin: 0,
    lineHeight: '1.5',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    fontWeight: '500',
  },
  callout: {
    position: 'absolute',
    top: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(30,86,49,0.75)',
    border: '1.5px solid var(--altin)',
    padding: '12px 28px',
    borderRadius: '999px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  touchCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--altin)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'ripple 2s infinite ease-out',
  },
  touchEmoji: { fontSize: '12px' },
  touchText: {
    color: 'var(--krem)',
    fontSize: '13px',
    letterSpacing: '2px',
    fontWeight: '800',
    animation: 'pulseText 2s infinite ease-in-out',
  },
};
