import type { ICommentAttachmentItem } from '../models/PhvbMag.models';

export function resolveCommentAttachmentFolderName(commentId: number): string {
  return String(commentId);
}

export function validateCommentAttachmentFiles(files: File[]): string | undefined {
  const seenNames = new Set<string>();

  for (let index = 0; index < files.length; index += 1) {
    const normalizedName = files[index].name.trim().toLowerCase();

    if (!normalizedName) {
      return 'Tên file không hợp lệ.';
    }

    if (seenNames.has(normalizedName)) {
      return `Tên file trùng nhau: ${files[index].name}`;
    }

    seenNames.add(normalizedName);
  }

  return undefined;
}

export function appendCommentAttachmentFiles(existingFiles: File[], incomingFiles: FileList | File[]): {
  files: File[];
  error?: string;
} {
  const nextFiles = existingFiles.slice();
  const filesToAdd = Array.prototype.slice.call(incomingFiles) as File[];

  filesToAdd.forEach(file => {
    nextFiles.push(file);
  });

  const validationError = validateCommentAttachmentFiles(nextFiles);

  if (validationError) {
    return {
      files: existingFiles,
      error: validationError
    };
  }

  return { files: nextFiles };
}

export function groupCommentAttachmentsByCommentId(
  attachments: ICommentAttachmentItem[]
): Record<number, ICommentAttachmentItem[]> {
  const grouped: Record<number, ICommentAttachmentItem[]> = {};

  attachments.forEach(attachment => {
    const bucket = grouped[attachment.commentId] || [];
    bucket.push(attachment);
    grouped[attachment.commentId] = bucket;
  });

  return grouped;
}
