import * as React from 'react';
import { useEffect, useState } from 'react';
import { TEMPLATE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext, ITemplateLibraryItem } from '../models/PhvbMag.models';
import { toRuntimeMessage } from '../services/PhvbMag.error';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { CloseIcon, FormTemplateFileIcon, SubmitRequestIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

interface IPhvbMagTemplateModalProps {
  isOpen: boolean;
  siteContext: IPhvbSiteContext;
  onClose: () => void;
}

const TEMPLATE_ICON_COLORS = ['#4A7FD4', '#2F9B57', '#D9792B', '#7B4C2C', '#6B4AA8'];

function getTemplateIconColor(index: number): string {
  return TEMPLATE_ICON_COLORS[index % TEMPLATE_ICON_COLORS.length];
}

function getTemplateMetaLabel(item: ITemplateLibraryItem): string {
  const extensionLabel = item.fileExtension || '.file';
  return `${extensionLabel} · Template chuẩn MAG`;
}

export function PhvbMagTemplateModal(props: IPhvbMagTemplateModalProps): React.ReactElement {
  const { isOpen, siteContext, onClose } = props;
  const [templates, setTemplates] = useState<ITemplateLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isCancelled = false;

    const loadTemplates = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const items = await phvbDocumentLibraryService.loadTemplateItems(siteContext);

        if (!isCancelled) {
          setTemplates(items);
        }
      } catch (error) {
        if (!isCancelled) {
          setTemplates([]);
          setErrorMessage(toRuntimeMessage(error, TEMPLATE_LIBRARY_TITLE));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTemplates().catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [isOpen, siteContext]);

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.templateModalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.templateModalHeader}>
          <div className={styles.templateModalTitleRow}>
            <span className={styles.templateModalTitleIcon} aria-hidden="true">
              <FormTemplateFileIcon style={{ width: 22, height: 22 }} />
            </span>
            <h4 id="template-modal-title">Template mẫu soạn thảo</h4>
          </div>
          <button type="button" className={styles.templateModalClose} onClick={onClose} aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <p className={styles.templateModalIntro}>
          Tải xuống biểu mẫu chuẩn để soạn thảo văn bản trước khi tạo yêu cầu.
        </p>

        <div className={styles.templateModalBody}>
          {isLoading ? (
            <p className={styles.templateModalStatus}>Đang tải danh sách template...</p>
          ) : null}

          {!isLoading && errorMessage ? (
            <p className={styles.templateModalError} role="alert">{errorMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && templates.length === 0 ? (
            <p className={styles.templateModalStatus}>Chưa có template trong thư viện BieuMau.</p>
          ) : null}

          {!isLoading && !errorMessage && templates.length > 0 ? (
            <ul className={styles.templateModalList}>
              {templates.map((item, index) => (
                <li key={item.id} className={styles.templateModalItem}>
                  <span
                    className={styles.templateModalItemIcon}
                    style={{ color: getTemplateIconColor(index) }}
                    aria-hidden="true"
                  >
                    <FormTemplateFileIcon style={{ width: 28, height: 28, color: getTemplateIconColor(index) }} />
                  </span>

                  <div className={styles.templateModalItemMain}>
                    <strong className={styles.templateModalItemTitle}>{item.name}</strong>
                    <span className={styles.templateModalItemMeta}>{getTemplateMetaLabel(item)}</span>
                  </div>

                  <a
                    href={item.fileUrl}
                    className={styles.templateModalDownloadBtn}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.name}
                  >
                    <SubmitRequestIcon style={{ width: 16, height: 16, marginLeft: 0 }} />
                    Tải
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={styles.templateModalFooter}>
          <button type="button" className={styles.templateModalCloseBtn} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
