/* Tournament dates are stored as ISO `YYYY-MM-DD` calendar days and formatted
   here, purely from their digits. Nothing in this file constructs a `Date`:
   `new Date("2026-09-20")` is parsed as UTC midnight, so west of Greenwich it
   renders as the 19th — the date the admin picked would silently shift by a day.

   `Intl.DateTimeFormat` is out for the same reason (it needs a `Date`), and its
   short month is "Sep" where the app's copy uses the AP-style "Sept". So the two
   month tables below are written by hand and indexed with plain arithmetic. */

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** AP style: four-letter "Sept", and the short months are never abbreviated. */
const MONTHS_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

type DateParts = { year: number; month: number; day: number };

/** `month` stays 1-based; index the tables with `month - 1`. */
function parts(iso: string): DateParts {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}

/** True only for a real calendar day written as `YYYY-MM-DD`. */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;
  const { year, month, day } = parts(value);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** The display string for a tournament's dates. Total: never throws, and an
 *  unusable input yields "" rather than a half-formed string. Validation is the
 *  gate on the ordering of the two dates, not this function. */
export function formatTournamentDates(
  startDate: string,
  endDate: string | null,
): string {
  if (!isValidIsoDate(startDate)) return "";
  const start = parts(startDate);

  // One-day event: the long form, with the year.
  if (!endDate || !isValidIsoDate(endDate) || endDate === startDate) {
    return `${MONTHS_LONG[start.month - 1]} ${start.day}, ${start.year}`;
  }

  const end = parts(endDate);
  const startAbbr = MONTHS_ABBR[start.month - 1];
  const endAbbr = MONTHS_ABBR[end.month - 1];

  // Ranges lean on the shared parts: same month, then same year, then neither.
  if (start.year === end.year && start.month === end.month) {
    return `${startAbbr} ${start.day}–${end.day}`;
  }
  if (start.year === end.year) {
    return `${startAbbr} ${start.day} – ${endAbbr} ${end.day}`;
  }
  return `${startAbbr} ${start.day}, ${start.year} – ${endAbbr} ${end.day}, ${end.year}`;
}
