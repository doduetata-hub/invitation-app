import { useEffect, useState } from 'react';
import Icon from './Icon';

export const PAGE_SIZE = 15;

// Pagination d'affichage : la liste complète reste chargée comme avant, on n'en montre qu'une page à la fois.
// `resetKey` change quand la recherche ou le filtre change : on revient alors à la première page.
export function usePagination(items, resetKey = '', pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    setPage,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
    total: items.length,
  };
}

// Numéros affichés : première, dernière, page courante et ses voisines.
function pageNumbers(page, pageCount) {
  const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  return wanted.flatMap((n, i) => (i > 0 && n - wanted[i - 1] > 1 ? [`gap-${n}`, n] : [n]));
}

// Pied d'un tableau : ce qui est affiché à gauche, les pages à droite (seulement s'il y en a plusieurs).
export default function TableFooter({ pagination, singular, plural }) {
  const { page, pageCount, setPage, from, to, total } = pagination;
  const noun = total > 1 ? plural : singular;
  return (
    <footer className="data-card__footer">
      <span>{pageCount > 1 ? `${from} à ${to} sur ${total} ${noun}` : `${total} ${noun}`}</span>
      {pageCount > 1 && (
        <nav className="pagination" aria-label="Pages">
          <button type="button" className="pagination__btn" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Page précédente">
            <Icon name="chevronLeft" />
          </button>
          {pageNumbers(page, pageCount).map((n) =>
            typeof n === 'number' ? (
              <button key={n} type="button" className="pagination__btn" onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}>
                {n}
              </button>
            ) : (
              <span key={n} className="pagination__gap">…</span>
            )
          )}
          <button type="button" className="pagination__btn" onClick={() => setPage(page + 1)} disabled={page === pageCount} aria-label="Page suivante">
            <Icon name="chevronRight" />
          </button>
        </nav>
      )}
    </footer>
  );
}
