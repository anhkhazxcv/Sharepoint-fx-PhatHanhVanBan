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

export function formatCurrentExecutionDateTime(): string {
  return formatDateTimeParts(new Date());
}
