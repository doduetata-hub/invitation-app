const common = { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function CalendarIcon(props) {
  return (
    <svg {...common} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <polyline points="12,7.5 12,12 15.5,14" />
    </svg>
  );
}

export function PinIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function MapIcon(props) {
  return (
    <svg {...common} {...props}>
      <polygon points="9,4 3.5,6 3.5,20 9,18 15,20 20.5,18 20.5,4 15,6" />
      <line x1="9" y1="4" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="20" />
    </svg>
  );
}

export function LeafIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z" />
      <path d="M5 19c2-4 5-7 9-9" />
    </svg>
  );
}

export function HeartIcon(props) {
  return (
    <svg {...common} fill="currentColor" stroke="none" {...props}>
      <path d="M12 20.5s-7.9-4.9-10.2-9.8C.3 7.6 2 4.5 5.2 4.1c2-.3 3.8.7 4.9 2.5 1-1.8 2.9-2.8 4.9-2.5 3.2.4 4.9 3.5 3.4 6.6-2.3 4.9-10.2 9.8-10.2 9.8z" />
    </svg>
  );
}

export function PeopleIcon(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="8.5" cy="8.5" r="3" />
      <circle cx="16" cy="9.5" r="2.4" />
      <path d="M2.5 20c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <path d="M14.5 14.3c2.6.3 4.5 2.4 4.5 5.7" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...common} {...props}>
      <polyline points="5,9 12,16 19,9" />
    </svg>
  );
}

export function SparkleIcon(props) {
  return (
    <svg {...common} fill="currentColor" stroke="none" {...props}>
      <path d="M12 2.5c.5 4 2.7 6.2 6.7 6.7-4 .5-6.2 2.7-6.7 6.7-.5-4-2.7-6.2-6.7-6.7 4-.5 6.2-2.7 6.7-6.7z" />
      <path d="M19 15c.25 1.8 1.2 2.75 3 3-1.8.25-2.75 1.2-3 3-.25-1.8-1.2-2.75-3-3 1.8-.25 2.75-1.2 3-3z" />
    </svg>
  );
}

export function DiamondIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2 L18 12 L12 22 L6 12 Z" />
    </svg>
  );
}
