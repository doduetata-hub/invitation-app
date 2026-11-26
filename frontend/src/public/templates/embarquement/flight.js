// Données de « vol » tirées de l'invitation : numéro (initiales + jour et mois), date courte, passager.
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials, pad2 } from '../soireeKit/utils';

export function flightOf(invitation) {
  const { namesLine, eventDate, eventTime, venueName, guest } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const d = eventDate ? new Date(eventDate) : null;
  const valid = Boolean(d && !Number.isNaN(d.getTime()));
  // Les dates de l'application sont calculées en UTC (voir eventDateTime).
  const number = `${ini.f}${ini.s || ''}`.trim() || 'IN';
  return {
    names,
    ini,
    code: valid ? `${number} ${pad2(d.getUTCDate())}${pad2(d.getUTCMonth() + 1)}` : number,
    day: valid ? formatEventDate(eventDate, { day: '2-digit', month: 'short' }).replace('.', '') : '',
    long: valid ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '',
    time: eventTime || '',
    destination: venueName || '',
    passenger: guest?.name || guest?.rsvp?.name || '',
    seat: guest?.tableNumber ? String(guest.tableNumber) : '',
  };
}
