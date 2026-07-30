import * as React from 'react';
import { TooltipHost } from '@fluentui/react';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import { usePhvbSavedDocumentsOptional } from '../context/PhvbMagSavedDocuments.context';
import { BookmarkFilledIcon, BookmarkOutlineIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

interface IPhvbMagSaveBookmarkButtonProps {
  document: IBanHanhLibraryItem;
  showBookmark?: boolean;
}

function PhvbMagSaveBookmarkButtonInner(props: IPhvbMagSaveBookmarkButtonProps): React.ReactElement {
  const { document, showBookmark = true } = props;
  const savedDocuments = usePhvbSavedDocumentsOptional();

  if (!showBookmark || !savedDocuments || document.fsObjType !== 0) {
    return <></>;
  }

  const isSaved = savedDocuments.isSaved(document.id);
  const isPending = savedDocuments.isPending(document.id);
  const tooltip = isSaved ? 'Bỏ lưu' : 'Lưu văn bản';

  return (
    <TooltipHost content={tooltip}>
      <button
        type="button"
        className={[
          styles.libraryDocumentDownloadBtn,
          isSaved ? styles.libraryDocumentBookmarkBtnActive : ''
        ].filter(Boolean).join(' ')}
        aria-label={tooltip}
        disabled={isPending}
        onClick={() => {
          savedDocuments.toggleSave(document).catch(() => undefined);
        }}
      >
        {isSaved ? (
          <BookmarkFilledIcon className={styles.libraryDocumentBookmarkIcon} />
        ) : (
          <BookmarkOutlineIcon className={styles.libraryDocumentBookmarkIcon} />
        )}
      </button>
    </TooltipHost>
  );
}

export const PhvbMagSaveBookmarkButton = React.memo(PhvbMagSaveBookmarkButtonInner);
