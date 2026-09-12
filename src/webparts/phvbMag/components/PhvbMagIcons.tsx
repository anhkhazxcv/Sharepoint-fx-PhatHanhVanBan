import * as React from 'react';
import {
  FaAdjust,
  FaBan,
  FaBars,
  FaBell,
  FaBookOpen,
  FaBookmark,
  FaRegBookmark,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaCommentDots,
  FaCompress,
  FaCopy,
  FaDownload,
  FaEdit,
  FaEllipsisH,
  FaEquals,
  FaExpand,
  FaExternalLinkAlt,
  FaEye,
  FaFile,
  FaFileAlt,
  FaFileContract,
  FaFire,
  FaFolder,
  FaFolderOpen,
  FaGem,
  FaHome,
  FaLightbulb,
  FaLink,
  FaListAlt,
  FaListOl,
  FaMinus,
  FaPaperPlane,
  FaPlus,
  FaQuestionCircle,
  FaRegCircle,
  FaSearch,
  FaStar,
  FaThumbtack,
  FaTimes,
  FaTimesCircle,
  FaTrashAlt,
  FaUndo,
  FaUpload,
  FaUser,
  FaUserCog
} from 'react-icons/fa';

interface IIconProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Mirrors PHVB CSS vars (--phvb-primary, --phvb-text-muted, --phvb-folder-accent). */
export const PHVB_ICON_COLOR_PRIMARY = 'var(--phvb-primary, #7B4C2C)';
export const PHVB_ICON_COLOR_MUTED = 'var(--phvb-text-muted, #8C827A)';
export const PHVB_ICON_COLOR_FOLDER = 'var(--phvb-folder-accent, #FFD700)';

function mergeStyle(
  props: IIconProps,
  defaults?: React.CSSProperties
): React.CSSProperties {
  return { ...defaults, ...props.style };
}

export function SidebarHomeIcon(props: IIconProps): React.ReactElement {
  return <FaHome className={props.className} style={props.style} aria-hidden />;
}

export function SidebarTasksIcon(props: IIconProps): React.ReactElement {
  return <FaListAlt className={props.className} style={props.style} aria-hidden />;
}

export function SidebarHelpIcon(props: IIconProps): React.ReactElement {
  return <FaQuestionCircle className={props.className} style={props.style} aria-hidden />;
}

export function SidebarMyRequestsIcon(props: IIconProps): React.ReactElement {
  return <FaUser className={props.className} style={props.style} aria-hidden />;
}

export function SidebarAdminIcon(props: IIconProps): React.ReactElement {
  return <FaCopy className={props.className} style={props.style} aria-hidden />;
}

export function SidebarDraftIcon(props: IIconProps): React.ReactElement {
  return <FaClipboardList className={props.className} style={props.style} aria-hidden />;
}

export function SidebarLibraryIcon(props: IIconProps): React.ReactElement {
  return <FaBookOpen className={props.className} style={props.style} aria-hidden />;
}

export function SidebarNewReleaseIcon(props: IIconProps): React.ReactElement {
  return <FaStar className={props.className} style={props.style} aria-hidden />;
}

export function SidebarSavedIcon(props: IIconProps): React.ReactElement {
  return <FaBookmark className={props.className} style={props.style} aria-hidden />;
}

export function SidebarRecentViewsIcon(props: IIconProps): React.ReactElement {
  return <FaEye className={props.className} style={props.style} aria-hidden />;
}

export function HomeCategoryIcon(props: IIconProps): React.ReactElement {
  return <FaFolder className={props.className} style={props.style} aria-hidden />;
}

export function HomeTrendingIcon(props: IIconProps): React.ReactElement {
  return <FaFire className={props.className} style={props.style} aria-hidden />;
}

export function BookmarkOutlineIcon(props: IIconProps): React.ReactElement {
  return <FaRegBookmark className={props.className} style={props.style} aria-hidden />;
}

export function BookmarkFilledIcon(props: IIconProps): React.ReactElement {
  return <FaBookmark className={props.className} style={props.style} aria-hidden />;
}

export function SidebarNumberingIcon(props: IIconProps): React.ReactElement {
  return <FaListOl className={props.className} style={props.style} aria-hidden />;
}

export function SidebarCollapseIcon(props: IIconProps): React.ReactElement {
  return <FaChevronLeft className={props.className} style={props.style} aria-hidden />;
}

export function SidebarExpandIcon(props: IIconProps): React.ReactElement {
  return <FaChevronRight className={props.className} style={props.style} aria-hidden />;
}

export function SearchIcon(props: IIconProps): React.ReactElement {
  return <FaSearch className={props.className} style={props.style} aria-hidden />;
}

export function CloseIcon(props: IIconProps): React.ReactElement {
  return <FaTimes className={props.className} style={props.style} aria-hidden />;
}

export function SuccessIcon(props: IIconProps): React.ReactElement {
  return <FaCheckCircle className={props.className} style={props.style} aria-hidden />;
}

export function AvatarBadgeRejectedIcon(props: IIconProps): React.ReactElement {
  return <FaTimesCircle className={props.className} style={props.style} aria-hidden />;
}

export function ModalCreateIcon(props: IIconProps): React.ReactElement {
  return (
    <FaEdit
      className={props.className}
      style={mergeStyle(props, { width: 22, height: 22, color: PHVB_ICON_COLOR_PRIMARY })}
      aria-hidden
    />
  );
}

export function FolderAccentIcon(props: IIconProps): React.ReactElement {
  return (
    <FaFolder
      className={props.className}
      style={mergeStyle(props, { width: 18, height: 18 })}
      aria-hidden
    />
  );
}

export function FolderSelectIcon(props: IIconProps): React.ReactElement {
  return <FaFolderOpen className={props.className} style={props.style} aria-hidden />;
}

export function FolderTreeChevronRightIcon(props: IIconProps): React.ReactElement {
  return <FaChevronRight className={props.className} style={props.style} aria-hidden />;
}

export function FolderTreeChevronDownIcon(props: IIconProps): React.ReactElement {
  return <FaChevronDown className={props.className} style={props.style} aria-hidden />;
}

export function DocumentFileIcon(props: IIconProps): React.ReactElement {
  return (
    <FaFileAlt
      className={props.className}
      style={mergeStyle(props, { width: 32, height: 32, color: PHVB_ICON_COLOR_PRIMARY })}
      aria-hidden
    />
  );
}

export function FormTemplateFileIcon(props: IIconProps): React.ReactElement {
  return (
    <FaListAlt
      className={props.className}
      style={mergeStyle(props, { width: 32, height: 32, color: PHVB_ICON_COLOR_PRIMARY })}
      aria-hidden
    />
  );
}

export function UploadDocumentIcon(props: IIconProps): React.ReactElement {
  return (
    <FaUpload
      className={props.className}
      style={mergeStyle(props, { width: 38, height: 38, color: PHVB_ICON_COLOR_MUTED })}
      aria-hidden
    />
  );
}

export function UploadFormIcon(props: IIconProps): React.ReactElement {
  return (
    <FaFileContract
      className={props.className}
      style={mergeStyle(props, { width: 38, height: 38, color: PHVB_ICON_COLOR_MUTED })}
      aria-hidden
    />
  );
}

export function RemoveTagIcon(props: IIconProps): React.ReactElement {
  return (
    <FaTimes
      className={props.className}
      style={mergeStyle(props, { fontSize: 12 })}
      aria-hidden
    />
  );
}

export function FieldErrorIcon(props: IIconProps): React.ReactElement {
  return (
    <FaTimesCircle
      className={props.className}
      style={mergeStyle(props, { width: 12, height: 12 })}
      aria-hidden
    />
  );
}

export function DeleteFileIcon(props: IIconProps): React.ReactElement {
  return <FaTrashAlt className={props.className} style={props.style} aria-hidden />;
}

export function SubmitRequestIcon(props: IIconProps): React.ReactElement {
  return (
    <FaPaperPlane
      className={props.className}
      style={mergeStyle(props, { marginLeft: 6 })}
      aria-hidden
    />
  );
}

export function DownloadIcon(props: IIconProps): React.ReactElement {
  return <FaDownload className={props.className} style={props.style} aria-hidden />;
}

export function SummaryHintIcon(props: IIconProps): React.ReactElement {
  return <FaLightbulb className={props.className} style={props.style} aria-hidden />;
}

export function NotePinIcon(props: IIconProps): React.ReactElement {
  return <FaThumbtack className={props.className} style={props.style} aria-hidden />;
}

export function RemindDeadlineIcon(props: IIconProps): React.ReactElement {
  return <FaBell className={props.className} style={props.style} aria-hidden />;
}

export function WorkflowParticipantIcon(props: IIconProps): React.ReactElement {
  return <FaUserCog className={props.className} style={props.style} aria-hidden />;
}

export function StepCompletedIcon(props: IIconProps): React.ReactElement {
  return <FaCheck className={props.className} style={props.style} aria-hidden />;
}

export function StatusDraftIcon(props: IIconProps): React.ReactElement {
  return <FaAdjust className={props.className} style={props.style} aria-hidden />;
}

export function StatusRejectedIcon(props: IIconProps): React.ReactElement {
  return <FaUndo className={props.className} style={props.style} aria-hidden />;
}

export function StatusGopYIcon(props: IIconProps): React.ReactElement {
  return <FaMinus className={props.className} style={props.style} aria-hidden />;
}

export function StatusThamDinhIcon(props: IIconProps): React.ReactElement {
  return <FaEquals className={props.className} style={props.style} aria-hidden />;
}

export function StatusPheDuyetIcon(props: IIconProps): React.ReactElement {
  return <FaBars className={props.className} style={props.style} aria-hidden />;
}

export function StatusPendingIcon(props: IIconProps): React.ReactElement {
  return <FaRegCircle className={props.className} style={props.style} aria-hidden />;
}

export function StatusNumberedIcon(props: IIconProps): React.ReactElement {
  return <FaGem className={props.className} style={props.style} aria-hidden />;
}

export function StatusPublishedIcon(props: IIconProps): React.ReactElement {
  return <FaCheck className={props.className} style={props.style} aria-hidden />;
}

export function StatusRevokedIcon(props: IIconProps): React.ReactElement {
  return <FaBan className={props.className} style={props.style} aria-hidden />;
}

export function CreateActionIcon(props: IIconProps): React.ReactElement {
  return <FaPlus className={props.className} style={props.style} aria-hidden />;
}

export function AccordionChevronIcon(props: IIconProps & { isOpen?: boolean }): React.ReactElement {
  const { isOpen, className, style } = props;

  return (
    <FaChevronDown
      className={className}
      style={{
        transition: 'transform 0.18s ease',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        ...style
      }}
      aria-hidden
    />
  );
}

export function PaginationPreviousIcon(props: IIconProps): React.ReactElement {
  return <FaChevronLeft className={props.className} style={props.style} aria-hidden />;
}

export function PaginationNextIcon(props: IIconProps): React.ReactElement {
  return <FaChevronRight className={props.className} style={props.style} aria-hidden />;
}

export function EyeIcon(props: IIconProps): React.ReactElement {
  return <FaEye className={props.className} style={props.style} aria-hidden />;
}

export function PreviewFullscreenIcon(props: IIconProps): React.ReactElement {
  return <FaExpand className={props.className} style={props.style} aria-hidden />;
}

export function PreviewExitFullscreenIcon(props: IIconProps): React.ReactElement {
  return <FaCompress className={props.className} style={props.style} aria-hidden />;
}

export function OpenExternalIcon(props: IIconProps): React.ReactElement {
  return <FaExternalLinkAlt className={props.className} style={props.style} aria-hidden />;
}

export function CopyLinkIcon(props: IIconProps): React.ReactElement {
  return <FaLink className={props.className} style={props.style} aria-hidden />;
}

export type LibraryFileTypeIconName = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'file';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfFileTypeIconUrl: string = require('../assets/pdf-document-svgrepo-com.svg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const wordFileTypeIconUrl: string = require('../assets/word-svgrepo-com.svg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const excelFileTypeIconUrl: string = require('../assets/excel-svgrepo-com.svg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const powerpointFileTypeIconUrl: string = require('../assets/powerpoint-svgrepo-com.svg');

const LIBRARY_FILE_TYPE_ASSET_URL: Partial<Record<LibraryFileTypeIconName, string>> = {
  pdf: pdfFileTypeIconUrl,
  word: wordFileTypeIconUrl,
  excel: excelFileTypeIconUrl,
  powerpoint: powerpointFileTypeIconUrl
};

export function LibraryFileTypeIcon(
  props: IIconProps & { iconName: LibraryFileTypeIconName }
): React.ReactElement {
  const { iconName, className, style } = props;
  const assetUrl = LIBRARY_FILE_TYPE_ASSET_URL[iconName];

  if (assetUrl) {
    return (
      <img
        src={assetUrl}
        className={className}
        style={style}
        alt=""
        aria-hidden
        draggable={false}
      />
    );
  }

  return <FaFile className={className} style={style} aria-hidden />;
}

// -------------------------------------------------------------
// MOBILE CHROME
// -------------------------------------------------------------

export function MobileBackIcon(props: IIconProps): React.ReactElement {
  return <FaChevronLeft className={props.className} style={props.style} aria-hidden />;
}

export function MobileCommentIcon(props: IIconProps): React.ReactElement {
  return <FaCommentDots className={props.className} style={props.style} aria-hidden />;
}

export function MobileMoreIcon(props: IIconProps): React.ReactElement {
  return <FaEllipsisH className={props.className} style={props.style} aria-hidden />;
}
