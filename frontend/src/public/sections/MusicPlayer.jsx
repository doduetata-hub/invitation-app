import { useRef, useState } from 'react';
import { injectStylesOnce } from '../utils/injectStyles';

injectStylesOnce(
  'invitation-music-keyframes',
  '@keyframes invitation-music-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'
);

export default function MusicPlayer({ invitation }) {
  const { musicUrl } = invitation;
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  if (!musicUrl) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying((p) => !p);
  };

  return (
    <div style={styles.wrapper}>
      <audio ref={audioRef} src={musicUrl} loop />
      <button type="button" onClick={toggle} style={styles.button} aria-label={playing ? 'Mettre en pause la musique' : 'Jouer la musique'}>
        <span style={{ ...styles.iconSpin, animationPlayState: playing ? 'running' : 'paused' }}>♪</span>
      </button>
    </div>
  );
}

const styles = {
  wrapper: { position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 40 },
  button: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--color-secondary)',
    color: '#fff',
    fontSize: '1.3rem',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpin: {
    display: 'inline-block',
    animationName: 'invitation-music-spin',
    animationDuration: '3s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
};
