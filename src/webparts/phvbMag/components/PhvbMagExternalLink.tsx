import * as React from 'react';

type PhvbMagExternalLinkMode = 'open' | 'download';

interface IPhvbMagExternalLinkProps {
  href?: string;
  className?: string;
  mode?: PhvbMagExternalLinkMode;
  downloadFileName?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

export function PhvbMagExternalLink(props: IPhvbMagExternalLinkProps): React.ReactElement {
  const {
    href,
    className,
    mode = 'open',
    downloadFileName,
    children,
    'aria-label': ariaLabel
  } = props;
  const normalizedHref = (href || '').trim();
  const isDownloadMode = mode === 'download';

  if (!normalizedHref) {
    return <span className={className}>{children}</span>;
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.stopPropagation();
  };

  return (
    <a
      href={normalizedHref}
      className={className}
      aria-label={ariaLabel}
      data-interception="off"
      {...(isDownloadMode
        ? { download: downloadFileName || true }
        : { target: '_blank', rel: 'noopener noreferrer' })}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
