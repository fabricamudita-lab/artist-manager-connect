import { useCallback } from 'react';

// Simple audio context for web-safe game sounds
export const useGameSound = () => {
  // Create audio context for better browser compatibility
  const createAudioContext = () => {
    try {
      return new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  };

  // Play a simple beep sound
  const playBeep = useCallback((frequency = 800, duration = 200, type: OscillatorType = 'sine') => {
    const audioContext = createAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  }, []);

  // Success sound effect
  const playSuccess = useCallback(() => {
    playBeep(587, 150); // D5
    setTimeout(() => playBeep(740, 150), 100); // F#5
    setTimeout(() => playBeep(880, 200), 200); // A5
  }, [playBeep]);

  // Error sound effect  
  const playError = useCallback(() => {
    playBeep(200, 300, 'sawtooth');
  }, [playBeep]);

  // Click sound effect
  const playClick = useCallback(() => {
    playBeep(1000, 100, 'square');
  }, [playBeep]);

  // Level up sound effect
  const playLevelUp = useCallback(() => {
    const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
    notes.forEach((freq, index) => {
      setTimeout(() => playBeep(freq, 200), index * 100);
    });
  }, [playBeep]);

  // Power up sound effect
  const playPowerUp = useCallback(() => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        playBeep(200 + i * 100, 80, 'square');
      }, i * 40);
    }
  }, [playBeep]);

  // Notification sound effect
  const playNotification = useCallback(() => {
    playBeep(800, 150);
    setTimeout(() => playBeep(600, 150), 100);
  }, [playBeep]);

  return {
    playSuccess,
    playError,
    playClick,
    playLevelUp,
    playPowerUp,
    playNotification,
    playBeep
  };
};