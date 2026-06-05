let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playSound = (type: 'click' | 'error' | 'success' | 'commit' | 'merge') => {
  try {
    initAudio();
    if (!audioCtx) return;

    const time = audioCtx.currentTime;

    switch (type) {
      case 'click': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, time);
        
        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.start(time);
        osc.stop(time + 0.04);
        break;
      }
      case 'error': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.linearRampToValueAtTime(90, time + 0.2);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.linearRampToValueAtTime(0.001, time + 0.22);

        osc.start(time);
        osc.stop(time + 0.22);
        break;
      }
      case 'commit': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, time); // C5
        osc.frequency.setValueAtTime(659.25, time + 0.08); // E5

        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
        break;
      }
      case 'success': {
        // C-E-G-C ascending chord
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, idx) => {
          const oscNode = audioCtx!.createOscillator();
          const gainNode = audioCtx!.createGain();
          oscNode.connect(gainNode);
          gainNode.connect(audioCtx!.destination);

          oscNode.type = 'sine';
          oscNode.frequency.setValueAtTime(freq, time + idx * 0.08);
          
          gainNode.gain.setValueAtTime(0.04, time + idx * 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.25);

          oscNode.start(time + idx * 0.08);
          oscNode.stop(time + idx * 0.08 + 0.25);
        });
        break;
      }
      case 'merge': {
        // Frequency sweep up
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, time);
        osc.frequency.exponentialRampToValueAtTime(950, time + 0.35);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.start(time);
        osc.stop(time + 0.35);
        break;
      }
    }
  } catch (error) {
    console.warn('Audio play failed:', error);
  }
};
