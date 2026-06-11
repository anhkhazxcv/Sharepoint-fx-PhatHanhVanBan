const REQUEST_REFERENCE_ID_LENGTH = 12;
const DATETIME_PART_LENGTH = 8;
const RANDOM_PART_LENGTH = REQUEST_REFERENCE_ID_LENGTH - DATETIME_PART_LENGTH;

function padEnd(value: string, targetLength: number, padChar: string = '0'): string {
  if (value.length >= targetLength) {
    return value;
  }

  const padding = new Array(targetLength - value.length + 1).join(padChar);
  return `${value}${padding}`;
}

function padTwoDigits(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export function formatRequestIdDatePart(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());

  return `${year}${month}${day}`;
}

export function generateRequestReferenceIdSuffix(length: number = RANDOM_PART_LENGTH): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').substring(0, length).toLowerCase();
  }

  return padEnd(
    Math.random()
      .toString(36)
      .replace(/[^a-z0-9]/g, '')
      .substring(0, length),
    length,
    '0'
  );
}

export function generateRequestReferenceId(date: Date = new Date()): string {
  const datePart = formatRequestIdDatePart(date);
  const randomPart = generateRequestReferenceIdSuffix();

  return `${datePart}${randomPart}`;
}
