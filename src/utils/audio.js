let audioCtx = null;

export const initAudio = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {
    console.warn('AudioContext initialization failed:', e);
  }
};

// Global click/touchstart listener to unlock AudioContext automatically
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    initAudio();
    if (audioCtx && audioCtx.state === 'running') {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    }
  };
  window.addEventListener('click', handleInteraction);
  window.addEventListener('touchstart', handleInteraction);
}

// Quick crisp click sound for buttons
export const playClick = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Mechanical tick sound for wheel rotation (realistic dual-frequency wooden peg click, slightly quieter)
export const playTick = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    
    // 1. High-pitched crisp transient (the plastic flapper click)
    const oscClick = audioCtx.createOscillator();
    const gainClick = audioCtx.createGain();
    oscClick.connect(gainClick);
    gainClick.connect(audioCtx.destination);
    
    oscClick.type = 'triangle';
    oscClick.frequency.setValueAtTime(2200, now);
    oscClick.frequency.exponentialRampToValueAtTime(700, now + 0.006);
    
    gainClick.gain.setValueAtTime(0.15, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
    
    oscClick.start(now);
    oscClick.stop(now + 0.006);
    
    // 2. Mid-low frequency resonance (the wooden/hollow wheel body sound)
    const oscBody = audioCtx.createOscillator();
    const gainBody = audioCtx.createGain();
    oscBody.connect(gainBody);
    gainBody.connect(audioCtx.destination);
    
    oscBody.type = 'sine';
    oscBody.frequency.setValueAtTime(280, now);
    oscBody.frequency.exponentialRampToValueAtTime(120, now + 0.02);
    
    gainBody.gain.setValueAtTime(0.25, now);
    gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    oscBody.start(now);
    oscBody.stop(now + 0.02);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Rich chime fanfare for winning
export const playWin = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0.15, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.75);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.75);
    });
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};
