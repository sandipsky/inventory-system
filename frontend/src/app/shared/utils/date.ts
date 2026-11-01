/** Today at local midnight, the shape Lumen's date input emits. */
export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** `YYYY-MM-DD` in local time, the date format the API sends and expects. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses an API `YYYY-MM-DD` string to local midnight; `null` for blank or malformed input. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
