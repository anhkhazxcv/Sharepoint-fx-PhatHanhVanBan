import * as React from 'react';
import {
  Apps20Regular,
  ArrowDown20Regular,
  ArrowUpload24Regular,
  BookOpen20Regular,
  CheckmarkCircle20Regular,
  ClipboardBulletListLtr20Regular,
  DocumentBulletList24Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Delete20Regular,
  Dismiss12Regular,
  Dismiss20Regular,
  Document24Regular,
  Edit24Regular,
  Filter20Regular,
  DocumentMultiple20Regular,
  Folder20Regular,
  FolderOpen20Regular,
  Home20Regular,
  Person20Regular,
  Search16Regular,
  TextNumberListLtr20Regular
} from '@fluentui/react-icons';

interface IIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SidebarHomeIcon(props: IIconProps): React.ReactElement {
  return <Home20Regular className={props.className} />;
}

export function SidebarMyRequestsIcon(props: IIconProps): React.ReactElement {
  return <Person20Regular className={props.className} />;
}

export function SidebarAdminIcon(props: IIconProps): React.ReactElement {
  return <DocumentMultiple20Regular className={props.className} />;
}

export function SidebarDraftIcon(props: IIconProps): React.ReactElement {
  return <ClipboardBulletListLtr20Regular className={props.className} />;
}

export function SidebarLibraryIcon(props: IIconProps): React.ReactElement {
  return <BookOpen20Regular className={props.className} />;
}

export function SidebarReleaseIcon(props: IIconProps): React.ReactElement {
  return <Folder20Regular className={props.className} />;
}

export function SidebarNumberingIcon(props: IIconProps): React.ReactElement {
  return <TextNumberListLtr20Regular className={props.className} />;
}

export function SidebarCollapseIcon(props: IIconProps): React.ReactElement {
  return <ChevronLeft20Regular className={props.className} />;
}

export function SidebarExpandIcon(props: IIconProps): React.ReactElement {
  return <ChevronRight20Regular className={props.className} />;
}

export function SearchIcon(props: IIconProps): React.ReactElement {
  return <Search16Regular className={props.className} />;
}

export function FilterIcon(props: IIconProps): React.ReactElement {
  return <Filter20Regular className={props.className} />;
}

export function CloseIcon(props: IIconProps): React.ReactElement {
  return <Dismiss20Regular className={props.className} />;
}

export function SuccessIcon(props: IIconProps): React.ReactElement {
  return <CheckmarkCircle20Regular className={props.className} />;
}

export function AppsIcon(props: IIconProps): React.ReactElement {
  return <Apps20Regular className={props.className} />;
}

export function ModalCreateIcon(props: IIconProps): React.ReactElement {
  return <Edit24Regular className={props.className} style={{ width: 22, height: 22, color: '#7B4C2C', ...props.style }} />;
}

export function FolderAccentIcon(props: IIconProps): React.ReactElement {
  return <Folder20Regular className={props.className} style={{ width: 18, height: 18, color: '#F4B400', ...props.style }} />;
}

export function FolderSelectIcon(props: IIconProps): React.ReactElement {
  return <FolderOpen20Regular className={props.className} style={props.style} />;
}

export function DocumentFileIcon(props: IIconProps): React.ReactElement {
  return <Document24Regular className={props.className} style={{ width: 32, height: 32, color: '#7B4C2C', ...props.style }} />;
}

export function FormTemplateFileIcon(props: IIconProps): React.ReactElement {
  return <DocumentBulletList24Regular className={props.className} style={{ width: 32, height: 32, color: '#7B4C2C', ...props.style }} />;
}

export function UploadDocumentIcon(props: IIconProps): React.ReactElement {
  return <ArrowUpload24Regular className={props.className} style={{ width: 38, height: 38, color: '#8C827A', ...props.style }} />;
}

export function UploadFormIcon(props: IIconProps): React.ReactElement {
  return <DocumentBulletList24Regular className={props.className} style={{ width: 38, height: 38, color: '#8C827A', ...props.style }} />;
}

export function RemoveTagIcon(props: IIconProps): React.ReactElement {
  return <Dismiss12Regular className={props.className} style={props.style} />;
}

export function DeleteFileIcon(props: IIconProps): React.ReactElement {
  return <Delete20Regular className={props.className} style={props.style} />;
}

export function SubmitRequestIcon(props: IIconProps): React.ReactElement {
  return <ArrowDown20Regular className={props.className} style={{ marginLeft: 6, ...props.style }} />;
}