// Jeu d'icônes de l'administration : trait fin, couleur du texte courant, aucune librairie externe.
const PATHS = {
  phone: <path d="M6.500 4h3l1.500 4-2 1.500a11 11 0 0 0 5.500 5.500l1.500-2 4 1.500v3a1.500 1.500 0 0 1-1.500 1.500A14.500 14.500 0 0 1 5 5.500 1.500 1.500 0 0 1 6.500 4z" />,
  camera: <><path d="M4 8h3l1.5-2.500h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.300" /></>,
  home: <><path d="M4 11l8-6.500 8 6.500v8.500H4z" /><path d="M10 19.500v-5h4v5" /></>,
  image: <><rect x="3.500" y="4.500" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.600" /><path d="M4 18l5.500-5 4 3.500 3-2.500 4 3.500" /></>,
  moon: <path d="M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z" />,
  more: <><circle cx="12" cy="5.500" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="18.500" r="1" /></>,
  'more-horizontal': <><circle cx="5.500" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18.500" cy="12" r="1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.500v2M12 18.500v2M20.500 12h-2M5.500 12h-2M17.700 6.300l-1.400 1.400M7.700 16.300l-1.400 1.400M17.700 17.700l-1.400-1.400M7.700 7.700L6.300 6.300" /></>,
  share: <><circle cx="17.500" cy="5.500" r="2.500" /><circle cx="6.500" cy="12" r="2.500" /><circle cx="17.500" cy="18.500" r="2.500" /><path d="M8.700 10.800l6.600-4M8.700 13.200l6.600 4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600l1.400 1.400M17 17l1.400 1.400M18.400 5.600L17 7M7 17l-1.400 1.400" /></>,
  templates: <><rect x="3.500" y="3.500" width="8" height="17" rx="1.200" /><rect x="13.500" y="3.500" width="7" height="7.500" rx="1.200" /><rect x="13.500" y="13" width="7" height="7.500" rx="1.200" /></>,
  userCheck: <><circle cx="9" cy="8" r="3.200" /><path d="M3.500 20c0-3.300 2.500-5.500 5.500-5.500s5.500 2.200 5.500 5.500M15.500 11.500l2 2 3.500-4" /></>,
  upload: <path d="M12 15V4M7.500 8.500L12 4l4.500 4.500M5 19.500h14" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chat: <><path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4.100A8 8 0 1 1 20 11.6z" /><path d="M9 10.500h6M9 13.500h4" /></>,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" />,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="M8.200 12.300l2.500 2.500 5-5.400" /></>,
  chevronLeft: <path d="M14.500 6l-6 6 6 6" />,
  chevronRight: <path d="M9.500 6l6 6-6 6" />,
  copy: <><rect x="8.500" y="8.500" width="11" height="11" rx="2" /><path d="M15.500 5.500v-.500a1.500 1.500 0 0 0-1.500-1.500H6a2.500 2.500 0 0 0-2.500 2.500v8a1.500 1.500 0 0 0 1.500 1.500h.500" /></>,
  download: <path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 19.500h14" />,
  draft: <><path d="M6 3.500h8l4.500 4.500v12.500H6z" /><path d="M14 3.500V8h4.500M9 12.500h6M9 16h6" /></>,
  edit: <><path d="M4.500 19.500l.900-4 10.800-10.800a2.200 2.200 0 0 1 3.100 3.100L8.500 18.600z" /><path d="M14.500 6.500l3 3" /></>,
  external: <path d="M14 4.500h5.500V10M19 5l-8 8M18 14v4a1.500 1.500 0 0 1-1.500 1.500H6A1.500 1.500 0 0 1 4.500 18V7.500A1.500 1.500 0 0 1 6 6h4" />,
  eye: <><path d="M2.800 12S6 5.800 12 5.800 21.200 12 21.200 12 18 18.200 12 18.200 2.800 12 2.800 12z" /><circle cx="12" cy="12" r="2.800" /></>,
  guestbook: <><path d="M12 6.500C10.500 5.200 8.500 4.500 4 4.500v14c4.500 0 6.500.700 8 2 1.500-1.300 3.500-2 8-2v-14c-4.500 0-6.500.700-8 2z" /><path d="M12 6.500v14" /></>,
  logout: <path d="M14.500 8V5.500a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V16M10 12h10M17 9l3 3-3 3" />,
  mail: <><rect x="3.500" y="5" width="17" height="14" rx="1.500" /><path d="M4 6.500l8 6.500 8-6.500" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  power: <><path d="M12 3.500v8" /><path d="M7.200 6.800a7.500 7.500 0 1 0 9.600 0" /></>,
  printer: <><path d="M7 9V4.500h10V9M7 17H4.500V10.500A1.500 1.500 0 0 1 6 9h12a1.500 1.500 0 0 1 1.500 1.500V17H17" /><path d="M7 14h10v5.500H7z" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.500v2.500H14zM20 14v.100M17.500 17.500H20V20M14 20h.100" /></>,
  search: <><circle cx="11" cy="11" r="6.500" /><path d="M16 16l4 4" /></>,
  trash: <path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l.800 12.500h9.400L17.500 7M10 11v5M14 11v5" />,
  users: <><circle cx="9" cy="8" r="3.200" /><path d="M3.500 20c0-3.300 2.500-5.500 5.500-5.500s5.500 2.200 5.500 5.500" /><circle cx="17" cy="8.500" r="2.400" /><path d="M15 14.700c2.600.200 4.700 2.300 4.700 5.300" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export default function Icon({ name }) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
