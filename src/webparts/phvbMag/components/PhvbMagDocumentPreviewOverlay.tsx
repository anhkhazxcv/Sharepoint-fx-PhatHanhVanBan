import * as React from 'react';
import type { IPhvbDocumentContext } from '../models/PhvbMag.models';
import { usePhvbDocumentPreviewOptional } from '../context/PhvbMagDocumentPreview.context';
import { resolveIssuanceLibraryTitle } from '../config/PhvbMag.configuration';
import { PhvbMagDialog } from './primitives/PhvbMagDialog';
import { PhvbMagDocumentPreview } from './PhvbMagDocumentPreview';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDocumentPreviewOverlayProps {
  documentContext: IPhvbDocumentContext;
  isEnabled: boolean;
}

export function PhvbMagDocumentPreviewOverlay(
  props: IPhvbMagDocumentPreviewOverlayProps
): React.ReactElement {
  const { documentContext, isEnabled } = props;
  const preview = usePhvbDocumentPreviewOptional();

  const previewDocument = preview?.previewDocument;
  // Fullscreen always uses the overlay — a 4th column cannot fill the viewport.
  const isOpen = Boolean(previewDocument && (isEnabled || preview?.isFullscreen));

  if (!isOpen || !preview || !previewDocument) {
    return <></>;
  }

  const contentClassName = preview.isFullscreen
    ? [styles.previewOverlayContent, styles.previewOverlayContentFullscreen].join(' ')
    : styles.previewOverlayContent;

  return (
    <PhvbMagDialog
      isOpen
      contentClassName={contentClassName}
      onDismiss={preview.closePreview}
    >
      <PhvbMagDocumentPreview
        document={previewDocument}
        libraryTitle={resolveIssuanceLibraryTitle(documentContext.issuanceLibraryTitle)}
        variant="overlay"
        isFullscreen={preview.isFullscreen}
        hasPrevious={preview.hasPrevious}
        hasNext={preview.hasNext}
        onToggleFullscreen={preview.toggleFullscreen}
        onPrevious={preview.goPrevious}
        onNext={preview.goNext}
        onClose={preview.closePreview}
        onCopyLink={preview.copyPreviewLink}
      />
    </PhvbMagDialog>
  );
}
