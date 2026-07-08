/**
 * Rome / Tirana share the same timezone (Europe/Rome ≡ Europe/Tirane).
 * All shift dates and clocks in the app derive from this single source
 * so a waiter cannot game their device clock to bypass day boundaries.
 */
export const ROME_TZ = "Europe/Rome";

export const romeDateISO = (d: Date = new Date()): string => {
  // en-CA yields YYYY-MM-DD which is what we compare.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

export const romeTimeHM = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
};

export const romeClockFull = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat("sq-AL", {
    timeZone: ROME_TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

/**
 * True when the current Rome date has advanced past the date the shift
 * was started on (i.e. we've crossed 23:59 → 00:00 in Rome).
 */
export const isPastShiftDay = (shiftStartDateISO: string | null): boolean => {
  if (!shiftStartDateISO) return false;
  return romeDateISO() > shiftStartDateISO;
};