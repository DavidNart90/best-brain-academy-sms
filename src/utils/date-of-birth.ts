export const dateOfBirthFormatMessage =
  "Use DD-MM-YYYY, for example 12-04-2015.";

const displayDatePattern = /^(\d{2})-(\d{2})-(\d{4})$/;
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidDate(year: number, month: number, day: number) {
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (month < 1 || month > 12) return false;
  const maximumDay = daysInMonth[month - 1] ?? 0;
  return day >= 1 && day <= maximumDay;
}

export function dateOfBirthToIso(value: string) {
  const trimmed = value.trim();
  const displayMatch = displayDatePattern.exec(trimmed);
  const isoMatch = isoDatePattern.exec(trimmed);
  const match = displayMatch ?? isoMatch;

  if (!match) return null;

  const [, first, second, third] = match;
  if (!first || !second || !third) return null;
  const [yearText, monthText, dayText] = displayMatch
    ? [third, second, first]
    : [first, second, third];
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!isValidDate(year, month, day)) return null;

  return `${yearText}-${monthText}-${dayText}`;
}

export function formatDateOfBirth(
  value: string | null | undefined,
  fallback = "Not recorded",
) {
  if (!value) return fallback;

  const isoDate = dateOfBirthToIso(value);
  if (!isoDate) return fallback;

  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}
