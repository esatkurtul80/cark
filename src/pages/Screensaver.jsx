import { useState, useEffect } from 'react';
import { playClick } from '../utils/audio';

export default function Screensaver({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Switch slide every 5 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  const handleDismiss = () => {
    playClick();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleDismiss}>
      {/* Background Slides */}
      {slides.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <div
            key={index}
            style={{
              ...styles.slide,
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 10 : 1,
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              style={styles.image}
              className={isActive ? 'ken-burns-active' : ''}
            />
            
            {/* Visual overlay gradient for text contrast */}
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
    transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
    background: 'linear-gradient(to top, rgba(18, 58, 32, 0.95) 0%, rgba(18, 58, 32, 0.4) 40%, rgba(0, 0, 0, 0.6) 100%)',
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
    animation: 'popIn 0.6s cubic-bezier(0.2, 1, 0.22, 1)',
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
    background: 'rgba(30, 86, 49, 0.75)',
    border: '1.5px solid var(--altin)',
    padding: '12px 28px',
    borderRadius: '999px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
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
  touchEmoji: {
    fontSize: '12px',
  },
  touchText: {
    color: 'var(--krem)',
    fontSize: '13px',
    letterSpacing: '2px',
    fontWeight: '800',
    animation: 'pulseText 2s infinite ease-in-out',
  },
};
