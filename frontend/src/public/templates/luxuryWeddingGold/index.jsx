import { Children, isValidElement } from 'react';
import LuxuryGoldCoverSection from './LuxuryGoldCoverSection';
import RevealOnScroll from './RevealOnScroll';
import { injectStylesOnce } from '../../utils/injectStyles';
import ornamentDivider from './assets/ornament-divider.webp';

injectStylesOnce(
  'luxury-gold-sections',
  `
  .lux-gold-shell, .lux-gold-shell *, .lux-gold-shell *::before, .lux-gold-shell *::after {
    box-sizing: border-box;
  }
  .lux-gold-shell section h2 {
    position: relative;
    letter-spacing: 0.02em;
    padding-bottom: 0.6rem;
  }
  .lux-gold-shell section h2::after {
    content: '';
    display: block;
    width: 46px;
    height: 2px;
    margin: 0.6rem auto 0;
    background: var(--color-secondary);
  }
  `
);

const tokens = {
  colorBg: '#f3e6c8',
  colorSurface: '#fbf5e6',
  colorPrimary: '#4a3418',
  colorSecondary: '#a9782e',
  colorText: '#2e2013',
  colorTextMuted: '#7a6a4f',
  colorAccent: '#a9782e',
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Cormorant Garamond', serif",
  radius: '18px',
};

function Wrapper({ children }) {
  const kids = Children.toArray(children).filter(isValidElement);

  return (
    <div style={styles.outer} className="lux-gold-shell">
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />
      <div style={styles.frame}>
        {kids.map((child, i) => {
          const key = child.key ?? i;
          const sectionKey = child.props?.id;
          if (sectionKey === 'cover') return child;
          return (
            <RevealOnScroll key={key}>
              <div style={styles.sectionDivider} aria-hidden="true">
                <img src={ornamentDivider} alt="" style={styles.sectionDividerImg} />
              </div>
              {child}
            </RevealOnScroll>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  outer: {
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--color-bg)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: '-120px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '480px',
    height: '320px',
    background: 'radial-gradient(circle, rgba(255,223,150,0.55), transparent 70%)',
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: '-100px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '420px',
    height: '280px',
    background: 'radial-gradient(circle, rgba(169,120,46,0.25), transparent 70%)',
    pointerEvents: 'none',
  },
  frame: { position: 'relative', width: '100%' },
  sectionDivider: { display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' },
  sectionDividerImg: { height: '20px', width: 'auto', opacity: 0.85 },
};

export default {
  key: 'luxury-wedding-gold',
  name: 'Luxury Wedding Gold',
  tokens,
  Wrapper,
  sectionComponents: {
    cover: LuxuryGoldCoverSection,
  },
};
