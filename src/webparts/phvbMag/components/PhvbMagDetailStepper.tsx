import * as React from 'react';
import { useEffect, useRef } from 'react';
import { getWorkflowStepFromStatus, WORKFLOW_STEPS } from '../config/PhvbMag.configuration';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailStepperProps {
  statusApproved?: string;
}

export function PhvbMagDetailStepper(props: IPhvbMagDetailStepperProps): React.ReactElement {
  const stepperRef = useRef<HTMLDivElement>(null);
  const activeStep = getWorkflowStepFromStatus(props.statusApproved);

  useEffect(() => {
    const container = stepperRef.current;
    if (!container) {
      return;
    }

    const activeElement = container.querySelector(`[data-step-index="${activeStep}"]`);
    if (activeElement && typeof activeElement.scrollIntoView === 'function') {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeStep]);

  return (
    <div
      ref={stepperRef}
      className={styles.detailStepper}
      role="list"
      aria-label="Tiến trình xử lý"
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = step.stepIndex < activeStep;
        const isActive = step.stepIndex === activeStep;
        const isLast = index === WORKFLOW_STEPS.length - 1;

        let stepClassName = styles.detailStepPending;
        if (isCompleted) {
          stepClassName = styles.detailStepCompleted;
        } else if (isActive) {
          stepClassName = styles.detailStepActive;
        }

        return (
          <React.Fragment key={step.key}>
            <div
              className={`${styles.detailStep} ${stepClassName}`}
              role="listitem"
              data-step-index={step.stepIndex}
            >
              <span className={styles.detailStepCircle}>
                {isCompleted ? '✓' : step.stepIndex}
              </span>
              <span className={styles.detailStepLabel}>{step.label}</span>
            </div>
            {!isLast && (
              <span
                className={[
                  styles.detailStepConnector,
                  isCompleted ? styles.detailStepConnectorCompleted : ''
                ].filter(Boolean).join(' ')}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
