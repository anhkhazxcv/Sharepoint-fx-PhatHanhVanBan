interface IValidateUpdateFieldResult {
  HasException?: boolean;
  ErrorMessage?: string;
  FieldName?: string;
}

export function assertValidateUpdateSucceeded(payload: unknown): void {
  const results = (payload && typeof payload === 'object' && 'value' in payload
    ? (payload as { value?: IValidateUpdateFieldResult[] }).value
    : undefined) || [];

  for (let index = 0; index < results.length; index += 1) {
    const fieldResult = results[index];
    if (!fieldResult) {
      continue;
    }

    const errorMessage = (fieldResult.ErrorMessage || '').trim();
    if (fieldResult.HasException || errorMessage) {
      const fieldName = (fieldResult.FieldName || '').trim() || 'unknown';
      throw new Error(
        errorMessage
          ? `Không cập nhật được field ${fieldName}: ${errorMessage}`
          : `Không cập nhật được field ${fieldName}.`
      );
    }
  }
}
