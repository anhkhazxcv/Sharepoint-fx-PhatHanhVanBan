import { parseDateOnlyToLocalMidnight } from './PhvbMagLibrary.utils';

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDateTimeParts(date: Date): string {
  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    date.getFullYear()
  ].join('/') + ` ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatDateParts(date: Date): string {
  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    date.getFullYear()
  ].join('/');
}

export function parseExecutionDateTime(value?: string): Date | undefined {
  const normalized = (value || '').trim();

  if (!normalized) {
    return undefined;
  }

  const viDateTimeMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(normalized);
  if (viDateTimeMatch) {
    return new Date(
      Number(viDateTimeMatch[3]),
      Number(viDateTimeMatch[2]) - 1,
      Number(viDateTimeMatch[1]),
      Number(viDateTimeMatch[4]),
      Number(viDateTimeMatch[5]),
      Number(viDateTimeMatch[6] || 0)
    );
  }

  const viDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (viDateMatch) {
    return new Date(
      Number(viDateMatch[3]),
      Number(viDateMatch[2]) - 1,
      Number(viDateMatch[1]),
      0,
      0,
      0
    );
  }

  const parsedTime = Date.parse(normalized);
  if (!isNaN(parsedTime)) {
    return new Date(parsedTime);
  }

  return undefined;
}

export function formatExecutionDateTime(value?: string): string {
  const parsed = parseExecutionDateTime(value);

  if (!parsed || isNaN(parsed.getTime())) {
    return (value || '').trim();
  }

  return formatDateTimeParts(parsed);
}

export function formatExecutionDate(value?: string): string {
  const parsed = parseExecutionDateTime(value);

  if (!parsed || isNaN(parsed.getTime())) {
    return (value || '').trim();
  }

  return formatDateParts(parsed);
}

function toLocalDateOnly(value?: string | Date): Date | undefined {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return undefined;
    }

    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  return parseDateOnlyToLocalMidnight(value);
}

function formatSharePointDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** REST Date-only: yyyy-MM-ddT00:00:00 (no Z). Empty / vô thời hạn → undefined (omit on create). */
export function toSharePointDateOnlyIso(value?: string | Date): string | undefined {
  const parsed = toLocalDateOnly(value);
  return parsed ? `${formatSharePointDateOnly(parsed)}T00:00:00` : undefined;
}

/** JSON null so SharePoint REST blanks a DateTime field on update. */
export function sharePointRestNull(): string {
  // eslint-disable-next-line @rushstack/no-new-null -- SharePoint REST DateTime clear
  return null as unknown as string;
}

/** validateUpdateListItem FieldValue for Date-only: M/d/yyyy (site en-US, e.g. 2/23/2012). Do not use dd/MM/yyyy or REST ISO. Empty → ''. */
export function toSharePointDateOnlyFieldValue(value?: string | Date): string {
  const parsed = toLocalDateOnly(value);
  return parsed ? `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}` : '';
}

export interface IDateOnlyFormValue {
  FieldName: string;
  FieldValue: string;
}

/**
 * Từ 1 payload đã có sẵn các field ngày dạng ISO lỗi (toSharePointDateOnlyIso) hoặc null,
 * build lại danh sách formValues đúng (M/d/yyyy) để gọi ValidateUpdateListItem ghi đè.
 * Field nào không phải string (undefined/null — đã bị clear ở payload chính) thì bỏ qua,
 * vì việc clear bằng null qua PATCH/POST thường không bị lỗi timezone.
 */
export function buildDateOnlyCorrectionFormValues(
  payload: Record<string, string | boolean | number | undefined>,
  fieldNames: ReadonlyArray<string>
): IDateOnlyFormValue[] {
  const values: IDateOnlyFormValue[] = [];

  fieldNames.forEach(fieldName => {
    const rawValue = payload[fieldName];
    if (typeof rawValue !== 'string' || !rawValue) {
      return;
    }

    const fieldValue = toSharePointDateOnlyFieldValue(rawValue);
    if (fieldValue) {
      values.push({ FieldName: fieldName, FieldValue: fieldValue });
    }
  });

  return values;
}

export function formatDateOnlyVi(value?: string): string {
  const parsed = parseDateOnlyToLocalMidnight(value);

  if (!parsed) {
    return (value || '').trim();
  }

  return formatDateParts(parsed);
}
