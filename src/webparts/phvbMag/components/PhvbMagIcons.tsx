import * as React from 'react';
import {
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
  FaCopy,
  FaDownload,
  FaEdit,
  FaEye,
  FaFile,
  FaFileAlt,
  FaFileContract,
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
  FaFire,
  FaFolder,
  FaFolderOpen,
  FaHome,
  FaLightbulb,
  FaListAlt,
  FaListOl,
  FaPaperPlane,
  FaPlus,
  FaQuestionCircle,
  FaSearch,
  FaStar,
  FaThumbtack,
  FaTimes,
  FaTrashAlt,
  FaUpload,
  FaUser,
  FaUserCog
} from 'react-icons/fa';

interface IIconProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Mirrors PHVB SCSS palette ($primary-color, $text-muted, $folder-accent). */
export const PHVB_ICON_COLOR_PRIMARY = '#7B4C2C';
export const PHVB_ICON_COLOR_MUTED = '#8C827A';
export const PHVB_ICON_COLOR_FOLDER = '#FFD700';

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

export type LibraryFileTypeIconName = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'file';

export function LibraryFileTypeIcon(
  props: IIconProps & { iconName: LibraryFileTypeIconName }
): React.ReactElement {
  const { iconName, className, style } = props;

  switch (iconName) {
    case 'pdf':
      return <FaFilePdf className={className} style={style} aria-hidden />;
    case 'word':
      return <FaFileWord className={className} style={style} aria-hidden />;
    case 'excel':
      return <FaFileExcel className={className} style={style} aria-hidden />;
    case 'powerpoint':
      return <FaFilePowerpoint className={className} style={style} aria-hidden />;
    default:
      return <FaFile className={className} style={style} aria-hidden />;
  }
}
