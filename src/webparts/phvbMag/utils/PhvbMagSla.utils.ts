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

