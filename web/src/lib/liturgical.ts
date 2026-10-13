/* Liturgical calendar layer for AME Monthly Church Reporting.
 *
 * Implements the real Gregorian computus (Anonymous Gregorian algorithm,
 * Nature 1876 / Meeus-Jone-Butcher) to find Easter Sunday, then derives every
 * movable holy day from it. Fixed feasts (Christmas, Epiphany) are hardcoded.
 *
 * All dates are computed in UTC so daylight-saving shifts can never move a
 * holy day onto the wrong calendar cell.
 */

export type LiturgicalSeason =
  | "Advent"
  | "Christmas"
  | "Epiphany"
  | "Lent"
  | "Holy Week"
  | "Easter"
  | "Pentecost"
  | "Ordinary Time";

export interface SeasonMeta {
  name: LiturgicalSeason;
  /** Season color for calendar bars / badges. */
  color: string;
  /** Border color to use when the season color is white. */
  borderColor?: string;
}

export const SEASON_META: Record<LiturgicalSeason, SeasonMeta> = {
  Advent: { name: "Advent", color: "#6A4C93" },
  Christmas: { name: "Christmas", color: "#FFFFFF", borderColor: "#C9A227" },
  Epiphany: { name: "Epiphany", color: "#2E7D32" },
  Lent: { name: "Lent", color: "#6A4C93" },
  "Holy Week": { name: "Holy Week", color: "#4A2C6A" },
  Easter: { name: "Easter", color: "#FFFFFF", borderColor: "#C9A227" },
  Pentecost: { name: "Pentecost", color: "#C62828" },
  "Ordinary Time": { name: "Ordinary Time", color: "#2E7D32" },
};

export interface LiturgicalInfo {
  season: LiturgicalSeason;
  color: string;
  /** Gold border for white seasons so the bar stays visible on a white cell. */
  borderColor?: string;
  /** Present on holy days and Sundays of the church year. */
  holyDay?: string;
}

export interface ChurchYear {
  ashWednesday: Date;
  palmSunday: Date;
  maundyThursday: Date;
  goodFriday: Date;
  holySaturday: Date;
  easterSunday: Date;
  ascensionDay: Date;
  pentecost: Date;
  trinitySunday: Date;
  christTheKing: Date;
  adventSunday: Date;
  christmasEve: Date;
  christmasDay: Date;
  epiphany: Date;
  baptismOfTheLord: Date;
}

const DAY = 86_400_000;

function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

function isSunday(d: Date): boolean {
  return d.getUTCDay() === 0;
}

/** Anonymous Gregorian algorithm (Nature, 1876). Returns Easter Sunday in UTC. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/** Advent Sunday: the first Sunday on or after November 27. */
export function adventSunday(year: number): Date {
  let d = utcDate(year, 11, 27);
  while (!isSunday(d)) d = addDays(d, 1);
  return d;
}

/** Baptism of the Lord: the first Sunday strictly after January 6. */
export function baptismOfTheLord(year: number): Date {
  let d = addDays(utcDate(year, 1, 6), 1);
  while (!isSunday(d)) d = addDays(d, 1);
  return d;
}

/** Every derived holy day for a church year, keyed to that year's Easter. */
export function churchYear(year: number): ChurchYear {
  const easter = easterSunday(year);
  const advent = adventSunday(year);
  return {
    ashWednesday: addDays(easter, -46),
    palmSunday: addDays(easter, -7),
    maundyThursday: addDays(easter, -3),
    goodFriday: addDays(easter, -2),
    holySaturday: addDays(easter, -1),
    easterSunday: easter,
    ascensionDay: addDays(easter, 39),
    pentecost: addDays(easter, 49),
    trinitySunday: addDays(easter, 56),
    christTheKing: addDays(advent, -7),
    adventSunday: advent,
    christmasEve: utcDate(year, 12, 24),
    christmasDay: utcDate(year, 12, 25),
    epiphany: utcDate(year, 1, 6),
    baptismOfTheLord: baptismOfTheLord(year),
  };
}

/** "YYYY-MM-DD" in UTC — safe for comparing calendar cells. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Map of YYYY-MM-DD → holy day name for the given civil year. */
export function holyDaysForYear(year: number): Map<string, string> {
  const y = churchYear(year);
  const pairs: [Date, string][] = [
    [y.ashWednesday, "Ash Wednesday"],
    [y.palmSunday, "Palm Sunday"],
    [y.maundyThursday, "Maundy Thursday"],
    [y.goodFriday, "Good Friday"],
    [y.holySaturday, "Holy Saturday"],
    [y.easterSunday, "Easter Sunday"],
    [y.ascensionDay, "Ascension Day"],
    [y.pentecost, "Pentecost"],
    [y.trinitySunday, "Trinity Sunday"],
    [y.christTheKing, "Christ the King Sunday"],
    [y.adventSunday, "First Sunday of Advent"],
    [y.christmasEve, "Christmas Eve"],
    [y.christmasDay, "Christmas Day"],
    [y.epiphany, "Epiphany"],
    [y.baptismOfTheLord, "Baptism of the Lord"],
  ];
  const map = new Map<string, string>();
  for (const [d, name] of pairs) map.set(dayKey(d), name);
  return map;
}

function inRange(d: Date, from: Date, to: Date): boolean {
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

/**
 * Season + color (+ holy day name, when it is one) for any calendar date.
 * Season ranges:
 *   Advent:        Advent Sunday → Christmas Eve
 *   Christmas:     Christmas Day → Baptism of the Lord
 *   Lent:          Ash Wednesday → day before Palm Sunday
 *   Holy Week:     Palm Sunday → Holy Saturday
 *   Easter:        Easter Sunday → day before Pentecost
 *   Pentecost:     Pentecost → day before Trinity Sunday
 *   Ordinary Time: everything else (includes Epiphanytide)
 */
export function getLiturgicalInfo(date: Date): LiturgicalInfo {
  const y = date.getUTCFullYear();
  // December/January dates can belong to the neighboring year's church year.
  const prev = churchYear(y - 1);
  const cur = churchYear(y);
  const next = churchYear(y + 1);

  const holy =
    holyDaysForYear(y - 1).get(dayKey(date)) ??
    holyDaysForYear(y).get(dayKey(date)) ??
    holyDaysForYear(y + 1).get(dayKey(date));

  let season: LiturgicalSeason = "Ordinary Time";

  if (inRange(date, prev.adventSunday, prev.christmasEve)) season = "Advent";
  else if (inRange(date, prev.christmasDay, cur.baptismOfTheLord)) season = "Christmas";
  else if (inRange(date, cur.adventSunday, cur.christmasEve)) season = "Advent";
  else if (inRange(date, cur.christmasDay, next.baptismOfTheLord)) season = "Christmas";
  else if (inRange(date, cur.ashWednesday, addDays(cur.palmSunday, -1))) season = "Lent";
  else if (inRange(date, cur.palmSunday, cur.holySaturday)) season = "Holy Week";
  else if (inRange(date, cur.easterSunday, addDays(cur.pentecost, -1))) season = "Easter";
  else if (inRange(date, cur.pentecost, addDays(cur.trinitySunday, -1))) season = "Pentecost";
  else season = "Ordinary Time";

  const meta = SEASON_META[season];
  return {
    season,
    color: meta.color,
    ...(meta.borderColor ? { borderColor: meta.borderColor } : {}),
    ...(holy ? { holyDay: holy } : {}),
  };
}
