import * as React from 'react';
import { useEffect, useState } from 'react';
import { TEMPLATE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext, ITemplateLibraryItem } from '../models/PhvbMag.models';
import { toRuntimeMessage } from '../services/PhvbMag.error';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { DownloadIcon, FormTemplateFileIcon } from './PhvbMagIcons';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';
import styles from './PhvbMag.module.scss';

interface IPhvbMagTemplateModalProps {
  isOpen: boolean;
  siteContext: IPhvbSiteContext;
  onClose: () => void;
}

// Mirrors $badge-tc-text/$badge-qc-text/$badge-qd-text/$badge-cs-text/$badge-hd-text
// in _PhvbMag.colors.scss — keep in sync if that SCSS palette ever changes.
const TEMPLATE_ICON_COLORS = ['#8C5B38', '#6C5A49', '#70675D', '#4F473E', '#5A544A'];

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
    <PhvbMagDialog
      isOpen={isOpen}
      title={(
        <span className={styles.templateModalTitleRow}>
          <span className={styles.templateModalTitleIcon} aria-hidden="true">
            <FormTemplateFileIcon style={{ width: 22, height: 22 }} />
          </span>
          Template mẫu soạn thảo
        </span>
      )}
      titleId="template-modal-title"
      onDismiss={onClose}
      contentClassName={styles.templateModalContent}
      footerClassName={styles.templateModalFooter}
      footer={(
        <button type="button" className={styles.templateModalCloseBtn} onClick={onClose}>
          Đóng
        </button>
      )}
    >
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

                <PhvbMagExternalLink
                  href={item.downloadUrl || item.fileUrl}
                  className={styles.templateModalDownloadBtn}
                  aria-label={`Tải ${item.name}`}
                >
                  <DownloadIcon style={{ width: 16, height: 16 }} />
                  Tải
                </PhvbMagExternalLink>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PhvbMagDialog>
  );
}
