/**
 * Helper duy nhất được truy cập window.localStorage / window.sessionStorage.
 *
 * Mọi hàm đều fail-silent (không throw, không log): storage có thể bị chặn
 * hoàn toàn (private mode, policy chặn site data, iframe third-party) và không
 * feature nào ở đây được phép chặn nghiệp vụ chính chỉ vì không ghi được
 * preference/cache. Không log vì một số consumer nằm trên hot path ghi lịch sử
 * — mà log lại ghi vào SharePoint list nên dễ thành đệ quy/ồn.
 */

export type PhvbStorageKind = 'local' | 'session';

/**
 * Ngay cả việc ĐỌC property window.localStorage cũng có thể throw (Safari
 * private mode, site data bị chặn bằng policy) nên toàn bộ nằm trong try/catch.
 * Không cache Storage object ở module scope: quyền có thể đổi lúc runtime.
 */
function resolveStorage(kind: PhvbStorageKind): Storage | undefined {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    return storage || undefined;
  } catch {
    return undefined;
  }
}

export function readStoredString(kind: PhvbStorageKind, key: string): string | undefined {
  const storage = resolveStorage(kind);

  if (!storage) {
    return undefined;
  }

  try {
    return storage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredString(kind: PhvbStorageKind, key: string, value: string): void {
  const storage = resolveStorage(kind);

  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // Quota / private mode — best effort.
  }
}

export function removeStoredKey(kind: PhvbStorageKind, key: string): void {
  const storage = resolveStorage(kind);

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Best effort.
  }
}

/**
 * Trả undefined khi key chưa từng được ghi — dùng cho preference cần phân biệt
 * "user chưa chỉnh" với "user đã chỉnh và trùng giá trị mặc định".
 *
 * parseInt (không phải Number) để '320px' -> 320 và '' -> undefined.
 */
export function readStoredNumberOptional(
  kind: PhvbStorageKind,
  key: string,
  normalize?: (value: number) => number
): number | undefined {
  const raw = readStoredString(kind, key);

  if (!raw) {
    return undefined;
  }

  const parsed = parseInt(raw, 10);

  if (isNaN(parsed)) {
    return undefined;
  }

  return normalize ? normalize(parsed) : parsed;
}

export function readStoredNumber(
  kind: PhvbStorageKind,
  key: string,
  fallback: number,
  normalize?: (value: number) => number
): number {
  return readStoredNumberOptional(kind, key, normalize) ?? fallback;
}

export function writeStoredNumber(kind: PhvbStorageKind, key: string, value: number): void {
  writeStoredString(kind, key, String(value));
}

/**
 * isValid là bắt buộc: không có nó thì hàm này chỉ là một `as` cast không an
 * toàn trên dữ liệu do phiên bản bundle cũ ghi ra.
 */
export function readStoredJson<T>(
  kind: PhvbStorageKind,
  key: string,
  isValid: (parsed: unknown) => parsed is T
): T | undefined {
  const raw = readStoredString(kind, key);

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredJson(kind: PhvbStorageKind, key: string, value: unknown): void {
  try {
    writeStoredString(kind, key, JSON.stringify(value));
  } catch {
    // JSON.stringify có thể throw (circular structure).
  }
}

export function listStoredKeysByPrefix(kind: PhvbStorageKind, prefix: string): string[] {
  const storage = resolveStorage(kind);

  if (!storage) {
    return [];
  }

  const keys: string[] = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key && key.indexOf(prefix) === 0) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }

  return keys;
}

/** Liệt kê xong mới xoá: xoá trong lúc duyệt làm index dịch và bỏ sót key. */
export function removeStoredKeysByPrefix(kind: PhvbStorageKind, prefix: string): void {
  const keys = listStoredKeysByPrefix(kind, prefix);

  for (let index = 0; index < keys.length; index += 1) {
    removeStoredKey(kind, keys[index]);
  }
}
