import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  DRAFT_DOCUMENT_ACCEPT,
  FORM_ATTACHMENT_ACCEPT
} from '../config/PhvbMag.configuration';
import type { IAttachmentLibraryItem } from '../models/PhvbMag.models';
import type { DetailDocumentUploadKind } from '../hooks/usePhvbDetailDocuments';
import { DeleteFileIcon, UploadDocumentIcon } from './PhvbMagIcons';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailDocumentsTabProps {
  attachments: IAttachmentLibraryItem[];
  canManage?: boolean;
  isMutating?: boolean;
  errorMessage?: string;
  onUploadFiles?: (kind: DetailDocumentUploadKind, files: FileList | File[]) => Promise<boolean>;
  onDeleteFile?: (file: IAttachmentLibraryItem) => Promise<boolean>;
  onDeleteFiles?: (files: IAttachmentLibraryItem[]) => Promise<boolean>;
}

function toggleIdInSet(previous: Set<number>, id: number, checked: boolean): Set<number> {
  const next = new Set<number>();
  previous.forEach(previousId => next.add(previousId));
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

export function PhvbMagDetailDocumentsTab(props: IPhvbMagDetailDocumentsTabProps): React.ReactElement {
  const {
    attachments,
    canManage = false,
    isMutating = false,
    errorMessage,
    onUploadFiles,
    onDeleteFile,
    onDeleteFiles
  } = props;
  const draftInputRef = useRef<HTMLInputElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());
  const [selectedFormIds, setSelectedFormIds] = useState<Set<number>>(new Set());

  const draftFiles = attachments.filter(item => !item.isFormAttachment);
  const formFiles = attachments.filter(item => item.isFormAttachment);

  useEffect(() => {
    const draftIdSet = new Set(draftFiles.map(file => file.id));
    const formIdSet = new Set(formFiles.map(file => file.id));

    setSelectedDraftIds(previous => {
      const next = new Set<number>();
      previous.forEach(id => {
        if (draftIdSet.has(id)) {
          next.add(id);
        }
      });
      return next;
    });

    setSelectedFormIds(previous => {
      const next = new Set<number>();
      previous.forEach(id => {
        if (formIdSet.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [attachments]);

  const handleUploadClick = (kind: DetailDocumentUploadKind): void => {
    if (!canManage || isMutating) {
      return;
    }

    if (kind === 'form') {
      formInputRef.current?.click();
      return;
    }

    draftInputRef.current?.click();
  };

  const handleUploadChange = (
    kind: DetailDocumentUploadKind,
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const fileList = event.target.files;
    const selectedFiles: File[] = [];

    if (fileList) {
      for (let index = 0; index < fileList.length; index += 1) {
        const file = fileList.item(index);
        if (file) {
          selectedFiles.push(file);
        }
      }
    }

    // Snapshot before clear — FileList is live and empties after value reset.
    event.target.value = '';

    if (selectedFiles.length === 0 || !onUploadFiles) {
      return;
    }

    onUploadFiles(kind, selectedFiles).catch(() => undefined);
  };

  const handleDeleteOne = (file: IAttachmentLibraryItem): void => {
    if (!canManage || isMutating || !onDeleteFile) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa file "${file.name}"?`);
    if (!confirmed) {
      return;
    }

    onDeleteFile(file).catch(() => undefined);
  };

  const handleDeleteSelected = (
    kind: DetailDocumentUploadKind,
    files: IAttachmentLibraryItem[],
    selectedIds: Set<number>
  ): void => {
    if (!canManage || isMutating || !onDeleteFiles) {
      return;
    }

    const selectedFiles = files.filter(file => selectedIds.has(file.id));
    if (selectedFiles.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa ${selectedFiles.length} file đã chọn?`);
    if (!confirmed) {
      return;
    }

    onDeleteFiles(selectedFiles)
      .then(succeeded => {
        if (!succeeded) {
          return;
        }

        if (kind === 'form') {
          setSelectedFormIds(new Set());
        } else {
          setSelectedDraftIds(new Set());
        }
      })
      .catch(() => undefined);
  };

  const renderSection = (
    title: string,
    kind: DetailDocumentUploadKind,
    files: IAttachmentLibraryItem[],
    selectedIds: Set<number>,
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>
  ): React.ReactElement => {
    const allSelected = files.length > 0 && files.every(file => selectedIds.has(file.id));
    const selectedCount = files.filter(file => selectedIds.has(file.id)).length;

    return (
      <div className={styles.detailDocSection}>
        <div className={styles.detailDocSectionHeader}>
          <h4 className={styles.detailDocSectionTitle}>{title}</h4>
          {canManage ? (
            <div className={styles.detailDocHeaderActions}>
              <button
                type="button"
                className={styles.detailDocDeleteSelectedBtn}
                disabled={isMutating || selectedCount === 0}
                onClick={() => handleDeleteSelected(kind, files, selectedIds)}
              >
                <DeleteFileIcon />
                Xóa{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button
                type="button"
                className={styles.detailDocUploadBtn}
                disabled={isMutating}
                onClick={() => handleUploadClick(kind)}
              >
                <UploadDocumentIcon style={{ width: 16, height: 16 }} />
                Upload
              </button>
            </div>
          ) : null}
        </div>
        {files.length === 0 ? (
          <p className={styles.detailDocEmpty}>Không có file.</p>
        ) : (
          <table className={styles.detailDocTable}>
            <thead>
              <tr>
                {canManage ? (
                  <th className={styles.detailDocCheckCol}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={isMutating}
                      aria-label={`Chọn tất cả ${title}`}
                      onChange={event => {
                        if (event.target.checked) {
                          setSelectedIds(new Set(files.map(file => file.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </th>
                ) : null}
                <th>Tên file</th>
                <th>Thư mục</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id}>
                  {canManage ? (
                    <td className={styles.detailDocCheckCol}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        disabled={isMutating}
                        aria-label={`Chọn file ${file.name}`}
                        onChange={event => {
                          setSelectedIds(previous => toggleIdInSet(previous, file.id, event.target.checked));
                        }}
                      />
                    </td>
                  ) : null}
                  <td>
                    <PhvbMagExternalLink href={file.fileUrl} className={styles.detailDocLink}>
                      {file.name}
                    </PhvbMagExternalLink>
                  </td>
                  <td className={styles.detailDocFolder}>{file.folderPath || '---'}</td>
                  <td className={styles.detailDocActions}>
                    {file.fileUrl ? (
                      <PhvbMagExternalLink href={file.fileUrl} className={styles.detailDocLink}>
                        Mở
                      </PhvbMagExternalLink>
                    ) : (
                      '---'
                    )}
                    {canManage ? (
                      <button
                        type="button"
                        className={styles.detailDocDeleteBtn}
                        disabled={isMutating}
                        aria-label={`Xóa file ${file.name}`}
                        onClick={() => handleDeleteOne(file)}
                      >
                        <DeleteFileIcon />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className={styles.detailDocuments}>
      <input
        ref={draftInputRef}
        type="file"
        multiple
        accept={DRAFT_DOCUMENT_ACCEPT}
        className={styles.detailCommentFileInput}
        disabled={!canManage || isMutating}
        onChange={event => handleUploadChange('draft', event)}
      />
      <input
        ref={formInputRef}
        type="file"
        multiple
        accept={FORM_ATTACHMENT_ACCEPT}
        className={styles.detailCommentFileInput}
        disabled={!canManage || isMutating}
        onChange={event => handleUploadChange('form', event)}
      />

      {renderSection('Tài liệu soạn thảo', 'draft', draftFiles, selectedDraftIds, setSelectedDraftIds)}
      {renderSection('Biểu mẫu đính kèm', 'form', formFiles, selectedFormIds, setSelectedFormIds)}

      {errorMessage ? (
        <p className={styles.detailCommentError} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
