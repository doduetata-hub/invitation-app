import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import BottomSheet, { SheetItem } from './BottomSheet';
import { useCompact } from '../../hooks/useMediaQuery';

// Actions d'une ligne ou d'une fiche. Sur ordinateur : un bloc d'icônes avec infobulle. Sur téléphone et tablette : un
// bouton « ⋮ » qui ouvre un panneau où chaque action est écrite en toutes lettres.
// `actions` : { label, icon, to | href | onClick, target, danger, disabled, done, compactOnly }.
export default function RowActions({ title, actions }) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  const list = actions.filter(Boolean);

  if (compact) {
    return (
      <>
        <button type="button" className="more-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Actions : ${title}`}>
          <Icon name="more" />
        </button>
        {open && (
          <BottomSheet title={title} onClose={() => setOpen(false)}>
            {list.map((a) => (
              <SheetItem key={a.label} {...a} onDone={() => setOpen(false)} />
            ))}
          </BottomSheet>
        )}
      </>
    );
  }

  return (
    <span className="row-actions">
      {list.filter((a) => !a.compactOnly).map((a) => {
        const props = {
          className: `row-action${a.danger ? ' row-action--danger' : ''}${a.done ? ' is-done' : ''}`,
          title: a.label,
          'aria-label': `${a.label} : ${title}`,
          children: <Icon name={a.icon} />,
        };
        if (a.to) return <Link key={a.icon} to={a.to} target={a.target} {...props} />;
        if (a.href) return <a key={a.icon} href={a.href} target={a.target} rel={a.target ? 'noreferrer' : undefined} {...props} />;
        return <button key={a.icon} type="button" onClick={a.onClick} disabled={a.disabled} {...props} />;
      })}
    </span>
  );
}
