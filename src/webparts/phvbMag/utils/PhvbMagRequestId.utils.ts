const GUID_SUFFIX_LENGTH = 6;
const REQUEST_ID_PREFIX = 'ID';

function padTwoDigits(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function generateGuidString(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function formatRequestIdMmddPart(date: Date = new Date()): string {
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());

  return `${month}${day}`;
}

export function getGuidSuffix(length: number = GUID_SUFFIX_LENGTH): string {
  const guid = generateGuidString();

  if (guid.length <= length) {
    return guid;
  }

  return guid.substring(guid.length - length);
}

export function generateRequestReferenceId(date: Date = new Date()): string {
  return `${REQUEST_ID_PREFIX}${getGuidSuffix()}${formatRequestIdMmddPart(date)}`;
}
