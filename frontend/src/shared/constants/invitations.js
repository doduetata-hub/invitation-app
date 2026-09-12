export const STATUS_LABELS = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En préparation',
  READY: 'Prête',
  PUBLISHED: 'Publiée',
  SUSPENDED: 'Suspendue',
  ARCHIVED: 'Archivée',
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

export const STATUS_BADGE_CLASS = {
  DRAFT: 'badge',
  IN_PROGRESS: 'badge badge-accent',
  READY: 'badge badge-accent',
  PUBLISHED: 'badge badge-success',
  SUSPENDED: 'badge badge-danger',
  ARCHIVED: 'badge',
};

export const PAYMENT_LABELS = {
  PENDING: 'En attente',
  PARTIAL: 'Partiellement payé',
  PAID: 'Payé',
};

export const PAYMENT_OPTIONS = Object.keys(PAYMENT_LABELS);
