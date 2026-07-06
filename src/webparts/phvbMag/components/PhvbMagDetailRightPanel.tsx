import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PhvbMag.module.scss';

const DEFAULT_WORKFLOW_RATIO = 0.52;
const MIN_PANEL_HEIGHT = 160;
const STACKED_BREAKPOINT = 1100;

interface IPhvbMagDetailRightPanelProps {
  workflowSlot: React.ReactNode;
  activitySlot: React.ReactNode;
}

export function PhvbMagDetailRightPanel(props: IPhvbMagDetailRightPanelProps): React.ReactElement {
  const { workflowSlot, activitySlot } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [workflowRatio, setWorkflowRatio] = useState(DEFAULT_WORKFLOW_RATIO);
  const [isResizing, setIsResizing] = useState(false);
  const [isStacked, setIsStacked] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${STACKED_BREAKPOINT}px)`);
    const updateLayout = (): void => {
      setIsStacked(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);

    return () => {
      mediaQuery.removeEventListener('change', updateLayout);
    };
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent): void => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const availableHeight = rect.height;

    if (availableHeight <= MIN_PANEL_HEIGHT * 2) {
      return;
    }

    const pointerOffset = event.clientY - rect.top;
    const clampedOffset = Math.min(
      Math.max(pointerOffset, MIN_PANEL_HEIGHT),
      availableHeight - MIN_PANEL_HEIGHT
    );

    setWorkflowRatio(clampedOffset / availableHeight);
  }, []);

  const handlePointerUp = useCallback((): void => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return undefined;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp, isResizing]);

  const handleSplitterPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (isStacked) {
      return;
    }

    event.preventDefault();
    setIsResizing(true);
    handlePointerMove(event.nativeEvent);
  };

  return (
    <div
      ref={containerRef}
      className={[
        styles.detailRightColumn,
        isResizing ? styles.detailRightColumnResizing : ''
      ].filter(Boolean).join(' ')}
    >
      <div
        className={styles.detailWorkflowSlot}
        style={isStacked ? undefined : { flex: `0 0 ${workflowRatio * 100}%` }}
      >
        {workflowSlot}
      </div>

      {!isStacked ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Điều chỉnh chiều cao giữa quy trình và hoạt động"
          className={[
            styles.detailRightPanelSplitter,
            isResizing ? styles.detailRightPanelSplitterActive : ''
          ].filter(Boolean).join(' ')}
          onPointerDown={handleSplitterPointerDown}
        />
      ) : null}

      <div className={styles.detailActivitySlot}>
        {activitySlot}
      </div>
    </div>
  );
}
