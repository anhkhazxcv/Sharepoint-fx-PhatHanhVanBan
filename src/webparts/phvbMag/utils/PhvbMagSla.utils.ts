import { SLA_OPTIONS } from '../config/PhvbMag.configuration';

export interface IWorkflowDeadlines {
  deadlineGopY: string;
  deadlineThamDinh: string;
  deadlinePheDuyet: string;
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthText = month < 10 ? `0${month}` : `${month}`;
  const dayText = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${monthText}-${dayText}`;
}

export function addDaysExcludingSunday(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate.getTime());
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) {
      addedDays += 1;
    }
  }

  return result;
}

export function getSlaTotalDays(loaiSla?: string): number | undefined {
  if (!loaiSla) {
    return undefined;
  }

  for (let index = 0; index < SLA_OPTIONS.length; index += 1) {
    if (SLA_OPTIONS[index].value === loaiSla) {
      return SLA_OPTIONS[index].totalDays;
    }
  }

  return undefined;
}

export function calculateWorkflowDeadlines(loaiSla?: string, startDate: Date = new Date()): IWorkflowDeadlines {
  const totalDays = getSlaTotalDays(loaiSla);

  if (!totalDays) {
    return {
      deadlineGopY: '',
      deadlineThamDinh: '',
      deadlinePheDuyet: ''
    };
  }

  const gopYDays = Math.max(1, Math.floor(totalDays / 3));
  const thamDinhDays = Math.max(gopYDays + 1, Math.floor((totalDays * 2) / 3));

  return {
    deadlineGopY: formatDateForInput(addDaysExcludingSunday(startDate, gopYDays)),
    deadlineThamDinh: formatDateForInput(addDaysExcludingSunday(startDate, thamDinhDays)),
    deadlinePheDuyet: formatDateForInput(addDaysExcludingSunday(startDate, totalDays))
  };
}

export function getSlaMaxDeadline(loaiSla?: string, startDate: Date = new Date()): string {
  return calculateWorkflowDeadlines(loaiSla, startDate).deadlinePheDuyet;
}

export function parseInputDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parts = value.split('-');
  if (parts.length !== 3) {
    return undefined;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) {
    return undefined;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return parsedDate;
}

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getTodayInputDate(): string {
  return formatDateForInput(startOfToday());
}

export function shiftInputDate(value: string, days: number): string | undefined {
  const parsedDate = parseInputDate(value);
  if (!parsedDate) {
    return undefined;
  }

  parsedDate.setDate(parsedDate.getDate() + days);
  return formatDateForInput(parsedDate);
}

export interface IDeadlineValidationResult {
  isValid: boolean;
  deadlineGopY?: string;
  deadlineThamDinh?: string;
  deadlinePheDuyet?: string;
  message?: string;
}

export function validateWorkflowDeadlines(options: {
  deadlineGopY?: string;
  deadlineThamDinh?: string;
  deadlinePheDuyet?: string;
  loaiSla?: string;
}): IDeadlineValidationResult {
  const result: IDeadlineValidationResult = { isValid: true };
  const today = startOfToday();

  if (!options.deadlineGopY) {
    result.isValid = false;
    result.deadlineGopY = 'Vui lòng chọn deadline người góp ý.';
  }

  if (!options.deadlineThamDinh) {
    result.isValid = false;
    result.deadlineThamDinh = 'Vui lòng chọn deadline người thẩm định.';
  }

  if (!options.deadlinePheDuyet) {
    result.isValid = false;
    result.deadlinePheDuyet = 'Vui lòng chọn deadline người phê duyệt.';
  }

  const gopYDate = parseInputDate(options.deadlineGopY);
  const thamDinhDate = parseInputDate(options.deadlineThamDinh);
  const pheDuyetDate = parseInputDate(options.deadlinePheDuyet);

  if (options.deadlineGopY && !gopYDate) {
    result.isValid = false;
    result.deadlineGopY = 'Deadline người góp ý không hợp lệ.';
  }

  if (options.deadlineThamDinh && !thamDinhDate) {
    result.isValid = false;
    result.deadlineThamDinh = 'Deadline người thẩm định không hợp lệ.';
  }

  if (options.deadlinePheDuyet && !pheDuyetDate) {
    result.isValid = false;
    result.deadlinePheDuyet = 'Deadline người phê duyệt không hợp lệ.';
  }

  if (!gopYDate || !thamDinhDate || !pheDuyetDate) {
    return result;
  }

  if (gopYDate.getTime() < today.getTime()) {
    result.isValid = false;
    result.deadlineGopY = 'Deadline người góp ý không được nhỏ hơn ngày hiện tại.';
  }

  if (thamDinhDate.getTime() < today.getTime()) {
    result.isValid = false;
    result.deadlineThamDinh = 'Deadline người thẩm định không được nhỏ hơn ngày hiện tại.';
  }

  if (pheDuyetDate.getTime() < today.getTime()) {
    result.isValid = false;
    result.deadlinePheDuyet = 'Deadline người phê duyệt không được nhỏ hơn ngày hiện tại.';
  }

  if (gopYDate.getTime() >= thamDinhDate.getTime()) {
    result.isValid = false;
    result.deadlineGopY = result.deadlineGopY || 'Deadline người góp ý phải trước deadline người thẩm định.';
    result.deadlineThamDinh = result.deadlineThamDinh || 'Deadline người thẩm định phải sau deadline người góp ý.';
  }

  if (thamDinhDate.getTime() >= pheDuyetDate.getTime()) {
    result.isValid = false;
    result.deadlineThamDinh = result.deadlineThamDinh || 'Deadline người thẩm định phải trước deadline người phê duyệt.';
    result.deadlinePheDuyet = result.deadlinePheDuyet || 'Deadline người phê duyệt phải sau deadline người thẩm định.';
  }

  const slaMaxDeadline = getSlaMaxDeadline(options.loaiSla);
  const slaMaxDate = parseInputDate(slaMaxDeadline);

  if (slaMaxDate && pheDuyetDate.getTime() > slaMaxDate.getTime()) {
    result.isValid = false;
    result.deadlinePheDuyet = `Deadline người phê duyệt không được vượt quá thời hạn SLA (${slaMaxDeadline}).`;
  }

  if (slaMaxDate && gopYDate.getTime() > slaMaxDate.getTime()) {
    result.isValid = false;
    result.deadlineGopY = result.deadlineGopY || `Deadline người góp ý không được vượt quá thời hạn SLA (${slaMaxDeadline}).`;
  }

  if (slaMaxDate && thamDinhDate.getTime() > slaMaxDate.getTime()) {
    result.isValid = false;
    result.deadlineThamDinh = result.deadlineThamDinh || `Deadline người thẩm định không được vượt quá thời hạn SLA (${slaMaxDeadline}).`;
  }

  const minGapDays = 1;
  const minThamDinhDate = parseInputDate(shiftInputDate(options.deadlineGopY || '', minGapDays) || '');
  const minPheDuyetDate = parseInputDate(shiftInputDate(options.deadlineThamDinh || '', minGapDays) || '');

  if (minThamDinhDate && thamDinhDate.getTime() < minThamDinhDate.getTime()) {
    result.isValid = false;
    result.deadlineThamDinh = result.deadlineThamDinh || 'Deadline người thẩm định phải cách deadline người góp ý ít nhất 1 ngày.';
  }

  if (minPheDuyetDate && pheDuyetDate.getTime() < minPheDuyetDate.getTime()) {
    result.isValid = false;
    result.deadlinePheDuyet = result.deadlinePheDuyet || 'Deadline người phê duyệt phải cách deadline người thẩm định ít nhất 1 ngày.';
  }

  if (!result.isValid && !result.message) {
    result.message = 'Deadline luồng xét duyệt phải theo thứ tự: Người góp ý < Người thẩm định < Người phê duyệt.';
  }

  return result;
}
