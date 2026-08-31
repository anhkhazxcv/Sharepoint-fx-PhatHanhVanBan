import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { TEMPLATE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext, ITemplateLibraryItem } from '../models/PhvbMag.models';
import { toRuntimeMessage } from '../services/PhvbMag.error';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { AccordionChevronIcon, DownloadIcon, FormTemplateFileIcon } from './PhvbMagIcons';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import styles from './PhvbMag.module.scss';

interface IPhvbMagCreateTemplatePanelProps {
  isActive: boolean;
  siteContext: IPhvbSiteContext;
}

const TEMPLATE_LIST_REGION_ID = 'phvb-create-template-list';

function getTemplateMetaLabel(item: ITemplateLibraryItem): string {
  const extensionLabel = item.fileExtension || '.file';
  return `${extensionLabel} · Template chuẩn MAG`;
}

export function PhvbMagCreateTemplatePanel(props: IPhvbMagCreateTemplatePanelProps): React.ReactElement {
  const { isActive, siteContext } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const [templates, setTemplates] = useState<ITemplateLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      return undefined;
    }

    hasLoadedRef.current = false;
    setIsExpanded(false);
    setTemplates([]);
    setIsLoading(false);
    setErrorMessage(undefined);
    return undefined;
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !isExpanded || hasLoadedRef.current) {
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
          hasLoadedRef.current = true;
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
  }, [isActive, isExpanded, siteContext]);

  const handleToggle = (): void => {
    if (isExpanded) {
      setIsExpanded(false);
      setIsLoading(false);
      return;
    }

    setIsExpanded(true);
  };

  if (!isActive) {
    return <></>;
  }

  return (
    <div className={styles.createTemplatePanel}>
      <div className={styles.createTemplatePanelHeader}>
        <p className={styles.createTemplatePanelHint}>
          <FormTemplateFileIcon style={{ width: 16, height: 16 }} />
          <span>Tải biểu mẫu để soạn thảo, sau đó đính kèm văn bản tại đây.</span>
        </p>
        <button
          type="button"
          className={styles.createTemplatePanelToggle}
          aria-expanded={isExpanded}
          aria-controls={TEMPLATE_LIST_REGION_ID}
          onClick={handleToggle}
        >
          <DownloadIcon style={{ width: 14, height: 14 }} />
          Tải template
          <AccordionChevronIcon isOpen={isExpanded} style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {isExpanded ? (
        <div
          id={TEMPLATE_LIST_REGION_ID}
          className={styles.createTemplatePanelBody}
          role="region"
          aria-live="polite"
          aria-label="Danh sách template mẫu soạn thảo"
        >
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
              {templates.map(item => (
                <li key={item.id} className={styles.templateModalItem}>
                  <span className={styles.templateModalItemIcon} aria-hidden="true">
                    <FormTemplateFileIcon style={{ width: 22, height: 22 }} />
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
                    <DownloadIcon style={{ width: 14, height: 14 }} />
                    Tải
                  </PhvbMagExternalLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
