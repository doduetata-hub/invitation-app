import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import InvitationPage from '../../public/InvitationPage';
import { OpeningPreview } from '../../public/templates/soireeKit/opening';
import Icon from './ui/Icon';
import PreviewModes from './PreviewModes';

// Largeur à laquelle l'invitation est mise en page dans chaque mode ; « mobile » suit l'écran (390 px au plus).
const WIDTHS = { mobile: 390, tablet: 768, desktop: 1024 };

// Aperçu en plein écran (téléphone, tablette, petit ordinateur). Le rendu est celui du moteur habituel ; en mode
// tablette ou desktop, la page plus large que l'écran est simplement réduite pour tenir dedans.
export default function PreviewScreen({ invitation, mode, onModeChange, onClose }) {
  const body = useRef(null);
  const [size, setSize] = useState(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const el = body.current;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  let layout = null;
  if (size) {
    const width = mode === 'mobile' ? Math.min(size.width, WIDTHS.mobile) : WIDTHS[mode];
    const scale = Math.min(1, size.width / width);
    layout = { width, scale, height: Math.floor(size.height / scale) };
  }

  return createPortal(
    <div className="preview-screen" role="dialog" aria-modal="true" aria-label="Aperçu de l'invitation">
      <div className="preview-screen__bar">
        <button type="button" className="btn btn-outline" onClick={onClose} autoFocus>
          <Icon name="arrowLeft" />
          Retour
        </button>
        <PreviewModes value={mode} onChange={onModeChange} />
      </div>
      <div className="preview-screen__body" ref={body}>
        {layout && (
          <div className="preview-screen__fit" style={{ width: Math.floor(layout.width * layout.scale), height: size.height }}>
            {/* La transformation garde les éléments « fixes » de l'invitation à l'intérieur de l'aperçu. */}
            <div className="preview-screen__scaler" style={{ width: layout.width, height: layout.height, transform: `scale(${layout.scale})` }}>
              <div className={`preview-frame preview-frame--${mode}`}>
                <OpeningPreview.Provider value="visit">
                  <InvitationPage invitation={invitation} />
                </OpeningPreview.Provider>
              </div>
            </div>
          </div>
        )}
      </div>
      {layout && layout.scale < 1 && (
        <p className="preview-screen__note">Réduit à {Math.round(layout.scale * 100)} % pour tenir sur cet écran.</p>
      )}
    </div>,
    document.querySelector('.admin-root') || document.body
  );
}
